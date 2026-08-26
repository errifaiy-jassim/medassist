import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.access import can_access_patient, ensure_patient_access, patients_for_user
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate

logger = logging.getLogger(__name__)
router = APIRouter()


def _nir_conflict_detail(existing: Patient, current_user: User) -> str:
    """Generic conflict message; slightly clearer when the NIR belongs to the caller."""
    if can_access_patient(existing, current_user):
        return "Vous avez déjà un patient avec ce NIR"
    # Do not reveal who owns the conflicting NIR.
    return "Un patient avec ce NIR existe déjà"


@router.get("/", response_model=list[PatientResponse])
def list_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return patients_for_user(db, current_user).order_by(Patient.full_name.asc()).all()


@router.get("/search", response_model=list[PatientResponse])
def search_patients(
    q: str = Query(..., min_length=1, description="Name, NIR or dossier number"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    term = f"%{q.strip()}%"
    return (
        patients_for_user(db, current_user)
        .filter(
            or_(
                Patient.full_name.ilike(term),
                Patient.nir.ilike(term),
                Patient.dossier_number.ilike(term),
                Patient.email.ilike(term),
            )
        )
        .order_by(Patient.full_name.asc())
        .limit(50)
        .all()
    )


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = patients_for_user(db, current_user).filter(Patient.id == patient_id).first()
    return ensure_patient_access(patient, current_user)


@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.nir:
        existing = db.query(Patient).filter(Patient.nir == payload.nir.strip()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_nir_conflict_detail(existing, current_user),
            )

    patient = Patient(
        created_by=current_user.id,
        full_name=payload.full_name.strip(),
        nir=payload.nir.strip() if payload.nir else None,
        age=payload.age.strip() if isinstance(payload.age, str) and payload.age else payload.age,
        gender=payload.gender,
        blood_group=payload.blood_group,
        phone=payload.phone.strip() if isinstance(payload.phone, str) and payload.phone else payload.phone,
        email=payload.email.strip().lower() if payload.email else None,
        dossier_number=payload.dossier_number.strip() if payload.dossier_number else None,
    )
    db.add(patient)
    try:
        db.commit()
        db.refresh(patient)
    except IntegrityError:
        db.rollback()
        logger.exception("Integrity error while creating patient")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflit d'unicité lors de la création du patient",
        )
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error while creating patient")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur base de données lors de la création du patient",
        )
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: str,
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = patients_for_user(db, current_user).filter(Patient.id == patient_id).first()
    ensure_patient_access(patient, current_user)

    new_nir = payload.nir.strip() if payload.nir else None
    if new_nir and new_nir != patient.nir:
        existing = db.query(Patient).filter(Patient.nir == new_nir).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_nir_conflict_detail(existing, current_user),
            )

    patient.full_name = payload.full_name.strip()
    patient.nir = new_nir
    patient.age = payload.age
    patient.gender = payload.gender
    patient.blood_group = payload.blood_group
    patient.phone = payload.phone
    patient.email = payload.email.strip().lower() if payload.email else None
    patient.dossier_number = payload.dossier_number.strip() if payload.dossier_number else None

    try:
        db.commit()
        db.refresh(patient)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflit d'unicité lors de la mise à jour du patient",
        )
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error while updating patient")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur base de données lors de la mise à jour du patient",
        )
    return patient


@router.patch("/{patient_id}", response_model=PatientResponse)
def patch_patient(
    patient_id: str,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = patients_for_user(db, current_user).filter(Patient.id == patient_id).first()
    ensure_patient_access(patient, current_user)

    data = payload.model_dump(exclude_unset=True)
    if "nir" in data and data["nir"]:
        data["nir"] = data["nir"].strip()
        if data["nir"] != patient.nir:
            existing = db.query(Patient).filter(Patient.nir == data["nir"]).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=_nir_conflict_detail(existing, current_user),
                )
    if "full_name" in data and data["full_name"]:
        data["full_name"] = data["full_name"].strip()
    if "email" in data and data["email"]:
        data["email"] = data["email"].strip().lower()

    for key, value in data.items():
        setattr(patient, key, value)

    try:
        db.commit()
        db.refresh(patient)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflit d'unicité lors de la mise à jour du patient",
        )
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error while patching patient")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur base de données lors de la mise à jour du patient",
        )
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = patients_for_user(db, current_user).filter(Patient.id == patient_id).first()
    ensure_patient_access(patient, current_user)

    db.delete(patient)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error while deleting patient")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur base de données lors de la suppression du patient",
        )
    return None
