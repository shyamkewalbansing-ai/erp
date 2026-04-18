# Vastgoed Kiosk ERP — PRD

## Sprint 20 (18 april 2026)

### Geïmplementeerd:
- **Betaling Goedkeuring Systeem** (P0): Alle betalingen status `pending` → Beheerder keurt goed/wijst af
- **Financieel Overzicht Fix** (P0): Pending betalingen niet in saldo, betalingsgeschiedenis alleen approved
- **Dashboard "In afwachting" stat**: Toont totaal pending bedrag in geel
- **Werknemers Rollen** (P1): Beheerder, Boekhouder, Kiosk Medewerker rollen
- **Losse werkers/Aannemers** (P1): `employee_type` vast/los
- **Werknemer Wachtwoord**: Hash opgeslagen voor toekomstige login
- **Salary Kwitanties** (P1): Bij werknemer betaling wordt een kwitantie aangemaakt
- **Processed By**: `processed_by` veld op elke betaling — wie het heeft verwerkt

### Nog te doen:
- Werknemer login systeem (inloggen op kiosk/admin met eigen credentials)
- Rol-gebaseerde toegang (welke functies per rol)
- `processed_by` op kwitantie PDF tonen

## Inloggegevens
- Kiosk: shyam@kewalbansing.net / Bharat7755 | PIN: 5678
- SuperAdmin: admin@facturatie.sr / Bharat7755
