#!/usr/bin/env python3
"""
Kiosk Bonprinter Server
=======================
Lokale printserver voor USB bonprinters (ESC/POS).
Draait op localhost:5555 en ontvangt printopdrachten van de kiosk frontend.

Ondersteunde printers:
- Epson TM-T20III / TM-T88VI
- Star TSP143III / TSP654II
- Bixolon SRP-350III / SRP-330II
- Elke ESC/POS compatibele USB bonprinter

Installatie:
    pip install flask flask-cors python-escpos Pillow

Gebruik:
    python3 print_server.py

De server detecteert automatisch aangesloten USB bonprinters.
"""

import os
import sys
import json
import logging
import tempfile
from datetime import datetime

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
except ImportError:
    print("Flask niet gevonden. Installeer met: pip install flask flask-cors")
    sys.exit(1)

# ESC/POS printer support
try:
    from escpos.printer import Usb, Network, Serial
    from escpos.exceptions import USBNotFoundError
    ESCPOS_AVAILABLE = True
except ImportError:
    ESCPOS_AVAILABLE = False
    print("[WAARSCHUWING] python-escpos niet gevonden. Installeer met: pip install python-escpos")

# Optional: HTML to image rendering for rich receipts
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

app = Flask(__name__)
CORS(app, origins=["*"])
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# ============================================================
# PRINTER CONFIGURATIE
# ============================================================
# De server probeert automatisch een USB printer te vinden.
# Als automatische detectie niet werkt, configureer handmatig:

PRINTER_CONFIG = {
    "type": "auto",        # "auto", "usb", "network", "serial"
    # USB (voor Epson, Star, Bixolon):
    "usb_vendor": None,    # bijv. 0x04b8 (Epson)
    "usb_product": None,   # bijv. 0x0202 (TM-T20III)
    # Network:
    "network_host": None,  # bijv. "192.168.1.100"
    "network_port": 9100,
    # Serial:
    "serial_port": None,   # bijv. "/dev/ttyUSB0" of "COM3"
}

# Bekende USB Vendor/Product IDs voor bonprinters
KNOWN_PRINTERS = [
    {"vendor": 0x04b8, "product": 0x0202, "name": "Epson TM-T20III"},
    {"vendor": 0x04b8, "product": 0x0e28, "name": "Epson TM-T88VI"},
    {"vendor": 0x04b8, "product": 0x0e27, "name": "Epson TM-T88V"},
    {"vendor": 0x04b8, "product": 0x0e03, "name": "Epson TM-T20II"},
    {"vendor": 0x0519, "product": 0x0001, "name": "Star TSP143III"},
    {"vendor": 0x0519, "product": 0x0003, "name": "Star TSP654II"},
    {"vendor": 0x1504, "product": 0x0006, "name": "Bixolon SRP-350III"},
    {"vendor": 0x1504, "product": 0x003d, "name": "Bixolon SRP-330II"},
    {"vendor": 0x0dd4, "product": 0x0001, "name": "Custom KUBE"},
    {"vendor": 0x0fe6, "product": 0x811e, "name": "POS-58 (Generic)"},
]

printer_instance = None
printer_name = "Niet verbonden"


def find_usb_printer():
    """Detecteer automatisch een USB bonprinter"""
    global printer_instance, printer_name

    if not ESCPOS_AVAILABLE:
        logging.warning("python-escpos niet beschikbaar")
        return None

    # Probeer bekende printers
    for p in KNOWN_PRINTERS:
        try:
            printer_instance = Usb(p["vendor"], p["product"])
            printer_name = p["name"]
            logging.info(f"Printer gevonden: {p['name']} (VID:{hex(p['vendor'])} PID:{hex(p['product'])})")
            return printer_instance
        except (USBNotFoundError, Exception):
            continue

    # Handmatige configuratie
    if PRINTER_CONFIG["usb_vendor"] and PRINTER_CONFIG["usb_product"]:
        try:
            printer_instance = Usb(PRINTER_CONFIG["usb_vendor"], PRINTER_CONFIG["usb_product"])
            printer_name = f"USB Printer ({hex(PRINTER_CONFIG['usb_vendor'])}:{hex(PRINTER_CONFIG['usb_product'])})"
            logging.info(f"Handmatig geconfigureerde printer gevonden: {printer_name}")
            return printer_instance
        except Exception as e:
            logging.error(f"Handmatige USB printer niet gevonden: {e}")

    logging.warning("Geen USB bonprinter gevonden")
    return None


