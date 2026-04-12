# Vastgoed Kiosk ERP — Product Requirements Document

## Origineel Probleem
Full-stack ERP systeem voor vastgoed/appartement huurbetalingen met KIOSK terminal.

## Architectuur
```
/app/backend/routers/kiosk/   → 12 Python modules (auth, admin, public, etc.)
/app/frontend/src/components/vastgoed-kiosk/ → KioskLayout, admin/ (14 tabs)
```

## Sprint 18-19 (12 april 2026)

### Bedrijfsnaam & URL Sync (P0) ✅
- Slug regeneratie bij naam-wijziging + cascade update 15 collecties + nieuw JWT

### Kwitanties Bug Fixes ✅
- **Covered months fix**: Berekening gebruikt nu vervaldatums (billing_day + billing_next_month) om te bepalen welke maanden overdue zijn. Consistent met Huurders tab.
- **Remaining balances**: Backend slaat remaining_rent/service/fines/internet op bij elke betaling
- **Openstaand kolom**: Toont nu opgeslagen saldo per betaling, niet huidig huurder-saldo
- **Afdrukken**: Opent backend HTML receipt in nieuw tabblad

### Overdue months fix
- Oude algoritme (`i+1` offset) telde 1 maand te ver terug
- Nieuw algoritme: bouwt lijst van oudste tot nieuwste onbetaalde maand, checkt vervaldatum per maand
- Huidige factureringsmaand (billed_through) wordt alleen als overdue getoond als vervaldatum verstreken is

## Inloggegevens
- SuperAdmin: admin@facturatie.sr / Bharat7755
- Kiosk: shyam@kewalbansing.net / Bharat7755 | PIN: 5678
- URL: /vastgoed/kewalbansing

## Prioriteiten
- P1: Kwitanties tab moderniseren (unified table style)
- P2: Maandelijks financieel rapport, CSV/PDF export, Wachtwoord vergeten, Multi-gebouw
