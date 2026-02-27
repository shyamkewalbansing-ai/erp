"""
Boekhouding Module - Complete Surinaams Boekhoudsysteem
=======================================================
18 Sub-modules:
1. Dashboard (Cockpit)
2. Grootboek
3. Debiteuren
4. Crediteuren
5. Bank/Kas
6. Bank Reconciliatie
7. Vaste Activa
8. Kostenplaatsen
9. Wisselkoersen
10. Inkoop
11. Verkoop
12. Voorraad
13. Projecten
14. Rapportages
15. BTW Module
16. Documentbeheer
17. Gebruikers & Rollen
18. Handleiding

Suriname Specifiek:
- Multi-valuta: SRD, USD, EUR
- BTW tarieven: 0%, 10%, 25%
- Centrale Bank koersen
- Surinaamse banken: DSB, Finabank, Hakrinbank, etc.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timezone, timedelta
from enum import Enum
import uuid
import httpx
from io import BytesIO
from decimal import Decimal
import csv
import io
import re

# Router setup
router = APIRouter(prefix="/boekhouding", tags=["Boekhouding"])

# ==================== ENUMS ====================

class ValutaEnum(str, Enum):
    SRD = "SRD"
    USD = "USD"
    EUR = "EUR"

class RekeningTypeEnum(str, Enum):
    ACTIVA = "activa"
    PASSIVA = "passiva"
    EIGEN_VERMOGEN = "eigen_vermogen"
    OMZET = "omzet"
    KOSTEN = "kosten"

class BTWTariefEnum(str, Enum):
    STANDAARD = "25"
    LAAG = "10"
    NUL = "0"
    VRIJGESTELD = "vrijgesteld"

class DagboekTypeEnum(str, Enum):
    BANK = "bank"
    KAS = "kas"
    VERKOOP = "verkoop"
    INKOOP = "inkoop"
    MEMORIAAL = "memoriaal"

class FactuurStatusEnum(str, Enum):
    CONCEPT = "concept"
    VERZONDEN = "verzonden"
    BETAALD = "betaald"
    GEDEELTELIJK_BETAALD = "gedeeltelijk_betaald"
    VERVALLEN = "vervallen"
    GEANNULEERD = "geannuleerd"

class OrderStatusEnum(str, Enum):
    CONCEPT = "concept"
    VERZONDEN = "verzonden"
    BEVESTIGD = "bevestigd"
    GEDEELTELIJK_GELEVERD = "gedeeltelijk_geleverd"
    VOLLEDIG_GELEVERD = "volledig_geleverd"
    GEFACTUREERD = "gefactureerd"
    GEANNULEERD = "geannuleerd"

class ActivaCategorieEnum(str, Enum):
    GEBOUWEN = "gebouwen"
    MACHINES = "machines"
    INVENTARIS = "inventaris"
    VOERTUIGEN = "voertuigen"
    COMPUTERS = "computers"
    SOFTWARE = "software"
    OVERIG = "overig"

class AfschrijvingsmethodeEnum(str, Enum):
    LINEAIR = "lineair"
    DEGRESSIEF = "degressief"
    ANNUITEIT = "annuiteit"

class MutatieTypeEnum(str, Enum):
    INKOOP = "inkoop"
    VERKOOP = "verkoop"
    CORRECTIE = "correctie"
    TRANSFER = "transfer"
    RETOUR = "retour"
    PRODUCTIE = "productie"

class ProjectStatusEnum(str, Enum):
    OPEN = "open"
    IN_UITVOERING = "in_uitvoering"
    ON_HOLD = "on_hold"
    AFGEROND = "afgerond"
    GESLOTEN = "gesloten"

class BankNaamEnum(str, Enum):
    DSB = "De Surinaamsche Bank N.V."
    FINABANK = "Finabank N.V."
    HAKRINBANK = "Hakrinbank N.V."
    REPUBLIC = "Republic Bank Suriname N.V."
    SPSB = "Surinaamse Postspaarbank"
    VCB = "Volkscredietbank"
    SCB = "Surichange Bank N.V."
    GODO = "Godo Bank"
    TRUSTBANK = "Trustbank Amanah"
    SOUTHERN = "Southern Commercial Bank N.V."
    NOB = "Nationale Ontwikkelingsbank"
    OVERIG = "Overig"

# ==================== PYDANTIC MODELS ====================

# === Grootboek Models ===
class RekeningBase(BaseModel):
    nummer: str = Field(..., description="Rekeningnummer bijv. 1000")
    naam: str = Field(..., description="Naam van de rekening")
    type: RekeningTypeEnum
    omschrijving: Optional[str] = None
    valuta: ValutaEnum = ValutaEnum.SRD
    btw_relevant: bool = False
    kostenplaats_verplicht: bool = False
    actief: bool = True
    parent_nummer: Optional[str] = None

class RekeningCreate(RekeningBase):
    pass

class RekeningResponse(RekeningBase):
    id: str
    user_id: str
    saldo: float = 0.0
    created_at: str
    updated_at: Optional[str] = None

class DagboekBase(BaseModel):
    code: str
    naam: str
    type: DagboekTypeEnum
    valuta: ValutaEnum = ValutaEnum.SRD
    standaard_tegenrekening: Optional[str] = None
    actief: bool = True

class DagboekCreate(DagboekBase):
    pass

class DagboekResponse(DagboekBase):
    id: str
    user_id: str
    laatst_gebruikt_nummer: int = 0
    created_at: str

class JournaalpostRegelBase(BaseModel):
    rekening_nummer: str
    omschrijving: str
    debet: float = 0.0
    credit: float = 0.0
    btw_code: Optional[str] = None
    btw_bedrag: float = 0.0
    kostenplaats_id: Optional[str] = None
    valuta: ValutaEnum = ValutaEnum.SRD
    koers: float = 1.0

class JournaalpostBase(BaseModel):
    dagboek_code: str
    datum: str
    omschrijving: str
    regels: List[JournaalpostRegelBase]
    document_id: Optional[str] = None
    relatie_id: Optional[str] = None
    relatie_type: Optional[str] = None  # debiteur/crediteur

class JournaalpostCreate(JournaalpostBase):
    pass

class JournaalpostResponse(JournaalpostBase):
    id: str
    user_id: str
    boekstuknummer: str
    periode: str
    status: str = "geboekt"
    created_at: str
    created_by: str

# === Debiteur Models ===
class DebiteurBase(BaseModel):
    klantnummer: Optional[str] = None
    bedrijfsnaam: str
    contactpersoon: Optional[str] = None
    adres: Optional[str] = None
    postcode: Optional[str] = None
    plaats: Optional[str] = None
    land: str = "Suriname"
    telefoon: Optional[str] = None
    email: Optional[str] = None
    btw_nummer: Optional[str] = None
    kvk_nummer: Optional[str] = None
    valuta: ValutaEnum = ValutaEnum.SRD
    betaalconditie_dagen: int = 30
    kredietlimiet: float = 0.0
    standaard_btw_code: str = "V25"
    actief: bool = True

class DebiteurCreate(DebiteurBase):
    pass

class DebiteurResponse(DebiteurBase):
    id: str
    user_id: str
    openstaand_saldo: float = 0.0
    created_at: str
    updated_at: Optional[str] = None

# === Crediteur Models ===
class CrediteurBase(BaseModel):
    leveranciersnummer: Optional[str] = None
    bedrijfsnaam: str
    contactpersoon: Optional[str] = None
    adres: Optional[str] = None
    postcode: Optional[str] = None
    plaats: Optional[str] = None
    land: str = "Suriname"
    telefoon: Optional[str] = None
    email: Optional[str] = None
    btw_nummer: Optional[str] = None
    iban: Optional[str] = None
    valuta: ValutaEnum = ValutaEnum.SRD
    betaalconditie_dagen: int = 30
    standaard_btw_code: str = "I25"
    actief: bool = True

class CrediteurCreate(CrediteurBase):
    pass

class CrediteurResponse(CrediteurBase):
    id: str
    user_id: str
    openstaand_saldo: float = 0.0
    created_at: str
    updated_at: Optional[str] = None

# === Verkoopfactuur Models ===
class FactuurRegelBase(BaseModel):
    artikelcode: Optional[str] = None
    omschrijving: str
    aantal: float = 1.0
    eenheid: str = "stuk"
    prijs_per_eenheid: float
    korting_percentage: float = 0.0
    btw_code: str = "V25"
    btw_percentage: float = 25.0
    kostenplaats_id: Optional[str] = None

class VerkoopfactuurBase(BaseModel):
    debiteur_id: str
    factuurdatum: str
    vervaldatum: Optional[str] = None
    valuta: ValutaEnum = ValutaEnum.SRD
    koers: float = 1.0
    regels: List[FactuurRegelBase]
    opmerkingen: Optional[str] = None
    betaalreferentie: Optional[str] = None

class VerkoopfactuurCreate(VerkoopfactuurBase):
    pass

class VerkoopfactuurResponse(VerkoopfactuurBase):
    id: str
    user_id: str
    factuurnummer: str
    subtotaal: float
    btw_totaal: float
    totaal: float
    openstaand_bedrag: float
    status: FactuurStatusEnum
    journaalpost_id: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# === Inkoopfactuur Models ===
class InkoopfactuurBase(BaseModel):
    crediteur_id: str
    extern_factuurnummer: str
    factuurdatum: str
    vervaldatum: Optional[str] = None
    valuta: ValutaEnum = ValutaEnum.SRD
    koers: float = 1.0
    regels: List[FactuurRegelBase]
    opmerkingen: Optional[str] = None

class InkoopfactuurCreate(InkoopfactuurBase):
    pass

class InkoopfactuurResponse(InkoopfactuurBase):
    id: str
    user_id: str
    intern_factuurnummer: str
    subtotaal: float
    btw_totaal: float
    totaal: float
    openstaand_bedrag: float
    status: FactuurStatusEnum
    journaalpost_id: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# === Bank Models ===
class BankrekeningBase(BaseModel):
    rekeningnummer: str
    naam: str
    bank: BankNaamEnum
    valuta: ValutaEnum = ValutaEnum.SRD
    grootboekrekening: str
    beginsaldo: float = 0.0
    actief: bool = True

class BankrekeningCreate(BankrekeningBase):
    pass

class BankrekeningResponse(BankrekeningBase):
    id: str
    user_id: str
    huidig_saldo: float = 0.0
    laatst_geimporteerd: Optional[str] = None
    created_at: str

class BankmutatieBatchImport(BaseModel):
    bankrekening_id: str
    bestandsformaat: str = "csv"  # csv, mt940
    # File wordt apart geupload

class BankmutatieBase(BaseModel):
    bankrekening_id: str
    datum: str
    valutadatum: Optional[str] = None
    bedrag: float
    omschrijving: str
    tegenrekening: Optional[str] = None
    naam_tegenpartij: Optional[str] = None
    betaalkenmerk: Optional[str] = None

class BankmutatieCreate(BankmutatieBase):
    pass

class BankmutatieResponse(BankmutatieBase):
    id: str
    user_id: str
    transactie_ref: str
    status: str = "te_verwerken"  # te_verwerken, gematcht, geboekt
    gekoppelde_factuur_id: Optional[str] = None
    gekoppelde_factuur_type: Optional[str] = None
    journaalpost_id: Optional[str] = None
    match_score: Optional[float] = None
    created_at: str

# === Kas Models ===
class KasmutatieBase(BaseModel):
    datum: str
    omschrijving: str
    bedrag_in: float = 0.0
    bedrag_uit: float = 0.0
    grootboekrekening: str
    relatie_id: Optional[str] = None
    relatie_type: Optional[str] = None
    document_referentie: Optional[str] = None

class KasmutatieCreate(KasmutatieBase):
    pass

class KasmutatieResponse(KasmutatieBase):
    id: str
    user_id: str
    kasmutatie_nummer: str
    saldo_na: float
    journaalpost_id: Optional[str] = None
    created_at: str
    created_by: str

# === Vaste Activa Models ===
class VastActivumBase(BaseModel):
    omschrijving: str
    categorie: ActivaCategorieEnum
    leverancier: Optional[str] = None
    factuurnummer: Optional[str] = None
    aankoopdatum: str
    ingebruikname_datum: Optional[str] = None
    aanschafwaarde: float
    restwaarde: float = 0.0
    afschrijvingsmethode: AfschrijvingsmethodeEnum = AfschrijvingsmethodeEnum.LINEAIR
    afschrijvingsduur_maanden: int
    afschrijvingspercentage: Optional[float] = None
    valuta: ValutaEnum = ValutaEnum.SRD
    kostenplaats_id: Optional[str] = None
    locatie: Optional[str] = None
    serienummer: Optional[str] = None
    actief: bool = True

class VastActivumCreate(VastActivumBase):
    pass

class VastActivumResponse(VastActivumBase):
    id: str
    user_id: str
    activum_nummer: str
    cumulatieve_afschrijving: float = 0.0
    boekwaarde: float
    status: str = "in_gebruik"  # in_gebruik, buiten_gebruik, verkocht, afgeschreven
    created_at: str
    updated_at: Optional[str] = None

# === Kostenplaats Models ===
class KostenplaatsBase(BaseModel):
    code: str
    naam: str
    omschrijving: Optional[str] = None
    budget: float = 0.0
    budget_jaar: int
    parent_code: Optional[str] = None
    actief: bool = True

class KostenplaatsCreate(KostenplaatsBase):
    pass

class KostenplaatsResponse(KostenplaatsBase):
    id: str
    user_id: str
    gerealiseerd: float = 0.0
    created_at: str

# === Wisselkoers Models ===
class WisselkoersBase(BaseModel):
    datum: str
    van_valuta: ValutaEnum
    naar_valuta: ValutaEnum
    koers: float
    bron: str = "handmatig"  # handmatig, centrale_bank

class WisselkoersCreate(WisselkoersBase):
    pass

class WisselkoersResponse(WisselkoersBase):
    id: str
    user_id: str
    created_at: str

# === BTW Models ===
class BTWCodeBase(BaseModel):
    code: str
    omschrijving: str
    percentage: float
    type: str  # verkoop, inkoop
    rekening_btw_af_te_dragen: Optional[str] = None
    rekening_btw_te_vorderen: Optional[str] = None
    actief: bool = True

class BTWCodeCreate(BTWCodeBase):
    pass

class BTWCodeResponse(BTWCodeBase):
    id: str
    user_id: str
    created_at: str

# === Artikel Models ===
class ArtikelBase(BaseModel):
    artikelcode: str
    naam: str
    omschrijving: Optional[str] = None
    categorie: Optional[str] = None
    eenheid: str = "stuk"
    inkoopprijs: float = 0.0
    verkoopprijs: float = 0.0
    valuta: ValutaEnum = ValutaEnum.SRD
    btw_code_verkoop: str = "V25"
    btw_code_inkoop: str = "I25"
    voorraad_artikel: bool = True
    min_voorraad: float = 0.0
    max_voorraad: Optional[float] = None
    kostprijs_methode: str = "fifo"  # fifo, lifo, gemiddeld
    actief: bool = True

class ArtikelCreate(ArtikelBase):
    pass

class ArtikelResponse(ArtikelBase):
    id: str
    user_id: str
    huidige_voorraad: float = 0.0
    gemiddelde_kostprijs: float = 0.0
    voorraadwaarde: float = 0.0
    created_at: str
    updated_at: Optional[str] = None

# === Magazijn Models ===
class MagazijnBase(BaseModel):
    code: str
    naam: str
    adres: Optional[str] = None
    contactpersoon: Optional[str] = None
    actief: bool = True

class MagazijnCreate(MagazijnBase):
    pass

class MagazijnResponse(MagazijnBase):
    id: str
    user_id: str
    created_at: str

class MagazijnLocatieBase(BaseModel):
    magazijn_id: str
    code: str
    naam: str
    capaciteit: Optional[float] = None

class MagazijnLocatieCreate(MagazijnLocatieBase):
    pass

class MagazijnLocatieResponse(MagazijnLocatieBase):
    id: str
    user_id: str
    created_at: str

# === Voorraad Mutatie Models ===
class VoorraadMutatieBase(BaseModel):
    artikel_id: str
    magazijn_id: str
    locatie_id: Optional[str] = None
    type: MutatieTypeEnum
    aantal: float
    kostprijs: Optional[float] = None
    referentie_type: Optional[str] = None  # inkooporder, verkooporder, etc.
    referentie_id: Optional[str] = None
    batch_nummer: Optional[str] = None
    serienummer: Optional[str] = None
    reden: Optional[str] = None

class VoorraadMutatieCreate(VoorraadMutatieBase):
    pass

class VoorraadMutatieResponse(VoorraadMutatieBase):
    id: str
    user_id: str
    mutatie_nummer: str
    voorraad_voor: float
    voorraad_na: float
    journaalpost_id: Optional[str] = None
    created_at: str
    created_by: str

# === Inkoop Order Models ===
class InkoopOrderRegelBase(BaseModel):
    artikel_id: Optional[str] = None
    omschrijving: str
    aantal: float
    eenheid: str = "stuk"
    prijs_per_eenheid: float
    btw_code: str = "I25"
    btw_percentage: float = 25.0
    geleverd_aantal: float = 0.0

class InkoopOrderBase(BaseModel):
    crediteur_id: str
    orderdatum: str
    verwachte_leverdatum: Optional[str] = None
    valuta: ValutaEnum = ValutaEnum.SRD
    koers: float = 1.0
    regels: List[InkoopOrderRegelBase]
    opmerkingen: Optional[str] = None
    magazijn_id: Optional[str] = None

class InkoopOrderCreate(InkoopOrderBase):
    pass

class InkoopOrderResponse(InkoopOrderBase):
    id: str
    user_id: str
    ordernummer: str
    subtotaal: float
    btw_totaal: float
    totaal: float
    status: OrderStatusEnum
    created_at: str
    updated_at: Optional[str] = None

# === Verkoop Order Models ===
class VerkoopOrderRegelBase(BaseModel):
    artikel_id: Optional[str] = None
    omschrijving: str
    aantal: float
    eenheid: str = "stuk"
    prijs_per_eenheid: float
    korting_percentage: float = 0.0
    btw_code: str = "V25"
    btw_percentage: float = 25.0
    geleverd_aantal: float = 0.0

class VerkoopOrderBase(BaseModel):
    debiteur_id: str
    orderdatum: str
    verwachte_leverdatum: Optional[str] = None
    valuta: ValutaEnum = ValutaEnum.SRD
    koers: float = 1.0
    regels: List[VerkoopOrderRegelBase]
    opmerkingen: Optional[str] = None
    magazijn_id: Optional[str] = None

class VerkoopOrderCreate(VerkoopOrderBase):
    pass

class VerkoopOrderResponse(VerkoopOrderBase):
    id: str
    user_id: str
    ordernummer: str
    subtotaal: float
    btw_totaal: float
    totaal: float
    status: OrderStatusEnum
    offerte_id: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# === Offerte Models ===
class OfferteRegelBase(BaseModel):
    artikel_id: Optional[str] = None
    omschrijving: str
    aantal: float
    eenheid: str = "stuk"
    prijs_per_eenheid: float
    korting_percentage: float = 0.0
    btw_code: str = "V25"
    btw_percentage: float = 25.0

class OfferteBase(BaseModel):
    debiteur_id: str
    offertedatum: str
    geldig_tot: str
    valuta: ValutaEnum = ValutaEnum.SRD
    koers: float = 1.0
    regels: List[OfferteRegelBase]
    opmerkingen: Optional[str] = None
    voorwaarden: Optional[str] = None

class OfferteCreate(OfferteBase):
    pass

class OfferteResponse(OfferteBase):
    id: str
    user_id: str
    offertenummer: str
    subtotaal: float
    btw_totaal: float
    totaal: float
    status: str = "concept"  # concept, verzonden, geaccepteerd, afgewezen, verlopen
    order_id: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# === Project Models ===
class ProjectBase(BaseModel):
    naam: str
    code: str
    omschrijving: Optional[str] = None
    klant_id: Optional[str] = None
    projectmanager: Optional[str] = None
    startdatum: str
    einddatum_gepland: Optional[str] = None
    valuta: ValutaEnum = ValutaEnum.SRD
    budget_uren: float = 0.0
    budget_kosten: float = 0.0
    budget_materialen: float = 0.0
    uurtarief: float = 0.0
    facturatiemethode: str = "uren_tarief"  # uren_tarief, fixed_price, voortgang
    fixed_price_bedrag: float = 0.0
    categorie: str = "klant"  # klant, intern, onderhoud

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    user_id: str
    projectnummer: str
    status: ProjectStatusEnum = ProjectStatusEnum.OPEN
    gerealiseerde_uren: float = 0.0
    gerealiseerde_kosten: float = 0.0
    gerealiseerde_materialen: float = 0.0
    gefactureerd_bedrag: float = 0.0
    created_at: str
    updated_at: Optional[str] = None

# === Uren Models ===
class UrenRegistratieBase(BaseModel):
    project_id: str
    medewerker_id: Optional[str] = None
    medewerker_naam: str
    datum: str
    activiteit: str
    aantal_uren: float
    intern_tarief: float = 0.0
    extern_tarief: float = 0.0
    omschrijving: Optional[str] = None
    facturabel: bool = True

class UrenRegistratieCreate(UrenRegistratieBase):
    pass

class UrenRegistratieResponse(UrenRegistratieBase):
    id: str
    user_id: str
    status: str = "ingevoerd"  # ingevoerd, goedgekeurd, gefactureerd
    goedgekeurd_door: Optional[str] = None
    goedgekeurd_op: Optional[str] = None
    created_at: str

# === Document Models ===
class DocumentBase(BaseModel):
    naam: str
    type: str  # factuur, contract, bon, overig
    referentie_type: Optional[str] = None  # verkoopfactuur, inkoopfactuur, etc.
    referentie_id: Optional[str] = None
    omschrijving: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: str
    user_id: str
    bestandsnaam: str
    bestandsgrootte: int
    mime_type: str
    upload_datum: str
    geupload_door: str

# === Periode Models ===
class PeriodeBase(BaseModel):
    jaar: int
    maand: int
    naam: str

class PeriodeResponse(PeriodeBase):
    id: str
    user_id: str
    status: str = "open"  # open, gesloten
    afgesloten_op: Optional[str] = None
    afgesloten_door: Optional[str] = None

# === Dashboard Models ===
class DashboardKPIs(BaseModel):
    omzet_maand: Dict[str, float]  # per valuta
    omzet_jaar: Dict[str, float]
    kosten_maand: Dict[str, float]
    kosten_jaar: Dict[str, float]
    winst_maand: Dict[str, float]
    winst_jaar: Dict[str, float]
    openstaande_debiteuren: Dict[str, float]
    openstaande_crediteuren: Dict[str, float]
    bank_saldi: Dict[str, float]
    kas_saldo: float
    btw_te_betalen: float
    btw_te_vorderen: float
    btw_saldo: float
    voorraadwaarde: float
    aantal_openstaande_facturen: int
    aantal_vervallen_facturen: int

# === Rapportage Models ===
class BTWAangifteRapport(BaseModel):
    periode_van: str
    periode_tot: str
    omzet_hoog_tarief: float
    omzet_laag_tarief: float
    omzet_nul_tarief: float
    omzet_vrijgesteld: float
    btw_hoog_tarief: float
    btw_laag_tarief: float
    totaal_btw_verkoop: float
    inkoop_btw_aftrekbaar: float
    btw_te_betalen: float
    details: List[Dict[str, Any]]

class BalansRapport(BaseModel):
    datum: str
    activa: Dict[str, Any]
    passiva: Dict[str, Any]
    eigen_vermogen: Dict[str, Any]
    totaal_activa: float
    totaal_passiva_ev: float

class WinstVerliesRapport(BaseModel):
    periode_van: str
    periode_tot: str
    omzet: Dict[str, float]
    kosten: Dict[str, float]
    bruto_winst: float
    netto_winst: float

# ==================== DATABASE DEPENDENCY ====================

async def get_db():
    """Get database instance from main app"""
    from server import db
    return db

async def get_current_user(request):
    """Get current authenticated user"""
    from server import get_current_user as main_get_current_user, security
    from fastapi import Request
    # This will be injected by the main app
    return await main_get_current_user(request)

# ==================== HELPER FUNCTIONS ====================

def generate_nummer(prefix: str, count: int) -> str:
    """Generate sequential number with prefix"""
    jaar = datetime.now().year
    return f"{prefix}{jaar}-{count:05d}"

async def get_next_nummer(db, collection: str, prefix: str, user_id: str) -> str:
    """Get next sequential number for a collection"""
    jaar = datetime.now().year
    pattern = f"^{prefix}{jaar}-"
    
    last_doc = await db[collection].find_one(
        {"user_id": user_id, "$or": [
            {"factuurnummer": {"$regex": pattern}},
            {"ordernummer": {"$regex": pattern}},
            {"offertenummer": {"$regex": pattern}},
            {"projectnummer": {"$regex": pattern}},
            {"activum_nummer": {"$regex": pattern}},
            {"boekstuknummer": {"$regex": pattern}},
            {"mutatie_nummer": {"$regex": pattern}},
            {"kasmutatie_nummer": {"$regex": pattern}},
        ]},

# ==================== INITIALIZATION ENDPOINTS ====================

@router.post("/init/rekeningschema")
async def init_standaard_rekeningschema(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Initialize standard Surinamese chart of accounts"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if already initialized
    existing = await db.boekhouding_rekeningen.find_one({"user_id": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Rekeningschema bestaat al")
    
    rekeningen = []
    for rek in STANDAARD_REKENINGSCHEMA:
        rekeningen.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "nummer": rek["nummer"],
            "naam": rek["naam"],
            "type": rek["type"],
            "omschrijving": rek.get("omschrijving"),
            "parent_nummer": rek.get("parent"),
            "btw_relevant": rek.get("btw_relevant", False),
            "kostenplaats_verplicht": False,
            "valuta": "SRD",
            "saldo": 0.0,
            "actief": True,
            "created_at": now
        })
    
    await db.boekhouding_rekeningen.insert_many(rekeningen)
    return {"message": f"{len(rekeningen)} rekeningen aangemaakt", "count": len(rekeningen)}

@router.post("/init/btw-codes")
async def init_standaard_btw_codes(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Initialize standard Surinamese BTW codes"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.boekhouding_btw_codes.find_one({"user_id": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="BTW codes bestaan al")
    
    btw_codes = []
    for code in STANDAARD_BTW_CODES:
        btw_codes.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "code": code["code"],
            "omschrijving": code["omschrijving"],
            "percentage": code["percentage"],
            "type": code["type"],
            "rekening_btw_af_te_dragen": code.get("rekening_btw") if code["type"] == "verkoop" else None,
            "rekening_btw_te_vorderen": code.get("rekening_btw") if code["type"] == "inkoop" else None,
            "actief": True,
            "created_at": now
        })
    
    await db.boekhouding_btw_codes.insert_many(btw_codes)
    return {"message": f"{len(btw_codes)} BTW codes aangemaakt", "count": len(btw_codes)}

@router.post("/init/dagboeken")
async def init_standaard_dagboeken(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Initialize standard journals"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.boekhouding_dagboeken.find_one({"user_id": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Dagboeken bestaan al")
    
    dagboeken = []
    for db_item in STANDAARD_DAGBOEKEN:
        dagboeken.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "code": db_item["code"],
            "naam": db_item["naam"],
            "type": db_item["type"],
            "standaard_tegenrekening": db_item.get("tegenrekening"),
            "valuta": "SRD",
            "laatst_gebruikt_nummer": 0,
            "actief": True,
            "created_at": now
        })
    
    await db.boekhouding_dagboeken.insert_many(dagboeken)
    return {"message": f"{len(dagboeken)} dagboeken aangemaakt", "count": len(dagboeken)}

@router.post("/init/volledig")
async def init_volledig_systeem(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Initialize complete accounting system with all defaults"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    results = {"rekeningen": 0, "btw_codes": 0, "dagboeken": 0, "demo_data": False}
    
    # Init rekeningen if not exists
    if not await db.boekhouding_rekeningen.find_one({"user_id": user_id}):
        rekeningen = []
        for rek in STANDAARD_REKENINGSCHEMA:
            rekeningen.append({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "nummer": rek["nummer"],
                "naam": rek["naam"],
                "type": rek["type"],
                "omschrijving": rek.get("omschrijving"),
                "parent_nummer": rek.get("parent"),
                "btw_relevant": rek.get("btw_relevant", False),
                "kostenplaats_verplicht": False,
                "valuta": "SRD",
                "saldo": 0.0,
                "actief": True,
                "created_at": now
            })
        await db.boekhouding_rekeningen.insert_many(rekeningen)
        results["rekeningen"] = len(rekeningen)
    
    # Init BTW codes if not exists
    if not await db.boekhouding_btw_codes.find_one({"user_id": user_id}):
        btw_codes = []
        for code in STANDAARD_BTW_CODES:
            btw_codes.append({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "code": code["code"],
                "omschrijving": code["omschrijving"],
                "percentage": code["percentage"],
                "type": code["type"],
                "rekening_btw_af_te_dragen": code.get("rekening_btw") if code["type"] == "verkoop" else None,
                "rekening_btw_te_vorderen": code.get("rekening_btw") if code["type"] == "inkoop" else None,
                "actief": True,
                "created_at": now
            })
        await db.boekhouding_btw_codes.insert_many(btw_codes)
        results["btw_codes"] = len(btw_codes)
    
    # Init dagboeken if not exists
    if not await db.boekhouding_dagboeken.find_one({"user_id": user_id}):
        dagboeken = []
        for db_item in STANDAARD_DAGBOEKEN:
            dagboeken.append({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "code": db_item["code"],
                "naam": db_item["naam"],
                "type": db_item["type"],
                "standaard_tegenrekening": db_item.get("tegenrekening"),
                "valuta": "SRD",
                "laatst_gebruikt_nummer": 0,
                "actief": True,
                "created_at": now
            })
        await db.boekhouding_dagboeken.insert_many(dagboeken)
        results["dagboeken"] = len(dagboeken)
    
    return {
        "message": "Boekhouding geïnitialiseerd",
        "results": results
    }

# ==================== DASHBOARD ENDPOINTS ====================

@router.get("/dashboard")
async def get_dashboard(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get comprehensive dashboard KPIs"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    now = datetime.now()
    start_maand = datetime(now.year, now.month, 1).isoformat()
    start_jaar = datetime(now.year, 1, 1).isoformat()
    
    # Openstaande debiteuren
    debiteur_pipeline = [
        {"$match": {"user_id": user_id, "status": {"$in": ["verzonden", "gedeeltelijk_betaald", "vervallen"]}}},
        {"$group": {
            "_id": "$valuta",
            "totaal": {"$sum": "$openstaand_bedrag"}
        }}
    ]
    debiteur_result = await db.boekhouding_verkoopfacturen.aggregate(debiteur_pipeline).to_list(100)
    openstaande_debiteuren = {item["_id"]: item["totaal"] for item in debiteur_result}
    
    # Openstaande crediteuren
    crediteur_pipeline = [
        {"$match": {"user_id": user_id, "status": {"$in": ["verzonden", "gedeeltelijk_betaald", "vervallen"]}}},
        {"$group": {
            "_id": "$valuta",
            "totaal": {"$sum": "$openstaand_bedrag"}
        }}
    ]
    crediteur_result = await db.boekhouding_inkoopfacturen.aggregate(crediteur_pipeline).to_list(100)
    openstaande_crediteuren = {item["_id"]: item["totaal"] for item in crediteur_result}
    
    # Bank saldi
    bank_saldi = {}
    async for bank in db.boekhouding_bankrekeningen.find({"user_id": user_id, "actief": True}):
        valuta = bank.get("valuta", "SRD")
        if valuta not in bank_saldi:
            bank_saldi[valuta] = 0.0
        bank_saldi[valuta] += bank.get("huidig_saldo", 0.0)
    
    # Kas saldo
    kas_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": None,
            "totaal_in": {"$sum": "$bedrag_in"},
            "totaal_uit": {"$sum": "$bedrag_uit"}
        }}
    ]
    kas_result = await db.boekhouding_kasmutaties.aggregate(kas_pipeline).to_list(1)
    kas_saldo = 0.0
    if kas_result:
        kas_saldo = kas_result[0].get("totaal_in", 0) - kas_result[0].get("totaal_uit", 0)
    
    # BTW berekeningen
    btw_te_betalen = 0.0
    btw_te_vorderen = 0.0
    
    # BTW op verkoopfacturen
    btw_verkoop_pipeline = [
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_maand}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_totaal"}}}
    ]
    btw_verkoop = await db.boekhouding_verkoopfacturen.aggregate(btw_verkoop_pipeline).to_list(1)
    if btw_verkoop:
        btw_te_betalen = btw_verkoop[0].get("totaal", 0)
    
    # BTW op inkoopfacturen
    btw_inkoop_pipeline = [
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_maand}}},
        {"$group": {"_id": None, "totaal": {"$sum": "$btw_totaal"}}}
    ]
    btw_inkoop = await db.boekhouding_inkoopfacturen.aggregate(btw_inkoop_pipeline).to_list(1)
    if btw_inkoop:
        btw_te_vorderen = btw_inkoop[0].get("totaal", 0)
    
    # Voorraadwaarde
    voorraad_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "totaal": {"$sum": "$voorraadwaarde"}}}
    ]
    voorraad_result = await db.boekhouding_artikelen.aggregate(voorraad_pipeline).to_list(1)
    voorraadwaarde = voorraad_result[0].get("totaal", 0) if voorraad_result else 0
    
    # Aantal facturen
    aantal_open = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "gedeeltelijk_betaald"]}
    })
    aantal_vervallen = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id,
        "status": "vervallen"
    })
    
    # Omzet berekeningen (per maand en jaar)
    omzet_maand_pipeline = [
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_maand}, "status": {"$ne": "geannuleerd"}}},
        {"$group": {"_id": "$valuta", "totaal": {"$sum": "$subtotaal"}}}
    ]
    omzet_maand_result = await db.boekhouding_verkoopfacturen.aggregate(omzet_maand_pipeline).to_list(10)
    omzet_maand = {item["_id"]: item["totaal"] for item in omzet_maand_result}
    
    omzet_jaar_pipeline = [
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_jaar}, "status": {"$ne": "geannuleerd"}}},
        {"$group": {"_id": "$valuta", "totaal": {"$sum": "$subtotaal"}}}
    ]
    omzet_jaar_result = await db.boekhouding_verkoopfacturen.aggregate(omzet_jaar_pipeline).to_list(10)
    omzet_jaar = {item["_id"]: item["totaal"] for item in omzet_jaar_result}
    
    # Kosten berekeningen
    kosten_maand_pipeline = [
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_maand}, "status": {"$ne": "geannuleerd"}}},
        {"$group": {"_id": "$valuta", "totaal": {"$sum": "$subtotaal"}}}
    ]
    kosten_maand_result = await db.boekhouding_inkoopfacturen.aggregate(kosten_maand_pipeline).to_list(10)
    kosten_maand = {item["_id"]: item["totaal"] for item in kosten_maand_result}
    
    kosten_jaar_pipeline = [
        {"$match": {"user_id": user_id, "factuurdatum": {"$gte": start_jaar}, "status": {"$ne": "geannuleerd"}}},
        {"$group": {"_id": "$valuta", "totaal": {"$sum": "$subtotaal"}}}
    ]
    kosten_jaar_result = await db.boekhouding_inkoopfacturen.aggregate(kosten_jaar_pipeline).to_list(10)
    kosten_jaar = {item["_id"]: item["totaal"] for item in kosten_jaar_result}
    
    # Winst berekeningen
    winst_maand = {}
    winst_jaar = {}
    for valuta in set(list(omzet_maand.keys()) + list(kosten_maand.keys())):
        winst_maand[valuta] = omzet_maand.get(valuta, 0) - kosten_maand.get(valuta, 0)
    for valuta in set(list(omzet_jaar.keys()) + list(kosten_jaar.keys())):
        winst_jaar[valuta] = omzet_jaar.get(valuta, 0) - kosten_jaar.get(valuta, 0)
    
    return {
        "omzet_maand": omzet_maand,
        "omzet_jaar": omzet_jaar,
        "kosten_maand": kosten_maand,
        "kosten_jaar": kosten_jaar,
        "winst_maand": winst_maand,
        "winst_jaar": winst_jaar,
        "openstaande_debiteuren": openstaande_debiteuren,
        "openstaande_crediteuren": openstaande_crediteuren,
        "bank_saldi": bank_saldi,
        "kas_saldo": kas_saldo,
        "btw_te_betalen": btw_te_betalen,
        "btw_te_vorderen": btw_te_vorderen,
        "btw_saldo": btw_te_betalen - btw_te_vorderen,
        "voorraadwaarde": voorraadwaarde,
        "aantal_openstaande_facturen": aantal_open,
        "aantal_vervallen_facturen": aantal_vervallen
    }

@router.get("/dashboard/grafieken/omzet")
async def get_omzet_grafiek(
    periode: str = Query("jaar", description="maand of jaar"),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Get revenue chart data per month"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    now = datetime.now()
    if periode == "maand":
        start_date = datetime(now.year, now.month, 1)
    else:
        start_date = datetime(now.year, 1, 1)
    
    pipeline = [
        {"$match": {
            "user_id": user_id, 
            "factuurdatum": {"$gte": start_date.isoformat()},
            "status": {"$ne": "geannuleerd"}
        }},
        {"$addFields": {
            "maand": {"$substr": ["$factuurdatum", 0, 7]}
        }},
        {"$group": {
            "_id": {"maand": "$maand", "valuta": "$valuta"},
            "omzet": {"$sum": "$subtotaal"},
            "btw": {"$sum": "$btw_totaal"}
        }},
        {"$sort": {"_id.maand": 1}}
    ]
    
    result = await db.boekhouding_verkoopfacturen.aggregate(pipeline).to_list(100)
    
    # Restructure data
    data = {}
    for item in result:
        maand = item["_id"]["maand"]
        valuta = item["_id"]["valuta"]
        if maand not in data:
            data[maand] = {}
        data[maand][valuta] = {
            "omzet": item["omzet"],
            "btw": item["btw"]
        }
    
    return {"periode": periode, "data": data}

@router.get("/dashboard/actielijst")
async def get_actielijst(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get action items for dashboard"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    today = datetime.now().strftime("%Y-%m-%d")
    
    acties = []
    
    # Vervallen facturen
    vervallen_count = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id,
        "vervaldatum": {"$lt": today},
        "status": {"$in": ["verzonden", "gedeeltelijk_betaald"]}
    })
    if vervallen_count > 0:
        acties.append({
            "type": "vervallen_facturen",
            "prioriteit": "hoog",
            "aantal": vervallen_count,
            "bericht": f"{vervallen_count} vervallen facturen vereisen actie",
            "actie": "Stuur herinneringen"
        })
    
    # Te verwerken bankmutaties
    bankmutaties_count = await db.boekhouding_bankmutaties.count_documents({
        "user_id": user_id,
        "status": "te_verwerken"
    })
    if bankmutaties_count > 0:
        acties.append({
            "type": "bankmutaties",
            "prioriteit": "medium",
            "aantal": bankmutaties_count,
            "bericht": f"{bankmutaties_count} bankmutaties te verwerken",
            "actie": "Ga naar bankreconciliatie"
        })
    
    # Te betalen inkoopfacturen
    binnenkort_vervallen = await db.boekhouding_inkoopfacturen.count_documents({
        "user_id": user_id,
        "vervaldatum": {"$lte": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")},
        "status": {"$in": ["verzonden", "gedeeltelijk_betaald"]}
    })
    if binnenkort_vervallen > 0:
        acties.append({
            "type": "te_betalen",
            "prioriteit": "medium",
            "aantal": binnenkort_vervallen,
            "bericht": f"{binnenkort_vervallen} facturen binnen 7 dagen te betalen",
            "actie": "Bekijk betaallijst"
        })
    
    # Lage voorraad
    lage_voorraad_count = await db.boekhouding_artikelen.count_documents({
        "user_id": user_id,
        "voorraad_artikel": True,
        "$expr": {"$lt": ["$huidige_voorraad", "$min_voorraad"]}
    })
    if lage_voorraad_count > 0:
        acties.append({
            "type": "lage_voorraad",
            "prioriteit": "laag",
            "aantal": lage_voorraad_count,
            "bericht": f"{lage_voorraad_count} artikelen onder minimum voorraad",
            "actie": "Bekijk inkoopadvies"
        })
    
    return {"acties": acties}

# ==================== GROOTBOEK ENDPOINTS ====================

@router.get("/rekeningen")
async def list_rekeningen(
    type: Optional[str] = None,
    actief: bool = True,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List all accounts"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if type:
        query["type"] = type
    if actief is not None:
        query["actief"] = actief
    
    rekeningen = []
    async for rek in db.boekhouding_rekeningen.find(query).sort("nummer", 1):
        rek.pop("_id", None)
        rekeningen.append(rek)
    
    return rekeningen

@router.post("/rekeningen")
async def create_rekening(data: RekeningCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a new account"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Check for duplicate nummer
    existing = await db.boekhouding_rekeningen.find_one({
        "user_id": user_id, 
        "nummer": data.nummer
    })
    if existing:
        raise HTTPException(status_code=400, detail="Rekeningnummer bestaat al")
    
    rekening = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.model_dump(),
        "saldo": 0.0,
        "created_at": now
    }
    
    await db.boekhouding_rekeningen.insert_one(rekening)
    rekening.pop("_id", None)
    return rekening

@router.put("/rekeningen/{rekening_id}")
async def update_rekening(rekening_id: str, data: RekeningCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Update an account"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.boekhouding_rekeningen.update_one(
        {"id": rekening_id, "user_id": user_id},
        {"$set": {**data.model_dump(), "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rekening niet gevonden")
    
    rekening = await db.boekhouding_rekeningen.find_one({"id": rekening_id})
    rekening.pop("_id", None)
    return rekening

@router.get("/rekeningen/{nummer}/grootboekkaart")
async def get_grootboekkaart(
    nummer: str,
    periode_van: Optional[str] = None,
    periode_tot: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Get ledger card for an account"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    rekening = await db.boekhouding_rekeningen.find_one({
        "user_id": user_id,
        "nummer": nummer
    })
    if not rekening:
        raise HTTPException(status_code=404, detail="Rekening niet gevonden")
    
    # Get all journal entries for this account
    query = {"user_id": user_id, "regels.rekening_nummer": nummer}
    if periode_van:
        query["datum"] = {"$gte": periode_van}
    if periode_tot:
        if "datum" in query:
            query["datum"]["$lte"] = periode_tot
        else:
            query["datum"] = {"$lte": periode_tot}
    
    mutaties = []
    lopend_saldo = 0.0
    
    async for post in db.boekhouding_journaalposten.find(query).sort("datum", 1):
        for regel in post.get("regels", []):
            if regel.get("rekening_nummer") == nummer:
                debet = regel.get("debet", 0)
                credit = regel.get("credit", 0)
                lopend_saldo += debet - credit
                
                mutaties.append({
                    "datum": post.get("datum"),
                    "boekstuknummer": post.get("boekstuknummer"),
                    "omschrijving": regel.get("omschrijving"),
                    "debet": debet,
                    "credit": credit,
                    "saldo": lopend_saldo
                })
    
    return {
        "rekening": {
            "nummer": rekening["nummer"],
            "naam": rekening["naam"],
            "type": rekening["type"]
        },
        "periode_van": periode_van,
        "periode_tot": periode_tot,
        "mutaties": mutaties,
        "eindsaldo": lopend_saldo
    }

# === Dagboeken ===
@router.get("/dagboeken")
async def list_dagboeken(db=Depends(get_db), current_user=Depends(get_current_user)):
    """List all journals"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    dagboeken = []
    async for dagboek in db.boekhouding_dagboeken.find({"user_id": user_id}).sort("code", 1):
        dagboek.pop("_id", None)
        dagboeken.append(dagboek)
    
    return dagboeken

