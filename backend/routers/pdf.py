"""
PDF Generation Module - Generate professional PDF invoices
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
from datetime import datetime
from .deps import db, get_current_active_user

router = APIRouter(prefix="/pdf", tags=["PDF"])


def get_currency_symbol(valuta: str) -> str:
    """Get currency symbol for display"""
    symbols = {"SRD": "SRD", "USD": "$", "EUR": "€"}
    return symbols.get(valuta, valuta)


def format_currency(amount: float, valuta: str) -> str:
    """Format amount with currency"""
    symbol = get_currency_symbol(valuta)
    return f"{symbol} {amount:,.2f}"


async def generate_invoice_pdf(factuur: dict, user: dict, debiteur: dict) -> BytesIO:
    """Generate a professional PDF invoice"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#059669'),  # emerald-600
        spaceAfter=20,
        alignment=TA_LEFT
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#6b7280'),  # gray-500
        spaceAfter=4
    )
    
    value_style = ParagraphStyle(
        'CustomValue',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#111827'),  # gray-900
        spaceAfter=8
    )
    
    small_header = ParagraphStyle(
        'SmallHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#6b7280'),
        spaceBefore=12,
        spaceAfter=4
    )
    
    # Build document elements
    elements = []
    
    # ============ HEADER SECTION ============
    # Company name and invoice title
    company_name = user.get('company_name') or user.get('name') or user.get('bedrijfsnaam') or 'Mijn Bedrijf'
    
    header_data = [
        [
            Paragraph(f"<b>{company_name}</b>", ParagraphStyle('Company', fontSize=16, textColor=colors.HexColor('#111827'))),
            Paragraph(f"<b>FACTUUR</b>", ParagraphStyle('InvoiceTitle', fontSize=24, textColor=colors.HexColor('#059669'), alignment=TA_RIGHT))
        ]
    ]
    
    header_table = Table(header_data, colWidths=[10*cm, 7*cm])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # ============ INVOICE INFO & CUSTOMER INFO ============
    # Format dates
    factuurdatum = factuur.get('factuurdatum', '')
    vervaldatum = factuur.get('vervaldatum', '')
    
    # Company address
    company_address = user.get('address') or ''
    company_phone = user.get('phone') or ''
    company_email = user.get('email') or ''
    
    company_info = f"{company_address}"
    if company_phone:
        company_info += f"<br/>Tel: {company_phone}"
    if company_email:
        company_info += f"<br/>{company_email}"
    
    # Customer info
    debiteur_naam = debiteur.get('naam') or debiteur.get('bedrijfsnaam') or factuur.get('debiteur_naam', 'Onbekend')
    debiteur_adres = debiteur.get('adres') or ''
    debiteur_stad = debiteur.get('stad') or ''
    debiteur_email = debiteur.get('email') or ''
    
    customer_address = debiteur_naam
    if debiteur_adres:
        customer_address += f"<br/>{debiteur_adres}"
    if debiteur_stad:
        customer_address += f"<br/>{debiteur_stad}"
    if debiteur_email:
        customer_address += f"<br/>{debiteur_email}"
    
    info_data = [
        [
            Paragraph("<b>Van:</b>", small_header),
            Paragraph("<b>Aan:</b>", small_header),
            Paragraph("<b>Factuur Details:</b>", small_header)
        ],
        [
            Paragraph(company_info or company_name, value_style),
            Paragraph(customer_address, value_style),
            Paragraph(f"""
                <b>Factuurnummer:</b> {factuur.get('factuurnummer', 'N/A')}<br/>
                <b>Factuurdatum:</b> {factuurdatum}<br/>
                <b>Vervaldatum:</b> {vervaldatum}<br/>
                <b>Valuta:</b> {factuur.get('valuta', 'SRD')}
            """, value_style)
        ]
    ]
    
    info_table = Table(info_data, colWidths=[5.5*cm, 5.5*cm, 6*cm])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 1*cm))
    
    # ============ INVOICE LINES TABLE ============
    valuta = factuur.get('valuta', 'SRD')
    
    # Table header
    line_data = [
        [
            Paragraph("<b>Omschrijving</b>", ParagraphStyle('TH', fontSize=10, textColor=colors.white)),
            Paragraph("<b>Aantal</b>", ParagraphStyle('TH', fontSize=10, textColor=colors.white, alignment=TA_CENTER)),
            Paragraph("<b>Prijs</b>", ParagraphStyle('TH', fontSize=10, textColor=colors.white, alignment=TA_RIGHT)),
            Paragraph("<b>BTW</b>", ParagraphStyle('TH', fontSize=10, textColor=colors.white, alignment=TA_CENTER)),
            Paragraph("<b>Totaal</b>", ParagraphStyle('TH', fontSize=10, textColor=colors.white, alignment=TA_RIGHT))
        ]
    ]
    
    # Table rows
    regels = factuur.get('regels', [])
    for regel in regels:
        omschrijving = regel.get('omschrijving', '')
        aantal = regel.get('aantal', 1)
        prijs = regel.get('prijs_per_stuk', 0)
        btw_tarief = regel.get('btw_tarief', '25')
        regel_totaal = regel.get('totaal', aantal * prijs)
        
        line_data.append([
            Paragraph(omschrijving, ParagraphStyle('TD', fontSize=10)),
            Paragraph(str(aantal), ParagraphStyle('TD', fontSize=10, alignment=TA_CENTER)),
            Paragraph(format_currency(prijs, valuta), ParagraphStyle('TD', fontSize=10, alignment=TA_RIGHT)),
            Paragraph(f"{btw_tarief}%", ParagraphStyle('TD', fontSize=10, alignment=TA_CENTER)),
            Paragraph(format_currency(regel_totaal, valuta), ParagraphStyle('TD', fontSize=10, alignment=TA_RIGHT))
        ])
    
    line_table = Table(line_data, colWidths=[7*cm, 2*cm, 3*cm, 2*cm, 3*cm])
    line_table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        
        # Row styling
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#111827')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        
        # Alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        
        # Alignment
        ('ALIGN', (1, 1), (1, -1), 'CENTER'),
        ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),
        ('ALIGN', (4, 1), (4, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # ============ TOTALS SECTION ============
    subtotaal = factuur.get('subtotaal', 0)
    btw_bedrag = factuur.get('btw_bedrag', 0)
    totaal = factuur.get('totaal', 0)
    betaald = factuur.get('betaald_bedrag', 0)
    openstaand = totaal - betaald
    
    totals_data = [
        ['', '', 'Subtotaal:', format_currency(subtotaal, valuta)],
        ['', '', 'BTW:', format_currency(btw_bedrag, valuta)],
        ['', '', 'Totaal:', format_currency(totaal, valuta)],
    ]
    
    if betaald > 0:
        totals_data.append(['', '', 'Betaald:', format_currency(betaald, valuta)])
        totals_data.append(['', '', 'Openstaand:', format_currency(openstaand, valuta)])
    
    totals_table = Table(totals_data, colWidths=[7*cm, 4*cm, 3*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
        ('FONTNAME', (2, -1), (3, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (2, -1), (3, -1), colors.HexColor('#059669')),
        ('LINEABOVE', (2, -1), (3, -1), 1, colors.HexColor('#059669')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 1*cm))
    
    # ============ PAYMENT INFO & NOTES ============
    # Payment status
    status = factuur.get('status', 'concept')
    status_labels = {
        'concept': 'Concept',
        'verstuurd': 'Verstuurd',
        'betaald': 'Betaald',
        'gedeeltelijk_betaald': 'Gedeeltelijk Betaald',
        'vervallen': 'Vervallen'
    }
    status_text = status_labels.get(status, status)
    
    status_style = ParagraphStyle(
        'Status',
        fontSize=12,
        textColor=colors.HexColor('#059669') if status == 'betaald' else colors.HexColor('#f59e0b') if status in ['verstuurd', 'gedeeltelijk_betaald'] else colors.HexColor('#ef4444')
    )
    
    elements.append(Paragraph(f"<b>Status:</b> {status_text}", status_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Notes/remarks
    opmerkingen = factuur.get('opmerkingen')
    if opmerkingen:
        elements.append(Paragraph("<b>Opmerkingen:</b>", small_header))
        elements.append(Paragraph(opmerkingen, value_style))
        elements.append(Spacer(1, 0.5*cm))
    
    # ============ FOOTER ============
    footer_style = ParagraphStyle(
        'Footer',
        fontSize=9,
        textColor=colors.HexColor('#9ca3af'),
        alignment=TA_CENTER,
        spaceBefore=20
    )
    
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph("─" * 60, footer_style))
    elements.append(Paragraph(f"Bedankt voor uw vertrouwen in {company_name}", footer_style))
    elements.append(Paragraph(f"Gegenereerd op {datetime.now().strftime('%d-%m-%Y %H:%M')}", footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer


@router.get("/verkoopfactuur/{factuur_id}")
async def download_verkoopfactuur_pdf(
    factuur_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Download a sales invoice as PDF"""
    user_id = current_user["id"]
    
    # Get invoice
    factuur = await db.boekhouding_verkoopfacturen.find_one(
        {"id": factuur_id, "user_id": user_id},
        {"_id": 0}
    )
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Get debtor info
    debiteur_id = factuur.get('debiteur_id')
    debiteur = await db.boekhouding_debiteuren.find_one(
        {"id": debiteur_id, "user_id": user_id},
        {"_id": 0}
    )
    if not debiteur:
        debiteur = {"naam": factuur.get('debiteur_naam', 'Onbekend')}
    
    # Get user info for company details
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        user = current_user
    
    # Generate PDF
    pdf_buffer = await generate_invoice_pdf(factuur, user, debiteur)
    
    # Return as downloadable file
    filename = f"Factuur_{factuur.get('factuurnummer', factuur_id)}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Type": "application/pdf"
        }
    )


@router.get("/verkoopfactuur/{factuur_id}/preview")
async def preview_verkoopfactuur_pdf(
    factuur_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Preview a sales invoice as PDF (inline display)"""
    user_id = current_user["id"]
    
    # Get invoice
    factuur = await db.boekhouding_verkoopfacturen.find_one(
        {"id": factuur_id, "user_id": user_id},
        {"_id": 0}
    )
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Get debtor info
    debiteur_id = factuur.get('debiteur_id')
    debiteur = await db.boekhouding_debiteuren.find_one(
        {"id": debiteur_id, "user_id": user_id},
        {"_id": 0}
    )
    if not debiteur:
        debiteur = {"naam": factuur.get('debiteur_naam', 'Onbekend')}
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        user = current_user
    
    # Generate PDF
    pdf_buffer = await generate_invoice_pdf(factuur, user, debiteur)
    
    # Return for inline viewing
    filename = f"Factuur_{factuur.get('factuurnummer', factuur_id)}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={filename}",
            "Content-Type": "application/pdf"
        }
    )
