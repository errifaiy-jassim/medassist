import json
import os
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


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


def _fmt_dt(value) -> str:
    if not value:
        return "—"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y à %H:%M")
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


class NumberedCanvas(canvas.Canvas):
    """
    Canvas personnalisé à deux passes pour générer dynamiquement 
    le footer professionnel et la pagination (Page X sur Y).
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # --- HEADER (Pages 2+) ---
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 9)
            self.setFillColor(colors.HexColor("#0D9488"))
            self.drawString(36, 812, "MedAssist")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(88, 812, "— Compte-Rendu Médical de Consultation")
            
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(36, 804, 559, 804)

        # --- FOOTER (Toutes les pages) ---
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 45, 559, 45)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(
            36, 32, "MedAssist IA — Système d'Information Hospitalier | Document Confidentiel - Usage Médical"
        )
        
        page_text = f"Page {self._pageNumber} / {page_count}"
        self.drawRightString(559, 32, page_text)
        
        self.restoreState()


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
            "patient_nir": getattr(patient, "nir", None),
            "patient_dossier": getattr(patient, "dossier_number", None),
            "patient_age": getattr(patient, "age", None),
            "patient_gender": getattr(patient, "gender", None),
            "consultation_id": getattr(consultation, "id", None),
            "consultation_date": _fmt_dt(getattr(consultation, "created_at", None)),
            "validated_at": _fmt_dt(getattr(consultation, "validated_at", None)),
            "status": getattr(consultation, "status", "—"),
            "validation_status": getattr(consultation, "validation_status", "NON VALIDÉE"),
            "transcription": getattr(consultation, "transcription", "") or "",
            "structured_summary": structured.get("structured_summary") or "",
            "symptoms": symptoms,
            "diagnoses": diagnoses,
            "treatments": treatments,
            "medications": medications,
            "examinations": examinations,
            "validated_codes": coded,
            "transmission_id": getattr(consultation, "transmission_id", None),
            "transmitted_at": _fmt_dt(getattr(consultation, "transmitted_at", None)),
            "transmission_status": getattr(consultation, "transmission_status", None),
        }

    @staticmethod
    def generate_consultation_pdf(consultation_data: dict, output_path: str, logo_path: str = None):
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=40,
            bottomMargin=55,
        )

        styles = getSampleStyleSheet()
        
        # Styles personnalisés
        primary_color = colors.HexColor("#0F766E")   # Teal Médical
        dark_neutral = colors.HexColor("#1E293B")    # Slate sombre
        text_muted = colors.HexColor("#475569")      # Slate moyen
        bg_card = colors.HexColor("#F8FAFC")         # Gris léger
        border_color = colors.HexColor("#E2E8F0")

        style_title = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=primary_color,
            alignment=2 # Droite
        )

        style_sec_title = ParagraphStyle(
            "SecTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=primary_color,
            spaceAfter=6
        )

        style_body = ParagraphStyle(
            "BodyTextCustom",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=dark_neutral
        )

        style_muted = ParagraphStyle(
            "MutedTextCustom",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9,
            leading=12,
            textColor=text_muted
        )

        story = []

        # ==========================================
        # 1. HEADER MEDASSIST (AVEC LOGO DU DOSSIER FRONTEND)
        # ==========================================
        if not logo_path:
            # Recherche du fichier logo dans les chemins possibles par rapport au backend
            current_dir = Path(__file__).resolve().parent
            possible_paths = [
                current_dir.parent.parent.parent / "frontend" / "src" / "assets" / "medassist-logo.png",
                current_dir / "assets" / "medassist-logo.png",
                Path("frontend/src/assets/medassist-logo.png"),
                Path("assets/medassist-logo.png"),
            ]
            for p in possible_paths:
                if p.exists():
                    logo_path = str(p)
                    break

        if logo_path and os.path.exists(logo_path):
            img = Image(logo_path, width=40, height=40)
            title_text = Paragraph(
                "<b><font size='16' color='#0F766E'>MedAssist</font></b><br/>"
                "<font size='8' color='#64748B'>Assistant IA de Consultation Médicale</font>",
                styles["Normal"]
            )
            header_left_content = Table([[img, title_text]], colWidths=[48, 212])
            header_left_content.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
        else:
            header_left_content = Paragraph(
                "<b><font size='18' color='#0F766E'>MedAssist</font></b><br/>"
                "<font size='8' color='#64748B'>Assistant IA de Consultation Médicale</font>",
                styles["Normal"]
            )
        
        header_text_right = Paragraph(
            "<b>COMPTE-RENDU DE CONSULTATION</b><br/>"
            f"<font size='8' color='#64748B'>Réf : {consultation_data.get('consultation_id') or '—'}</font>",
            style_title
        )

        header_table = Table(
            [[header_left_content, header_text_right]], 
            colWidths=[260, 263]
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        story.append(header_table)
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=15))

        # ==========================================
        # 2. PATIENT & METADATA CARD
        # ==========================================
        pat_name = consultation_data.get('patient_name') or '—'
        pat_nir = consultation_data.get('patient_nir') or '—'
        pat_dossier = consultation_data.get('patient_dossier') or '—'
        pat_age = f"{consultation_data.get('patient_age')} ans" if consultation_data.get('patient_age') else '—'
        pat_gender = consultation_data.get('patient_gender') or '—'
        
        date_consult = consultation_data.get('consultation_date') or '—'
        val_status = consultation_data.get('validation_status') or '—'
        val_date = consultation_data.get('validated_at') or '—'

        patient_info_html = (
            f"<b>Patient :</b> {pat_name}<br/>"
            f"<b>Dossier :</b> {pat_dossier} &nbsp;|&nbsp; <b>NIR :</b> {pat_nir}<br/>"
            f"<b>Âge / Sexe :</b> {pat_age} ({pat_gender})"
        )

        consult_info_html = (
            f"<b>Date Consultation :</b> {date_consult}<br/>"
            f"<b>Statut Validation :</b> {val_status}<br/>"
            f"<b>Validé le :</b> {val_date}"
        )

        info_table = Table(
            [[
                Paragraph(patient_info_html, style_body),
                Paragraph(consult_info_html, style_body)
            ]],
            colWidths=[270, 253]
        )
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg_card),
            ('BOX', (0, 0), (-1, -1), 0.5, border_color),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        story.append(info_table)
        story.append(Spacer(1, 15))

        # Helper pour construire des cartes de section
        def build_section(title: str, content_elements: list) -> KeepTogether:
            elements = [
                Paragraph(title.upper(), style_sec_title),
                HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6)
            ]
            elements.extend(content_elements)
            
            card = Table([[elements]], colWidths=[523])
            card.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), bg_card),
                ('BOX', (0, 0), (-1, -1), 0.5, border_color),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            return KeepTogether([card, Spacer(1, 12)])

        def build_list_items(items: list, empty_text: str):
            if not items:
                return [Paragraph(empty_text, style_muted)]
            res = []
            for item in items:
                res.append(Paragraph(f"• {item}", style_body))
            return res

        # ==========================================
        # 3. SECTIONS MÉDICALES
        # ==========================================

        # Transcription
        trans = (consultation_data.get("transcription") or "").strip()
        story.append(build_section("Dictée Vocal & Transcription", [
            Paragraph(trans if trans else "Aucune transcription enregistrée.", style_body if trans else style_muted)
        ]))

        # Synthèse Clinique
        summary = (consultation_data.get("structured_summary") or "").strip()
        story.append(build_section("Synthèse Clinique Extraite (IA)", [
            Paragraph(summary if summary else "Aucune synthèse disponible.", style_body if summary else style_muted)
        ]))

        # Symptômes & Diagnostics
        symp_elems = build_list_items(consultation_data.get("symptoms"), "Aucun symptôme relevé.")
        diag_elems = build_list_items(consultation_data.get("diagnoses"), "Aucun diagnostic retenu.")
        
        diag_table = Table([[
            [Paragraph("<b>Symptômes</b>", style_body), Spacer(1, 4)] + symp_elems,
            [Paragraph("<b>Diagnostics</b>", style_body), Spacer(1, 4)] + diag_elems
        ]], colWidths=[245, 258])
        diag_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
        
        story.append(build_section("Évaluation Clinique & Diagnostics", [diag_table]))

        # Traitements & Médicaments / Prescriptions
        treat_elems = build_list_items(consultation_data.get("treatments"), "Aucun traitement spécifié.")
        med_elems = build_list_items(consultation_data.get("medications"), "Aucune prescription médicamenteuse.")
        
        presc_table = Table([[
            [Paragraph("<b>Traitements & Prise en charge</b>", style_body), Spacer(1, 4)] + treat_elems,
            [Paragraph("<b>Prescriptions Médicamenteuses</b>", style_body), Spacer(1, 4)] + med_elems
        ]], colWidths=[245, 258])
        presc_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))

        story.append(build_section("Traitements & Prescriptions", [presc_table]))

        # Examens Biologiques & Imagerie
        exam_elems = build_list_items(consultation_data.get("examinations"), "Aucun examen biologique ou d'imagerie demandé.")
        story.append(build_section("Examens Complémentaires (Biologie / Imagerie)", exam_elems))

        # Codification Médicale
        coded_elems = build_list_items(consultation_data.get("validated_codes"), "Aucune codification associée.")
        story.append(build_section("Codification Médicale Référencée (CIM-10 / GMR / NABM)", coded_elems))

        # Transmission SIH
        tx_status = consultation_data.get("transmission_status") or "Non transmise"
        tx_id = consultation_data.get("transmission_id") or "—"
        tx_at = consultation_data.get("transmitted_at") or "—"
        
        sih_html = (
            f"<b>Statut d'envoi :</b> {tx_status} &nbsp;|&nbsp; "
            f"<b>ID Transmission :</b> {tx_id} &nbsp;|&nbsp; "
            f"<b>Horodatage SIH :</b> {tx_at}"
        )
        story.append(build_section("Transmission Système d'Information Hospitalier (SIH)", [
            Paragraph(sih_html, style_body)
        ]))

        # Génération du document avec la Canvas personnalisée NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        return output_path


pdf_service = PDFService()