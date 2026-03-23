# Kiosk Setup Handleiding - Automatisch Printen

## BELANGRIJK: Automatisch Printen Instellen

Om kwitanties **100% automatisch af te drukken zonder klikken**, moet Chrome in kiosk mode draaien.

---

## Snelle Start

### Windows
1. Download `START_KIOSK.bat` van uw kiosk URL
2. Open het bestand met Kladblok
3. Pas de URL aan: `SET KIOSK_URL=https://uw-domein.com/vastgoed/uw-company-id`
4. Sla op en dubbelklik om te starten

### Linux
1. Download `start_kiosk.sh`
2. Pas de URL aan in het bestand
3. Maak uitvoerbaar: `chmod +x start_kiosk.sh`
4. Start: `./start_kiosk.sh`

---

## Handmatige Start

### Windows (CMD of PowerShell)
```batch
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing "https://UW-DOMEIN/vastgoed/COMPANY-ID"
```

### Linux
```bash
chromium-browser --kiosk --kiosk-printing "https://UW-DOMEIN/vastgoed/COMPANY-ID"
```

### macOS
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk --kiosk-printing "https://UW-DOMEIN/vastgoed/COMPANY-ID"
```

---

## Alle Chrome Flags Uitgelegd

| Flag | Functie |
|------|---------|
| `--kiosk` | Volledig scherm, geen adresbalk |
| `--kiosk-printing` | **AUTOMATISCH PRINTEN zonder dialoog** |
| `--disable-pinch` | Geen zoom met vingers (touchscreen) |
| `--noerrdialogs` | Geen foutmeldingen tonen |
| `--disable-infobars` | Geen info balken |
| `--disable-session-crashed-bubble` | Geen herstel popup |

---

## Printer Instellen

### Stap 1: Stel uw bonprinter in als STANDAARD printer

**Windows:**
1. Instellingen → Apparaten → Printers
2. Klik op uw printer → Beheren → Als standaard instellen

**Linux:**
```bash
lpstat -p -d          # Lijst printers
lpoptions -d PRINTER  # Stel standaard in
```

### Stap 2: Test de printer
Print een testpagina om te controleren dat de printer werkt.

---

## Autostart bij Opstarten

### Windows
1. Druk `Win+R`, typ `shell:startup`
2. Maak snelkoppeling naar `START_KIOSK.bat`

### Linux (Raspberry Pi)
Maak bestand: `~/.config/autostart/kiosk.desktop`
```ini
[Desktop Entry]
Type=Application
Name=Appartement Kiosk
Exec=/pad/naar/start_kiosk.sh
X-GNOME-Autostart-enabled=true
```

---

## Afsluiten

- **Windows**: `Ctrl+Shift+Q` of `Alt+F4`
- **Linux**: `Alt+F4`
- **Nood**: `Ctrl+Alt+Delete` → Taakbeheer

---

## Problemen Oplossen

### Print dialoog verschijnt nog steeds
- Controleer of `--kiosk-printing` correct is toegevoegd
- Sluit ALLE Chrome vensters en start opnieuw
- Controleer of standaard printer is ingesteld

### Printer print niet
- Test printer met andere software
- Controleer papier en inkt
- Controleer USB/netwerk verbinding

### Kiosk start niet op
- Controleer Chrome pad in script
- Controleer internet verbinding
- Controleer of URL correct is

---

## Aanbevolen Hardware

- **Bonprinter**: Epson TM-T20III, Star TSP143III
- **Touchscreen**: 15-22 inch capacitief
- **Computer**: Mini PC of Raspberry Pi 4
