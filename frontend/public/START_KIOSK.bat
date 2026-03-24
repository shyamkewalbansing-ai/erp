@echo off
REM ==========================================
REM  KIOSK OPSTARTSCRIPT - WINDOWS
REM  Automatisch printen zonder dialoog
REM ==========================================

REM === CONFIGURATIE ===
REM Pas deze URL aan naar uw eigen domein
SET KIOSK_URL=https://apartment-kiosk.preview.emergentagent.com/vastgoed

REM === CHROME PAD ===
REM Standaard Chrome locatie (pas aan indien nodig)
SET CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"

REM === ALTERNATIEVE LOCATIES ===
IF NOT EXIST %CHROME_PATH% SET CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
IF NOT EXIST %CHROME_PATH% SET CHROME_PATH="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

REM === START KIOSK ===
echo.
echo =============================================
echo   APPARTEMENT KIOSK - OPSTARTEN
echo =============================================
echo.
echo URL: %KIOSK_URL%
echo.
echo De kiosk start nu in volledig scherm...
echo Kwitanties worden AUTOMATISCH afgedrukt.
echo.
echo Druk Alt+F4 om af te sluiten.
echo.

%CHROME_PATH% ^
    --kiosk ^
    --kiosk-printing ^
    --disable-pinch ^
    --overscroll-history-navigation=0 ^
    --disable-features=TranslateUI ^
    --noerrdialogs ^
    --disable-infobars ^
    --disable-session-crashed-bubble ^
    --disable-restore-session-state ^
    --disable-component-update ^
    --check-for-update-interval=31536000 ^
    %KIOSK_URL%
