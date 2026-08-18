import logging

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.coding import GMRCode, ICD10Code, NABMCode

logger = logging.getLogger(__name__)


class CodingService:
    @staticmethod
    def _match(db: Session, model, term: str, pending_code: str, source: str) -> dict:
        term = (term or "").strip()
        base = {
            "query": term,
            "code": pending_code,
            "label": term,
            "status": "To Confirm",
            "match_quality": "none",
            "source": source,
            "requires_validation": True,
        }
        if not term:
            return base

        try:
            result = (
                db.query(model)
                .filter(func.similarity(model.label, term) > 0.3)
                .order_by(func.similarity(model.label, term).desc())
                .first()
            )
            matched_via = "similarity"
        except Exception:
            logger.warning(
                "similarity() unavailable — falling back to ILIKE for %s",
                model.__tablename__,
            )
            db.rollback()
            result = (
                db.query(model)
                .filter(model.label.ilike(f"%{term}%"))
                .order_by(model.label.asc())
                .first()
            )
            matched_via = "ilike"

        if result:
            return {
                "query": term,
                "code": result.code,
                "label": result.label,
                "status": "Matched",
                "match_quality": "high" if matched_via == "similarity" else "partial",
                "source": source,
                "requires_validation": True,
            }
        return base

    @classmethod
    def match_icd10(cls, db: Session, term: str) -> dict:
        return cls._match(db, ICD10Code, term, "A CONFIRMER", "CIM-10")

    @classmethod
    def match_gmr(cls, db: Session, term: str) -> dict:
        return cls._match(db, GMRCode, term, "GMR-AUTO", "GMR")

    @classmethod
    def match_nabm(cls, db: Session, term: str) -> dict:
        return cls._match(db, NABMCode, term, "NABM-AUTO", "NABM")


coding_service = CodingService()
