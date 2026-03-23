# Kiosk Setup Handleiding - Silent Printing

## Chrome/Chromium Kiosk Mode met Automatisch Printen

Om de kwitanties **automatisch te printen zonder print dialoog**, moet Chrome in kiosk mode gestart worden met speciale flags.

### Windows

Maak een snelkoppeling met het volgende commando:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing --disable-pinch --overscroll-history-navigation=0 --disable-features=TranslateUI --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state https://UW-DOMEIN.com/vastgoed/UW-COMPANY-ID
```

### Linux (Raspberry Pi / Ubuntu)

```bash
chromium-browser --kiosk --kiosk-printing --disable-pinch --overscroll-history-navigation=0 --disable-features=TranslateUI --noerrdialogs --disable-infobars --disable-session-crashed-bubble "https://UW-DOMEIN.com/vastgoed/UW-COMPANY-ID"
```

### macOS

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk --kiosk-printing --disable-pinch "https://UW-DOMEIN.com/vastgoed/UW-COMPANY-ID"
```

---

## Belangrijke Chrome Flags

| Flag | Beschrijving |
|------|-------------|
| `--kiosk` | Start Chrome in fullscreen kiosk mode |
| `--kiosk-printing` | **Print automatisch naar standaard printer zonder dialoog** |
| `--disable-pinch` | Schakelt zoom uit (voor touchscreen) |
| `--noerrdialogs` | Verbergt error dialogen |
| `--disable-infobars` | Verbergt info balken |
| `--disable-session-crashed-bubble` | Verbergt crash herstel meldingen |

---

## Printer Instellen als Standaard

### Windows
1. Open **Instellingen** > **Apparaten** > **Printers en scanners**
2. Klik op uw bonprinter
3. Klik op **Beheren** > **Als standaard instellen**

### Linux
```bash
# Lijst alle printers
lpstat -p -d

# Stel standaard printer in
lpoptions -d PRINTER_NAAM
```

---

## Aanbevolen Hardware

- **Bonprinter**: Epson TM-T20III of Star TSP143III
- **Touchscreen**: 15-22 inch capacitief touchscreen
- **Computer**: Mini PC (Intel NUC) of Raspberry Pi 4

---

## Autostart op Boot (Linux)

Maak bestand: `~/.config/autostart/kiosk.desktop`

```ini
[Desktop Entry]
Type=Application
Name=Kiosk
Exec=chromium-browser --kiosk --kiosk-printing "https://UW-DOMEIN.com/vastgoed/UW-COMPANY-ID"
X-GNOME-Autostart-enabled=true
```

---

## Troubleshooting

### Print dialoog verschijnt nog steeds
- Controleer of `--kiosk-printing` flag correct is toegevoegd
- Herstart Chrome volledig (alle vensters sluiten)
- Controleer of de standaard printer correct is ingesteld

### Printer print niet
- Test de printer met een andere applicatie
- Controleer printer verbinding (USB/Netwerk)
- Controleer papier en inkt/lint

### Kiosk sluit niet af
- Druk `Alt+F4` (Windows) of `Cmd+Q` (Mac)
- Of gebruik `Ctrl+Alt+Delete` om taakbeheer te openen

---

## Support

Voor vragen over de kiosk setup, neem contact op met uw systeembeheerder.
