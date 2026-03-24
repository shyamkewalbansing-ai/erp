# Vastgoed Subdomein Configuratie

## vastgoed.facturatie.sr instellen

### Hoe het werkt

De kiosk draait op een eigen subdomein **zonder** `/vastgoed` in de URL:

| URL | Functie |
|-----|---------|
| `vastgoed.facturatie.sr/` | Inloggen (wachtwoord of PIN) |
| `vastgoed.facturatie.sr/{company_id}` | Kiosk voor een bedrijf |
| `vastgoed.facturatie.sr/admin` | Admin Dashboard |

De frontend detecteert automatisch het `vastgoed.*` subdomein en toont alleen de kiosk module.

### Stap 1: DNS Record toevoegen

Ga naar uw domeinprovider en voeg dit DNS record toe:

| Type | Naam      | Waarde         |
|------|-----------|----------------|
| A    | vastgoed  | 72.62.174.80   |

### Stap 2: SSL certificaat vernieuwen

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone \
  -d facturatie.sr \
  -d www.facturatie.sr \
  -d app.facturatie.sr \
  -d vastgoed.facturatie.sr
sudo systemctl start nginx
```

### Stap 3: Installatiescript uitvoeren

Het `COMPLETE_INSTALL.sh` script bevat al de Nginx configuratie voor het vastgoed subdomein.
Bij de volgende deployment wordt alles automatisch geconfigureerd.