@router.post("/dagboeken")
async def create_dagboek(data: DagboekCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a new journal"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.boekhouding_dagboeken.find_one({
        "user_id": user_id, 
        "code": data.code
    })
    if existing:
        raise HTTPException(status_code=400, detail="Dagboekcode bestaat al")
    
    dagboek = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.model_dump(),
        "laatst_gebruikt_nummer": 0,
        "created_at": now
    }
    
    await db.boekhouding_dagboeken.insert_one(dagboek)
    dagboek.pop("_id", None)
    return dagboek

# === Journaalposten ===
@router.get("/journaalposten")
async def list_journaalposten(
    dagboek: Optional[str] = None,
    periode_van: Optional[str] = None,
    periode_tot: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List journal entries"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if dagboek:
        query["dagboek_code"] = dagboek
    if periode_van:
        query["datum"] = {"$gte": periode_van}
    if periode_tot:
        if "datum" in query:
            query["datum"]["$lte"] = periode_tot
        else:
            query["datum"] = {"$lte": periode_tot}
    
    posten = []
    async for post in db.boekhouding_journaalposten.find(query).sort("datum", -1).skip(offset).limit(limit):
        post.pop("_id", None)
        posten.append(post)
    
    total = await db.boekhouding_journaalposten.count_documents(query)
    
    return {"items": posten, "total": total}

@router.post("/journaalposten")
async def create_journaalpost(data: JournaalpostCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a journal entry"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate balance
    totaal_debet = sum(r.debet for r in data.regels)
    totaal_credit = sum(r.credit for r in data.regels)
    
    if abs(totaal_debet - totaal_credit) > 0.01:
        raise HTTPException(
            status_code=400, 
            detail=f"Boeking niet in balans: debet {totaal_debet} != credit {totaal_credit}"
        )
    
    # Get dagboek and increment nummer
    dagboek = await db.boekhouding_dagboeken.find_one({
        "user_id": user_id,
        "code": data.dagboek_code
    })
    if not dagboek:
        raise HTTPException(status_code=404, detail="Dagboek niet gevonden")
    
    nieuw_nummer = dagboek.get("laatst_gebruikt_nummer", 0) + 1
    await db.boekhouding_dagboeken.update_one(
        {"id": dagboek["id"]},
        {"$set": {"laatst_gebruikt_nummer": nieuw_nummer}}
    )
    
    jaar = datetime.now().year
    maand = datetime.now().month
    boekstuknummer = f"{data.dagboek_code}{jaar}-{nieuw_nummer:05d}"
    
    journaalpost = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "boekstuknummer": boekstuknummer,
        "periode": f"{jaar}-{maand:02d}",
        "status": "geboekt",
        "created_at": now,
        "created_by": user_id,
        **data.model_dump()
    }
    
    # Convert regels to dict
    journaalpost["regels"] = [r.model_dump() for r in data.regels]
    
    await db.boekhouding_journaalposten.insert_one(journaalpost)
    
    # Update account balances
    for regel in journaalpost["regels"]:
        await db.boekhouding_rekeningen.update_one(
            {"user_id": user_id, "nummer": regel["rekening_nummer"]},
            {"$inc": {"saldo": regel["debet"] - regel["credit"]}}
        )
    
    journaalpost.pop("_id", None)
    return journaalpost

# ==================== DEBITEUREN ENDPOINTS ====================

@router.get("/debiteuren")
async def list_debiteuren(
    actief: Optional[bool] = None,
    zoek: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List all debtors"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if actief is not None:
        query["actief"] = actief
    if zoek:
        query["$or"] = [
            {"bedrijfsnaam": {"$regex": zoek, "$options": "i"}},
            {"klantnummer": {"$regex": zoek, "$options": "i"}},
            {"email": {"$regex": zoek, "$options": "i"}}
        ]
    
    debiteuren = []
    async for deb in db.boekhouding_debiteuren.find(query).sort("bedrijfsnaam", 1):
        deb.pop("_id", None)
        debiteuren.append(deb)
    
    return debiteuren

@router.post("/debiteuren")
async def create_debiteur(data: DebiteurCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a new debtor"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate klantnummer if not provided
    klantnummer = data.klantnummer
    if not klantnummer:
        count = await db.boekhouding_debiteuren.count_documents({"user_id": user_id})
        klantnummer = f"K{count + 1:05d}"
    
    debiteur = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.model_dump(),
        "klantnummer": klantnummer,
        "openstaand_saldo": 0.0,
        "created_at": now
    }
    
    await db.boekhouding_debiteuren.insert_one(debiteur)
    debiteur.pop("_id", None)
    return debiteur

@router.get("/debiteuren/{debiteur_id}")
async def get_debiteur(debiteur_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get debtor details"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    debiteur = await db.boekhouding_debiteuren.find_one({
        "user_id": user_id,
        "id": debiteur_id
    })
    if not debiteur:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    
    debiteur.pop("_id", None)
    return debiteur

@router.put("/debiteuren/{debiteur_id}")
async def update_debiteur(debiteur_id: str, data: DebiteurCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Update a debtor"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.boekhouding_debiteuren.update_one(
        {"id": debiteur_id, "user_id": user_id},
        {"$set": {**data.model_dump(), "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    
    debiteur = await db.boekhouding_debiteuren.find_one({"id": debiteur_id})
    debiteur.pop("_id", None)
    return debiteur

@router.delete("/debiteuren/{debiteur_id}")
async def delete_debiteur(debiteur_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Delete (deactivate) a debtor"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    # Check for open invoices
    open_facturen = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id,
        "debiteur_id": debiteur_id,
        "status": {"$nin": ["betaald", "geannuleerd"]}
    })
    
    if open_facturen > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Kan debiteur niet verwijderen: {open_facturen} openstaande facturen"
        )
    
    await db.boekhouding_debiteuren.update_one(
        {"id": debiteur_id, "user_id": user_id},
        {"$set": {"actief": False}}
    )
    
    return {"message": "Debiteur gedeactiveerd"}

@router.get("/debiteuren/{debiteur_id}/openstaand")
async def get_debiteur_openstaand(debiteur_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get open invoices for a debtor"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    facturen = []
    async for fac in db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "debiteur_id": debiteur_id,
        "status": {"$in": ["verzonden", "gedeeltelijk_betaald", "vervallen"]}
    }).sort("factuurdatum", 1):
        fac.pop("_id", None)
        facturen.append(fac)
    
    return facturen

@router.get("/debiteuren/aging")
async def get_debiteuren_aging(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get aging analysis for debtors"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    today = datetime.now()
    
    buckets = {
        "0-30": {"count": 0, "bedrag": {}},
        "31-60": {"count": 0, "bedrag": {}},
        "61-90": {"count": 0, "bedrag": {}},
        "90+": {"count": 0, "bedrag": {}}
    }
    
    async for fac in db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$in": ["verzonden", "gedeeltelijk_betaald", "vervallen"]}
    }):
        if fac.get("factuurdatum"):
            fac_date = datetime.fromisoformat(fac["factuurdatum"].replace("Z", "+00:00")).replace(tzinfo=None)
            days = (today - fac_date).days
            valuta = fac.get("valuta", "SRD")
            bedrag = fac.get("openstaand_bedrag", 0)
            
            if days <= 30:
                bucket = "0-30"
            elif days <= 60:
                bucket = "31-60"
            elif days <= 90:
                bucket = "61-90"
            else:
                bucket = "90+"
            
            buckets[bucket]["count"] += 1
            if valuta not in buckets[bucket]["bedrag"]:
                buckets[bucket]["bedrag"][valuta] = 0
            buckets[bucket]["bedrag"][valuta] += bedrag
    
    return buckets

