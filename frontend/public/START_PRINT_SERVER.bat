@echo off
REM ==========================================
REM  PRINT SERVER OPSTARTSCRIPT - WINDOWS
REM  Automatisch printen zonder dialoog
REM ==========================================

echo.
echo =============================================
echo   APPARTEMENT KIOSK - PRINT SERVER
echo =============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo FOUT: Python is niet geinstalleerd!
    echo.
    echo Download Python van: https://www.python.org/downloads/
    echo Zorg dat "Add Python to PATH" is aangevinkt tijdens installatie.
    echo.
    pause
    exit /b 1
)

echo Python gevonden!
echo.

REM Install required packages
echo Benodigde packages installeren...
pip install flask flask-cors >nul 2>&1

echo.
echo Print server wordt gestart...
echo.
echo De server draait op: http://localhost:5555
echo.
echo LAAT DIT VENSTER OPEN om de print server actief te houden!
echo Druk Ctrl+C om te stoppen.
echo.
echo =============================================
echo.

REM Start the print server
python print_server.py

pause
