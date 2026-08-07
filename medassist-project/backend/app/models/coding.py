from sqlalchemy import Column, String
from app.core.database import Base
import uuid

class ICD10Code(Base):
    __tablename__ = "icd10_codes"
    __table_args__ = {'extend_existing': True}
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, unique=True, index=True, nullable=False)
    label = Column(String, nullable=False)

class GMRCode(Base):
    __tablename__ = "gmr_codes"
    __table_args__ = {'extend_existing': True}
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, unique=True, index=True, nullable=False)
    label = Column(String, nullable=False)

class NABMCode(Base):
    __tablename__ = "nabm_codes"
    __table_args__ = {'extend_existing': True}
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, unique=True, index=True, nullable=False)
    label = Column(String, nullable=False)