# Vastgoed Kiosk ERP — PRD

## Sprint 20 (18 april 2026) — Betaling Goedkeuring Systeem

### Geïmplementeerd:
- **Betaling Goedkeuring**: Alle betalingen (kiosk + admin) krijgen status `pending`
  - Saldo wordt NIET bijgewerkt tot beheerder goedkeurt
  - WhatsApp wordt NIET verstuurd tot goedkeuring
  - Kiosk toont "Wacht op goedkeuring" na betaling
  - Admin Kwitanties: "IN AFWACHTING" badge + Goedkeuren/Afwijzen knoppen
  - Na goedkeuring: saldo wordt bijgewerkt + WhatsApp bevestiging
  - Backend endpoints: POST /admin/payments/{id}/approve en /reject

### Nog te doen (P1):
- Kiosk Financieel Overzicht fix (pending betalingen niet meetellen)
- Werknemers Rollen Systeem
- Losse werkers/aannemers betalen
- Werknemers kwitanties
- Welke werknemer op elke kwitantie

## Inloggegevens
- Kiosk: shyam@kewalbansing.net / Bharat7755 | PIN: 5678
- SuperAdmin: admin@facturatie.sr / Bharat7755
