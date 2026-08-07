from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
# Assurez-vous d'avoir bien importé votre service Qwen si vous l'utilisez
# from app.services.llm_service import extract_medical_data_with_qwen

router = APIRouter()

class TranscribeRequest(BaseModel):
    text: str

# NOUVELLE ROUTE : Permet au Dashboard de récupérer les consultations sans erreur 404
@router.get("/")
async def get_consultations():
    """
    Renvoie la liste des consultations.
    En attendant PostgreSQL, on renvoie une liste vide ou des données simulées.
    """
    return []

# VOTRE ROUTE EXISTANTE
@router.post("/extract-entities")
async def extract_entities(payload: TranscribeRequest):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Le texte de transcription est vide.")

    # Simuler un retour réussi en attendant que Qwen soit configuré
    return {
        "success": True,
        "data": {
            "summary": "Résumé simulé..."
        }
    }