from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


# Explicit workflow statuses shared by backend and frontend
CONSULTATION_STATUSES = (
    "draft",
    "transcribing",
    "transcribed",
    "analyzed",
    "coded",
    "validated",
    "transmitting",
    "transmitted",
    "failed",
)


class Consultation(Base):
    __tablename__ = "consultations"
    __table_args__ = {"extend_existing": True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String, nullable=True)
    transcription = Column(Text)
    structured_data = Column(Text)  # JSON: extracted entities
    coding_results = Column(Text)  # JSON: coding matches
    status = Column(String, default="draft", nullable=False, index=True)
    validation_status = Column(String, default="pending", nullable=False)
    transmission_status = Column(String, default="pending", nullable=False)
    pdf_status = Column(String, default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=True,
    )
    transcribed_at = Column(DateTime, nullable=True)
    analyzed_at = Column(DateTime, nullable=True)
    coded_at = Column(DateTime, nullable=True)
    validated_at = Column(DateTime, nullable=True)
    transmitted_at = Column(DateTime, nullable=True)
    transmission_id = Column(String, nullable=True, index=True)

    patient = relationship("Patient", back_populates="consultations")
    author = relationship("User", foreign_keys=[created_by])
