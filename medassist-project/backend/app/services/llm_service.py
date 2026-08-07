import json
import httpx
from typing import Dict, Any

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5:7b-instruct"

SYSTEM_PROMPT = """Vous êtes un assistant IA clinique spécialisé dans l'analyse de consultations médicales.
Votre rôle est d'analyser le texte brut de la transcription d'une dictée médicale et d'extraire toutes les entités cliniques pertinentes.

RÈGLES STRICTES DE FORMATTAGE :
1. Vous devez répondre EXCLUSIVEMENT sous la forme d'un objet JSON valide.
2. N'ajoutez AUCUN texte avant ou après le JSON (pas de bavardage, pas de bloc de code markdown ```json).
3. Si une information est absente du texte, laissez une liste vide [] ou null.

STRUCTURE JSON REQUISE :
{
  "demographics": {
    "age": null,
    "sexe": null
  },
  "diagnostics": [
    { "term": "nom de la maladie ou symptôme", "status": "Confirmed" ou "Suspected" }
  ],
  "prescriptions": [
    { "drug_name": "nom du médicament", "dosage": "ex: 850mg", "frequency": "ex: 2 comprimés par jour" }
  ],
  "biology_requests": [
    { "test_name": "nom de l'analyse biologique" }
  ],
  "imaging_requests": [
    { "exam_name": "nom de l'examen d'imagerie" }
  ],
  "clinical_summary": "un résumé synthétique de 2 à 3 phrases de la consultation."
}
"""

async def extract_medical_data_with_qwen(transcript_text: str) -> Dict[str, Any]:
    """
    Envoie la transcription au modèle Qwen via Ollama et retourne les données structurées en JSON.
    """
    user_prompt = f"Transcription de la consultation à analyser :\n\"\"\"\n{transcript_text}\n\"\"\""

    payload = {
        "model": MODEL_NAME,
        "system": SYSTEM_PROMPT,
        "prompt": user_prompt,
        "format": "json",  # Force Ollama à générer un JSON valide
        "stream": False,
        "options": {
            "temperature": 0.1  # Réduit la créativité pour maximiser la précision médicale
        }
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            
            result = response.json()
            raw_response = result.get("response", "{}")
            
            # Parsing de la réponse du modèle
            structured_data = json.loads(raw_response)
            return structured_data

        except httpx.HTTPError as e:
            raise RuntimeError(f"Erreur de communication avec le serveur Ollama: {str(e)}")
        except json.JSONDecodeError:
            raise ValueError(f"Qwen a renvoyé un format non conforme au JSON: {raw_response}")