# Facturatie ERP - Multi-Tenant SaaS Platform

Een complete, modulaire ERP SaaS oplossing met multi-tenant architectuur voor bedrijven in Suriname.

---

## 🚀 Quick Start (Ontwikkeling)

```bash
# Backend starten
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend starten (in nieuwe terminal)
cd frontend
yarn install
yarn start
```

---

## 📦 Modules

| Module | Beschrijving | Status |
|--------|--------------|--------|
| **CMS** | Content Management Systeem | ✅ |
| **HRM** | Human Resource Management met employee portal | ✅ |
| **Vastgoed Beheer** | Real Estate Management met huurders portal | ✅ |
| **Auto Dealer** | Voertuig- en verkoopbeheer (multi-currency) | ✅ |
| **AI Chatbot** | GPT-powered ondersteuning | ✅ |

---

## 🌐 Multi-Tenant Features

- **Workspace Isolatie**: Elke klant heeft zijn eigen afgeschermde omgeving
- **Custom Branding**: Logo en kleuren per workspace
- **Subdomain Support**: `klant.facturatie.sr`
- **Custom Domains**: Eigen domein koppelen mogelijk
- **Backup & Restore**: Per-workspace backup functionaliteit

---

## 📖 Documentatie

### Installatie & Deployment

| Document | Beschrijving |
|----------|--------------|
| [INSTALLATIE_HANDLEIDING.md](./INSTALLATIE_HANDLEIDING.md) | Complete CloudPanel installatie guide |
| [VPS_SETUP_GUIDE.md](./VPS_SETUP_GUIDE.md) | Uitgebreide VPS setup met architectuur |
| [CLOUDPANEL_INSTALL.sh](./CLOUDPANEL_INSTALL.sh) | Automatisch installatie script |

### Beheer Scripts

| Script | Gebruik |
|--------|---------|
| `UPDATE.sh` | Applicatie updaten na wijzigingen |
| `BACKUP.sh` | Complete backup maken |
| `RESTORE.sh` | Backup terugzetten |
| `WEBHOOK_DEPLOY.sh` | Automatisch deployen via CI/CD |

---

## 🔧 Technische Stack

**Backend:**
- Python 3.10+
- FastAPI
- MongoDB (motor async driver)
- JWT Authentication

**Frontend:**
- React 18
- Tailwind CSS
- Shadcn UI
- Lucide React Icons

---

## 💳 Multi-Currency Support

De Auto Dealer module ondersteunt:
- 🇸🇷 Surinaamse Dollar (SRD)
- 🇪🇺 Euro (EUR)
- 🇺🇸 US Dollar (USD)

---

## 🔐 Standaard Login

| Rol | Email | Wachtwoord |
|-----|-------|------------|
| Superadmin | `admin@facturatie.sr` | `admin123` |

**⚠️ Verander dit wachtwoord in productie!**

---

## 📞 Support

- Documentatie: Zie `/docs` folder
- Issues: GitHub Issues

---

## 📄 Licentie

© 2024-2026 Facturatie N.V. Suriname  
Alle rechten voorbehouden.
