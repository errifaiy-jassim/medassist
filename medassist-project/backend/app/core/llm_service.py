import json
import logging

import requests

from app.core.config import assert_llm_host_allowed, settings

logger = logging.getLogger(__name__)


def _as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _label_from_item(item, *keys: str) -> str | None:
    if item is None:
        return None
    if isinstance(item, str):
        text = item.strip()
        return text or None
    if isinstance(item, dict):
        for key in keys:
            raw = item.get(key)
            if isinstance(raw, str) and raw.strip():
                return raw.strip()
    return None


def normalize_extracted_entities(raw: dict) -> dict:
    """Normalize LLM output into a stable clinical structure without inventing fields."""
    if not isinstance(raw, dict):
        raise RuntimeError("LLM returned invalid JSON structure")

    diagnostics_raw = _as_list(raw.get("diagnostics") or raw.get("diagnoses"))
    symptoms_raw = _as_list(raw.get("symptoms"))
    prescriptions_raw = _as_list(raw.get("prescriptions") or raw.get("medications"))
    treatments_raw = _as_list(raw.get("treatments"))
    biology_raw = _as_list(raw.get("biology") or raw.get("examinations"))
    imaging_raw = _as_list(raw.get("imaging"))

    diagnoses = []
    for item in diagnostics_raw:
        label = _label_from_item(item, "label", "name", "diagnosis")
        if label:
            diagnoses.append({"label": label})

    symptoms = []
    for item in symptoms_raw:
        label = _label_from_item(item, "label", "name", "symptom")
        if label:
            symptoms.append({"label": label})

    medications = []
    for item in prescriptions_raw:
        if isinstance(item, str) and item.strip():
            medications.append({"drug_name": item.strip(), "dosage": None, "frequency": None})
            continue
        if isinstance(item, dict):
            name = _label_from_item(item, "drug_name", "name", "label", "medication")
            if name:
                medications.append(
                    {
                        "drug_name": name,
                        "dosage": item.get("dosage"),
                        "frequency": item.get("frequency"),
                    }
                )

    treatments = []
    for item in treatments_raw:
        label = _label_from_item(item, "label", "name", "treatment")
        if label:
            treatments.append({"label": label})
    if not treatments:
        treatments = [{"label": m["drug_name"]} for m in medications]

    examinations = []
    for item in biology_raw:
        label = _label_from_item(item, "test_name", "label", "name")
        if label:
            examinations.append({"label": label, "type": "biology"})
    for item in imaging_raw:
        label = _label_from_item(item, "type", "label", "name")
        if label:
            examinations.append(
                {
                    "label": label,
                    "type": "imaging",
                    "indication": item.get("indication") if isinstance(item, dict) else None,
                }
            )

    demographics = raw.get("demographics") if isinstance(raw.get("demographics"), dict) else {}
    summary = raw.get("structured_summary")
    if summary is not None and not isinstance(summary, str):
        summary = str(summary)

    return {
        "demographics": {
            "age": demographics.get("age"),
            "gender": demographics.get("gender"),
            "blood_group": demographics.get("blood_group"),
        },
        "symptoms": symptoms,
        "diagnoses": diagnoses,
        "diagnostics": diagnoses,  # backward-compatible alias
        "treatments": treatments,
        "medications": medications,
        "prescriptions": medications,  # backward-compatible alias
        "examinations": examinations,
        "biology": [
            {"test_name": e["label"]}
            for e in examinations
            if e.get("type") == "biology"
        ],
        "imaging": [
            {"type": e["label"], "indication": e.get("indication")}
            for e in examinations
            if e.get("type") == "imaging"
        ],
        "structured_summary": summary,
    }


class LLMService:
    def __init__(self):
        self.ollama_url = settings.LLM_API_URL
        self.model_name = settings.LLM_MODEL_NAME

    def extract_medical_data(self, transcription_text: str) -> dict:
        assert_llm_host_allowed(self.ollama_url)
        
        prompt = (
            "Tu es l'Assistant IA Clinique du système MedAssist. "
            "Ton rôle est d'analyser la transcription médicale et d'extraire EXCLUSIVEMENT les faits cliniques réels et explicites. "
            "Ces extractions sont des PROPOSITIONS IA ÉDITABLES qui seront révisées et modifiées manuellement par le médecin.\n\n"
            f"TRANSCRIPTION À ANALYSER :\n\"\"\"{transcription_text}\"\"\"\n\n"
            "RÈGLES STRICTES DE SÉCURITÉ ET DE FIDÉLITÉ (ZÉRO HALLUCINATION) :\n"
            "1. AUCUNE INVENTION : Base-toi uniquement sur la transcription. N'invente JAMAIS de symptômes, diagnostics ou traitements.\n"
            "2. TRANSCRIPTION VIDE OU NON CLINIQUE : Renvoie des listes vides [] si aucune donnée médicale n'est présente.\n"
            "3. FORMAT STRICT : Réponds UNIQUEMENT avec un objet JSON valide suivant exactement la structure ci-dessous.\n\n"
            "FORMAT JSON ATTENDU :\n"
            "{\n"
            '  "demographics": {"age": null, "gender": null, "blood_group": null},\n'
            '  "symptoms": [{"label": "symptôme exact"}],\n'
            '  "diagnostics": [{"label": "diagnostic exact"}],\n'
            '  "treatments": [{"label": "traitement exact"}],\n'
            '  "prescriptions": [{"drug_name": "médicament", "dosage": null, "frequency": null}],\n'
            '  "biology": [{"test_name": "examen biologique"}],\n'
            '  "imaging": [{"type": "examen imagerie", "indication": null}],\n'
            '  "structured_summary": "Synthèse factuelle."\n'
            "}"
        )

        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.0,
                "num_predict": 512,
            },
        }

        try:
            response = requests.post(
                self.ollama_url,
                json=payload,
                timeout=90,
                allow_redirects=False,
            )
        except requests.Timeout as exc:
            logger.error("LLM request timed out")
            raise RuntimeError("LLM service timed out") from exc
        except requests.RequestException as exc:
            logger.error("LLM request failed: %s", type(exc).__name__)
            raise RuntimeError("LLM service unreachable") from exc

        if response.status_code != 200:
            logger.error(
                "LLM HTTP %s (body omitted — may contain clinical text)",
                response.status_code,
            )
            raise RuntimeError("LLM service returned a non-success status")

        try:
            result = response.json()
            response_text = result.get("response", "{}")
            data = json.loads(response_text) if isinstance(response_text, str) else response_text
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            logger.error("LLM returned unparseable JSON payload")
            raise RuntimeError("LLM returned invalid JSON") from exc

        return normalize_extracted_entities(data)


llm_service = LLMService()