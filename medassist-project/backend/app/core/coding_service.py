from sqlalchemy.orm import Session
from app.models.coding import ICD10Code, GMRCode, NABMCode

class CodingService:
    @staticmethod
    def match_icd10(db: Session, term: str) -> dict:
        """ Cherche une correspondance CIM-10 dans la base locale """
        result = db.query(ICD10Code).filter(ICD10Code.label.ilike(f"%{term}%")).first()
        if result:
            return {"code": result.code, "label": result.label, "status": "Confirmed"}
        return {"code": "A CONFIRMER", "label": term, "status": "To Confirm"}

    @staticmethod
    def match_gmr(db: Session, term: str) -> dict:
        """ Cherche une correspondance Médicament GMR dans la base locale """
        result = db.query(GMRCode).filter(GMRCode.label.ilike(f"%{term}%")).first()
        if result:
            return {"code": result.code, "label": result.label, "status": "Confirmed"}
        return {"code": "GMR-AUTO", "label": term, "status": "To Confirm"}

    @staticmethod
    def match_nabm(db: Session, term: str) -> dict:
        """ Cherche une correspondance Biologie NABM dans la base locale """
        result = db.query(NABMCode).filter(NABMCode.label.ilike(f"%{term}%")).first()
        if result:
            return {"code": result.code, "label": result.label, "status": "Confirmed"}
        return {"code": "NABM-AUTO", "label": term, "status": "To Confirm"}

coding_service = CodingService()