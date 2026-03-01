"""
PDF Generator Module - Professionele factuur PDFs
Met moderne, clean design gebaseerd op Nederlandse facturatiestandaarden
"""
import io
from datetime import datetime
from typing import Dict, Any, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.pdfgen import canvas


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
    Genereer professionele factuur PDF met moderne, clean design
    
    Design kenmerken:
    - Groene accent kleur header strip
    - Bedrijfslogo rechts bovenaan met adresgegevens
    - Klantgegevens links
    - Duidelijke factuurgegevens met labels
    - Professionele regelitems tabel
    - BTW breakdown
    - Totaal sectie prominent weergegeven
    """
    buffer = io.BytesIO()
    
    # Get template settings with defaults
    settings = template_settings or {}
    
    # Brand kleuren - groen accent zoals in referentie
    accent_color = settings.get('factuur_primaire_kleur', '#22c55e')  # Groene accent
    text_dark = '#1e293b'  # Donkere tekst
    text_light = '#64748b'  # Lichte tekst
    
    # Setup document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=10*mm,
        bottomMargin=15*mm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    company_info_style = ParagraphStyle(
        'CompanyInfo',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor(text_light),
        leading=11
    )
    
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Normal'],
        fontSize=24,
        textColor=colors.HexColor(text_dark),
        fontName='Helvetica-Bold',
        spaceAfter=15
    )
    
    label_style = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor(accent_color),
        fontName='Helvetica-Bold',
        leading=10
    )
    
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor(text_dark),
        leading=13
    )
    
    small_label_style = ParagraphStyle(
        'SmallLabel',
        parent=styles['Normal'],
        fontSize=7,
        textColor=colors.HexColor(text_light),
        leading=9
    )
    
    client_name_style = ParagraphStyle(
        'ClientName',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor(text_dark),
        fontName='Helvetica-Bold',
        leading=13
    )
    
    client_info_style = ParagraphStyle(
        'ClientInfo',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor(text_dark),
        leading=12
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor(text_light),
        fontName='Helvetica-Bold',
        leading=10
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor(text_dark),
        leading=12
    )
    
    total_label_style = ParagraphStyle(
        'TotalLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor(text_light),
        leading=12
    )
    
    # Build content
    content = []
    
    # === GROENE HEADER STRIP ===
    # Simuleren met een gekleurde tabel
    header_strip = Table([['']], colWidths=[180*mm], rowHeights=[3*mm])
    header_strip.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(accent_color)),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    content.append(header_strip)
    content.append(Spacer(1, 8*mm))
    
    # === HEADER: KLANT LINKS, BEDRIJF RECHTS ===
    bedrijfsnaam = bedrijf.get('bedrijfsnaam', 'Mijn Bedrijf')
    
    # Bedrijfsgegevens rechts
    bedrijf_info_lines = []
    if bedrijf.get('adres'):
        bedrijf_info_lines.append(bedrijf['adres'])
    if bedrijf.get('postcode') and bedrijf.get('plaats'):
        bedrijf_info_lines.append(f"{bedrijf.get('postcode', '')} {bedrijf.get('plaats', '')}")
    elif bedrijf.get('plaats'):
        bedrijf_info_lines.append(bedrijf['plaats'])
    
    bedrijf_info_lines.append('')  # Lege regel
    
    if bedrijf.get('kvk_nummer'):
        bedrijf_info_lines.append(f"KvK nr: {bedrijf['kvk_nummer']}")
    if bedrijf.get('btw_nummer'):
        bedrijf_info_lines.append(f"BTW nr: {bedrijf['btw_nummer']}")
    
    bedrijf_info_lines.append('')  # Lege regel
    
    if bedrijf.get('bank_naam') and bedrijf.get('bank_rekening'):
        bedrijf_info_lines.append(f"Bank: {bedrijf['bank_naam']}")
        bedrijf_info_lines.append(f"IBAN: {bedrijf['bank_rekening']}")
    
    bedrijf_info_lines.append('')  # Lege regel
    
    if bedrijf.get('telefoon'):
        bedrijf_info_lines.append(f"Tel: {bedrijf['telefoon']}")
    if bedrijf.get('email'):
        bedrijf_info_lines.append(f"Email: {bedrijf['email']}")
    if bedrijf.get('website'):
        bedrijf_info_lines.append(bedrijf['website'])
    
    # Klantgegevens links
    klant_naam = debiteur.get('naam') if debiteur else factuur.get('debiteur_naam', '')
    klant_adres = debiteur.get('adres', '') if debiteur else ''
    klant_postcode = debiteur.get('postcode', '') if debiteur else ''
    klant_plaats = debiteur.get('plaats', '') if debiteur else ''
    
    klant_info_lines = [f"Aan: {klant_naam}"]
    if klant_adres:
        klant_info_lines.append(klant_adres)
    if klant_postcode and klant_plaats:
        klant_info_lines.append(f"{klant_postcode} {klant_plaats}")
    elif klant_plaats:
        klant_info_lines.append(klant_plaats)
    
    # Header tabel
    header_data = [[
        # Links: Klantgegevens (later ingevuld)
        '',
        # Rechts: Logo en bedrijfsgegevens
        Paragraph(f"<font color='{accent_color}' size='14'><b>{bedrijfsnaam}</b></font>", styles['Normal'])
    ]]
    
    header_table = Table(header_data, colWidths=[100*mm, 80*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    content.append(header_table)
    
    # Bedrijfsinfo rechts uitgelijnd
    bedrijf_info_text = '<br/>'.join(bedrijf_info_lines)
    bedrijf_info_table = Table([['', Paragraph(bedrijf_info_text, company_info_style)]], 
                                colWidths=[100*mm, 80*mm])
    bedrijf_info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    content.append(bedrijf_info_table)
    
    content.append(Spacer(1, 10*mm))
    
    # === FACTUUR TITEL ===
    content.append(Paragraph("Factuur", title_style))
    
    # === FACTUUR INFO & KLANT INFO ===
    factuurnummer = factuur.get('factuurnummer', 'CONCEPT')
    factuurdatum = format_date(factuur.get('factuurdatum'))
    vervaldatum = format_date(factuur.get('vervaldatum'))
    referentie = factuur.get('referentie', '')
    valuta = factuur.get('valuta', 'SRD')
    
    # Links: Klantgegevens, Rechts: Factuurdetails
    klant_content = []
    klant_content.append(Paragraph("Aan:", small_label_style))
    klant_content.append(Paragraph(klant_naam or '-', client_name_style))
    if klant_adres:
        klant_content.append(Paragraph(klant_adres, client_info_style))
    if klant_postcode or klant_plaats:
        klant_content.append(Paragraph(f"{klant_postcode} {klant_plaats}".strip(), client_info_style))
    
    # Factuurdetails rechts
    details_data = [
        [Paragraph("Factuurnummer", label_style), Paragraph(factuurnummer, value_style)],
        [Paragraph("", styles['Normal']), Paragraph("", styles['Normal'])],
        [Paragraph("DATUM", small_label_style), Paragraph("Factuurdatum", small_label_style)],
        [Paragraph("", styles['Normal']), Paragraph(factuurdatum, value_style)],
        [Paragraph("", styles['Normal']), Paragraph("", styles['Normal'])],
        [Paragraph("", styles['Normal']), Paragraph("Vervaldatum", small_label_style)],
        [Paragraph("", styles['Normal']), Paragraph(vervaldatum, value_style)],
    ]
    
    if referentie:
        details_data.append([Paragraph("", styles['Normal']), Paragraph("", styles['Normal'])])
        details_data.append([Paragraph("", styles['Normal']), Paragraph("Uw referentie", small_label_style)])
        details_data.append([Paragraph("", styles['Normal']), Paragraph(referentie, value_style)])
    
    details_table = Table(details_data, colWidths=[30*mm, 50*mm])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    
    # Bouw klant info als losse paragraphs
    info_left = Paragraph('<br/>'.join([
        f"<font color='{text_light}' size='7'>Aan:</font>",
        f"<font color='{text_dark}' size='10'><b>{klant_naam or '-'}</b></font>",
        f"<font color='{text_dark}' size='9'>{klant_adres}</font>" if klant_adres else '',
        f"<font color='{text_dark}' size='9'>{klant_postcode} {klant_plaats}</font>" if klant_postcode or klant_plaats else ''
    ]), styles['Normal'])
    
    main_info_table = Table([[info_left, details_table]], colWidths=[100*mm, 80*mm])
    main_info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    content.append(main_info_table)
    
    content.append(Spacer(1, 10*mm))
    
    # === FACTUURREGELS TABEL ===
    regels = factuur.get('regels', [])
    
    # Header met groene accent
    table_header = [
        Paragraph("OMSCHRIJVING", table_header_style),
        Paragraph("AANTAL", ParagraphStyle('RightHeader', parent=table_header_style, alignment=TA_RIGHT)),
        Paragraph("STUKSPRIJS", ParagraphStyle('RightHeader', parent=table_header_style, alignment=TA_RIGHT)),
        Paragraph("BTW", ParagraphStyle('RightHeader', parent=table_header_style, alignment=TA_RIGHT)),
        Paragraph("TOTAAL", ParagraphStyle('RightHeader', parent=table_header_style, alignment=TA_RIGHT)),
    ]
    
    regels_data = [table_header]
    
    # Factuurregels
    for regel in regels:
        omschrijving = regel.get('omschrijving', regel.get('artikel_naam', 'Product/Dienst'))
        aantal = regel.get('aantal', 1)
        prijs = regel.get('eenheidsprijs', 0)
        btw_perc = regel.get('btw_percentage', 0)
        bedrag = regel.get('bedrag_incl', regel.get('bedrag_excl', aantal * prijs))
        
        regels_data.append([
            Paragraph(omschrijving, table_cell_style),
            Paragraph(str(aantal), ParagraphStyle('RightCell', parent=table_cell_style, alignment=TA_RIGHT)),
            Paragraph(format_currency(prijs, valuta), ParagraphStyle('RightCell', parent=table_cell_style, alignment=TA_RIGHT)),
            Paragraph(f"{btw_perc}%", ParagraphStyle('RightCell', parent=table_cell_style, alignment=TA_RIGHT)),
            Paragraph(format_currency(bedrag, valuta), ParagraphStyle('RightCell', parent=table_cell_style, alignment=TA_RIGHT)),
        ])
    
    # Tabel styling
    regels_table = Table(regels_data, colWidths=[70*mm, 22*mm, 30*mm, 20*mm, 38*mm])
    
    table_style_commands = [
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.white),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor(text_light)),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor(accent_color)),
        
        # Body styling
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor(text_dark)),
        
        # Alternerende rijen
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        
        # Padding
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        
        # Alignment
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        
        # Lijnen tussen rijen
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, colors.HexColor('#e2e8f0')),
    ]
    
    regels_table.setStyle(TableStyle(table_style_commands))
    content.append(regels_table)
    
    content.append(Spacer(1, 8*mm))
    
    # === BTW BREAKDOWN ===
    # Verzamel BTW per percentage
    btw_breakdown = {}
    for regel in regels:
        btw_perc = regel.get('btw_percentage', 0)
        bedrag_excl = regel.get('bedrag_excl', regel.get('aantal', 1) * regel.get('eenheidsprijs', 0))
        btw_bedrag = bedrag_excl * (btw_perc / 100)
        
        if btw_perc not in btw_breakdown:
            btw_breakdown[btw_perc] = {'over': 0, 'bedrag': 0}
        btw_breakdown[btw_perc]['over'] += bedrag_excl
        btw_breakdown[btw_perc]['bedrag'] += btw_bedrag
    
    # BTW tabel
    btw_header = [
        Paragraph("BTW%", small_label_style),
        Paragraph("OVER", ParagraphStyle('Right', parent=small_label_style, alignment=TA_RIGHT)),
        Paragraph("BEDRAG", ParagraphStyle('Right', parent=small_label_style, alignment=TA_RIGHT)),
    ]
    
    btw_data = [btw_header]
    for perc in sorted(btw_breakdown.keys()):
        btw_data.append([
            Paragraph(f"{perc}%", table_cell_style),
            Paragraph(format_currency(btw_breakdown[perc]['over'], valuta), 
                     ParagraphStyle('Right', parent=table_cell_style, alignment=TA_RIGHT)),
            Paragraph(format_currency(btw_breakdown[perc]['bedrag'], valuta), 
                     ParagraphStyle('Right', parent=table_cell_style, alignment=TA_RIGHT)),
        ])
    
    btw_table = Table(btw_data, colWidths=[25*mm, 40*mm, 40*mm])
    btw_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    # === TOTALEN ===
    subtotaal = factuur.get('subtotaal', 0)
    btw_bedrag = factuur.get('btw_bedrag', 0)
    totaal = factuur.get('totaal_incl_btw', subtotaal + btw_bedrag)
    
    totaal_data = [
        ['', Paragraph("TOTAAL EXCL BTW", total_label_style), 
         Paragraph(format_currency(subtotaal, valuta), ParagraphStyle('Right', parent=value_style, alignment=TA_RIGHT))],
    ]
    
    totaal_table = Table(totaal_data, colWidths=[75*mm, 50*mm, 55*mm])
    totaal_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    # BTW en Totalen combineren
    btw_totaal_layout = Table([
        [btw_table, totaal_table]
    ], colWidths=[105*mm, 75*mm])
    btw_totaal_layout.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    content.append(btw_totaal_layout)
    
    content.append(Spacer(1, 3*mm))
    
    # Groot totaal
    grand_total_data = [
        ['', Paragraph("<b>TOTAAL</b>", ParagraphStyle('TotalLabel', parent=styles['Normal'], fontSize=12, alignment=TA_RIGHT)), 
         Paragraph(f"<b>{format_currency(totaal, valuta)}</b>", ParagraphStyle('TotalValue', parent=styles['Normal'], fontSize=14, alignment=TA_RIGHT, textColor=colors.HexColor(accent_color)))]
    ]
    
    grand_total_table = Table(grand_total_data, colWidths=[75*mm, 50*mm, 55*mm])
    grand_total_table.setStyle(TableStyle([
        ('LINEABOVE', (1, 0), (-1, 0), 1.5, colors.HexColor(accent_color)),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    content.append(grand_total_table)
    
    content.append(Spacer(1, 10*mm))
    
    # === BETALINGSGEGEVENS ===
    betaling_style = ParagraphStyle(
        'Betaling',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor(text_light),
        leading=11
    )
    
    betaling_text = f"Gelieve het bedrag van {format_currency(totaal, valuta)} over te maken onder vermelding van factuurnummer {factuurnummer}."
    content.append(Paragraph(betaling_text, betaling_style))
    
    content.append(Spacer(1, 5*mm))
    
    # === OPMERKINGEN ===
    if factuur.get('opmerkingen'):
        content.append(Spacer(1, 5*mm))
        content.append(Paragraph("<b>Opmerkingen:</b>", small_label_style))
        content.append(Paragraph(factuur['opmerkingen'], betaling_style))
    
    # === VOORWAARDEN (Footer) ===
    footer_text = settings.get('factuur_voorwaarden', '') or bedrijf.get('factuur_voorwaarden', '')
    if footer_text:
        content.append(Spacer(1, 10*mm))
        # Groene lijn
        footer_line = Table([['']], colWidths=[180*mm], rowHeights=[1*mm])
        footer_line.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(accent_color)),
        ]))
        content.append(footer_line)
        content.append(Spacer(1, 3*mm))
        
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=7,
            textColor=colors.HexColor(text_light),
            leading=9
        )
        for line in footer_text.split('\n'):
            content.append(Paragraph(line, footer_style))
    
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
