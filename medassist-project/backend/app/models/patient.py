from sqlalchemy import Column, String, DateTime
from app.core.database import Base
import uuid
from datetime import datetime

class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String, nullable=False)
    cin = Column(String, unique=True, index=True)
    birth_date = Column(String)
    gender = Column(String)
    phone = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)