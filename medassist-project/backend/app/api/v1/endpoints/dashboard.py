import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.consultation import Consultation
from app.models.user import User
from app.schemas.user import UserResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def _activity_payload(consultation: Consultation) -> dict:
    patient_name = (
        consultation.patient.full_name if consultation.patient else "Patient inconnu"
    )
    coding = consultation.coding_results
    has_coding = bool(coding and coding not in ("{}", "[]", "null"))

    if consultation.transmission_status == "sent":
        action = "Consultation validée & transmise"
        status = "green"
        code = consultation.transmission_id or f"#TX-{consultation.id[:8].upper()}"
    elif consultation.transmission_status == "failed" or consultation.status == "failed":
        action = "Échec de transmission SIH"
        status = "amber"
        code = ""
    elif consultation.validation_status == "validated":
        action = "Consultation validée"
        status = "green"
        code = ""
    elif consultation.status == "coded" or has_coding:
        action = "Codification proposée"
        status = "blue"
        code = ""
    elif consultation.status == "analyzed":
        action = "Extraction IA terminée"
        status = "blue"
        code = ""
    elif consultation.transcription:
        action = "Dictée vocale en cours"
        status = "amber"
        code = ""
    else:
        action = "Consultation créée"
        status = "green"
        code = ""

    created = consultation.updated_at or consultation.created_at or datetime.utcnow()
    return {
        "consultation_id": consultation.id,
        "patient": patient_name,
        "patient_id": consultation.patient_id,
        "action": action,
        "time": created.isoformat(),
        "code": code,
        "status": status,
        "consultation_status": consultation.status,
    }


def _for_practitioner(query, user_id: str):
    return query.filter(Consultation.created_by == user_id)


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Real dashboard metrics scoped to the authenticated practitioner."""
    user_id = current_user.id
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    consultations_today = (
        _for_practitioner(db.query(func.count(Consultation.id)), user_id)
        .filter(Consultation.created_at >= today_start)
        .scalar()
        or 0
    )
    consultations_yesterday = (
        _for_practitioner(db.query(func.count(Consultation.id)), user_id)
        .filter(
            Consultation.created_at >= yesterday_start,
            Consultation.created_at < today_start,
        )
        .scalar()
        or 0
    )

    patients_followed = (
        db.query(func.count(distinct(Consultation.patient_id)))
        .filter(Consultation.created_by == user_id)
        .scalar()
        or 0
    )
    patients_followed_before_today = (
        db.query(func.count(distinct(Consultation.patient_id)))
        .filter(
            Consultation.created_by == user_id,
            Consultation.created_at < today_start,
        )
        .scalar()
        or 0
    )

    transmitted = (
        _for_practitioner(db.query(func.count(Consultation.id)), user_id)
        .filter(Consultation.transmission_status == "sent")
        .scalar()
        or 0
    )
    transmission_failed = (
        _for_practitioner(db.query(func.count(Consultation.id)), user_id)
        .filter(Consultation.transmission_status == "failed")
        .scalar()
        or 0
    )
    transmission_eligible = (
        _for_practitioner(db.query(func.count(Consultation.id)), user_id)
        .filter(
            or_(
                Consultation.validation_status == "validated",
                Consultation.transmission_status.in_(["sent", "failed"]),
            )
        )
        .scalar()
        or 0
    )
    transmission_rate = (
        round((transmitted / transmission_eligible) * 100) if transmission_eligible else 0
    )

    transmitted_yesterday = (
        _for_practitioner(db.query(func.count(Consultation.id)), user_id)
        .filter(
            Consultation.transmission_status == "sent",
            Consultation.transmitted_at >= yesterday_start,
            Consultation.transmitted_at < today_start,
        )
        .scalar()
        or 0
    )
    transmitted_today = (
        _for_practitioner(db.query(func.count(Consultation.id)), user_id)
        .filter(
            Consultation.transmission_status == "sent",
            Consultation.transmitted_at >= today_start,
        )
        .scalar()
        or 0
    )

    # Incomplete dictations / consultations still in the pipeline
    pending_dictations = (
        _for_practitioner(db.query(func.count(Consultation.id)), user_id)
        .filter(
            Consultation.validation_status != "validated",
            Consultation.transmission_status != "sent",
            Consultation.status.notin_(["validated", "transmitting", "transmitted"]),
        )
        .scalar()
        or 0
    )
    pending_yesterday = (
        _for_practitioner(db.query(func.count(Consultation.id)), user_id)
        .filter(
            Consultation.created_at >= yesterday_start,
            Consultation.created_at < today_start,
            Consultation.validation_status != "validated",
            Consultation.transmission_status != "sent",
            Consultation.status.notin_(["validated", "transmitting", "transmitted"]),
        )
        .scalar()
        or 0
    )

    recent_rows = (
        _for_practitioner(db.query(Consultation), user_id)
        .options(joinedload(Consultation.patient))
        .order_by(Consultation.created_at.desc())
        .limit(8)
        .all()
    )
    recent_activity = [_activity_payload(row) for row in recent_rows]

    return {
        "practitioner": UserResponse.model_validate(current_user).model_dump(),
        "consultations_today": int(consultations_today),
        "consultations_delta": int(consultations_today - consultations_yesterday),
        "patients_followed": int(patients_followed),
        "patients_delta": int(patients_followed - patients_followed_before_today),
        "transmission_rate": int(transmission_rate),
        "transmission_sent": int(transmitted),
        "transmission_failed": int(transmission_failed),
        "transmission_eligible": int(transmission_eligible),
        "transmission_delta": int(transmitted_today - transmitted_yesterday),
        "pending_dictations": int(pending_dictations),
        "pending_dictations_delta": int(pending_dictations - pending_yesterday),
        "recent_activity": recent_activity,
        "generated_at": now.isoformat(),
    }
