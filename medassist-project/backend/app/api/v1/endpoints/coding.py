from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.coding_service import coding_service
from pydantic import BaseModel
from typing import List

router = APIRouter()

class CodeRequest(BaseModel):
    diagnostics: List[str]
    prescriptions: List[str]
    biology: List[str]

@router.post("/process")
def process_medical_coding(payload: CodeRequest, db: Session = Depends(get_db)):
    icd10_results = [coding_service.match_icd10(db, d) for d in payload.diagnostics]
    gmr_results = [coding_service.match_gmr(db, p) for p in payload.prescriptions]
    nabm_results = [coding_service.match_nabm(db, b) for b in payload.biology]

    return {
        "diagnostics_icd10": icd10_results,
        "prescriptions_gmr": gmr_results,
        "biology_nabm": nabm_results
    }