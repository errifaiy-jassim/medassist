from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.coding import ICD10Code, GMRCode, NABMCode

class CodingService:
    @staticmethod
    def match_icd10(db: Session, term: str) -> dict:
        """ Cherche une correspondance CIM-10 avec fuzzy matching """
        result = db.query(ICD10Code).filter(func.similarity(ICD10Code.label, term) > 0.3).order_by(func.similarity(ICD10Code.label, term).desc()).first()
        if result:
            return {"code": result.code, "label": result.label, "status": "Confirmed"}
        return {"code": "A CONFIRMER", "label": term, "status": "To Confirm"}

    @staticmethod
    def match_gmr(db: Session, term: str) -> dict:
        """ Cherche une correspondance GMR avec fuzzy matching """
        result = db.query(GMRCode).filter(func.similarity(GMRCode.label, term) > 0.3).order_by(func.similarity(GMRCode.label, term).desc()).first()
        if result:
            return {"code": result.code, "label": result.label, "status": "Confirmed"}
        return {"code": "GMR-AUTO", "label": term, "status": "To Confirm"}

    @staticmethod
    def match_nabm(db: Session, term: str) -> dict:
        """ Cherche une correspondance NABM avec fuzzy matching """
        result = db.query(NABMCode).filter(func.similarity(NABMCode.label, term) > 0.3).order_by(func.similarity(NABMCode.label, term).desc()).first()
        if result:
            return {"code": result.code, "label": result.label, "status": "Confirmed"}
        return {"code": "NABM-AUTO", "label": term, "status": "To Confirm"}

coding_service = CodingService()