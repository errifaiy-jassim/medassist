import json
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def _parse_json(value):
    if value is None or value == "":
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def _wrap_text(text: str, width: int):
    text = (text or "").replace("\r", "")
    lines = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = []
        for word in words:
            trial = " ".join(current + [word])
            if len(trial) <= width:
                current.append(word)
            else:
                if current:
                    lines.append(" ".join(current))
                current = [word]
        if current:
            lines.append(" ".join(current))
    return lines


def _fmt_dt(value) -> str:
    if not value:
        return "—"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    return str(value)


def _labels(items, *keys):
    out = []
    for item in items or []:
        if isinstance(item, str) and item.strip():
            out.append(item.strip())
            continue
        if isinstance(item, dict):
            for key in keys:
                raw = item.get(key)
                if isinstance(raw, str) and raw.strip():
                    out.append(raw.strip())
                    break
    return out


class PDFService:
    @staticmethod
    def build_pdf_payload(consultation, patient) -> dict:
        structured = _parse_json(getattr(consultation, "structured_data", None)) or {}
        coding = _parse_json(getattr(consultation, "coding_results", None)) or {}
        if not isinstance(structured, dict):
            structured = {"structured_summary": str(structured)}
        if not isinstance(coding, dict):
            coding = {}

        diagnoses = _labels(
            structured.get("diagnoses") or structured.get("diagnostics"),
            "label",
            "name",
        )
        treatments = _labels(structured.get("treatments"), "label", "name")
        medications = []
        for item in structured.get("medications") or structured.get("prescriptions") or []:
            if isinstance(item, str) and item.strip():
                medications.append(item.strip())
            elif isinstance(item, dict):
                name = item.get("drug_name") or item.get("label") or item.get("name")
                if name:
                    detail = " — ".join(
                        str(x) for x in [name, item.get("dosage"), item.get("frequency")] if x
                    )
                    medications.append(detail)
        examinations = _labels(
            structured.get("examinations") or structured.get("biology"),
            "label",
            "test_name",
            "name",
        )
        symptoms = _labels(structured.get("symptoms"), "label", "name")

        coded = []
        for row in coding.get("diagnostics_icd10") or []:
            if isinstance(row, dict) and row.get("code"):
                coded.append(f"CIM-10 {row.get('code')} — {row.get('label') or row.get('query') or ''}")
        for row in coding.get("prescriptions_gmr") or []:
            if isinstance(row, dict) and row.get("code"):
                coded.append(f"GMR {row.get('code')} — {row.get('label') or row.get('query') or ''}")
        for row in coding.get("biology_nabm") or []:
            if isinstance(row, dict) and row.get("code"):
                coded.append(f"NABM {row.get('code')} — {row.get('label') or row.get('query') or ''}")

        return {
            "patient_name": patient.full_name if patient else "Patient inconnu",
            "patient_nir": patient.nir if patient else None,
            "patient_dossier": patient.dossier_number if patient else None,
            "patient_age": patient.age if patient else None,
            "patient_gender": patient.gender if patient else None,
            "consultation_id": consultation.id,
            "consultation_date": _fmt_dt(consultation.created_at),
            "validated_at": _fmt_dt(consultation.validated_at),
            "status": consultation.status,
            "validation_status": consultation.validation_status,
            "transcription": consultation.transcription or "",
            "structured_summary": structured.get("structured_summary") or "",
            "symptoms": symptoms,
            "diagnoses": diagnoses,
            "treatments": treatments,
            "medications": medications,
            "examinations": examinations,
            "validated_codes": coded,
            "transmission_id": consultation.transmission_id,
            "transmitted_at": _fmt_dt(consultation.transmitted_at),
            "transmission_status": consultation.transmission_status,
        }

    @staticmethod
    def generate_consultation_pdf(consultation_data: dict, output_path: str):
        c = canvas.Canvas(output_path, pagesize=A4)
        width, height = A4
        y = height - 50

        def ensure_space(needed=40):
            nonlocal y
            if y < needed:
                c.showPage()
                c.setFont("Helvetica", 10)
                y = height - 50

        def draw_heading(title: str):
            nonlocal y
            ensure_space(60)
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, y, title)
            y -= 18
            c.setFont("Helvetica", 10)

        def draw_line(text: str):
            nonlocal y
            for line in _wrap_text(str(text), 95):
                ensure_space()
                c.drawString(50, y, line)
                y -= 14

        def draw_list(items, empty_label):
            if not items:
                draw_line(empty_label)
                return
            for item in items:
                draw_line(f"• {item}")

        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y, "Compte-rendu médical — MedAssist")
        y -= 28

        c.setFont("Helvetica", 10)
        draw_line(f"Patient : {consultation_data.get('patient_name') or '—'}")
        draw_line(
            " · ".join(
                part
                for part in [
                    f"NIR : {consultation_data.get('patient_nir') or '—'}",
                    f"Dossier : {consultation_data.get('patient_dossier') or '—'}",
                    f"Âge : {consultation_data.get('patient_age') or '—'}",
                    f"Sexe : {consultation_data.get('patient_gender') or '—'}",
                ]
            )
        )
        draw_line(f"Consultation : {consultation_data.get('consultation_id') or '—'}")
        draw_line(f"Date de consultation : {consultation_data.get('consultation_date') or '—'}")
        draw_line(
            f"Validation : {consultation_data.get('validation_status') or '—'} "
            f"({consultation_data.get('validated_at') or '—'})"
        )
        y -= 8

        draw_heading("Transcription")
        transcription = (consultation_data.get("transcription") or "").strip()
        draw_line(transcription if transcription else "Aucune transcription disponible.")
        y -= 8

        summary = (consultation_data.get("structured_summary") or "").strip()
        if summary:
            draw_heading("Synthèse clinique extraite")
            draw_line(summary)
            y -= 8

        draw_heading("Symptômes")
        draw_list(consultation_data.get("symptoms"), "Aucun symptôme extrait.")
        y -= 6

        draw_heading("Diagnostics")
        draw_list(consultation_data.get("diagnoses"), "Aucun diagnostic extrait.")
        y -= 6

        draw_heading("Traitements")
        draw_list(consultation_data.get("treatments"), "Aucun traitement extrait.")
        y -= 6

        draw_heading("Médicaments / prescriptions")
        draw_list(consultation_data.get("medications"), "Aucune prescription extraite.")
        y -= 6

        draw_heading("Examens")
        draw_list(consultation_data.get("examinations"), "Aucun examen extrait.")
        y -= 6

        draw_heading("Codes médicaux validés / proposés")
        draw_list(
            consultation_data.get("validated_codes"),
            "Aucun code médical disponible.",
        )
        y -= 6

        draw_heading("Transmission SIH")
        tx_status = consultation_data.get("transmission_status") or "pending"
        draw_line(f"Statut : {tx_status}")
        if consultation_data.get("transmission_id"):
            draw_line(f"Identifiant : {consultation_data.get('transmission_id')}")
            draw_line(f"Horodatage : {consultation_data.get('transmitted_at') or '—'}")
        else:
            draw_line("Aucune transmission confirmée.")

        c.save()
        return output_path


pdf_service = PDFService()
