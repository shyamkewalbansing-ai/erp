#!/bin/bash
# ==========================================
#  KIOSK OPSTARTSCRIPT - LINUX
#  Automatisch printen zonder dialoog
# ==========================================

# === CONFIGURATIE ===
# Pas deze URL aan naar uw eigen domein
KIOSK_URL="https://kiosk-payment.preview.emergentagent.com/vastgoed"

# === CHROME/CHROMIUM DETECTIE ===
if command -v chromium-browser &> /dev/null; then
    BROWSER="chromium-browser"
elif command -v chromium &> /dev/null; then
    BROWSER="chromium"
elif command -v google-chrome &> /dev/null; then
    BROWSER="google-chrome"
elif command -v google-chrome-stable &> /dev/null; then
    BROWSER="google-chrome-stable"
else
    echo "ERROR: Chrome of Chromium niet gevonden!"
    echo "Installeer met: sudo apt install chromium-browser"
    exit 1
fi

echo ""
echo "============================================="
echo "  APPARTEMENT KIOSK - OPSTARTEN"
echo "============================================="
echo ""
echo "Browser: $BROWSER"
echo "URL: $KIOSK_URL"
echo ""
echo "De kiosk start nu in volledig scherm..."
echo "Kwitanties worden AUTOMATISCH afgedrukt."
echo ""
echo "Druk Alt+F4 om af te sluiten."
echo ""

# === START KIOSK ===
$BROWSER \
    --kiosk \
    --kiosk-printing \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --disable-features=TranslateUI \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --disable-component-update \
    --check-for-update-interval=31536000 \
    "$KIOSK_URL"