def find_network_printer():
    """Verbind met een netwerk bonprinter"""
    global printer_instance, printer_name
    if PRINTER_CONFIG["network_host"]:
        try:
            printer_instance = Network(PRINTER_CONFIG["network_host"], port=PRINTER_CONFIG["network_port"])
            printer_name = f"Netwerk Printer ({PRINTER_CONFIG['network_host']})"
            logging.info(f"Netwerk printer verbonden: {printer_name}")
            return printer_instance
        except Exception as e:
            logging.error(f"Netwerk printer niet gevonden: {e}")
    return None


def find_serial_printer():
    """Verbind met een seriële bonprinter"""
    global printer_instance, printer_name
    if PRINTER_CONFIG["serial_port"]:
        try:
            printer_instance = Serial(PRINTER_CONFIG["serial_port"])
            printer_name = f"Serieel ({PRINTER_CONFIG['serial_port']})"
            logging.info(f"Seriële printer verbonden: {printer_name}")
            return printer_instance
        except Exception as e:
            logging.error(f"Seriële printer niet gevonden: {e}")
    return None


def get_printer():
    """Haal de printer op, of probeer opnieuw te verbinden"""
    global printer_instance
    if printer_instance:
        return printer_instance

    if PRINTER_CONFIG["type"] == "auto":
        return find_usb_printer() or find_network_printer() or find_serial_printer()
    elif PRINTER_CONFIG["type"] == "usb":
        return find_usb_printer()
    elif PRINTER_CONFIG["type"] == "network":
        return find_network_printer()
    elif PRINTER_CONFIG["type"] == "serial":
        return find_serial_printer()
    return None


def print_receipt_escpos(data):
    """Print een kassabon via ESC/POS commando's"""
    p = get_printer()
    if not p:
        return False, "Geen printer verbonden"

    try:
        # === HEADER ===
        p.set(align='center', font='a', bold=True, double_height=True, double_width=True)
        p.text(data.get("company_name", "VASTGOED").upper() + "\n")
        p.set(align='center', font='a', bold=False, double_height=False, double_width=False)

        if data.get("address"):
            p.text(data["address"] + "\n")
        if data.get("phone"):
            p.text("Tel: " + data["phone"] + "\n")
        p.text("\n")

        # === KWITANTIE BAR ===
        p.set(align='center', font='a', bold=True, custom_size=True, width=2, height=2)
        p.text("KWITANTIE\n")
        p.set(bold=False, custom_size=False)
        p.text("-" * 32 + "\n")

        # === BON INFO ===
        p.set(align='left')
        p.text(f"Bonnr.  {data.get('receipt_number', '')}\n")
        p.text(f"Datum   {data.get('date', '')}\n")
        p.text(f"Tijd    {data.get('time', '')}\n")
        p.text(f"Huurder {data.get('tenant_name', '')}\n")
        p.text(f"Appt.   {data.get('apartment', '')}\n")
        p.text("-" * 32 + "\n")

        # === BETALINGSREGEL ===
        desc = data.get("payment_type", "Huurbetaling")
        amount = data.get("amount", "0,00")
        p.text(f"1 {desc:<20s} {amount:>8s}\n")
        p.text("\n")

        # === TOTALEN BAR ===
        p.set(align='center', bold=True, custom_size=True, width=2, height=2)
        p.text("TOTALEN\n")
        p.set(bold=False, custom_size=False, align='left')
        p.text("=" * 32 + "\n")

        total = data.get("total", amount)
        p.set(bold=True)
        p.text(f"{'TOTAAL':<20s} SRD {total:>8s}\n")
        p.set(bold=False)
        p.text("=" * 32 + "\n")
        p.text(f"{'Ontvangen':<20s} {total:>11s}\n")
        p.text(f"{'Retour':<20s} {'0,00':>11s}\n")
        p.text("-" * 32 + "\n")
        p.set(bold=True)
        p.text(f"BetaalWijze  {data.get('payment_method', 'Contant')}\n")
        p.set(bold=False)

        # === OPENSTAAND ===
        p.text("-" * 32 + "\n")
        remaining = data.get("remaining_total", "0,00")
        if remaining and remaining != "0,00":
            p.text(f"{'OPENSTAAND':<20s} SRD {remaining:>8s}\n")
        else:
            p.set(align='center', bold=True)
            p.text("*** VOLLEDIG VOLDAAN ***\n")
            p.set(bold=False)

        # === FOOTER ===
        p.text("\n")
        p.set(align='center')
        p.text("Bedankt voor uw betaling\n")
        p.text("en tot ziens!\n")
        p.text("\n\n")

        # Cut paper
        p.cut()

        return True, "Bon succesvol geprint"

    except Exception as e:
        logging.error(f"Print fout: {e}")
        printer_instance = None  # Reset for reconnect
        return False, str(e)


