from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.patient import Patient

router = APIRouter()

@router.get("/")
def get_patients(db: Session = Depends(get_db)):
    return db.query(Patient).all()