"""
Boekhouding Module - Modulaire Structuur
=========================================
Dit pakket bevat alle boekhouding routers.

HUIDIGE STATUS: Legacy mode (backward compatible)
De originele monolithische router wordt nog gebruikt voor stabiliteit.

STRUCTUUR (voor toekomstige refactoring):
- common.py: Gedeelde imports, helpers en models
- dashboard.py: Dashboard endpoints (KLAAR)
- grootboek.py: Rekeningen, BTW-codes, Journaalposten
- relaties.py: Debiteuren, Crediteuren
- bank.py: Bankrekeningen, Transacties, Import
- verkoop.py: Verkoopfacturen, Offertes, Orders
- inkoop.py: Inkoopfacturen, Orders
- voorraad.py: Artikelen, Magazijnen, Mutaties
- rapportages.py: Alle rapporten
- instellingen.py: Instellingen, Bedrijven, Herinneringen
- overig.py: Documenten, Projecten, Uren, Vaste Activa, Audit

SERVICES:
- /services/grootboek_service.py: Automatische journaalpost logica (KLAAR)
"""

# Import de volledige originele router voor backward compatibility
from routers.boekhouding_legacy import router

__all__ = ['router']
