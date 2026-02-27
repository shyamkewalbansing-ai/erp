"""
PDF Generator Module - Professionele factuur PDFs
"""
import io
from datetime import datetime
from typing import Dict, Any, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER


def format_currency(amount: float, currency: str = "SRD") -> str:
    """Format bedrag met valuta"""
    symbols = {"SRD": "SRD", "USD": "$", "EUR": "€"}
    symbol = symbols.get(currency, currency)
    formatted = f"{abs(amount):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    prefix = "-" if amount < 0 else ""
    return f"{prefix}{symbol} {formatted}"


def format_date(date_str: str) -> str:
    """Format datum naar Nederlands formaat"""
    if not date_str:
        return "-"
    try:
        dt = datetime.fromisoformat(str(date_str).replace('Z', '+00:00'))
        return dt.strftime("%d-%m-%Y")
    except (ValueError, TypeError):
        return str(date_str)


def generate_invoice_pdf(
    factuur: Dict[str, Any],
    bedrijf: Dict[str, Any],
    debiteur: Optional[Dict[str, Any]] = None,
    template_settings: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Genereer professionele factuur PDF met aanpasbare templates
    
    Args:
        factuur: Factuur data
        bedrijf: Bedrijfsgegevens
        debiteur: Klantgegevens (optioneel, kan ook in factuur zitten)
        template_settings: Template instellingen (kleuren, stijl)
        
    Returns:
        PDF als bytes
    
    Template types:
        - 'standaard': Clean, professional look
        - 'modern': Bold colors, contemporary design
        - 'kleurrijk': Vibrant, colorful design
    """
    buffer = io.BytesIO()
    
    # Get template settings with defaults
    settings = template_settings or {}
    template_type = settings.get('factuur_template', 'standaard')
    footer_text = settings.get('factuur_voorwaarden', '')
    
    # Template-specific color schemes
    if template_type == 'modern':
        # Modern: Bold dark blue with accent
        primary_color = settings.get('factuur_primaire_kleur', '#0f172a')
        secondary_color = settings.get('factuur_secundaire_kleur', '#e2e8f0')
        accent_color = '#3b82f6'  # Blue accent
        header_bg = primary_color
    elif template_type == 'kleurrijk':
        # Kleurrijk: Vibrant colors
        primary_color = settings.get('factuur_primaire_kleur', '#7c3aed')
        secondary_color = settings.get('factuur_secundaire_kleur', '#faf5ff')
        accent_color = '#f59e0b'  # Amber accent
        header_bg = primary_color
    else:
        # Standaard: Classic professional
        primary_color = settings.get('factuur_primaire_kleur', '#1e293b')
        secondary_color = settings.get('factuur_secundaire_kleur', '#f1f5f9')
        accent_color = primary_color
        header_bg = None  # No header background for standard
    
    # Setup document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles using template colors
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=24 if template_type != 'modern' else 28,
        textColor=colors.HexColor(primary_color),
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12 if template_type != 'kleurrijk' else 14,
        textColor=colors.HexColor(accent_color if template_type == 'kleurrijk' else primary_color),
        spaceBefore=15,
        spaceAfter=5
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#334155')
    )
    
    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94a3b8')
    )
    
    # Build content
    content = []
    
    # === HEADER ===
    # Bedrijfsnaam
    bedrijfsnaam = bedrijf.get('bedrijfsnaam', 'Uw Bedrijf')
    content.append(Paragraph(bedrijfsnaam, title_style))
    
    # Bedrijfsadres
    adres_lines = []
    if bedrijf.get('adres'):
        adres_lines.append(bedrijf['adres'])
    if bedrijf.get('plaats'):
        adres_lines.append(bedrijf['plaats'])
    if bedrijf.get('land', 'Suriname') != 'Suriname':
        adres_lines.append(bedrijf['land'])
    if adres_lines:
        content.append(Paragraph(" | ".join(adres_lines), subtitle_style))
    
    # Contact info
    contact_parts = []
    if bedrijf.get('telefoon'):
        contact_parts.append(f"Tel: {bedrijf['telefoon']}")
    if bedrijf.get('email'):
        contact_parts.append(f"Email: {bedrijf['email']}")
    if contact_parts:
        content.append(Paragraph(" | ".join(contact_parts), subtitle_style))
    
    # BTW nummer
    if bedrijf.get('btw_nummer'):
        content.append(Paragraph(f"BTW: {bedrijf['btw_nummer']}", subtitle_style))
    
    content.append(Spacer(1, 15*mm))
    
    # === FACTUUR INFO & KLANT ===
    # Two column layout
    factuurnummer = factuur.get('factuurnummer', 'CONCEPT')
    factuurdatum = format_date(factuur.get('factuurdatum'))
    vervaldatum = format_date(factuur.get('vervaldatum'))
    
    # Klantgegevens
    klant_naam = debiteur.get('naam') if debiteur else factuur.get('debiteur_naam', '')
    klant_adres = debiteur.get('adres', '') if debiteur else ''
    klant_plaats = debiteur.get('plaats', '') if debiteur else ''
    klant_btw = debiteur.get('btw_nummer', '') if debiteur else ''
    
    # Info table
    info_data = [
        [
            Paragraph("<b>FACTUUR AAN:</b>", normal_style),
            Paragraph(f"<b>Factuurnummer:</b> {factuurnummer}", normal_style)
        ],
        [
            Paragraph(klant_naam, normal_style),
            Paragraph(f"<b>Factuurdatum:</b> {factuurdatum}", normal_style)
        ],
        [
            Paragraph(klant_adres, small_style) if klant_adres else Paragraph("", small_style),
            Paragraph(f"<b>Vervaldatum:</b> {vervaldatum}", normal_style)
        ],
        [
            Paragraph(klant_plaats, small_style) if klant_plaats else Paragraph("", small_style),
            Paragraph(f"<b>Valuta:</b> {factuur.get('valuta', 'SRD')}", normal_style)
        ]
    ]
    
    if klant_btw:
        info_data.append([
            Paragraph(f"BTW: {klant_btw}", small_style),
            Paragraph("", normal_style)
        ])
    
    info_table = Table(info_data, colWidths=[90*mm, 80*mm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    content.append(info_table)
    
    content.append(Spacer(1, 10*mm))
    
    # === FACTUURREGELS ===
    content.append(Paragraph("FACTUURREGELS", heading_style))
    
    # Check if any regel has a foto_url to determine if we need the foto column
    regels = factuur.get('regels', [])
    has_fotos = any(regel.get('foto_url') for regel in regels)
    
    # Header row - with or without foto column
    if has_fotos:
        regels_header = [
            Paragraph("<b>Foto</b>", normal_style),
            Paragraph("<b>Omschrijving</b>", normal_style),
            Paragraph("<b>Aantal</b>", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
            Paragraph("<b>Prijs</b>", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
            Paragraph("<b>BTW</b>", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
            Paragraph("<b>Bedrag</b>", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT))
        ]
        col_widths = [15*mm, 55*mm, 20*mm, 30*mm, 20*mm, 30*mm]
    else:
        regels_header = [
            Paragraph("<b>Omschrijving</b>", normal_style),
            Paragraph("<b>Aantal</b>", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
            Paragraph("<b>Prijs</b>", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
            Paragraph("<b>BTW</b>", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
            Paragraph("<b>Bedrag</b>", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT))
        ]
        col_widths = [70*mm, 20*mm, 30*mm, 20*mm, 30*mm]
    
    regels_data = [regels_header]
    valuta = factuur.get('valuta', 'SRD')
    
    # Factuurregels
    for regel in regels:
        omschrijving = regel.get('omschrijving', regel.get('artikel_naam', 'Product/Dienst'))
        aantal = regel.get('aantal', 1)
        prijs = regel.get('eenheidsprijs', 0)
        btw_perc = regel.get('btw_percentage', 0)
        bedrag = regel.get('bedrag_incl', regel.get('bedrag_excl', aantal * prijs))
        foto_url = regel.get('foto_url', '')
        
        # Create row data
        if has_fotos:
            # Try to load product image
            foto_cell = ""
            if foto_url:
                try:
                    import os
                    # Handle local file path
                    if foto_url.startswith('/api/boekhouding/images/'):
                        filename = foto_url.split('/')[-1]
                        local_path = f"/app/backend/uploads/{filename}"
                        if os.path.exists(local_path):
                            foto_cell = Image(local_path, width=12*mm, height=12*mm)
                except Exception:
                    foto_cell = ""
            
            regels_data.append([
                foto_cell,
                Paragraph(omschrijving, normal_style),
                Paragraph(str(aantal), ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
                Paragraph(format_currency(prijs, valuta), ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
                Paragraph(f"{btw_perc}%", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
                Paragraph(format_currency(bedrag, valuta), ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT))
            ])
        else:
            regels_data.append([
                Paragraph(omschrijving, normal_style),
                Paragraph(str(aantal), ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
                Paragraph(format_currency(prijs, valuta), ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
                Paragraph(f"{btw_perc}%", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
                Paragraph(format_currency(bedrag, valuta), ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT))
            ])
    
    # Maak tabel met template-specifieke styling
    regels_table = Table(regels_data, colWidths=col_widths)
    
    # Template-specific table styles
    table_style_commands = [
        # Body defaults
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#334155')),
        # Padding
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        # Alignment
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    
    if template_type == 'modern':
        # Modern: Bold header with dark background
        table_style_commands.extend([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(primary_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor(accent_color)),
            ('LINEBELOW', (0, 1), (-1, -2), 0.5, colors.HexColor('#e2e8f0')),
        ])
    elif template_type == 'kleurrijk':
        # Kleurrijk: Colorful with gradient-like alternating rows
        table_style_commands.extend([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(primary_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor(accent_color)),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor(secondary_color)]),
        ])
    else:
        # Standaard: Classic professional
        table_style_commands.extend([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(secondary_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor(primary_color)),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#e2e8f0')),
            ('LINEBELOW', (0, 1), (-1, -2), 0.5, colors.HexColor(secondary_color)),
        ])
    
    regels_table.setStyle(TableStyle(table_style_commands))
    content.append(regels_table)
    
    content.append(Spacer(1, 5*mm))
    
    # === TOTALEN ===
    subtotaal = factuur.get('subtotaal', 0)
    btw_bedrag = factuur.get('btw_bedrag', 0)
    totaal = factuur.get('totaal_incl_btw', subtotaal + btw_bedrag)
    
    totaal_data = [
        [
            Paragraph("", normal_style),
            Paragraph("<b>Subtotaal:</b>", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
            Paragraph(format_currency(subtotaal, valuta), ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT))
        ],
        [
            Paragraph("", normal_style),
            Paragraph("<b>BTW:</b>", ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)),
            Paragraph(format_currency(btw_bedrag, valuta), ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT))
        ],
        [
            Paragraph("", normal_style),
            Paragraph("<b>TOTAAL:</b>", ParagraphStyle('Right', parent=heading_style, alignment=TA_RIGHT, fontSize=14)),
            Paragraph(f"<b>{format_currency(totaal, valuta)}</b>", ParagraphStyle('Right', parent=heading_style, alignment=TA_RIGHT, fontSize=14))
        ]
    ]
    
    totaal_table = Table(totaal_data, colWidths=[90*mm, 40*mm, 40*mm])
    totaal_table.setStyle(TableStyle([
        ('LINEABOVE', (1, 2), (-1, 2), 1, colors.HexColor('#1e293b')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    content.append(totaal_table)
    
    content.append(Spacer(1, 15*mm))
    
    # === BETALINGSGEGEVENS ===
    content.append(Paragraph("BETALINGSGEGEVENS", heading_style))
    
    betaling_text = []
    if bedrijf.get('bank_naam'):
        betaling_text.append(f"Bank: {bedrijf['bank_naam']}")
    if bedrijf.get('bank_rekening'):
        betaling_text.append(f"Rekeningnummer: {bedrijf['bank_rekening']}")
    betaling_text.append(f"Onder vermelding van: {factuurnummer}")
    
    for line in betaling_text:
        content.append(Paragraph(line, normal_style))
    
    content.append(Spacer(1, 10*mm))
    
    # === OPMERKINGEN ===
    if factuur.get('opmerkingen'):
        content.append(Paragraph("OPMERKINGEN", heading_style))
        content.append(Paragraph(factuur['opmerkingen'], normal_style))
        content.append(Spacer(1, 10*mm))
    
    # === VOORWAARDEN ===
    # Use footer_text from template settings, or fallback to bedrijf settings
    voorwaarden_tekst = footer_text or bedrijf.get('factuur_voorwaarden', '')
    if voorwaarden_tekst:
        content.append(Spacer(1, 10*mm))
        content.append(Paragraph("VOORWAARDEN", heading_style))
        for line in voorwaarden_tekst.split('\n'):
            content.append(Paragraph(line, small_style))
    
    # Build PDF
    doc.build(content)
    
    return buffer.getvalue()


def generate_reminder_pdf(
    herinnering: Dict[str, Any],
    factuur: Dict[str, Any],
    bedrijf: Dict[str, Any],
    debiteur: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Genereer betalingsherinnering PDF
    """
    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#dc2626'),
        spaceAfter=10
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#334155'),
        spaceBefore=5,
        spaceAfter=5
    )
    
    content = []
    
    # Header
    bedrijfsnaam = bedrijf.get('bedrijfsnaam', 'Uw Bedrijf')
    content.append(Paragraph(bedrijfsnaam, styles['Heading2']))
    
    adres = bedrijf.get('adres', '')
    if adres:
        content.append(Paragraph(adres, styles['Normal']))
    
    content.append(Spacer(1, 20*mm))
    
    # Herinnering type
    type_labels = {
        'eerste': 'EERSTE BETALINGSHERINNERING',
        'tweede': 'TWEEDE BETALINGSHERINNERING',
        'aanmaning': 'AANMANING'
    }
    herinnering_type = herinnering.get('type', 'eerste')
    content.append(Paragraph(type_labels.get(herinnering_type, 'BETALINGSHERINNERING'), title_style))
    
    content.append(Spacer(1, 10*mm))
    
    # Aan
    klant_naam = debiteur.get('naam') if debiteur else herinnering.get('debiteur_naam', '')
    content.append(Paragraph(f"Aan: {klant_naam}", normal_style))
    content.append(Paragraph(f"Datum: {format_date(datetime.now().isoformat())}", normal_style))
    
    content.append(Spacer(1, 10*mm))
    
    # Brief tekst
    factuurnummer = herinnering.get('factuurnummer', '')
    openstaand = herinnering.get('openstaand_bedrag', 0)
    valuta = factuur.get('valuta', 'SRD')
    
    content.append(Paragraph("Geachte heer/mevrouw,", normal_style))
    content.append(Spacer(1, 5*mm))
    
    if herinnering_type == 'eerste':
        tekst = """
        Bij controle van onze administratie is ons gebleken dat de betaling van onderstaande factuur 
        nog niet door ons is ontvangen. Wij verzoeken u vriendelijk het openstaande bedrag zo spoedig 
        mogelijk over te maken.
        """
    elif herinnering_type == 'tweede':
        tekst = """
        Ondanks onze eerdere herinnering hebben wij nog geen betaling mogen ontvangen voor onderstaande 
        factuur. Wij verzoeken u dringend het openstaande bedrag binnen 7 dagen te voldoen.
        """
    else:
        tekst = """
        Tot op heden hebben wij, ondanks herhaalde herinneringen, geen betaling mogen ontvangen voor 
        onderstaande factuur. Indien wij binnen 5 dagen geen betaling ontvangen, zien wij ons genoodzaakt 
        verdere incassomaatregelen te nemen. De eventuele kosten hiervan komen voor uw rekening.
        """
    
    content.append(Paragraph(tekst.strip(), normal_style))
    
    content.append(Spacer(1, 10*mm))
    
    # Factuur details
    details_data = [
        ["Factuurnummer:", factuurnummer],
        ["Factuurdatum:", format_date(factuur.get('factuurdatum'))],
        ["Vervaldatum:", format_date(factuur.get('vervaldatum'))],
        ["Openstaand bedrag:", format_currency(openstaand, valuta)]
    ]
    
    details_table = Table(details_data, colWidths=[50*mm, 80*mm])
    details_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    content.append(details_table)
    
    content.append(Spacer(1, 15*mm))
    
    # Betalingsgegevens
    content.append(Paragraph("Gelieve te betalen op:", normal_style))
    if bedrijf.get('bank_naam'):
        content.append(Paragraph(f"Bank: {bedrijf['bank_naam']}", normal_style))
    if bedrijf.get('bank_rekening'):
        content.append(Paragraph(f"Rekeningnummer: {bedrijf['bank_rekening']}", normal_style))
    content.append(Paragraph(f"Onder vermelding van: {factuurnummer}", normal_style))
    
    content.append(Spacer(1, 15*mm))
    
    # Afsluiting
    content.append(Paragraph(
        "Mocht u reeds betaald hebben, dan kunt u deze herinnering als niet verzonden beschouwen.",
        normal_style
    ))
    
    content.append(Spacer(1, 10*mm))
    content.append(Paragraph("Met vriendelijke groet,", normal_style))
    content.append(Spacer(1, 5*mm))
    content.append(Paragraph(bedrijfsnaam, normal_style))
    
    doc.build(content)
    
    return buffer.getvalue()
