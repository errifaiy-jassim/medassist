import json
import requests
import os

class LLMService:
    def __init__(self):
        # Utilisation de l'API Ollama / vLLM locale pour Qwen 3 On-Premise
        self.ollama_url = os.getenv("LLM_API_URL", "http://host.docker.internal:11434/api/generate")
        self.model_name = os.getenv("LLM_MODEL_NAME", "qwen2.5:7b") # Qwen 3 / Qwen 2.5 local

    def extract_medical_data(self, transcription_text: str) -> dict:
        prompt = f"""
Tu es un assistant médical IA hautement spécialisé dans la structuration de consultations médicales.
Analyse la transcription médicale suivante et extrait les informations au format JSON STRICT.

TRANSCRIPTION :
"{transcription_text}"

RÈGLES STRICTES :
1. Réponds UNIQUEMENT avec un objet JSON valide. Aucun texte explicatif avant ou après.
2. N'invente aucune information non mentionnée dans la transcription.
3. Utilise exactement la structure JSON suivante :

{{
  "demographics": {{
    "age": null,
    "gender": null,
    "blood_group": null
  }},
  "diagnostics": [
    {{
      "label": "Nom de la maladie/symptôme"
    }}
  ],
  "prescriptions": [
    {{
      "drug_name": "Nom du médicament",
      "dosage": "Posologie si mentionnée",
      "frequency": "Fréquence d'administration"
    }}
  ],
  "biology": [
    {{
      "test_name": "Nom de l'analyse biologique demandée"
    }}
  ],
  "imaging": [
    {{
      "type": "Examen d'imagerie demandé",
      "indication": "Raison clinique"
    }}
  ],
  "structured_summary": "Synthèse globale rédigée de la consultation"
}}
"""

        try:
            # Envoi au moteur local LLM
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }
            response = requests.post(self.ollama_url, json=payload, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                response_text = result.get("response", "{}")
                return json.loads(response_text)
            else:
                # Mode fallback d'urgence si le moteur LLM local n'est pas démarré
                return self._fallback_extraction(transcription_text)
                
        except Exception as e:
            return self._fallback_extraction(transcription_text)

    def _fallback_extraction(self, text: str) -> dict:
        """ Extraction basique de secours en cas de déconnexion du LLM """
        return {
            "demographics": {"age": None, "gender": None, "blood_group": None},
            "diagnostics": [{"label": "Non extrait (Moteur LLM hors-ligne)"}],
            "prescriptions": [],
            "biology": [],
            "imaging": [],
            "structured_summary": text
        }

llm_service = LLMService()