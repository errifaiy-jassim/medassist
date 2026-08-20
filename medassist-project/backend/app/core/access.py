"""Authorization helpers — ownership scoping for clinical resources."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.consultation import Consultation
from app.models.patient import Patient
from app.models.user import User


def is_admin(user: User) -> bool:
    return (user.role or "").lower() == "admin"


def can_access_consultation(consultation: Consultation, user: User) -> bool:
    if is_admin(user):
        return True
    if not consultation.created_by:
        return False
    return consultation.created_by == user.id


def can_access_patient(patient: Patient, user: User) -> bool:
    if is_admin(user):
        return True
    if not getattr(patient, "created_by", None):
        return False
    return patient.created_by == user.id


def ensure_consultation_access(consultation: Consultation | None, user: User) -> Consultation:
    if not consultation or not can_access_consultation(consultation, user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation introuvable",
        )
    return consultation


def ensure_patient_access(patient: Patient | None, user: User) -> Patient:
    if not patient or not can_access_patient(patient, user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient introuvable",
        )
    return patient


def consultations_for_user(db: Session, user: User):
    query = db.query(Consultation)
    if not is_admin(user):
        query = query.filter(Consultation.created_by == user.id)
    return query


def patients_for_user(db: Session, user: User):
    query = db.query(Patient)
    if not is_admin(user):
        query = query.filter(Patient.created_by == user.id)
    return query
