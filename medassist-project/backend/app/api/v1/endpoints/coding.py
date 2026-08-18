import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from typing import List

from app.core.access import ensure_consultation_access
from app.core.coding_service import coding_service
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.consultation import Consultation
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


class CodeRequest(BaseModel):
    diagnostics: List[str] = []
    prescriptions: List[str] = []
    biology: List[str] = []
    consultation_id: str | None = None


@router.post("/process")
def process_medical_coding(
    payload: CodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        icd10_results = [coding_service.match_icd10(db, d) for d in payload.diagnostics]
        gmr_results = [coding_service.match_gmr(db, p) for p in payload.prescriptions]
        nabm_results = [coding_service.match_nabm(db, b) for b in payload.biology]
    except Exception:
        logger.exception("Coding process failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la codification médicale",
        )

    result = {
        "diagnostics_icd10": icd10_results,
        "prescriptions_gmr": gmr_results,
        "biology_nabm": nabm_results,
        "note": "Les codes proposés nécessitent une validation médicale. Aucun code n'est considéré comme confirmé cliniquement automatiquement.",
    }

    if payload.consultation_id:
        consultation = (
            db.query(Consultation).filter(Consultation.id == payload.consultation_id).first()
        )
        ensure_consultation_access(consultation, current_user)
        consultation.coding_results = json.dumps(result, ensure_ascii=False)
        consultation.coded_at = datetime.utcnow()
        consultation.status = "coded"
        consultation.updated_at = datetime.utcnow()
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            logger.exception("Failed to persist coding results")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de l'enregistrement de la codification",
            )

    return result
