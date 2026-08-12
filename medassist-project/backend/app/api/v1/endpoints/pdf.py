from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.pdf_service import pdf_service
from pydantic import BaseModel
import os

router = APIRouter()

class PDFRequest(BaseModel):
    consultation_id: str

@router.post("/generate")
def generate_pdf(request: PDFRequest, db: Session = Depends(get_db)):
    """
    Génère un compte rendu médical en PDF pour une consultation donnée.
    """
    # 1. Vérifier si la consultation existe (Simulation)
    # consultation = db.query(Consultation).filter(Consultation.id == request.consultation_id).first()
    # if not consultation:
    #     raise HTTPException(status_code=404, detail="Consultation non trouvée")
    
    # 2. Données simulées pour le test
    consultation_data = {"structured_summary": "Résumé de la consultation test pour ID " + request.consultation_id}
    
    # 3. Chemin temporaire
    output_path = f"temp_pdf_{request.consultation_id}.pdf"
    
    try:
        pdf_service.generate_consultation_pdf(consultation_data, output_path)
        return FileResponse(output_path, media_type='application/pdf', filename=f"Consultation_{request.consultation_id}.pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
