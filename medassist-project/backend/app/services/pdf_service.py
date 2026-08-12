from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

class PDFService:
    @staticmethod
    def generate_consultation_pdf(consultation_data: dict, output_path: str):
        """
        Génère un compte rendu médical en PDF.
        """
        c = canvas.Canvas(output_path, pagesize=letter)
        width, height = letter
        
        # Titre
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, height - 50, "Compte Rendu Médical")
        
        # Contenu
        c.setFont("Helvetica", 12)
        y = height - 80
        
        c.drawString(50, y, f"Résumé: {consultation_data.get('structured_summary', 'N/A')}")
        
        # Sauvegarde
        c.save()
        return output_path

pdf_service = PDFService()