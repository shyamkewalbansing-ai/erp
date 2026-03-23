#!/usr/bin/env python3
"""
APPARTEMENT KIOSK - LOKALE PRINT SERVER
========================================
Deze applicatie draait op uw kiosk computer en ontvangt
print opdrachten van de browser. Kwitanties worden
automatisch afgedrukt zonder dialoog.

INSTALLATIE:
    pip install flask flask-cors weasyprint

STARTEN:
    python print_server.py

De server draait op: http://localhost:5555
"""

import os
import sys
import json
import tempfile
import subprocess
import platform
from datetime import datetime

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
except ImportError:
    print("=" * 50)
    print("FOUT: Flask niet gevonden!")
    print("Installeer met: pip install flask flask-cors")
    print("=" * 50)
    sys.exit(1)

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from browser

# Configuration
PRINT_SERVER_PORT = 5555
DEFAULT_PRINTER = None  # None = system default printer

def get_default_printer():
    """Get the system default printer name"""
    system = platform.system()
    try:
        if system == "Windows":
            import winreg
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, 
                r"Software\Microsoft\Windows NT\CurrentVersion\Windows")
            printer, _ = winreg.QueryValueEx(key, "Device")
            return printer.split(",")[0]
        elif system == "Linux":
            result = subprocess.run(["lpstat", "-d"], capture_output=True, text=True)
            if result.returncode == 0:
                return result.stdout.split(":")[1].strip()
        elif system == "Darwin":  # macOS
            result = subprocess.run(["lpstat", "-d"], capture_output=True, text=True)
            if result.returncode == 0:
                return result.stdout.split(":")[1].strip()
    except Exception as e:
        print(f"Kon standaard printer niet detecteren: {e}")
    return None

def print_html_windows(html_content, printer_name=None):
    """Print HTML content on Windows"""
    try:
        # Save HTML to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as f:
            f.write(html_content)
            temp_file = f.name
        
        # Use Microsoft Edge or Chrome to print
        # Edge print command
        edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        
        browser_path = None
        if os.path.exists(chrome_path):
            browser_path = chrome_path
        elif os.path.exists(edge_path):
            browser_path = edge_path
        
        if browser_path:
            # Use headless print
            cmd = [
                browser_path,
                "--headless",
                "--disable-gpu",
                f"--print-to-pdf={temp_file}.pdf",
                temp_file
            ]
            subprocess.run(cmd, capture_output=True, timeout=30)
            
            # Print the PDF
            pdf_file = f"{temp_file}.pdf"
            if os.path.exists(pdf_file):
                os.startfile(pdf_file, "print")
                return True
        
        # Fallback: open in default browser and trigger print
        import webbrowser
        webbrowser.open(f"file://{temp_file}")
        return True
        
    except Exception as e:
        print(f"Print fout (Windows): {e}")
        return False

def print_html_linux(html_content, printer_name=None):
    """Print HTML content on Linux"""
    try:
        # Try using wkhtmltopdf if available
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as f:
            f.write(html_content)
            html_file = f.name
        
        pdf_file = html_file.replace('.html', '.pdf')
        
        # Convert HTML to PDF using wkhtmltopdf
        result = subprocess.run(
            ["wkhtmltopdf", "--quiet", html_file, pdf_file],
            capture_output=True,
            timeout=30
        )
        
        if result.returncode == 0 and os.path.exists(pdf_file):
            # Print using lp command
            cmd = ["lp"]
            if printer_name:
                cmd.extend(["-d", printer_name])
            cmd.append(pdf_file)
            
            subprocess.run(cmd, capture_output=True, timeout=30)
            return True
        
        # Fallback: try printing HTML directly
        cmd = ["lp"]
        if printer_name:
            cmd.extend(["-d", printer_name])
        cmd.append(html_file)
        subprocess.run(cmd, capture_output=True, timeout=30)
        return True
        
    except FileNotFoundError:
        print("wkhtmltopdf niet gevonden. Installeer met: sudo apt install wkhtmltopdf")
        return False
    except Exception as e:
        print(f"Print fout (Linux): {e}")
        return False

def print_html(html_content, printer_name=None):
    """Print HTML content to the default or specified printer"""
    system = platform.system()
    
    if system == "Windows":
        return print_html_windows(html_content, printer_name)
    elif system == "Linux":
        return print_html_linux(html_content, printer_name)
    elif system == "Darwin":
        return print_html_linux(html_content, printer_name)  # macOS uses similar commands
    else:
        print(f"Onbekend besturingssysteem: {system}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "online",
        "server": "Appartement Kiosk Print Server",
        "version": "1.0.0",
        "printer": get_default_printer() or "Standaard systeemprinter"
    })

@app.route('/print', methods=['POST', 'OPTIONS'])
def print_receipt():
    """Receive and print a receipt"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.json
        
        if not data:
            return jsonify({"success": False, "error": "Geen data ontvangen"}), 400
        
        html_content = data.get('html', '')
        printer_name = data.get('printer', DEFAULT_PRINTER)
        receipt_number = data.get('receipt_number', 'Onbekend')
        
        if not html_content:
            return jsonify({"success": False, "error": "Geen HTML content"}), 400
        
        # Add basic HTML wrapper if needed
        if '<html' not in html_content.lower():
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Kwitantie {receipt_number}</title>
    <style>
        @page {{ size: A4; margin: 0; }}
        body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; }}
        * {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
    </style>
</head>
<body>
{html_content}
</body>
</html>
"""
        
        print(f"\n{'='*50}")
        print(f"PRINT OPDRACHT ONTVANGEN")
        print(f"Kwitantie: {receipt_number}")
        print(f"Tijd: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*50}")
        
        success = print_html(html_content, printer_name)
        
        if success:
            print(f"✓ Kwitantie {receipt_number} verzonden naar printer")
            return jsonify({
                "success": True,
                "message": f"Kwitantie {receipt_number} wordt afgedrukt",
                "printer": printer_name or get_default_printer()
            })
        else:
            print(f"✗ Printen mislukt voor kwitantie {receipt_number}")
            return jsonify({
                "success": False,
                "error": "Printen mislukt"
            }), 500
            
    except Exception as e:
        print(f"Fout bij printen: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/printers', methods=['GET'])
def list_printers():
    """List available printers"""
    printers = []
    system = platform.system()
    
    try:
        if system == "Windows":
            import winreg
            # This is simplified - in production, use win32print
            printers = ["Standaard Windows Printer"]
        elif system in ["Linux", "Darwin"]:
            result = subprocess.run(["lpstat", "-p"], capture_output=True, text=True)
            if result.returncode == 0:
                for line in result.stdout.split("\n"):
                    if line.startswith("printer"):
                        printer_name = line.split()[1]
                        printers.append(printer_name)
    except Exception as e:
        print(f"Kon printers niet ophalen: {e}")
    
    return jsonify({
        "printers": printers,
        "default": get_default_printer()
    })

def main():
    print("\n" + "=" * 60)
    print("  APPARTEMENT KIOSK - LOKALE PRINT SERVER")
    print("=" * 60)
    print(f"\n  Server URL: http://localhost:{PRINT_SERVER_PORT}")
    print(f"  Standaard printer: {get_default_printer() or 'Systeem standaard'}")
    print(f"\n  Status: ACTIEF - Wacht op print opdrachten...")
    print("\n  Druk Ctrl+C om te stoppen")
    print("=" * 60 + "\n")
    
    app.run(host='127.0.0.1', port=PRINT_SERVER_PORT, debug=False)

if __name__ == '__main__':
    main()