# ============================================================
# API ENDPOINTS
# ============================================================

@app.route('/health', methods=['GET'])
def health():
    """Check of de printserver draait en een printer beschikbaar is"""
    p = get_printer()
    return jsonify({
        "status": "online",
        "printer": printer_name,
        "connected": p is not None,
        "escpos_available": ESCPOS_AVAILABLE,
        "timestamp": datetime.now().isoformat()
    })


@app.route('/print', methods=['POST'])
def print_receipt():
    """Print een kassabon"""
    data = request.json
    if not data:
        return jsonify({"error": "Geen data ontvangen"}), 400

    # Try ESC/POS printing first
    if ESCPOS_AVAILABLE:
        success, message = print_receipt_escpos(data)
        if success:
            logging.info(f"Bon geprint: {data.get('receipt_number', 'onbekend')}")
            return jsonify({"success": True, "message": message, "method": "escpos"})

    return jsonify({"error": "Geen printer beschikbaar", "connected": False}), 503


@app.route('/printers', methods=['GET'])
def list_printers():
    """Lijst alle bekende printer configuraties"""
    return jsonify({
        "known_printers": [{"name": p["name"], "vendor": hex(p["vendor"]), "product": hex(p["product"])} for p in KNOWN_PRINTERS],
        "current_config": PRINTER_CONFIG,
        "connected_printer": printer_name
    })


@app.route('/reconnect', methods=['POST'])
def reconnect():
    """Probeer opnieuw verbinding te maken met de printer"""
    global printer_instance
    printer_instance = None
    p = get_printer()
    return jsonify({
        "success": p is not None,
        "printer": printer_name
    })


@app.route('/test', methods=['POST'])
def test_print():
    """Print een testbon"""
    test_data = {
        "company_name": "TEST PRINT",
        "address": "Teststraat 1, Paramaribo",
        "phone": "+597 000 0000",
        "receipt_number": "TEST-001",
        "date": datetime.now().strftime("%d-%m-%Y"),
        "time": datetime.now().strftime("%H:%M"),
        "tenant_name": "Test Huurder",
        "apartment": "A1 / T001",
        "payment_type": "Huurbetaling",
        "amount": "100,00",
        "total": "100,00",
        "payment_method": "Contant",
        "remaining_total": "900,00"
    }

    if ESCPOS_AVAILABLE:
        success, message = print_receipt_escpos(test_data)
        return jsonify({"success": success, "message": message})

    return jsonify({"error": "python-escpos niet geïnstalleerd"}), 503


if __name__ == '__main__':
    print("""
╔══════════════════════════════════════════╗
║     KIOSK BONPRINTER SERVER v1.0         ║
║                                          ║
║  Luistert op: http://localhost:5555      ║
╚══════════════════════════════════════════╝
    """)

    # Probeer printer te vinden bij opstarten
    if ESCPOS_AVAILABLE:
        p = get_printer()
        if p:
            print(f"  ✓ Printer gevonden: {printer_name}")
        else:
            print("  ✗ Geen printer gevonden")
            print("    Sluit een USB bonprinter aan en herstart")
            print("    Of configureer handmatig in PRINTER_CONFIG")
    else:
        print("  ✗ python-escpos niet geïnstalleerd")
        print("    pip install python-escpos")

    print(f"\n  Endpoints:")
    print(f"    GET  /health     - Status check")
    print(f"    POST /print      - Print kassabon")
    print(f"    GET  /printers   - Bekende printers")
    print(f"    POST /reconnect  - Herverbind printer")
    print(f"    POST /test       - Test print\n")

    app.run(host='0.0.0.0', port=5555, debug=False)