# ==================== CREDITEUREN ENDPOINTS ====================

@router.get("/crediteuren")
async def list_crediteuren(
    actief: Optional[bool] = None,
    zoek: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List all creditors"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if actief is not None:
        query["actief"] = actief
    if zoek:
        query["$or"] = [
            {"bedrijfsnaam": {"$regex": zoek, "$options": "i"}},
            {"leveranciersnummer": {"$regex": zoek, "$options": "i"}},
            {"email": {"$regex": zoek, "$options": "i"}}
        ]
    
    crediteuren = []
    async for cred in db.boekhouding_crediteuren.find(query).sort("bedrijfsnaam", 1):
        cred.pop("_id", None)
        crediteuren.append(cred)
    
    return crediteuren

@router.post("/crediteuren")
async def create_crediteur(data: CrediteurCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a new creditor"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate leveranciersnummer if not provided
    leveranciersnummer = data.leveranciersnummer
    if not leveranciersnummer:
        count = await db.boekhouding_crediteuren.count_documents({"user_id": user_id})
        leveranciersnummer = f"L{count + 1:05d}"
    
    crediteur = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.model_dump(),
        "leveranciersnummer": leveranciersnummer,
        "openstaand_saldo": 0.0,
        "created_at": now
    }
    
    await db.boekhouding_crediteuren.insert_one(crediteur)
    crediteur.pop("_id", None)
    return crediteur

@router.get("/crediteuren/{crediteur_id}")
async def get_crediteur(crediteur_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get creditor details"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    crediteur = await db.boekhouding_crediteuren.find_one({
        "user_id": user_id,
        "id": crediteur_id
    })
    if not crediteur:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    
    crediteur.pop("_id", None)
    return crediteur

