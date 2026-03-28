# Kiosk Setup Handleiding - Automatisch Printen

## 2 MANIEREN OM AUTOMATISCH TE PRINTEN

### Methode 1: Chrome Kiosk Mode (voor dedicated kiosk PC)
- Chrome start in volledig scherm
- Print automatisch naar standaard printer
- Geen print dialoog

### Methode 2: Print Server (voor normale browser)
- Werkt in elke browser (Chrome, Edge, Firefox)
- Kleine applicatie draait op achtergrond
- Print automatisch naar standaard printer

---

# METHODE 1: CHROME KIOSK MODE

## Windows - Snelkoppeling maken

1. **Rechtermuisknop** op bureaublad → **Nieuw** → **Snelkoppeling**
2. Plak dit:
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing "https://kiosk-erp-vastgoed.preview.emergentagent.com/vastgoed"
```
3. Noem het: **Appartement Kiosk**
4. **SLUIT ALLE CHROME VENSTERS** eerst!
5. Dubbelklik op de snelkoppeling

## Linux
```bash
chromium-browser --kiosk --kiosk-printing "https://kiosk-erp-vastgoed.preview.emergentagent.com/vastgoed"
```

## Afsluiten
- **Alt+F4** of **Ctrl+Shift+Q**

---

# METHODE 2: PRINT SERVER (Normale Browser)

## Stap 1: Installeer Python
1. Download van: https://www.python.org/downloads/
2. **BELANGRIJK**: Vink aan "Add Python to PATH"
3. Installeer

## Stap 2: Download bestanden
Download deze bestanden naar uw computer:
- `print_server.py`
- `START_PRINT_SERVER.bat`

## Stap 3: Start de Print Server
1. Dubbelklik op `START_PRINT_SERVER.bat`
2. Laat het venster open (server moet draaien)
3. U ziet: "Server draait op http://localhost:5555"

## Stap 4: Open de Kiosk
1. Open Chrome of Edge
2. Ga naar uw kiosk URL
3. Kwitanties worden nu automatisch afgedrukt!

## Print Server stoppen
- Druk **Ctrl+C** in het server venster
- Of sluit het venster

---

# PRINTER INSTELLEN

## Windows
1. **Instellingen** → **Bluetooth en apparaten** → **Printers**
2. Klik op uw printer
3. Klik **Als standaard instellen**

## Linux
```bash
lpstat -p -d          # Lijst printers
lpoptions -d PRINTER  # Stel standaard in
```

---

# AUTOSTART BIJ OPSTARTEN

## Print Server autostart (Windows)
1. Druk **Win+R**, typ: `shell:startup`
2. Kopieer `START_PRINT_SERVER.bat` naar deze map

## Kiosk autostart (Windows)
1. Druk **Win+R**, typ: `shell:startup`
2. Kopieer de Kiosk snelkoppeling naar deze map

---

# PROBLEMEN OPLOSSEN

## Print server werkt niet
1. Controleer of Python is geïnstalleerd: `python --version`
2. Installeer packages: `pip install flask flask-cors`
3. Controleer of poort 5555 vrij is

## Kiosk mode print niet automatisch
1. Sluit ALLE Chrome vensters
2. Start de kiosk snelkoppeling opnieuw
3. Controleer of `--kiosk-printing` in het commando staat

## Printer print niet
1. Test printer met andere software
2. Controleer of printer standaard is ingesteld
3. Controleer papier en inkt

---

# AANBEVOLEN HARDWARE

- **Bonprinter**: Epson TM-T20III, Star TSP143III
- **Touchscreen**: 15-22 inch
- **Computer**: Mini PC of Raspberry Pi 4
