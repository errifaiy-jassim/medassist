from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientResponse
import logging

logging.basicConfig(filename='app_debug.log', level=logging.DEBUG)

router = APIRouter()

@router.get("/", response_model=list[PatientResponse])
def get_patients(db: Session = Depends(get_db)):
    return db.query(Patient).all()

@router.post("/", response_model=PatientResponse, status_code=201)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    logging.debug(f"Creating patient: {patient}")
    try:
        if patient.nir:
            existing = db.query(Patient).filter(Patient.nir == patient.nir).first()
            if existing:
                raise HTTPException(status_code=400, detail="Patient with this NIR already exists")

        db_patient = Patient(
            full_name=patient.full_name,
            nir=patient.nir,
            age=patient.age,
            gender=patient.gender,
            blood_group=patient.blood_group,
            phone=patient.phone,
            email=patient.email,
            dossier_number=patient.dossier_number,
        )
        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)
        logging.debug(f"Patient created: {db_patient.id}")
        return db_patient
    except Exception as e:
        logging.exception("Error creating patient")
        raise e

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: str, patient: PatientCreate, db: Session = Depends(get_db)):
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if patient.nir and patient.nir != db_patient.nir:
        existing = db.query(Patient).filter(Patient.nir == patient.nir).first()
        if existing:
            raise HTTPException(status_code=400, detail="Patient with this NIR already exists")

    db_patient.full_name = patient.full_name
    db_patient.nir = patient.nir
    db_patient.age = patient.age
    db_patient.gender = patient.gender
    db_patient.blood_group = patient.blood_group
    db_patient.phone = patient.phone
    db_patient.email = patient.email
    db_patient.dossier_number = patient.dossier_number

    db.commit()
    db.refresh(db_patient)
    return db_patient