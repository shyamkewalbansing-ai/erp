# Vastgoed Kiosk ERP — Product Requirements Document

## Origineel Probleem
Full-stack ERP systeem voor vastgoed/appartement huurbetalingen met een geïntegreerde KIOSK applicatie (Albert Heijn self-checkout stijl). Bevat Face ID login, PIN-code authenticatie, en mock/echte betaalmethoden.

## Architectuur
```
/app/
├── backend/
│   ├── routers/kiosk.py          # Kiosk API logica
│   └── server.py                 # FastAPI server + ERP auth
├── frontend/
│   ├── public/
│   │   ├── models/               # face-api.js model bestanden (.bin + manifest)
│   │   └── service-worker.js     # SW v3 — model bestanden uitgesloten van cache
│   └── src/
│       ├── components/
│       │   ├── Layout.js         # Hoofd sidebar (Admin links)
│       │   ├── VastgoedKioskManager.jsx
│       │   └── vastgoed-kiosk/
│       │       ├── KioskLayout.jsx
│       │       ├── KioskAdminDashboard.jsx  # Admin dashboard (bottom: 12vh fix)
│       │       ├── FaceCapture.jsx          # Face ID (rAF loop, geluid, responsive)
│       │       ├── HuurdersLayout.jsx       # Huurders portaal (responsive)
│       │       ├── KioskApartmentSelect.jsx
│       │       └── ...overige kiosk componenten
│       └── pages/
│           ├── Admin.js
│           └── App.js
```

## Wat is geïmplementeerd

### Sprint 1 (vorige sessies)
- ERP basis: facturen, klanten, producten, boekhouding modules
- Kiosk terminal: Face ID login, PIN-code, betalingsflow
- SuperAdmin dashboard met bedrijfsbeheer
- WhatsApp integratie (backend)
- SumUp checkout integratie

### Sprint 2 (vorige sessie)
- SuperAdmin tabs verplaatst naar sidebar in Layout.js
- `emergentintegrations` verwijderd uit requirements.txt (productie fix)
- FaceCapture.jsx eerste patches (race condition)

### Sprint 3 (huidige sessie — 29 maart 2026)
- **Face ID model .bin fix**: Shard bestanden hernoemd naar .bin extensie + manifesten bijgewerkt — Nginx serveerde index.html i.p.v. binaire modeldata
- **Service Worker v3**: Cache versie gebumpt, model bestanden uitgesloten van SW caching
- **FaceCapture.jsx volledig herschreven**:
  - requestAnimationFrame detectie loop (smooth, geen jank)
  - Camera start direct (modellen laden op achtergrond)
  - Geluid bij gezichtsherkenning (Web Audio API twee-tonen chime)
  - Adaptive camera resolutie (320x240 mobiel, 640x480 desktop)
  - Professionele scanning UI (hoek brackets + scan line animatie)
  - Try/catch om detectSingleFace met automatisch model-herlaad
- **HuurdersLayout.jsx volledig responsive**: Werkt op alle telefoons
  - Flexbox layout met shrink-0 bottom bar
  - Responsive tekst, knoppen, spacing
  - `min-h-dvh` voor correcte mobiele viewport
- **KioskLayout scroll fix**: overflow-y-auto voor alle stappen
- **KioskAdminDashboard scroll fix**: `bottom: 12vh` zodat content niet achter bottom bar verdwijnt
- **Maandhuur auto-fill**: Bij appartement selectie wordt huur + borg automatisch ingevuld
- **Appartement dropdown filter**: Bezette appartementen verborgen bij nieuwe huurder, zichtbaar wanneer vrij
- **Surinaamse tijd**: Live klok (America/Paramaribo) op admin dashboard
- **KioskApartmentSelect**: h-full verwijderd van grid — alle appartementen scrollbaar

### Sprint 4 (29 maart 2026)
- **Mobiele responsiveness fix voor alle Kiosk betaalschermen** (P0):
  - `KioskTenantOverview.jsx`: flex-col op mobiel, md:flex-row op desktop
  - `KioskPaymentSelect.jsx`: Betalingstypen + keypad stapelen verticaal op mobiel
  - `KioskPaymentConfirm.jsx`: Betaalmethode kaarten responsive grid/flex-wrap
  - `PaymentConfirm.jsx`: w-full md:w-1/2 layout
  - Alle headers responsive met flex-wrap en truncate
  - Huurder variant card breedte verlaagd van 500px min naar 300px
  - Getest met testing agent: 100% pass rate op mobiel (375px) én desktop (1920px)

## Inloggegevens
- SuperAdmin ERP: admin@facturatie.sr / Bharat7755
- Kiosk Company: shyam@kewalbansing.net / Bharat7755
- Kiosk PIN: 5678

## Productie Deployment
- Server: app.facturatie.sr
- Workflow: git pull → cd frontend → rm -rf build → yarn build → supervisorctl restart
- NOOIT emergentintegrations in requirements.txt
- Service Worker actief — cache versie bumpen bij grote wijzigingen

## Geblokkeerd
- Mope Payment Gateway — wacht op API key
- Uni5Pay — wacht op API key

## Backlog (prioriteit)
### P1
- Kwitanties tab moderniseren (unified table style)
- WhatsApp bonnetje automatisch sturen na betaling
- Refactoring: Admin.js (~3700 regels), KioskAdminDashboard.jsx (~3400 regels), kiosk.py (~3300 regels)

### P2
- Maandelijks financieel rapport (automatisch)
- CSV/PDF export betalingsrapporten
- Wachtwoord vergeten functionaliteit
- Multi-gebouw ondersteuning per bedrijf
