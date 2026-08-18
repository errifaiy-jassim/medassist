import logging
from typing import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _add_column_if_missing(
    table: str,
    column: str,
    ddl_type: str,
    *,
    server_default: str | None = None,
) -> None:
    """Add a missing column. Optional server_default protects existing rows on upgrade."""
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns(table)}
    if column in existing:
        return
    ddl = f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"
    if server_default is not None:
        ddl = f"{ddl} DEFAULT {server_default}"
    with engine.begin() as conn:
        conn.execute(text(ddl))
    logger.info("Added missing column %s.%s", table, column)


def _ensure_fk_if_missing(
    table: str,
    column: str,
    ref_table: str,
    ref_column: str,
    constraint_name: str,
) -> None:
    """Best-effort FK for upgraded DBs (PostgreSQL). SQLite ALTER cannot add FKs safely."""
    if engine.dialect.name != "postgresql":
        return
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns(table)}
    if column not in columns:
        return
    existing_fks = inspector.get_foreign_keys(table)
    for fk in existing_fks:
        if column in (fk.get("constrained_columns") or []) and fk.get("referred_table") == ref_table:
            return
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    f"ALTER TABLE {table} "
                    f"ADD CONSTRAINT {constraint_name} "
                    f"FOREIGN KEY ({column}) REFERENCES {ref_table}({ref_column})"
                )
            )
        logger.info("Added missing FK %s on %s.%s", constraint_name, table, column)
    except Exception:
        # Do not fail startup if legacy rows prevent FK creation; log for ops follow-up.
        logger.exception(
            "Could not add FK %s on %s.%s — verify legacy data and add manually if needed",
            constraint_name,
            table,
            column,
        )


def _backfill_legacy_nulls() -> None:
    """Fill NULLs from older ALTER upgrades so non-nullable model fields stay valid."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    statements: list[str] = []

    if "users" in tables:
        user_cols = {c["name"] for c in inspector.get_columns("users")}
        if "role" in user_cols:
            statements.append("UPDATE users SET role = 'doctor' WHERE role IS NULL")

    if "consultations" in tables:
        cons_cols = {c["name"] for c in inspector.get_columns("consultations")}
        if "status" in cons_cols:
            statements.append(
                "UPDATE consultations SET status = 'draft' WHERE status IS NULL"
            )
        if "validation_status" in cons_cols:
            statements.append(
                "UPDATE consultations SET validation_status = 'pending' "
                "WHERE validation_status IS NULL"
            )
        if "transmission_status" in cons_cols:
            statements.append(
                "UPDATE consultations SET transmission_status = 'pending' "
                "WHERE transmission_status IS NULL"
            )
        if "pdf_status" in cons_cols:
            statements.append(
                "UPDATE consultations SET pdf_status = 'pending' WHERE pdf_status IS NULL"
            )

    if not statements:
        return

    with engine.begin() as conn:
        for sql in statements:
            conn.execute(text(sql))
    logger.info("Backfilled legacy NULL workflow/role columns where needed")


def ensure_schema() -> None:
    """Create tables and add newly introduced columns on existing databases."""
    import app.models  # noqa: F401 — register metadata

    Base.metadata.create_all(bind=engine)

    # Consultation workflow columns (create_all does not ALTER existing tables).
    # Defaults keep existing rows valid for non-nullable model fields.
    _add_column_if_missing("consultations", "coding_results", "TEXT")
    _add_column_if_missing(
        "consultations", "validation_status", "VARCHAR(50)", server_default="'pending'"
    )
    _add_column_if_missing(
        "consultations",
        "transmission_status",
        "VARCHAR(50)",
        server_default="'pending'",
    )
    _add_column_if_missing(
        "consultations", "pdf_status", "VARCHAR(50)", server_default="'pending'"
    )
    _add_column_if_missing("consultations", "updated_at", "TIMESTAMP")
    _add_column_if_missing("consultations", "created_by", "VARCHAR")
    _add_column_if_missing("consultations", "validated_at", "TIMESTAMP")
    _add_column_if_missing("consultations", "transmitted_at", "TIMESTAMP")
    _add_column_if_missing("consultations", "transcribed_at", "TIMESTAMP")
    _add_column_if_missing("consultations", "analyzed_at", "TIMESTAMP")
    _add_column_if_missing("consultations", "coded_at", "TIMESTAMP")
    _add_column_if_missing("consultations", "transmission_id", "VARCHAR")

    _add_column_if_missing("patients", "created_by", "VARCHAR")

    _add_column_if_missing("users", "role", "VARCHAR(50)", server_default="'doctor'")

    _backfill_legacy_nulls()

    # Strengthen upgraded Postgres schemas to match model FKs where possible.
    _ensure_fk_if_missing(
        "patients", "created_by", "users", "id", "fk_patients_created_by_users"
    )
    _ensure_fk_if_missing(
        "consultations", "created_by", "users", "id", "fk_consultations_created_by_users"
    )
    _ensure_fk_if_missing(
        "consultations",
        "patient_id",
        "patients",
        "id",
        "fk_consultations_patient_id_patients",
    )


def check_database_connection() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.exception("Database connectivity check failed: %s", exc)
        return False


def init_db() -> None:
    ensure_schema()
    _seed_admin_user()
    _backfill_ownership()


def _seed_admin_user() -> None:
    from app.core.security import hash_password
    from app.models.user import User

    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return
        if settings.is_production and settings.ADMIN_PASSWORD in {
            "ChangeMeAdmin123!",
            "admin",
            "password",
            "changeme",
        }:
            raise RuntimeError("Refusing to seed admin with a default password in production")
        admin = User(
            inpe=settings.ADMIN_INPE,
            email=settings.ADMIN_EMAIL.lower(),
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            full_name=settings.ADMIN_FULL_NAME,
            specialty=settings.ADMIN_SPECIALTY,
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        logger.info("Bootstrap admin user created: %s", settings.ADMIN_EMAIL)
    except Exception:
        db.rollback()
        logger.exception("Failed to seed admin user")
        raise
    finally:
        db.close()


def _backfill_ownership() -> None:
    """Assign orphan clinical rows to the bootstrap admin so access checks are enforceable."""
    from app.models.consultation import Consultation
    from app.models.patient import Patient
    from app.models.user import User

    db = SessionLocal()
    try:
        admin = (
            db.query(User)
            .filter(User.role == "admin")
            .order_by(User.email.asc())
            .first()
        )
        if not admin:
            return
        orphan_patients = (
            db.query(Patient)
            .filter(Patient.created_by.is_(None))
            .update({Patient.created_by: admin.id}, synchronize_session=False)
        )
        orphan_consultations = (
            db.query(Consultation)
            .filter(Consultation.created_by.is_(None))
            .update({Consultation.created_by: admin.id}, synchronize_session=False)
        )
        if orphan_patients or orphan_consultations:
            db.commit()
            logger.info(
                "Backfilled ownership: patients=%s consultations=%s -> admin=%s",
                orphan_patients,
                orphan_consultations,
                admin.id,
            )
    except Exception:
        db.rollback()
        logger.exception("Failed to backfill ownership columns")
    finally:
        db.close()
