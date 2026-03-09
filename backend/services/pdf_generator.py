"""
PDF Generator Module - Professionele factuur PDFs
Met moderne, clean design gebaseerd op Nederlandse facturatiestandaarden
Inclusief decoratieve diagonale strepen in groen/donkerblauw thema
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


# Brand kleuren
BRAND_GREEN = '#1EB870'  # Primaire groene kleur
BRAND_NAVY = '#1e3a5f'   # Donkerblauwe accent
TEXT_DARK = '#1e293b'
TEXT_LIGHT = '#64748b'


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


class InvoicePDFCanvas(canvas.Canvas):
    """Custom canvas met decoratieve elementen (diagonale strepen)"""
    
    def __init__(self, *args, accent_color=BRAND_GREEN, secondary_color=BRAND_NAVY, **kwargs):
        super().__init__(*args, **kwargs)
        self.accent_color = accent_color
        self.secondary_color = secondary_color
        self.pages = []
    
    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()
    
    def save(self):
        page_count = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self.draw_decorations()
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)
    
    def draw_decorations(self):
        """Teken decoratieve diagonale strepen"""
        page_width, page_height = A4
        
        # Donkerblauwe diagonale streep rechtsboven
        self.setFillColor(colors.HexColor(self.secondary_color))
        # Driehoek rechtsboven
        self.beginPath()
        self.moveTo(page_width - 80*mm, page_height)  # Linker punt boven
        self.lineTo(page_width, page_height)  # Rechter hoek boven
        self.lineTo(page_width, page_height - 40*mm)  # Rechter punt onder
        self.closePath()
        self.fill()
        
        # Groene diagonale streep rechtsonder
        self.setFillColor(colors.HexColor(self.accent_color))
        self.beginPath()
        self.moveTo(page_width - 50*mm, 0)  # Linker punt onder
        self.lineTo(page_width, 0)  # Rechter hoek onder
        self.lineTo(page_width, 30*mm)  # Rechter punt boven
        self.closePath()
        self.fill()


def generate_invoice_pdf(
    factuur: Dict[str, Any],
    bedrijf: Dict[str, Any],
    debiteur: Optional[Dict[str, Any]] = None,
    template_settings: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Genereer professionele factuur PDF met modern design
    
    Design kenmerken:
    - Logo met initialen in groene cirkel
    - Bedrijfsnaam naast logo
    - FACTUUR titel prominent
    - Donkerblauwe diagonale streep rechtsboven
    - Groene diagonale streep rechtsonder
    - Tabel met groene header
    - Betalingsvoorwaarden sectie
    - Totaal met groene achtergrond
    - Handtekening sectie
    """
    buffer = io.BytesIO()
    
    # Get template settings with defaults
    settings = template_settings or {}
    
    # Brand kleuren
    accent_color = settings.get('factuur_primaire_kleur', BRAND_GREEN)
    secondary_color = settings.get('factuur_secundaire_kleur', BRAND_NAVY)
    
    # Setup document met custom canvas
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=20*mm
    )
    
    # Custom canvas builder
    def make_canvas(*args, **kwargs):
        return InvoicePDFCanvas(*args, accent_color=accent_color, secondary_color=secondary_color, **kwargs)
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    company_name_style = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontSize=16,
        textColor=colors.HexColor(TEXT_DARK),
        fontName='Helvetica-Bold',
        leading=20
    )
    
    company_info_style = ParagraphStyle(
        'CompanyInfo',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor(TEXT_LIGHT),
        leading=11
    )
    
    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Normal'],
        fontSize=28,
        textColor=colors.HexColor(TEXT_DARK),
        fontName='Helvetica-Bold',
        spaceAfter=15
    )
    
    section_label_style = ParagraphStyle(
        'SectionLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor(accent_color),
        fontName='Helvetica-Bold',
        leading=12
    )
    
    value_style = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor(TEXT_DARK),
        leading=13
    )
    
    small_label_style = ParagraphStyle(
        'SmallLabel',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor(TEXT_LIGHT),
        fontName='Helvetica-Bold',
        leading=10
    )
    
    client_name_style = ParagraphStyle(
        'ClientName',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor(TEXT_DARK),
        fontName='Helvetica-Bold',
        leading=14
    )
    
    client_info_style = ParagraphStyle(
        'ClientInfo',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor(TEXT_DARK),
        leading=12
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.white,
        fontName='Helvetica-Bold',
        leading=12
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor(TEXT_DARK),
        leading=12
    )
    
    total_label_style = ParagraphStyle(
        'TotalLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor(TEXT_LIGHT),
        leading=12
    )
    
    # Build content
    content = []
    
    # === HEADER: LOGO + BEDRIJFSNAAM ===
    bedrijfsnaam = bedrijf.get('bedrijfsnaam', 'Mijn Bedrijf')
    initialen = ''.join([w[0].upper() for w in bedrijfsnaam.split()[:2]]) or 'FB'
    
    # Logo als cirkel met initialen (gesimuleerd met tabel)
    logo_circle = Table(
        [[Paragraph(f"<font color='white' size='14'><b>{initialen}</b></font>", 
                   ParagraphStyle('Logo', alignment=TA_CENTER))]],
        colWidths=[12*mm],
        rowHeights=[12*mm]
    )
    logo_circle.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(accent_color)),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [6*mm, 6*mm, 6*mm, 6*mm]),
    ]))
    
    header_data = [[
        logo_circle,
        Paragraph(bedrijfsnaam, company_name_style),
        ''  # Placeholder for top-right decoration area
    ]]
    
    header_table = Table(header_data, colWidths=[15*mm, 100*mm, 65*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (1, 0), (1, 0), 5),
    ]))
    content.append(header_table)
    content.append(Spacer(1, 8*mm))
    
    # === FACTUUR TITEL ===
    content.append(Paragraph("FACTUUR", title_style))
    content.append(Spacer(1, 5*mm))
    
    # === FACTUUR INFO: LINKS KLANT, RECHTS FACTUURDETAILS ===
    factuurnummer = factuur.get('factuurnummer', factuur.get('nummer', 'CONCEPT'))
    factuurdatum = format_date(factuur.get('factuurdatum', factuur.get('datum')))
    vervaldatum = format_date(factuur.get('vervaldatum'))
    valuta = factuur.get('valuta', 'SRD')
    
    # Klantgegevens
    klant_naam = debiteur.get('naam') if debiteur else factuur.get('debiteur_naam', '')
    klant_adres = debiteur.get('adres', '') if debiteur else ''
    klant_postcode = debiteur.get('postcode', '') if debiteur else ''
    klant_plaats = debiteur.get('plaats', '') if debiteur else ''
    
    # Links: Factuur Aan
    klant_content = [
        Paragraph("FACTUUR AAN:", section_label_style),
        Spacer(1, 2*mm),
        Paragraph(klant_naam or '-', client_name_style),
    ]
    if klant_adres:
        klant_content.append(Paragraph(klant_adres, client_info_style))
    if klant_postcode or klant_plaats:
        klant_content.append(Paragraph(f"{klant_postcode} {klant_plaats}".strip(), client_info_style))
    
    klant_table = Table([[c] for c in klant_content], colWidths=[90*mm])
    klant_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    
    # Rechts: Factuur nummer en datum
    factuur_details = [
        [Paragraph("FACTUUR NR:", section_label_style), Paragraph(factuurnummer, value_style)],
        [Paragraph("DATUM:", section_label_style), Paragraph(factuurdatum, value_style)],
    ]
    if vervaldatum and vervaldatum != '-':
        factuur_details.append([Paragraph("VERVALDATUM:", section_label_style), Paragraph(vervaldatum, value_style)])
    
    details_table = Table(factuur_details, colWidths=[35*mm, 40*mm])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    
    # Combineer links en rechts
    main_info_table = Table([[klant_table, details_table]], colWidths=[105*mm, 75*mm])
    main_info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    content.append(main_info_table)
    content.append(Spacer(1, 10*mm))
    
    # === FACTUURREGELS TABEL ===
    regels = factuur.get('regels', [])
    
    # Header met groene achtergrond
    table_header = [
        Paragraph("OMSCHRIJVING", table_header_style),
        Paragraph("PRIJS", ParagraphStyle('RightHeader', parent=table_header_style, alignment=TA_RIGHT)),
        Paragraph("AANTAL", ParagraphStyle('RightHeader', parent=table_header_style, alignment=TA_CENTER)),
        Paragraph("BTW", ParagraphStyle('RightHeader', parent=table_header_style, alignment=TA_CENTER)),
        Paragraph("TOTAAL", ParagraphStyle('RightHeader', parent=table_header_style, alignment=TA_RIGHT)),
    ]
    
    regels_data = [table_header]
    
    # Factuurregels
    subtotaal_calc = 0
    btw_calc = 0
    for regel in regels:
        omschrijving = regel.get('omschrijving', regel.get('artikel_naam', 'Product/Dienst'))
        aantal = regel.get('aantal', 1)
        prijs = regel.get('eenheidsprijs', regel.get('prijs', 0))
        btw_perc = regel.get('btw_percentage', 0)
        bedrag_excl = aantal * prijs
        bedrag_btw = bedrag_excl * (btw_perc / 100)
        bedrag_incl = regel.get('bedrag_incl', bedrag_excl + bedrag_btw)
        
        subtotaal_calc += bedrag_excl
        btw_calc += bedrag_btw
        
        regels_data.append([
            Paragraph(omschrijving, table_cell_style),
            Paragraph(format_currency(prijs, valuta), ParagraphStyle('RightCell', parent=table_cell_style, alignment=TA_RIGHT)),
            Paragraph(str(aantal), ParagraphStyle('CenterCell', parent=table_cell_style, alignment=TA_CENTER)),
            Paragraph(f"{btw_perc}%", ParagraphStyle('CenterCell', parent=table_cell_style, alignment=TA_CENTER)),
            Paragraph(format_currency(bedrag_incl, valuta), ParagraphStyle('RightCell', parent=table_cell_style, alignment=TA_RIGHT)),
        ])
    
    # Tabel styling met groene header
    regels_table = Table(regels_data, colWidths=[65*mm, 28*mm, 22*mm, 20*mm, 35*mm])
    
    table_style_commands = [
        # Header styling - groene achtergrond
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(accent_color)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        
        # Body styling
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor(TEXT_DARK)),
        
        # Alternerende rijen
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        
        # Padding
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        
        # Alignment
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        
        # Lijnen
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#e2e8f0')),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e2e8f0')),
    ]
    
    regels_table.setStyle(TableStyle(table_style_commands))
    content.append(regels_table)
    content.append(Spacer(1, 8*mm))
    
    # === BETALINGSVOORWAARDEN EN TOTALEN ===
    subtotaal = factuur.get('subtotaal', subtotaal_calc)
    btw_bedrag = factuur.get('btw_bedrag', btw_calc)
    totaal = factuur.get('totaal_incl_btw', factuur.get('totaal', subtotaal + btw_bedrag))
    
    # Betalingsvoorwaarden links
    betaling_termijn = factuur.get('betalingstermijn', 14)
    betaling_content = [
        Paragraph("BETALINGSVOORWAARDEN:", section_label_style),
        Spacer(1, 2*mm),
        Paragraph(f"Betaling binnen {betaling_termijn} dagen na factuurdatum.", client_info_style),
    ]
    
    betaling_table = Table([[c] for c in betaling_content], colWidths=[80*mm])
    betaling_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    # Totalen rechts
    totaal_rows = [
        [Paragraph("Subtotaal", total_label_style), 
         Paragraph(format_currency(subtotaal, valuta), ParagraphStyle('Right', parent=value_style, alignment=TA_RIGHT))],
        [Paragraph("BTW", total_label_style), 
         Paragraph(format_currency(btw_bedrag, valuta), ParagraphStyle('Right', parent=value_style, alignment=TA_RIGHT))],
    ]
    
    totaal_subtable = Table(totaal_rows, colWidths=[40*mm, 40*mm])
    totaal_subtable.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    
    # Groot totaal met groene achtergrond
    grand_total_cell = Table(
        [[Paragraph(f"<b>TOTAAL</b>", ParagraphStyle('TotalLabel', fontSize=10, textColor=colors.white)),
          Paragraph(f"<b>{format_currency(totaal, valuta)}</b>", ParagraphStyle('TotalValue', fontSize=12, textColor=colors.white, alignment=TA_RIGHT))]],
        colWidths=[40*mm, 40*mm]
    )
    grand_total_cell.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(accent_color)),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    # Totalen kolom
    totaal_column = Table([[totaal_subtable], [grand_total_cell]], colWidths=[80*mm])
    totaal_column.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    # Combineer betalingsvoorwaarden en totalen
    footer_layout = Table([[betaling_table, totaal_column]], colWidths=[100*mm, 80*mm])
    footer_layout.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    content.append(footer_layout)
    
    content.append(Spacer(1, 15*mm))
    
    # === HANDTEKENING SECTIE ===
    # Horizontale lijn
    hr_line = Table([['']], colWidths=[180*mm], rowHeights=[0.5*mm])
    hr_line.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e2e8f0')),
    ]))
    content.append(hr_line)
    content.append(Spacer(1, 5*mm))
    
    signature_data = [[
        Paragraph(bedrijfsnaam, client_name_style),
        '',
        Paragraph("HANDTEKENING", small_label_style)
    ]]
    signature_table = Table(signature_data, colWidths=[70*mm, 60*mm, 50*mm])
    signature_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
    ]))
    content.append(signature_table)
    
    # === OPMERKINGEN ===
    if factuur.get('opmerkingen'):
        content.append(Spacer(1, 8*mm))
        content.append(Paragraph("OPMERKINGEN:", section_label_style))
        content.append(Spacer(1, 2*mm))
        content.append(Paragraph(factuur['opmerkingen'], client_info_style))
    
    # === BEDRIJFSGEGEVENS FOOTER ===
    footer_info = []
    if bedrijf.get('kvk_nummer'):
        footer_info.append(f"KvK: {bedrijf['kvk_nummer']}")
    if bedrijf.get('btw_nummer'):
        footer_info.append(f"BTW: {bedrijf['btw_nummer']}")
    if bedrijf.get('bank_rekening'):
        footer_info.append(f"IBAN: {bedrijf['bank_rekening']}")
    
    if footer_info:
        content.append(Spacer(1, 10*mm))
        footer_text = ' | '.join(footer_info)
        footer_style = ParagraphStyle(
            'FooterInfo',
            parent=styles['Normal'],
            fontSize=7,
            textColor=colors.HexColor(TEXT_LIGHT),
            alignment=TA_CENTER
        )
        content.append(Paragraph(footer_text, footer_style))
    
    # Build PDF met custom canvas
    doc.build(content, canvasmaker=make_canvas)
    
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
