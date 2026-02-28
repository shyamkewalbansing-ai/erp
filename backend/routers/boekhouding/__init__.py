"""
Boekhouding Module - Modulaire Structuur
=========================================
Dit pakket bevat alle boekhouding routers.

De refactoring is stapsgewijs:
- common.py: Gedeelde imports, helpers en models
- dashboard.py: Dashboard endpoints
- grootboek.py: Rekeningen, BTW-codes, Journaalposten
- relaties.py: Debiteuren, Crediteuren
- bank.py: Bankrekeningen, Transacties, Import
- verkoop.py: Verkoopfacturen, Offertes, Orders
- inkoop.py: Inkoopfacturen, Orders
- voorraad.py: Artikelen, Magazijnen, Mutaties
- rapportages.py: Alle rapporten
- instellingen.py: Instellingen, Bedrijven, Herinneringen
- overig.py: Documenten, Projecten, Uren, Vaste Activa, Audit

Voor nu exporteren we de originele monolithische router.
"""

# Import de volledige originele router voor backward compatibility
# Deze wordt geleidelijk vervangen door de modulaire versie
from routers.boekhouding_legacy import router

__all__ = ['router']
