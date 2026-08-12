from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import CIM10, NABM, GMR

router = APIRouter()

@router.get("/cim10")
def search_cim10(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    """ Recherche un code ou un libellé CIM-10 par mot-clé """
    results = db.query(CIM10).filter(
        (CIM10.code.ilike(f"%{q}%")) | (CIM10.libelle.ilike(f"%{q}%"))
    ).limit(20).all()
    return results