@router.put("/crediteuren/{crediteur_id}")
async def update_crediteur(crediteur_id: str, data: CrediteurCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Update a creditor"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.boekhouding_crediteuren.update_one(
        {"id": crediteur_id, "user_id": user_id},
        {"$set": {**data.model_dump(), "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    
    crediteur = await db.boekhouding_crediteuren.find_one({"id": crediteur_id})
    crediteur.pop("_id", None)
    return crediteur

@router.get("/crediteuren/betaaladvies")
async def get_betaaladvies(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get payment advice - invoices due for payment"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    today = datetime.now().strftime("%Y-%m-%d")
    next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    facturen = []
    async for fac in db.boekhouding_inkoopfacturen.find({
        "user_id": user_id,
        "vervaldatum": {"$lte": next_week},
        "status": {"$in": ["verzonden", "gedeeltelijk_betaald"]}
    }).sort("vervaldatum", 1):
        fac.pop("_id", None)
        
        # Get crediteur info
        crediteur = await db.boekhouding_crediteuren.find_one({"id": fac.get("crediteur_id")})
        if crediteur:
            fac["crediteur_naam"] = crediteur.get("bedrijfsnaam")
            fac["iban"] = crediteur.get("iban")
        
        fac["vervallen"] = fac.get("vervaldatum", "") < today
        facturen.append(fac)
    
    return facturen

        sort=[("created_at", -1)]
    )
    
    if last_doc:
        # Extract number from various field names
        for field in ["factuurnummer", "ordernummer", "offertenummer", "projectnummer", 
                      "activum_nummer", "boekstuknummer", "mutatie_nummer", "kasmutatie_nummer"]:
            if field in last_doc and last_doc[field]:
                try:
                    num = int(last_doc[field].split("-")[-1])
                    return generate_nummer(prefix, num + 1)
                except:
                    pass
    
    return generate_nummer(prefix, 1)

def calculate_btw(bedrag: float, percentage: float) -> float:
    """Calculate BTW amount"""
    return round(bedrag * (percentage / 100), 2)

def calculate_factuur_totalen(regels: List[dict]) -> dict:
    """Calculate invoice totals"""
    subtotaal = 0.0
    btw_totaal = 0.0
    
    for regel in regels:
        regel_subtotaal = regel.get("aantal", 1) * regel.get("prijs_per_eenheid", 0)
        korting = regel_subtotaal * (regel.get("korting_percentage", 0) / 100)
        regel_netto = regel_subtotaal - korting
        btw = calculate_btw(regel_netto, regel.get("btw_percentage", 0))
        
        subtotaal += regel_netto
        btw_totaal += btw
    
    return {
        "subtotaal": round(subtotaal, 2),
        "btw_totaal": round(btw_totaal, 2),
        "totaal": round(subtotaal + btw_totaal, 2)
    }

# ==================== STANDAARD REKENINGSCHEMA SURINAME ====================

STANDAARD_REKENINGSCHEMA = [
    # ACTIVA (1xxx)
    {"nummer": "1000", "naam": "Vaste activa", "type": "activa", "parent": None},
    {"nummer": "1010", "naam": "Gebouwen", "type": "activa", "parent": "1000"},
    {"nummer": "1011", "naam": "Afschrijving gebouwen", "type": "activa", "parent": "1000"},
    {"nummer": "1020", "naam": "Machines en installaties", "type": "activa", "parent": "1000"},
    {"nummer": "1021", "naam": "Afschrijving machines", "type": "activa", "parent": "1000"},
    {"nummer": "1030", "naam": "Inventaris", "type": "activa", "parent": "1000"},
    {"nummer": "1031", "naam": "Afschrijving inventaris", "type": "activa", "parent": "1000"},
    {"nummer": "1040", "naam": "Voertuigen", "type": "activa", "parent": "1000"},
    {"nummer": "1041", "naam": "Afschrijving voertuigen", "type": "activa", "parent": "1000"},
    {"nummer": "1050", "naam": "Computers en hardware", "type": "activa", "parent": "1000"},
    {"nummer": "1051", "naam": "Afschrijving computers", "type": "activa", "parent": "1000"},
    {"nummer": "1060", "naam": "Software", "type": "activa", "parent": "1000"},
    {"nummer": "1061", "naam": "Afschrijving software", "type": "activa", "parent": "1000"},
    
    {"nummer": "1100", "naam": "Liquide middelen", "type": "activa", "parent": None},
    {"nummer": "1110", "naam": "Kas SRD", "type": "activa", "parent": "1100"},
    {"nummer": "1120", "naam": "Bank SRD", "type": "activa", "parent": "1100"},
    {"nummer": "1121", "naam": "Bank USD", "type": "activa", "parent": "1100"},
    {"nummer": "1122", "naam": "Bank EUR", "type": "activa", "parent": "1100"},
    
    {"nummer": "1200", "naam": "Vorderingen", "type": "activa", "parent": None},
    {"nummer": "1210", "naam": "Debiteuren", "type": "activa", "parent": "1200"},
    {"nummer": "1220", "naam": "Te vorderen BTW", "type": "activa", "parent": "1200", "btw_relevant": True},
    {"nummer": "1230", "naam": "Overige vorderingen", "type": "activa", "parent": "1200"},
    
    {"nummer": "1300", "naam": "Voorraden", "type": "activa", "parent": None},
    {"nummer": "1310", "naam": "Voorraad handelsgoederen", "type": "activa", "parent": "1300"},
    {"nummer": "1320", "naam": "Voorraad grondstoffen", "type": "activa", "parent": "1300"},
    {"nummer": "1330", "naam": "Goederen onderweg", "type": "activa", "parent": "1300"},
    
    # PASSIVA (2xxx)
    {"nummer": "2000", "naam": "Kortlopende schulden", "type": "passiva", "parent": None},
    {"nummer": "2010", "naam": "Crediteuren", "type": "passiva", "parent": "2000"},
    {"nummer": "2020", "naam": "Te betalen BTW", "type": "passiva", "parent": "2000", "btw_relevant": True},
    {"nummer": "2030", "naam": "Te betalen loonbelasting", "type": "passiva", "parent": "2000"},
    {"nummer": "2040", "naam": "Te betalen pensioenpremies", "type": "passiva", "parent": "2000"},
    {"nummer": "2050", "naam": "Overige te betalen posten", "type": "passiva", "parent": "2000"},
    
    {"nummer": "2100", "naam": "Langlopende schulden", "type": "passiva", "parent": None},
    {"nummer": "2110", "naam": "Bankleningen", "type": "passiva", "parent": "2100"},
    {"nummer": "2120", "naam": "Hypotheek", "type": "passiva", "parent": "2100"},
    
    # EIGEN VERMOGEN (3xxx)
    {"nummer": "3000", "naam": "Eigen vermogen", "type": "eigen_vermogen", "parent": None},
    {"nummer": "3010", "naam": "Aandelenkapitaal", "type": "eigen_vermogen", "parent": "3000"},
    {"nummer": "3020", "naam": "Reserves", "type": "eigen_vermogen", "parent": "3000"},
    {"nummer": "3030", "naam": "Onverdeelde winst", "type": "eigen_vermogen", "parent": "3000"},
    {"nummer": "3040", "naam": "Resultaat lopend boekjaar", "type": "eigen_vermogen", "parent": "3000"},
    
    # OMZET (4xxx)
    {"nummer": "4000", "naam": "Omzet", "type": "omzet", "parent": None},
    {"nummer": "4010", "naam": "Omzet handelsgoederen", "type": "omzet", "parent": "4000"},
    {"nummer": "4020", "naam": "Omzet diensten", "type": "omzet", "parent": "4000"},
    {"nummer": "4030", "naam": "Omzet projecten", "type": "omzet", "parent": "4000"},
    {"nummer": "4100", "naam": "Kortingen", "type": "omzet", "parent": "4000"},
    {"nummer": "4110", "naam": "Verleende kortingen", "type": "omzet", "parent": "4100"},
    
    # KOSTEN (5xxx - 9xxx)
    {"nummer": "5000", "naam": "Kostprijs omzet", "type": "kosten", "parent": None},
    {"nummer": "5010", "naam": "Inkoopwaarde handelsgoederen", "type": "kosten", "parent": "5000"},
    {"nummer": "5020", "naam": "Inkoopwaarde grondstoffen", "type": "kosten", "parent": "5000"},
    {"nummer": "5030", "naam": "Voorraadmutaties", "type": "kosten", "parent": "5000"},
    
    {"nummer": "6000", "naam": "Personeelskosten", "type": "kosten", "parent": None},
    {"nummer": "6010", "naam": "Lonen en salarissen", "type": "kosten", "parent": "6000"},
    {"nummer": "6020", "naam": "Sociale lasten", "type": "kosten", "parent": "6000"},
    {"nummer": "6030", "naam": "Pensioenpremies", "type": "kosten", "parent": "6000"},
    {"nummer": "6040", "naam": "Overige personeelskosten", "type": "kosten", "parent": "6000"},
    
    {"nummer": "7000", "naam": "Huisvestingskosten", "type": "kosten", "parent": None},
    {"nummer": "7010", "naam": "Huur", "type": "kosten", "parent": "7000"},
    {"nummer": "7020", "naam": "Gas, water, elektra", "type": "kosten", "parent": "7000"},
    {"nummer": "7030", "naam": "Onderhoud pand", "type": "kosten", "parent": "7000"},
    {"nummer": "7040", "naam": "Verzekeringen pand", "type": "kosten", "parent": "7000"},
    
    {"nummer": "8000", "naam": "Afschrijvingen", "type": "kosten", "parent": None},
    {"nummer": "8010", "naam": "Afschrijving gebouwen", "type": "kosten", "parent": "8000"},
    {"nummer": "8020", "naam": "Afschrijving machines", "type": "kosten", "parent": "8000"},
    {"nummer": "8030", "naam": "Afschrijving inventaris", "type": "kosten", "parent": "8000"},
    {"nummer": "8040", "naam": "Afschrijving voertuigen", "type": "kosten", "parent": "8000"},
    {"nummer": "8050", "naam": "Afschrijving computers", "type": "kosten", "parent": "8000"},
    
    {"nummer": "9000", "naam": "Overige bedrijfskosten", "type": "kosten", "parent": None},
    {"nummer": "9010", "naam": "Kantoorkosten", "type": "kosten", "parent": "9000"},
    {"nummer": "9020", "naam": "Autokosten", "type": "kosten", "parent": "9000"},
    {"nummer": "9030", "naam": "Verkoopkosten", "type": "kosten", "parent": "9000"},
    {"nummer": "9040", "naam": "Algemene kosten", "type": "kosten", "parent": "9000"},
    {"nummer": "9050", "naam": "Bankkosten", "type": "kosten", "parent": "9000"},
    {"nummer": "9060", "naam": "Rentekosten", "type": "kosten", "parent": "9000"},
    {"nummer": "9070", "naam": "Koersverschillen", "type": "kosten", "parent": "9000"},
    {"nummer": "9080", "naam": "Accountantskosten", "type": "kosten", "parent": "9000"},
    {"nummer": "9090", "naam": "Advieskosten", "type": "kosten", "parent": "9000"},
]

STANDAARD_BTW_CODES = [
    # Verkoop BTW codes
    {"code": "V25", "omschrijving": "Verkoop hoog tarief 25%", "percentage": 25.0, "type": "verkoop", "rekening_btw": "2020"},
    {"code": "V10", "omschrijving": "Verkoop laag tarief 10%", "percentage": 10.0, "type": "verkoop", "rekening_btw": "2020"},
    {"code": "V0", "omschrijving": "Verkoop 0%", "percentage": 0.0, "type": "verkoop", "rekening_btw": None},
    {"code": "VV", "omschrijving": "Verkoop vrijgesteld", "percentage": 0.0, "type": "verkoop", "rekening_btw": None},
    {"code": "VE", "omschrijving": "Export (0%)", "percentage": 0.0, "type": "verkoop", "rekening_btw": None},
    
    # Inkoop BTW codes
    {"code": "I25", "omschrijving": "Inkoop hoog tarief 25%", "percentage": 25.0, "type": "inkoop", "rekening_btw": "1220"},
    {"code": "I10", "omschrijving": "Inkoop laag tarief 10%", "percentage": 10.0, "type": "inkoop", "rekening_btw": "1220"},
    {"code": "I0", "omschrijving": "Inkoop 0%", "percentage": 0.0, "type": "inkoop", "rekening_btw": None},
    {"code": "IV", "omschrijving": "Inkoop vrijgesteld", "percentage": 0.0, "type": "inkoop", "rekening_btw": None},
    {"code": "IN", "omschrijving": "Inkoop niet aftrekbaar", "percentage": 0.0, "type": "inkoop", "rekening_btw": None},
]

STANDAARD_DAGBOEKEN = [
    {"code": "BNK", "naam": "Bankboek", "type": "bank", "tegenrekening": "1120"},
    {"code": "KAS", "naam": "Kasboek", "type": "kas", "tegenrekening": "1110"},
    {"code": "VRK", "naam": "Verkoopboek", "type": "verkoop", "tegenrekening": "1210"},
    {"code": "INK", "naam": "Inkoopboek", "type": "inkoop", "tegenrekening": "2010"},
    {"code": "MEM", "naam": "Memoriaal", "type": "memoriaal", "tegenrekening": None},
]

# ==================== API ENDPOINTS ====================
