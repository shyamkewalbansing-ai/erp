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

from routers.deps import get_db, get_current_user, security, db, clean_doc

# ==================== HELPER FUNCTIONS ====================

def generate_nummer(prefix: str, count: int) -> str:
    """Generate sequential number with prefix"""
    jaar = datetime.now().year
    return f"{prefix}{jaar}-{count:05d}"

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


# ==================== VERKOOPFACTUREN ENDPOINTS ====================

@router.get("/verkoopfacturen")
async def list_verkoopfacturen(
    status: Optional[str] = None,
    debiteur_id: Optional[str] = None,
    periode_van: Optional[str] = None,
    periode_tot: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List sales invoices"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    if debiteur_id:
        query["debiteur_id"] = debiteur_id
    if periode_van:
        query["factuurdatum"] = {"$gte": periode_van}
    if periode_tot:
        if "factuurdatum" in query:
            query["factuurdatum"]["$lte"] = periode_tot
        else:
            query["factuurdatum"] = {"$lte": periode_tot}
    
    facturen = []
    async for fac in db.boekhouding_verkoopfacturen.find(query).sort("factuurdatum", -1).skip(offset).limit(limit):
        fac.pop("_id", None)
        
        # Get debiteur naam
        debiteur = await db.boekhouding_debiteuren.find_one({"id": fac.get("debiteur_id")})
        if debiteur:
            fac["debiteur_naam"] = debiteur.get("bedrijfsnaam")
        
        facturen.append(fac)
    
    total = await db.boekhouding_verkoopfacturen.count_documents(query)
    return {"items": facturen, "total": total}

@router.post("/verkoopfacturen")
async def create_verkoopfactuur(data: VerkoopfactuurCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a sales invoice"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate debiteur
    debiteur = await db.boekhouding_debiteuren.find_one({
        "user_id": user_id,
        "id": data.debiteur_id
    })
    if not debiteur:
        raise HTTPException(status_code=404, detail="Debiteur niet gevonden")
    
    # Generate factuurnummer
    jaar = datetime.now().year
    count = await db.boekhouding_verkoopfacturen.count_documents({
        "user_id": user_id,
        "factuurnummer": {"$regex": f"^VF{jaar}-"}
    })
    factuurnummer = f"VF{jaar}-{count + 1:05d}"
    
    # Calculate totals
    regels_dict = [r.model_dump() for r in data.regels]
    totalen = calculate_factuur_totalen(regels_dict)
    
    # Set vervaldatum if not provided
    vervaldatum = data.vervaldatum
    if not vervaldatum:
        fac_date = datetime.fromisoformat(data.factuurdatum)
        vervaldatum = (fac_date + timedelta(days=debiteur.get("betaalconditie_dagen", 30))).strftime("%Y-%m-%d")
    
    factuur = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "factuurnummer": factuurnummer,
        "debiteur_id": data.debiteur_id,
        "factuurdatum": data.factuurdatum,
        "vervaldatum": vervaldatum,
        "valuta": data.valuta.value,
        "koers": data.koers,
        "regels": regels_dict,
        "opmerkingen": data.opmerkingen,
        "betaalreferentie": data.betaalreferentie or factuurnummer,
        "subtotaal": totalen["subtotaal"],
        "btw_totaal": totalen["btw_totaal"],
        "totaal": totalen["totaal"],
        "openstaand_bedrag": totalen["totaal"],
        "status": "concept",
        "created_at": now
    }
    
    await db.boekhouding_verkoopfacturen.insert_one(factuur)
    factuur.pop("_id", None)
    return factuur

@router.get("/verkoopfacturen/{factuur_id}")
async def get_verkoopfactuur(factuur_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get sales invoice details"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({
        "user_id": user_id,
        "id": factuur_id
    })
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Get debiteur info
    debiteur = await db.boekhouding_debiteuren.find_one({"id": factuur.get("debiteur_id")})
    if debiteur:
        debiteur.pop("_id", None)
        factuur["debiteur"] = debiteur
    
    factuur.pop("_id", None)
    return factuur

@router.put("/verkoopfacturen/{factuur_id}")
async def update_verkoopfactuur(factuur_id: str, data: VerkoopfactuurCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Update a sales invoice (only if concept)"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.boekhouding_verkoopfacturen.find_one({
        "user_id": user_id,
        "id": factuur_id
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    if existing.get("status") != "concept":
        raise HTTPException(status_code=400, detail="Kan alleen concept facturen wijzigen")
    
    # Recalculate totals
    regels_dict = [r.model_dump() for r in data.regels]
    totalen = calculate_factuur_totalen(regels_dict)
    
    await db.boekhouding_verkoopfacturen.update_one(
        {"id": factuur_id, "user_id": user_id},
        {"$set": {
            "debiteur_id": data.debiteur_id,
            "factuurdatum": data.factuurdatum,
            "vervaldatum": data.vervaldatum,
            "valuta": data.valuta.value,
            "koers": data.koers,
            "regels": regels_dict,
            "opmerkingen": data.opmerkingen,
            "subtotaal": totalen["subtotaal"],
            "btw_totaal": totalen["btw_totaal"],
            "totaal": totalen["totaal"],
            "openstaand_bedrag": totalen["totaal"],
            "updated_at": now
        }}
    )
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({"id": factuur_id})
    factuur.pop("_id", None)
    return factuur

@router.post("/verkoopfacturen/{factuur_id}/verzenden")
async def verzend_verkoopfactuur(factuur_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Mark invoice as sent and create journal entry"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({
        "user_id": user_id,
        "id": factuur_id
    })
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    if factuur.get("status") != "concept":
        raise HTTPException(status_code=400, detail="Factuur is al verzonden")
    
    # Create journal entry
    # Debit: Debiteuren (1210)
    # Credit: Omzet (4010) + Te betalen BTW (2020)
    
    dagboek = await db.boekhouding_dagboeken.find_one({
        "user_id": user_id,
        "type": "verkoop"
    })
    if not dagboek:
        raise HTTPException(status_code=400, detail="Verkoopdagboek niet gevonden. Initialiseer eerst het systeem.")
    
    nieuw_nummer = dagboek.get("laatst_gebruikt_nummer", 0) + 1
    await db.boekhouding_dagboeken.update_one(
        {"id": dagboek["id"]},
        {"$set": {"laatst_gebruikt_nummer": nieuw_nummer}}
    )
    
    jaar = datetime.now().year
    boekstuknummer = f"{dagboek['code']}{jaar}-{nieuw_nummer:05d}"
    
    regels = [
        {
            "rekening_nummer": "1210",  # Debiteuren
            "omschrijving": f"Factuur {factuur['factuurnummer']}",
            "debet": factuur["totaal"],
            "credit": 0.0,
            "valuta": factuur["valuta"],
            "koers": factuur["koers"]
        },
        {
            "rekening_nummer": "4010",  # Omzet
            "omschrijving": f"Omzet factuur {factuur['factuurnummer']}",
            "debet": 0.0,
            "credit": factuur["subtotaal"],
            "valuta": factuur["valuta"],
            "koers": factuur["koers"]
        }
    ]
    
    if factuur["btw_totaal"] > 0:
        regels.append({
            "rekening_nummer": "2020",  # Te betalen BTW
            "omschrijving": f"BTW factuur {factuur['factuurnummer']}",
            "debet": 0.0,
            "credit": factuur["btw_totaal"],
            "valuta": factuur["valuta"],
            "koers": factuur["koers"]
        })
    
    journaalpost = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "dagboek_code": dagboek["code"],
        "boekstuknummer": boekstuknummer,
        "datum": factuur["factuurdatum"],
        "omschrijving": f"Verkoopfactuur {factuur['factuurnummer']}",
        "periode": f"{jaar}-{datetime.now().month:02d}",
        "regels": regels,
        "relatie_id": factuur["debiteur_id"],
        "relatie_type": "debiteur",
        "document_id": factuur_id,
        "status": "geboekt",
        "created_at": now,
        "created_by": user_id
    }
    
    await db.boekhouding_journaalposten.insert_one(journaalpost)
    
    # Update rekening saldi
    for regel in regels:
        await db.boekhouding_rekeningen.update_one(
            {"user_id": user_id, "nummer": regel["rekening_nummer"]},
            {"$inc": {"saldo": regel["debet"] - regel["credit"]}}
        )
    
    # Update factuur status
    await db.boekhouding_verkoopfacturen.update_one(
        {"id": factuur_id},
        {"$set": {
            "status": "verzonden",
            "journaalpost_id": journaalpost["id"],
            "updated_at": now
        }}
    )
    
    # Update debiteur openstaand saldo
    await db.boekhouding_debiteuren.update_one(
        {"id": factuur["debiteur_id"]},
        {"$inc": {"openstaand_saldo": factuur["totaal"]}}
    )
    
    return {"message": "Factuur verzonden", "journaalpost_id": journaalpost["id"]}

@router.post("/verkoopfacturen/{factuur_id}/betaling")
async def registreer_betaling(
    factuur_id: str,
    bedrag: float = Query(...),
    datum: str = Query(...),
    betaalwijze: str = Query("bank"),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Register payment for an invoice"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    factuur = await db.boekhouding_verkoopfacturen.find_one({
        "user_id": user_id,
        "id": factuur_id
    })
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    if factuur.get("status") in ["concept", "betaald", "geannuleerd"]:
        raise HTTPException(status_code=400, detail=f"Kan geen betaling registreren voor status: {factuur.get('status')}")
    
    openstaand = factuur.get("openstaand_bedrag", 0)
    if bedrag > openstaand:
        raise HTTPException(status_code=400, detail=f"Bedrag ({bedrag}) is hoger dan openstaand ({openstaand})")
    
    nieuw_openstaand = openstaand - bedrag
    nieuwe_status = "betaald" if nieuw_openstaand <= 0 else "gedeeltelijk_betaald"
    
    # Update factuur
    await db.boekhouding_verkoopfacturen.update_one(
        {"id": factuur_id},
        {"$set": {
            "openstaand_bedrag": nieuw_openstaand,
            "status": nieuwe_status,
            "updated_at": now
        }}
    )
    
    # Update debiteur saldo
    await db.boekhouding_debiteuren.update_one(
        {"id": factuur["debiteur_id"]},
        {"$inc": {"openstaand_saldo": -bedrag}}
    )
    
    # Create journal entry for payment
    dagboek_type = "bank" if betaalwijze == "bank" else "kas"
    dagboek = await db.boekhouding_dagboeken.find_one({
        "user_id": user_id,
        "type": dagboek_type
    })
    
    if dagboek:
        nieuw_nummer = dagboek.get("laatst_gebruikt_nummer", 0) + 1
        await db.boekhouding_dagboeken.update_one(
            {"id": dagboek["id"]},
            {"$set": {"laatst_gebruikt_nummer": nieuw_nummer}}
        )
        
        jaar = datetime.now().year
        boekstuknummer = f"{dagboek['code']}{jaar}-{nieuw_nummer:05d}"
        bank_rekening = "1120" if betaalwijze == "bank" else "1110"
        
        journaalpost = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "dagboek_code": dagboek["code"],
            "boekstuknummer": boekstuknummer,
            "datum": datum,
            "omschrijving": f"Betaling factuur {factuur['factuurnummer']}",
            "periode": f"{jaar}-{datetime.now().month:02d}",
            "regels": [
                {
                    "rekening_nummer": bank_rekening,
                    "omschrijving": f"Ontvangst {factuur['factuurnummer']}",
                    "debet": bedrag,
                    "credit": 0.0
                },
                {
                    "rekening_nummer": "1210",  # Debiteuren
                    "omschrijving": f"Betaling {factuur['factuurnummer']}",
                    "debet": 0.0,
                    "credit": bedrag
                }
            ],
            "relatie_id": factuur["debiteur_id"],
            "relatie_type": "debiteur",
            "status": "geboekt",
            "created_at": now,
            "created_by": user_id
        }
        
        await db.boekhouding_journaalposten.insert_one(journaalpost)
        
        # Update rekening saldi
        await db.boekhouding_rekeningen.update_one(
            {"user_id": user_id, "nummer": bank_rekening},
            {"$inc": {"saldo": bedrag}}
        )
        await db.boekhouding_rekeningen.update_one(
            {"user_id": user_id, "nummer": "1210"},
            {"$inc": {"saldo": -bedrag}}
        )
    
    return {
        "message": "Betaling geregistreerd",
        "nieuw_openstaand": nieuw_openstaand,
        "status": nieuwe_status
    }

# ==================== INKOOPFACTUREN ENDPOINTS ====================

@router.get("/inkoopfacturen")
async def list_inkoopfacturen(
    status: Optional[str] = None,
    crediteur_id: Optional[str] = None,
    periode_van: Optional[str] = None,
    periode_tot: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List purchase invoices"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    if crediteur_id:
        query["crediteur_id"] = crediteur_id
    if periode_van:
        query["factuurdatum"] = {"$gte": periode_van}
    if periode_tot:
        if "factuurdatum" in query:
            query["factuurdatum"]["$lte"] = periode_tot
        else:
            query["factuurdatum"] = {"$lte": periode_tot}
    
    facturen = []
    async for fac in db.boekhouding_inkoopfacturen.find(query).sort("factuurdatum", -1).skip(offset).limit(limit):
        fac.pop("_id", None)
        
        crediteur = await db.boekhouding_crediteuren.find_one({"id": fac.get("crediteur_id")})
        if crediteur:
            fac["crediteur_naam"] = crediteur.get("bedrijfsnaam")
        
        facturen.append(fac)
    
    total = await db.boekhouding_inkoopfacturen.count_documents(query)
    return {"items": facturen, "total": total}

@router.post("/inkoopfacturen")
async def create_inkoopfactuur(data: InkoopfactuurCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a purchase invoice"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate crediteur
    crediteur = await db.boekhouding_crediteuren.find_one({
        "user_id": user_id,
        "id": data.crediteur_id
    })
    if not crediteur:
        raise HTTPException(status_code=404, detail="Crediteur niet gevonden")
    
    # Generate intern factuurnummer
    jaar = datetime.now().year
    count = await db.boekhouding_inkoopfacturen.count_documents({
        "user_id": user_id,
        "intern_factuurnummer": {"$regex": f"^IF{jaar}-"}
    })
    intern_factuurnummer = f"IF{jaar}-{count + 1:05d}"
    
    # Calculate totals
    regels_dict = [r.model_dump() for r in data.regels]
    totalen = calculate_factuur_totalen(regels_dict)
    
    # Set vervaldatum
    vervaldatum = data.vervaldatum
    if not vervaldatum:
        fac_date = datetime.fromisoformat(data.factuurdatum)
        vervaldatum = (fac_date + timedelta(days=crediteur.get("betaalconditie_dagen", 30))).strftime("%Y-%m-%d")
    
    factuur = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "intern_factuurnummer": intern_factuurnummer,
        "extern_factuurnummer": data.extern_factuurnummer,
        "crediteur_id": data.crediteur_id,
        "factuurdatum": data.factuurdatum,
        "vervaldatum": vervaldatum,
        "valuta": data.valuta.value,
        "koers": data.koers,
        "regels": regels_dict,
        "opmerkingen": data.opmerkingen,
        "subtotaal": totalen["subtotaal"],
        "btw_totaal": totalen["btw_totaal"],
        "totaal": totalen["totaal"],
        "openstaand_bedrag": totalen["totaal"],
        "status": "concept",
        "created_at": now
    }
    
    await db.boekhouding_inkoopfacturen.insert_one(factuur)
    factuur.pop("_id", None)
    return factuur

@router.post("/inkoopfacturen/{factuur_id}/boeken")
async def boek_inkoopfactuur(factuur_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Book a purchase invoice and create journal entry"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    factuur = await db.boekhouding_inkoopfacturen.find_one({
        "user_id": user_id,
        "id": factuur_id
    })
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    if factuur.get("status") != "concept":
        raise HTTPException(status_code=400, detail="Factuur is al geboekt")
    
    # Get inkoopdagboek
    dagboek = await db.boekhouding_dagboeken.find_one({
        "user_id": user_id,
        "type": "inkoop"
    })
    if not dagboek:
        raise HTTPException(status_code=400, detail="Inkoopdagboek niet gevonden")
    
    nieuw_nummer = dagboek.get("laatst_gebruikt_nummer", 0) + 1
    await db.boekhouding_dagboeken.update_one(
        {"id": dagboek["id"]},
        {"$set": {"laatst_gebruikt_nummer": nieuw_nummer}}
    )
    
    jaar = datetime.now().year
    boekstuknummer = f"{dagboek['code']}{jaar}-{nieuw_nummer:05d}"
    
    # Journal entry:
    # Debit: Kosten (9040) + Te vorderen BTW (1220)
    # Credit: Crediteuren (2010)
    
    regels = [
        {
            "rekening_nummer": "9040",  # Algemene kosten
            "omschrijving": f"Inkoopfactuur {factuur['extern_factuurnummer']}",
            "debet": factuur["subtotaal"],
            "credit": 0.0,
            "valuta": factuur["valuta"],
            "koers": factuur["koers"]
        }
    ]
    
    if factuur["btw_totaal"] > 0:
        regels.append({
            "rekening_nummer": "1220",  # Te vorderen BTW
            "omschrijving": f"BTW {factuur['extern_factuurnummer']}",
            "debet": factuur["btw_totaal"],
            "credit": 0.0
        })
    
    regels.append({
        "rekening_nummer": "2010",  # Crediteuren
        "omschrijving": f"Factuur {factuur['extern_factuurnummer']}",
        "debet": 0.0,
        "credit": factuur["totaal"]
    })
    
    journaalpost = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "dagboek_code": dagboek["code"],
        "boekstuknummer": boekstuknummer,
        "datum": factuur["factuurdatum"],
        "omschrijving": f"Inkoopfactuur {factuur['extern_factuurnummer']}",
        "periode": f"{jaar}-{datetime.now().month:02d}",
        "regels": regels,
        "relatie_id": factuur["crediteur_id"],
        "relatie_type": "crediteur",
        "document_id": factuur_id,
        "status": "geboekt",
        "created_at": now,
        "created_by": user_id
    }
    
    await db.boekhouding_journaalposten.insert_one(journaalpost)
    
    # Update rekening saldi
    for regel in regels:
        await db.boekhouding_rekeningen.update_one(
            {"user_id": user_id, "nummer": regel["rekening_nummer"]},
            {"$inc": {"saldo": regel["debet"] - regel["credit"]}}
        )
    
    # Update factuur
    await db.boekhouding_inkoopfacturen.update_one(
        {"id": factuur_id},
        {"$set": {
            "status": "verzonden",
            "journaalpost_id": journaalpost["id"],
            "updated_at": now
        }}
    )
    
    # Update crediteur saldo
    await db.boekhouding_crediteuren.update_one(
        {"id": factuur["crediteur_id"]},
        {"$inc": {"openstaand_saldo": factuur["totaal"]}}
    )
    
    return {"message": "Factuur geboekt", "journaalpost_id": journaalpost["id"]}

# ==================== BANK ENDPOINTS ====================

@router.get("/bankrekeningen")
async def list_bankrekeningen(db=Depends(get_db), current_user=Depends(get_current_user)):
    """List bank accounts"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    rekeningen = []
    async for rek in db.boekhouding_bankrekeningen.find({"user_id": user_id}).sort("naam", 1):
        rek.pop("_id", None)
        rekeningen.append(rek)
    
    return rekeningen

@router.post("/bankrekeningen")
async def create_bankrekening(data: BankrekeningCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a bank account"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    rekening = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.model_dump(),
        "bank": data.bank.value,
        "valuta": data.valuta.value,
        "huidig_saldo": data.beginsaldo,
        "created_at": now
    }
    
    await db.boekhouding_bankrekeningen.insert_one(rekening)
    rekening.pop("_id", None)
    return rekening

@router.get("/bankrekeningen/{rekening_id}/mutaties")
async def get_bankmutaties(
    rekening_id: str,
    status: Optional[str] = None,
    periode_van: Optional[str] = None,
    periode_tot: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Get bank mutations for an account"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id, "bankrekening_id": rekening_id}
    if status:
        query["status"] = status
    if periode_van:
        query["datum"] = {"$gte": periode_van}
    if periode_tot:
        if "datum" in query:
            query["datum"]["$lte"] = periode_tot
        else:
            query["datum"] = {"$lte": periode_tot}
    
    mutaties = []
    async for mut in db.boekhouding_bankmutaties.find(query).sort("datum", -1):
        mut.pop("_id", None)
        mutaties.append(mut)
    
    return mutaties

@router.post("/bankrekeningen/{rekening_id}/import")
async def import_bankmutaties(
    rekening_id: str,
    file: UploadFile = File(...),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Import bank mutations from CSV file"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Verify bank account exists
    bankrekening = await db.boekhouding_bankrekeningen.find_one({
        "user_id": user_id,
        "id": rekening_id
    })
    if not bankrekening:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    
    # Read CSV file
    content = await file.read()
    decoded = content.decode('utf-8')
    
    reader = csv.DictReader(io.StringIO(decoded), delimiter=';')
    
    imported = 0
    duplicates = 0
    
    for row in reader:
        # Parse row based on common Surinamese bank CSV formats
        # Expected columns: datum, bedrag, omschrijving, tegenrekening
        
        datum = row.get('datum', row.get('Datum', row.get('Date', '')))
        bedrag_str = row.get('bedrag', row.get('Bedrag', row.get('Amount', '0')))
        omschrijving = row.get('omschrijving', row.get('Omschrijving', row.get('Description', '')))
        tegenrekening = row.get('tegenrekening', row.get('Tegenrekening', ''))
        naam = row.get('naam', row.get('Naam', row.get('Name', '')))
        
        # Clean bedrag
        try:
            bedrag = float(bedrag_str.replace(',', '.').replace(' ', ''))
        except:
            continue
        
        # Generate transaction reference
        trans_ref = f"{datum}-{abs(bedrag)}-{omschrijving[:20]}"
        
        # Check for duplicate
        existing = await db.boekhouding_bankmutaties.find_one({
            "user_id": user_id,
            "bankrekening_id": rekening_id,
            "transactie_ref": trans_ref
        })
        
        if existing:
            duplicates += 1
            continue
        
        mutatie = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "bankrekening_id": rekening_id,
            "datum": datum,
            "valutadatum": datum,
            "bedrag": bedrag,
            "omschrijving": omschrijving,
            "tegenrekening": tegenrekening,
            "naam_tegenpartij": naam,
            "transactie_ref": trans_ref,
            "status": "te_verwerken",
            "created_at": now
        }
        
        await db.boekhouding_bankmutaties.insert_one(mutatie)
        imported += 1
    
    return {
        "message": f"{imported} mutaties geïmporteerd, {duplicates} duplicaten overgeslagen",
        "imported": imported,
        "duplicates": duplicates
    }

# ==================== BANK RECONCILIATIE ENDPOINTS ====================

@router.get("/reconciliatie/te-verwerken")
async def get_te_verwerken_mutaties(
    bankrekening_id: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Get unprocessed bank mutations for reconciliation"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id, "status": "te_verwerken"}
    if bankrekening_id:
        query["bankrekening_id"] = bankrekening_id
    
    mutaties = []
    async for mut in db.boekhouding_bankmutaties.find(query).sort("datum", -1):
        mut.pop("_id", None)
        
        # Try to find matching invoices
        matches = []
        
        if mut.get("bedrag", 0) > 0:
            # Incoming payment - look for sales invoices
            async for fac in db.boekhouding_verkoopfacturen.find({
                "user_id": user_id,
                "status": {"$in": ["verzonden", "gedeeltelijk_betaald"]},
                "openstaand_bedrag": {"$gte": mut["bedrag"] * 0.95, "$lte": mut["bedrag"] * 1.05}
            }).limit(5):
                fac.pop("_id", None)
                debiteur = await db.boekhouding_debiteuren.find_one({"id": fac.get("debiteur_id")})
                matches.append({
                    "type": "verkoopfactuur",
                    "id": fac["id"],
                    "nummer": fac.get("factuurnummer"),
                    "bedrag": fac.get("openstaand_bedrag"),
                    "klant": debiteur.get("bedrijfsnaam") if debiteur else None,
                    "score": 0.8 if abs(fac.get("openstaand_bedrag", 0) - mut["bedrag"]) < 0.01 else 0.5
                })
        else:
            # Outgoing payment - look for purchase invoices
            async for fac in db.boekhouding_inkoopfacturen.find({
                "user_id": user_id,
                "status": {"$in": ["verzonden", "gedeeltelijk_betaald"]},
                "openstaand_bedrag": {"$gte": abs(mut["bedrag"]) * 0.95, "$lte": abs(mut["bedrag"]) * 1.05}
            }).limit(5):
                fac.pop("_id", None)
                crediteur = await db.boekhouding_crediteuren.find_one({"id": fac.get("crediteur_id")})
                matches.append({
                    "type": "inkoopfactuur",
                    "id": fac["id"],
                    "nummer": fac.get("intern_factuurnummer"),
                    "bedrag": fac.get("openstaand_bedrag"),
                    "leverancier": crediteur.get("bedrijfsnaam") if crediteur else None,
                    "score": 0.8 if abs(fac.get("openstaand_bedrag", 0) - abs(mut["bedrag"])) < 0.01 else 0.5
                })
        
        mut["mogelijke_matches"] = matches
        mutaties.append(mut)
    
    return mutaties

@router.post("/reconciliatie/match")
async def match_mutatie(
    mutatie_id: str = Query(...),
    factuur_id: str = Query(...),
    factuur_type: str = Query(..., description="verkoopfactuur of inkoopfactuur"),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Match a bank mutation with an invoice"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Get mutation
    mutatie = await db.boekhouding_bankmutaties.find_one({
        "user_id": user_id,
        "id": mutatie_id
    })
    if not mutatie:
        raise HTTPException(status_code=404, detail="Mutatie niet gevonden")
    
    # Get invoice
    collection = db.boekhouding_verkoopfacturen if factuur_type == "verkoopfactuur" else db.boekhouding_inkoopfacturen
    factuur = await collection.find_one({
        "user_id": user_id,
        "id": factuur_id
    })
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Update mutation
    await db.boekhouding_bankmutaties.update_one(
        {"id": mutatie_id},
        {"$set": {
            "status": "gematcht",
            "gekoppelde_factuur_id": factuur_id,
            "gekoppelde_factuur_type": factuur_type,
            "updated_at": now
        }}
    )
    
    # Process payment on invoice
    bedrag = abs(mutatie.get("bedrag", 0))
    openstaand = factuur.get("openstaand_bedrag", 0)
    nieuw_openstaand = max(0, openstaand - bedrag)
    nieuwe_status = "betaald" if nieuw_openstaand <= 0 else "gedeeltelijk_betaald"
    
    await collection.update_one(
        {"id": factuur_id},
        {"$set": {
            "openstaand_bedrag": nieuw_openstaand,
            "status": nieuwe_status,
            "updated_at": now
        }}
    )
    
    # Update debtor/creditor balance
    if factuur_type == "verkoopfactuur":
        await db.boekhouding_debiteuren.update_one(
            {"id": factuur.get("debiteur_id")},
            {"$inc": {"openstaand_saldo": -bedrag}}
        )
    else:
        await db.boekhouding_crediteuren.update_one(
            {"id": factuur.get("crediteur_id")},
            {"$inc": {"openstaand_saldo": -bedrag}}
        )
    
    return {"message": "Mutatie gekoppeld aan factuur", "nieuwe_status": nieuwe_status}

@router.post("/reconciliatie/boek-overig")
async def boek_overige_mutatie(
    mutatie_id: str = Query(...),
    grootboekrekening: str = Query(...),
    omschrijving: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Book a bank mutation to a ledger account (e.g., bank fees, interest)"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    mutatie = await db.boekhouding_bankmutaties.find_one({
        "user_id": user_id,
        "id": mutatie_id
    })
    if not mutatie:
        raise HTTPException(status_code=404, detail="Mutatie niet gevonden")
    
    # Get bank account
    bankrekening = await db.boekhouding_bankrekeningen.find_one({
        "id": mutatie.get("bankrekening_id")
    })
    if not bankrekening:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    
    # Create journal entry
    dagboek = await db.boekhouding_dagboeken.find_one({
        "user_id": user_id,
        "type": "bank"
    })
    if not dagboek:
        raise HTTPException(status_code=400, detail="Bankdagboek niet gevonden")
    
    nieuw_nummer = dagboek.get("laatst_gebruikt_nummer", 0) + 1
    await db.boekhouding_dagboeken.update_one(
        {"id": dagboek["id"]},
        {"$set": {"laatst_gebruikt_nummer": nieuw_nummer}}
    )
    
    jaar = datetime.now().year
    boekstuknummer = f"{dagboek['code']}{jaar}-{nieuw_nummer:05d}"
    bedrag = mutatie.get("bedrag", 0)
    bank_gb = bankrekening.get("grootboekrekening", "1120")
    
    regels = []
    if bedrag > 0:
        # Incoming
        regels = [
            {"rekening_nummer": bank_gb, "omschrijving": mutatie.get("omschrijving", ""), "debet": bedrag, "credit": 0.0},
            {"rekening_nummer": grootboekrekening, "omschrijving": omschrijving or mutatie.get("omschrijving", ""), "debet": 0.0, "credit": bedrag}
        ]
    else:
        # Outgoing
        regels = [
            {"rekening_nummer": grootboekrekening, "omschrijving": omschrijving or mutatie.get("omschrijving", ""), "debet": abs(bedrag), "credit": 0.0},
            {"rekening_nummer": bank_gb, "omschrijving": mutatie.get("omschrijving", ""), "debet": 0.0, "credit": abs(bedrag)}
        ]
    
    journaalpost = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "dagboek_code": dagboek["code"],
        "boekstuknummer": boekstuknummer,
        "datum": mutatie.get("datum"),
        "omschrijving": omschrijving or mutatie.get("omschrijving", "Bankmutatie"),
        "periode": f"{jaar}-{datetime.now().month:02d}",
        "regels": regels,
        "status": "geboekt",
        "created_at": now,
        "created_by": user_id
    }
    
    await db.boekhouding_journaalposten.insert_one(journaalpost)
    
    # Update rekening saldi
    for regel in regels:
        await db.boekhouding_rekeningen.update_one(
            {"user_id": user_id, "nummer": regel["rekening_nummer"]},
            {"$inc": {"saldo": regel["debet"] - regel["credit"]}}
        )
    
    # Update bank saldo
    await db.boekhouding_bankrekeningen.update_one(
        {"id": bankrekening["id"]},
        {"$inc": {"huidig_saldo": bedrag}}
    )
    
    # Mark mutation as processed
    await db.boekhouding_bankmutaties.update_one(
        {"id": mutatie_id},
        {"$set": {
            "status": "geboekt",
            "journaalpost_id": journaalpost["id"],
            "updated_at": now
        }}
    )
    
    return {"message": "Mutatie geboekt", "journaalpost_id": journaalpost["id"]}

# ==================== KAS ENDPOINTS ====================

@router.get("/kas")
async def get_kas_overzicht(
    periode_van: Optional[str] = None,
    periode_tot: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Get cash book overview"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if periode_van:
        query["datum"] = {"$gte": periode_van}
    if periode_tot:
        if "datum" in query:
            query["datum"]["$lte"] = periode_tot
        else:
            query["datum"] = {"$lte": periode_tot}
    
    mutaties = []
    async for mut in db.boekhouding_kasmutaties.find(query).sort("datum", -1):
        mut.pop("_id", None)
        mutaties.append(mut)
    
    # Calculate totals
    totaal_in = sum(m.get("bedrag_in", 0) for m in mutaties)
    totaal_uit = sum(m.get("bedrag_uit", 0) for m in mutaties)
    saldo = totaal_in - totaal_uit
    
    return {
        "mutaties": mutaties,
        "totaal_in": totaal_in,
        "totaal_uit": totaal_uit,
        "saldo": saldo
    }

@router.post("/kas")
async def create_kasmutatie(data: KasmutatieCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a cash book entry"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Get current kas saldo
    saldo_result = await db.boekhouding_kasmutaties.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "in": {"$sum": "$bedrag_in"}, "uit": {"$sum": "$bedrag_uit"}}}
    ]).to_list(1)
    
    huidig_saldo = 0.0
    if saldo_result:
        huidig_saldo = saldo_result[0].get("in", 0) - saldo_result[0].get("uit", 0)
    
    nieuw_saldo = huidig_saldo + data.bedrag_in - data.bedrag_uit
    
    # Generate kasmutatie nummer
    jaar = datetime.now().year
    count = await db.boekhouding_kasmutaties.count_documents({
        "user_id": user_id,
        "kasmutatie_nummer": {"$regex": f"^KAS{jaar}-"}
    })
    kasmutatie_nummer = f"KAS{jaar}-{count + 1:05d}"
    
    mutatie = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "kasmutatie_nummer": kasmutatie_nummer,
        **data.model_dump(),
        "saldo_na": nieuw_saldo,
        "created_at": now,
        "created_by": user_id
    }
    
    await db.boekhouding_kasmutaties.insert_one(mutatie)
    
    # Create journal entry
    dagboek = await db.boekhouding_dagboeken.find_one({
        "user_id": user_id,
        "type": "kas"
    })
    
    if dagboek:
        nieuw_nummer = dagboek.get("laatst_gebruikt_nummer", 0) + 1
        await db.boekhouding_dagboeken.update_one(
            {"id": dagboek["id"]},
            {"$set": {"laatst_gebruikt_nummer": nieuw_nummer}}
        )
        
        boekstuknummer = f"{dagboek['code']}{jaar}-{nieuw_nummer:05d}"
        
        regels = []
        if data.bedrag_in > 0:
            regels = [
                {"rekening_nummer": "1110", "omschrijving": data.omschrijving, "debet": data.bedrag_in, "credit": 0.0},
                {"rekening_nummer": data.grootboekrekening, "omschrijving": data.omschrijving, "debet": 0.0, "credit": data.bedrag_in}
            ]
        else:
            regels = [
                {"rekening_nummer": data.grootboekrekening, "omschrijving": data.omschrijving, "debet": data.bedrag_uit, "credit": 0.0},
                {"rekening_nummer": "1110", "omschrijving": data.omschrijving, "debet": 0.0, "credit": data.bedrag_uit}
            ]
        
        journaalpost = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "dagboek_code": dagboek["code"],
            "boekstuknummer": boekstuknummer,
            "datum": data.datum,
            "omschrijving": data.omschrijving,
            "periode": f"{jaar}-{datetime.now().month:02d}",
            "regels": regels,
            "status": "geboekt",
            "created_at": now,
            "created_by": user_id
        }
        
        await db.boekhouding_journaalposten.insert_one(journaalpost)
        
        # Update rekening saldi
        for regel in regels:
            await db.boekhouding_rekeningen.update_one(
                {"user_id": user_id, "nummer": regel["rekening_nummer"]},
                {"$inc": {"saldo": regel["debet"] - regel["credit"]}}
            )
        
        mutatie["journaalpost_id"] = journaalpost["id"]
    
    mutatie.pop("_id", None)
    return mutatie

# ==================== WISSELKOERSEN ENDPOINTS ====================

@router.get("/wisselkoersen")
async def list_wisselkoersen(
    datum: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List exchange rates"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if datum:
        query["datum"] = datum
    
    koersen = []
    async for koers in db.boekhouding_wisselkoersen.find(query).sort("datum", -1).limit(100):
        koers.pop("_id", None)
        koersen.append(koers)
    
    return koersen

@router.post("/wisselkoersen")
async def create_wisselkoers(data: WisselkoersCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create/update exchange rate"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Check for existing rate on same date
    existing = await db.boekhouding_wisselkoersen.find_one({
        "user_id": user_id,
        "datum": data.datum,
        "van_valuta": data.van_valuta.value,
        "naar_valuta": data.naar_valuta.value
    })
    
    if existing:
        await db.boekhouding_wisselkoersen.update_one(
            {"id": existing["id"]},
            {"$set": {"koers": data.koers, "bron": data.bron, "updated_at": now}}
        )
        existing["koers"] = data.koers
        existing.pop("_id", None)
        return existing
    
    koers = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.model_dump(),
        "van_valuta": data.van_valuta.value,
        "naar_valuta": data.naar_valuta.value,
        "created_at": now
    }
    
    await db.boekhouding_wisselkoersen.insert_one(koers)
    koers.pop("_id", None)
    return koers

@router.get("/wisselkoersen/haal-centrale-bank")
async def haal_centrale_bank_koersen(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Fetch exchange rates from Central Bank of Suriname"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Note: This is a placeholder. In production, you would connect to the actual CBvS API
    # For now, we'll use mock data based on typical SRD exchange rates
    
    # Mock data - in production replace with actual API call
    mock_rates = [
        {"van": "USD", "naar": "SRD", "koers": 36.50},
        {"van": "EUR", "naar": "SRD", "koers": 39.75},
        {"van": "SRD", "naar": "USD", "koers": 0.0274},
        {"van": "SRD", "naar": "EUR", "koers": 0.0252},
    ]
    
    saved_rates = []
    for rate in mock_rates:
        koers_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "datum": today,
            "van_valuta": rate["van"],
            "naar_valuta": rate["naar"],
            "koers": rate["koers"],
            "bron": "centrale_bank",
            "created_at": now
        }
        
        # Upsert
        await db.boekhouding_wisselkoersen.update_one(
            {
                "user_id": user_id,
                "datum": today,
                "van_valuta": rate["van"],
                "naar_valuta": rate["naar"]
            },
            {"$set": koers_data},
            upsert=True
        )
        saved_rates.append(koers_data)
    
    return {
        "message": f"{len(saved_rates)} koersen opgehaald van Centrale Bank",
        "datum": today,
        "koersen": saved_rates
    }

@router.get("/wisselkoersen/actueel")
async def get_actuele_koersen(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get most recent exchange rates"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    # Get latest rates per currency pair
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$sort": {"datum": -1}},
        {"$group": {
            "_id": {"van": "$van_valuta", "naar": "$naar_valuta"},
            "koers": {"$first": "$koers"},
            "datum": {"$first": "$datum"},
            "bron": {"$first": "$bron"}
        }}
    ]
    
    result = await db.boekhouding_wisselkoersen.aggregate(pipeline).to_list(20)
    
    koersen = {}
    for item in result:
        key = f"{item['_id']['van']}_to_{item['_id']['naar']}"
        koersen[key] = {
            "van": item["_id"]["van"],
            "naar": item["_id"]["naar"],
            "koers": item["koers"],
            "datum": item["datum"],
            "bron": item["bron"]
        }
    
    return koersen



# ==================== VASTE ACTIVA ENDPOINTS ====================

@router.get("/vaste-activa")
async def list_vaste_activa(
    categorie: Optional[str] = None,
    status: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List fixed assets"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if categorie:
        query["categorie"] = categorie
    if status:
        query["status"] = status
    
    activa = []
    async for activum in db.boekhouding_vaste_activa.find(query).sort("activum_nummer", 1):
        activum.pop("_id", None)
        activa.append(activum)
    
    return activa

@router.post("/vaste-activa")
async def create_vast_activum(data: VastActivumCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a fixed asset"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate activum nummer
    jaar = datetime.now().year
    count = await db.boekhouding_vaste_activa.count_documents({
        "user_id": user_id,
        "activum_nummer": {"$regex": f"^ACT{jaar}-"}
    })
    activum_nummer = f"ACT{jaar}-{count + 1:05d}"
    
    # Calculate afschrijving per maand
    af_te_schrijven = data.aanschafwaarde - data.restwaarde
    maandelijkse_afschrijving = af_te_schrijven / data.afschrijvingsduur_maanden if data.afschrijvingsduur_maanden > 0 else 0
    
    activum = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "activum_nummer": activum_nummer,
        **data.model_dump(),
        "categorie": data.categorie.value,
        "afschrijvingsmethode": data.afschrijvingsmethode.value,
        "valuta": data.valuta.value,
        "cumulatieve_afschrijving": 0.0,
        "boekwaarde": data.aanschafwaarde,
        "maandelijkse_afschrijving": maandelijkse_afschrijving,
        "status": "in_gebruik",
        "created_at": now
    }
    
    await db.boekhouding_vaste_activa.insert_one(activum)
    activum.pop("_id", None)
    return activum

@router.get("/vaste-activa/{activum_id}")
async def get_vast_activum(activum_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get fixed asset details"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    activum = await db.boekhouding_vaste_activa.find_one({
        "user_id": user_id,
        "id": activum_id
    })
    if not activum:
        raise HTTPException(status_code=404, detail="Activum niet gevonden")
    
    # Get afschrijvingshistorie
    afschrijvingen = []
    async for afs in db.boekhouding_afschrijvingen.find({
        "user_id": user_id,
        "activum_id": activum_id
    }).sort("datum", -1):
        afs.pop("_id", None)
        afschrijvingen.append(afs)
    
    activum.pop("_id", None)
    activum["afschrijvingen"] = afschrijvingen
    return activum

@router.post("/vaste-activa/afschrijven")
async def run_afschrijvingen(
    periode: str = Query(..., description="YYYY-MM formaat"),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Run monthly depreciation for all active assets"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Get all active assets
    activa = []
    async for activum in db.boekhouding_vaste_activa.find({
        "user_id": user_id,
        "status": "in_gebruik"
    }):
        activa.append(activum)
    
    if not activa:
        return {"message": "Geen actieve activa gevonden", "verwerkt": 0}
    
    # Get memoriaal dagboek
    dagboek = await db.boekhouding_dagboeken.find_one({
        "user_id": user_id,
        "type": "memoriaal"
    })
    if not dagboek:
        raise HTTPException(status_code=400, detail="Memoriaaldagboek niet gevonden")
    
    verwerkt = 0
    totaal_afschrijving = 0.0
    
    for activum in activa:
        # Check if already depreciated this period
        existing = await db.boekhouding_afschrijvingen.find_one({
            "user_id": user_id,
            "activum_id": activum["id"],
            "periode": periode
        })
        if existing:
            continue
        
        maand_afschrijving = activum.get("maandelijkse_afschrijving", 0)
        if maand_afschrijving <= 0:
            continue
        
        # Check if fully depreciated
        boekwaarde = activum.get("boekwaarde", 0)
        restwaarde = activum.get("restwaarde", 0)
        
        if boekwaarde <= restwaarde:
            await db.boekhouding_vaste_activa.update_one(
                {"id": activum["id"]},
                {"$set": {"status": "afgeschreven"}}
            )
            continue
        
        # Adjust if would go below restwaarde
        if boekwaarde - maand_afschrijving < restwaarde:
            maand_afschrijving = boekwaarde - restwaarde
        
        # Create afschrijving record
        afschrijving = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "activum_id": activum["id"],
            "periode": periode,
            "bedrag": maand_afschrijving,
            "boekwaarde_voor": boekwaarde,
            "boekwaarde_na": boekwaarde - maand_afschrijving,
            "created_at": now
        }
        await db.boekhouding_afschrijvingen.insert_one(afschrijving)
        
        # Update activum
        await db.boekhouding_vaste_activa.update_one(
            {"id": activum["id"]},
            {"$inc": {
                "cumulatieve_afschrijving": maand_afschrijving,
                "boekwaarde": -maand_afschrijving
            }}
        )
        
        totaal_afschrijving += maand_afschrijving
        verwerkt += 1
    
    # Create single journal entry for all depreciations
    if totaal_afschrijving > 0:
        nieuw_nummer = dagboek.get("laatst_gebruikt_nummer", 0) + 1
        await db.boekhouding_dagboeken.update_one(
            {"id": dagboek["id"]},
            {"$set": {"laatst_gebruikt_nummer": nieuw_nummer}}
        )
        
        jaar = int(periode.split("-")[0])
        boekstuknummer = f"{dagboek['code']}{jaar}-{nieuw_nummer:05d}"
        
        journaalpost = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "dagboek_code": dagboek["code"],
            "boekstuknummer": boekstuknummer,
            "datum": f"{periode}-01",
            "omschrijving": f"Afschrijvingen periode {periode}",
            "periode": periode,
            "regels": [
                {"rekening_nummer": "8030", "omschrijving": f"Afschrijvingen {periode}", "debet": totaal_afschrijving, "credit": 0.0},
                {"rekening_nummer": "1031", "omschrijving": f"Cum. afschrijving {periode}", "debet": 0.0, "credit": totaal_afschrijving}
            ],
            "status": "geboekt",
            "created_at": now,
            "created_by": user_id
        }
        
        await db.boekhouding_journaalposten.insert_one(journaalpost)
        
        # Update rekening saldi
        await db.boekhouding_rekeningen.update_one(
            {"user_id": user_id, "nummer": "8030"},
            {"$inc": {"saldo": totaal_afschrijving}}
        )
        await db.boekhouding_rekeningen.update_one(
            {"user_id": user_id, "nummer": "1031"},
            {"$inc": {"saldo": -totaal_afschrijving}}
        )
    
    return {
        "message": f"{verwerkt} activa afgeschreven",
        "verwerkt": verwerkt,
        "totaal_afschrijving": totaal_afschrijving
    }

# ==================== KOSTENPLAATSEN ENDPOINTS ====================

@router.get("/kostenplaatsen")
async def list_kostenplaatsen(db=Depends(get_db), current_user=Depends(get_current_user)):
    """List cost centers"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    kostenplaatsen = []
    async for kp in db.boekhouding_kostenplaatsen.find({"user_id": user_id}).sort("code", 1):
        kp.pop("_id", None)
        kostenplaatsen.append(kp)
    
    return kostenplaatsen

@router.post("/kostenplaatsen")
async def create_kostenplaats(data: KostenplaatsCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a cost center"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.boekhouding_kostenplaatsen.find_one({
        "user_id": user_id,
        "code": data.code
    })
    if existing:
        raise HTTPException(status_code=400, detail="Kostenplaatscode bestaat al")
    
    kostenplaats = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.model_dump(),
        "gerealiseerd": 0.0,
        "created_at": now
    }
    
    await db.boekhouding_kostenplaatsen.insert_one(kostenplaats)
    kostenplaats.pop("_id", None)
    return kostenplaats

@router.get("/kostenplaatsen/{kostenplaats_id}/boekingen")
async def get_kostenplaats_boekingen(
    kostenplaats_id: str,
    periode_van: Optional[str] = None,
    periode_tot: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Get bookings for a cost center"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id, "regels.kostenplaats_id": kostenplaats_id}
    if periode_van:
        query["datum"] = {"$gte": periode_van}
    if periode_tot:
        if "datum" in query:
            query["datum"]["$lte"] = periode_tot
        else:
            query["datum"] = {"$lte": periode_tot}
    
    boekingen = []
    async for post in db.boekhouding_journaalposten.find(query).sort("datum", -1):
        for regel in post.get("regels", []):
            if regel.get("kostenplaats_id") == kostenplaats_id:
                boekingen.append({
                    "datum": post.get("datum"),
                    "boekstuknummer": post.get("boekstuknummer"),
                    "omschrijving": regel.get("omschrijving"),
                    "bedrag": regel.get("debet", 0) - regel.get("credit", 0)
                })
    
    return boekingen

# ==================== BTW ENDPOINTS ====================

@router.get("/btw/codes")
async def list_btw_codes(db=Depends(get_db), current_user=Depends(get_current_user)):
    """List BTW codes"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    codes = []
    async for code in db.boekhouding_btw_codes.find({"user_id": user_id}).sort("code", 1):
        code.pop("_id", None)
        codes.append(code)
    
    return codes

@router.post("/btw/codes")
async def create_btw_code(data: BTWCodeCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a BTW code"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.boekhouding_btw_codes.find_one({
        "user_id": user_id,
        "code": data.code
    })
    if existing:
        raise HTTPException(status_code=400, detail="BTW code bestaat al")
    
    btw_code = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.model_dump(),
        "created_at": now
    }
    
    await db.boekhouding_btw_codes.insert_one(btw_code)
    btw_code.pop("_id", None)
    return btw_code

@router.get("/btw/aangifte")
async def get_btw_aangifte(
    periode_van: str = Query(...),
    periode_tot: str = Query(...),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Generate BTW declaration report"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    # Get verkoop facturen
    verkoop_pipeline = [
        {"$match": {
            "user_id": user_id,
            "factuurdatum": {"$gte": periode_van, "$lte": periode_tot},
            "status": {"$ne": "geannuleerd"}
        }},
        {"$unwind": "$regels"},
        {"$group": {
            "_id": "$regels.btw_percentage",
            "omzet": {"$sum": {"$multiply": ["$regels.aantal", "$regels.prijs_per_eenheid"]}},
            "btw": {"$sum": {"$multiply": [
                {"$multiply": ["$regels.aantal", "$regels.prijs_per_eenheid"]},
                {"$divide": ["$regels.btw_percentage", 100]}
            ]}}
        }}
    ]
    
    verkoop_result = await db.boekhouding_verkoopfacturen.aggregate(verkoop_pipeline).to_list(10)
    
    # Get inkoop facturen
    inkoop_pipeline = [
        {"$match": {
            "user_id": user_id,
            "factuurdatum": {"$gte": periode_van, "$lte": periode_tot},
            "status": {"$ne": "geannuleerd"}
        }},
        {"$unwind": "$regels"},
        {"$group": {
            "_id": "$regels.btw_percentage",
            "inkoop": {"$sum": {"$multiply": ["$regels.aantal", "$regels.prijs_per_eenheid"]}},
            "btw_aftrek": {"$sum": {"$multiply": [
                {"$multiply": ["$regels.aantal", "$regels.prijs_per_eenheid"]},
                {"$divide": ["$regels.btw_percentage", 100]}
            ]}}
        }}
    ]
    
    inkoop_result = await db.boekhouding_inkoopfacturen.aggregate(inkoop_pipeline).to_list(10)
    
    # Process results
    omzet_hoog = sum(r.get("omzet", 0) for r in verkoop_result if r.get("_id") == 25)
    omzet_laag = sum(r.get("omzet", 0) for r in verkoop_result if r.get("_id") == 10)
    omzet_nul = sum(r.get("omzet", 0) for r in verkoop_result if r.get("_id") == 0)
    omzet_vrijgesteld = 0  # Would need separate tracking
    
    btw_hoog = sum(r.get("btw", 0) for r in verkoop_result if r.get("_id") == 25)
    btw_laag = sum(r.get("btw", 0) for r in verkoop_result if r.get("_id") == 10)
    
    totaal_btw_verkoop = btw_hoog + btw_laag
    
    inkoop_btw_aftrekbaar = sum(r.get("btw_aftrek", 0) for r in inkoop_result)
    
    btw_te_betalen = totaal_btw_verkoop - inkoop_btw_aftrekbaar
    
    return {
        "periode_van": periode_van,
        "periode_tot": periode_tot,
        "verkoop": {
            "omzet_hoog_tarief": round(omzet_hoog, 2),
            "omzet_laag_tarief": round(omzet_laag, 2),
            "omzet_nul_tarief": round(omzet_nul, 2),
            "omzet_vrijgesteld": round(omzet_vrijgesteld, 2),
            "btw_hoog_tarief": round(btw_hoog, 2),
            "btw_laag_tarief": round(btw_laag, 2),
            "totaal_btw": round(totaal_btw_verkoop, 2)
        },
        "inkoop": {
            "btw_aftrekbaar": round(inkoop_btw_aftrekbaar, 2)
        },
        "saldo": {
            "te_betalen": round(btw_te_betalen, 2) if btw_te_betalen > 0 else 0,
            "te_vorderen": round(abs(btw_te_betalen), 2) if btw_te_betalen < 0 else 0
        }
    }

@router.get("/btw/controlelijst")
async def get_btw_controlelijst(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get BTW validation list - invoices with missing or incorrect BTW"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    problemen = []
    
    # Check verkoopfacturen without BTW
    async for fac in db.boekhouding_verkoopfacturen.find({
        "user_id": user_id,
        "status": {"$ne": "geannuleerd"},
        "btw_totaal": 0
    }).limit(50):
        fac.pop("_id", None)
        problemen.append({
            "type": "verkoopfactuur",
            "nummer": fac.get("factuurnummer"),
            "probleem": "Geen BTW berekend",
            "datum": fac.get("factuurdatum"),
            "bedrag": fac.get("totaal")
        })
    
    # Check inkoopfacturen without BTW
    async for fac in db.boekhouding_inkoopfacturen.find({
        "user_id": user_id,
        "status": {"$ne": "geannuleerd"},
        "btw_totaal": 0
    }).limit(50):
        fac.pop("_id", None)
        problemen.append({
            "type": "inkoopfactuur",
            "nummer": fac.get("intern_factuurnummer"),
            "probleem": "Geen BTW berekend",
            "datum": fac.get("factuurdatum"),
            "bedrag": fac.get("totaal")
        })
    
    return {"problemen": problemen, "aantal": len(problemen)}

# ==================== RAPPORTAGES ENDPOINTS ====================

@router.get("/rapportages/balans")
async def get_balans(
    datum: str = Query(..., description="Balansdatum YYYY-MM-DD"),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Generate balance sheet"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    # Get all accounts with their balances
    activa = {"totaal": 0.0, "details": []}
    passiva = {"totaal": 0.0, "details": []}
    eigen_vermogen = {"totaal": 0.0, "details": []}
    
    async for rek in db.boekhouding_rekeningen.find({"user_id": user_id, "actief": True}).sort("nummer", 1):
        item = {
            "nummer": rek.get("nummer"),
            "naam": rek.get("naam"),
            "saldo": rek.get("saldo", 0)
        }
        
        rek_type = rek.get("type")
        if rek_type == "activa":
            activa["details"].append(item)
            activa["totaal"] += item["saldo"]
        elif rek_type == "passiva":
            passiva["details"].append(item)
            passiva["totaal"] += abs(item["saldo"])
        elif rek_type == "eigen_vermogen":
            eigen_vermogen["details"].append(item)
            eigen_vermogen["totaal"] += abs(item["saldo"])
    
    return {
        "datum": datum,
        "activa": activa,
        "passiva": passiva,
        "eigen_vermogen": eigen_vermogen,
        "totaal_activa": activa["totaal"],
        "totaal_passiva_ev": passiva["totaal"] + eigen_vermogen["totaal"],
        "in_balans": abs(activa["totaal"] - (passiva["totaal"] + eigen_vermogen["totaal"])) < 0.01
    }

@router.get("/rapportages/winst-verlies")
async def get_winst_verlies(
    periode_van: str = Query(...),
    periode_tot: str = Query(...),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Generate profit & loss statement"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    omzet = {"totaal": 0.0, "details": []}
    kosten = {"totaal": 0.0, "details": []}
    
    # Get journaalposten in periode
    async for post in db.boekhouding_journaalposten.find({
        "user_id": user_id,
        "datum": {"$gte": periode_van, "$lte": periode_tot}
    }):
        for regel in post.get("regels", []):
            rek_nummer = regel.get("rekening_nummer", "")
            bedrag = regel.get("credit", 0) - regel.get("debet", 0)
            
            # Omzet rekeningen (4xxx)
            if rek_nummer.startswith("4"):
                omzet["totaal"] += bedrag
            # Kosten rekeningen (5xxx - 9xxx)
            elif rek_nummer[0] in ["5", "6", "7", "8", "9"]:
                kosten["totaal"] += abs(bedrag)
    
    # Get rekening details
    async for rek in db.boekhouding_rekeningen.find({"user_id": user_id}).sort("nummer", 1):
        nummer = rek.get("nummer", "")
        if nummer.startswith("4"):
            omzet["details"].append({
                "nummer": nummer,
                "naam": rek.get("naam"),
                "saldo": rek.get("saldo", 0)
            })
        elif nummer[0] in ["5", "6", "7", "8", "9"]:
            kosten["details"].append({
                "nummer": nummer,
                "naam": rek.get("naam"),
                "saldo": rek.get("saldo", 0)
            })
    
    bruto_winst = omzet["totaal"] - kosten["totaal"]
    
    return {
        "periode_van": periode_van,
        "periode_tot": periode_tot,
        "omzet": omzet,
        "kosten": kosten,
        "bruto_winst": bruto_winst,
        "netto_winst": bruto_winst  # Simplified - would need tax calculation
    }

@router.get("/rapportages/openstaande-debiteuren")
async def get_openstaande_debiteuren_rapport(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get outstanding debtors report"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    rapport = []
    
    async for deb in db.boekhouding_debiteuren.find({"user_id": user_id, "openstaand_saldo": {"$gt": 0}}):
        facturen = []
        async for fac in db.boekhouding_verkoopfacturen.find({
            "user_id": user_id,
            "debiteur_id": deb["id"],
            "status": {"$in": ["verzonden", "gedeeltelijk_betaald", "vervallen"]}
        }).sort("factuurdatum", 1):
            fac.pop("_id", None)
            facturen.append({
                "factuurnummer": fac.get("factuurnummer"),
                "datum": fac.get("factuurdatum"),
                "vervaldatum": fac.get("vervaldatum"),
                "totaal": fac.get("totaal"),
                "openstaand": fac.get("openstaand_bedrag"),
                "valuta": fac.get("valuta")
            })
        
        rapport.append({
            "debiteur": {
                "klantnummer": deb.get("klantnummer"),
                "bedrijfsnaam": deb.get("bedrijfsnaam"),
                "openstaand_saldo": deb.get("openstaand_saldo")
            },
            "facturen": facturen
        })
    
    return rapport

@router.get("/rapportages/openstaande-crediteuren")
async def get_openstaande_crediteuren_rapport(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get outstanding creditors report"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    rapport = []
    
    async for cred in db.boekhouding_crediteuren.find({"user_id": user_id, "openstaand_saldo": {"$gt": 0}}):
        facturen = []
        async for fac in db.boekhouding_inkoopfacturen.find({
            "user_id": user_id,
            "crediteur_id": cred["id"],
            "status": {"$in": ["verzonden", "gedeeltelijk_betaald", "vervallen"]}
        }).sort("factuurdatum", 1):
            fac.pop("_id", None)
            facturen.append({
                "factuurnummer": fac.get("extern_factuurnummer"),
                "datum": fac.get("factuurdatum"),
                "vervaldatum": fac.get("vervaldatum"),
                "totaal": fac.get("totaal"),
                "openstaand": fac.get("openstaand_bedrag"),
                "valuta": fac.get("valuta")
            })
        
        rapport.append({
            "crediteur": {
                "leveranciersnummer": cred.get("leveranciersnummer"),
                "bedrijfsnaam": cred.get("bedrijfsnaam"),
                "openstaand_saldo": cred.get("openstaand_saldo")
            },
            "facturen": facturen
        })
    
    return rapport

@router.get("/rapportages/proef-saldibalans")
async def get_proef_saldibalans(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get trial balance"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    rekeningen = []
    totaal_debet = 0.0
    totaal_credit = 0.0
    
    async for rek in db.boekhouding_rekeningen.find({"user_id": user_id, "actief": True}).sort("nummer", 1):
        saldo = rek.get("saldo", 0)
        debet = saldo if saldo > 0 else 0
        credit = abs(saldo) if saldo < 0 else 0
        
        rekeningen.append({
            "nummer": rek.get("nummer"),
            "naam": rek.get("naam"),
            "debet": debet,
            "credit": credit
        })
        
        totaal_debet += debet
        totaal_credit += credit
    
    return {
        "rekeningen": rekeningen,
        "totaal_debet": totaal_debet,
        "totaal_credit": totaal_credit,
        "in_balans": abs(totaal_debet - totaal_credit) < 0.01
    }

# ==================== VOORRAAD ENDPOINTS ====================

@router.get("/artikelen")
async def list_artikelen(
    categorie: Optional[str] = None,
    voorraad_artikel: Optional[bool] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List articles/products"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if categorie:
        query["categorie"] = categorie
    if voorraad_artikel is not None:
        query["voorraad_artikel"] = voorraad_artikel
    
    artikelen = []
    async for art in db.boekhouding_artikelen.find(query).sort("artikelcode", 1):
        art.pop("_id", None)
        artikelen.append(art)
    
    return artikelen

@router.post("/artikelen")
async def create_artikel(data: ArtikelCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create an article"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.boekhouding_artikelen.find_one({
        "user_id": user_id,
        "artikelcode": data.artikelcode
    })
    if existing:
        raise HTTPException(status_code=400, detail="Artikelcode bestaat al")
    
    artikel = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.model_dump(),
        "valuta": data.valuta.value,
        "huidige_voorraad": 0.0,
        "gemiddelde_kostprijs": data.inkoopprijs,
        "voorraadwaarde": 0.0,
        "created_at": now
    }
    
    await db.boekhouding_artikelen.insert_one(artikel)
    artikel.pop("_id", None)
    return artikel

@router.get("/magazijnen")
async def list_magazijnen(db=Depends(get_db), current_user=Depends(get_current_user)):
    """List warehouses"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    magazijnen = []
    async for mag in db.boekhouding_magazijnen.find({"user_id": user_id}).sort("code", 1):
        mag.pop("_id", None)
        magazijnen.append(mag)
    
    return magazijnen

@router.post("/magazijnen")
async def create_magazijn(data: MagazijnCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a warehouse"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    magazijn = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **data.model_dump(),
        "created_at": now
    }
    
    await db.boekhouding_magazijnen.insert_one(magazijn)
    magazijn.pop("_id", None)
    return magazijn

@router.post("/voorraad/mutatie")
async def create_voorraad_mutatie(data: VoorraadMutatieCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a stock mutation"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Get artikel
    artikel = await db.boekhouding_artikelen.find_one({
        "user_id": user_id,
        "id": data.artikel_id
    })
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel niet gevonden")
    
    voorraad_voor = artikel.get("huidige_voorraad", 0)
    
    # Calculate new voorraad
    if data.type in [MutatieTypeEnum.INKOOP, MutatieTypeEnum.RETOUR, MutatieTypeEnum.PRODUCTIE]:
        voorraad_na = voorraad_voor + data.aantal
    else:
        voorraad_na = voorraad_voor - data.aantal
    
    if voorraad_na < 0:
        raise HTTPException(status_code=400, detail="Onvoldoende voorraad")
    
    # Generate mutatie nummer
    jaar = datetime.now().year
    count = await db.boekhouding_voorraad_mutaties.count_documents({
        "user_id": user_id,
        "mutatie_nummer": {"$regex": f"^VM{jaar}-"}
    })
    mutatie_nummer = f"VM{jaar}-{count + 1:05d}"
    
    # Update gemiddelde kostprijs if inkoop
    nieuwe_kostprijs = artikel.get("gemiddelde_kostprijs", 0)
    if data.type == MutatieTypeEnum.INKOOP and data.kostprijs:
        totale_waarde = voorraad_voor * artikel.get("gemiddelde_kostprijs", 0)
        nieuwe_waarde = data.aantal * data.kostprijs
        nieuwe_kostprijs = (totale_waarde + nieuwe_waarde) / voorraad_na if voorraad_na > 0 else data.kostprijs
    
    mutatie = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "mutatie_nummer": mutatie_nummer,
        **data.model_dump(),
        "type": data.type.value,
        "voorraad_voor": voorraad_voor,
        "voorraad_na": voorraad_na,
        "created_at": now,
        "created_by": user_id
    }
    
    await db.boekhouding_voorraad_mutaties.insert_one(mutatie)
    
    # Update artikel voorraad
    await db.boekhouding_artikelen.update_one(
        {"id": data.artikel_id},
        {"$set": {
            "huidige_voorraad": voorraad_na,
            "gemiddelde_kostprijs": nieuwe_kostprijs,
            "voorraadwaarde": voorraad_na * nieuwe_kostprijs,
            "updated_at": now
        }}
    )
    
    mutatie.pop("_id", None)
    return mutatie

@router.get("/voorraad/waardering")
async def get_voorraad_waardering(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get stock valuation report"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    artikelen = []
    totaal_waarde = 0.0
    
    async for art in db.boekhouding_artikelen.find({
        "user_id": user_id,
        "voorraad_artikel": True,
        "actief": True
    }).sort("artikelcode", 1):
        art.pop("_id", None)
        voorraad = art.get("huidige_voorraad", 0)
        kostprijs = art.get("gemiddelde_kostprijs", 0)
        waarde = voorraad * kostprijs
        
        artikelen.append({
            "artikelcode": art.get("artikelcode"),
            "naam": art.get("naam"),
            "voorraad": voorraad,
            "eenheid": art.get("eenheid"),
            "kostprijs": kostprijs,
            "waarde": waarde
        })
        totaal_waarde += waarde
    
    return {
        "artikelen": artikelen,
        "totaal_waarde": totaal_waarde
    }

# ==================== PROJECTEN ENDPOINTS ====================

@router.get("/projecten")
async def list_projecten(
    status: Optional[str] = None,
    klant_id: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List projects"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    if klant_id:
        query["klant_id"] = klant_id
    
    projecten = []
    async for proj in db.boekhouding_projecten.find(query).sort("projectnummer", -1):
        proj.pop("_id", None)
        projecten.append(proj)
    
    return projecten

@router.post("/projecten")
async def create_project(data: ProjectCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Create a project"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate projectnummer
    jaar = datetime.now().year
    count = await db.boekhouding_projecten.count_documents({
        "user_id": user_id,
        "projectnummer": {"$regex": f"^PRJ{jaar}-"}
    })
    projectnummer = f"PRJ{jaar}-{count + 1:05d}"
    
    project = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "projectnummer": projectnummer,
        **data.model_dump(),
        "valuta": data.valuta.value,
        "status": "open",
        "gerealiseerde_uren": 0.0,
        "gerealiseerde_kosten": 0.0,
        "gerealiseerde_materialen": 0.0,
        "gefactureerd_bedrag": 0.0,
        "created_at": now
    }
    
    await db.boekhouding_projecten.insert_one(project)
    project.pop("_id", None)
    return project

@router.get("/projecten/{project_id}")
async def get_project(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get project details with hours and costs"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    project = await db.boekhouding_projecten.find_one({
        "user_id": user_id,
        "id": project_id
    })
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    # Get uren
    uren = []
    async for uur in db.boekhouding_uren.find({"user_id": user_id, "project_id": project_id}).sort("datum", -1):
        uur.pop("_id", None)
        uren.append(uur)
    
    # Get klant info if applicable
    klant = None
    if project.get("klant_id"):
        klant = await db.boekhouding_debiteuren.find_one({"id": project["klant_id"]})
        if klant:
            klant.pop("_id", None)
    
    project.pop("_id", None)
    project["uren"] = uren
    project["klant"] = klant
    
    return project

@router.post("/projecten/{project_id}/uren")
async def registreer_uren(project_id: str, data: UrenRegistratieCreate, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Register hours on a project"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Verify project exists
    project = await db.boekhouding_projecten.find_one({
        "user_id": user_id,
        "id": project_id
    })
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    uren = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "project_id": project_id,
        **data.model_dump(),
        "status": "ingevoerd",
        "created_at": now
    }
    
    await db.boekhouding_uren.insert_one(uren)
    
    # Update project totals
    await db.boekhouding_projecten.update_one(
        {"id": project_id},
        {"$inc": {"gerealiseerde_uren": data.aantal_uren}}
    )
    
    uren.pop("_id", None)
    return uren

@router.get("/projecten/{project_id}/resultaat")
async def get_project_resultaat(project_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get project financial result"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    project = await db.boekhouding_projecten.find_one({
        "user_id": user_id,
        "id": project_id
    })
    if not project:
        raise HTTPException(status_code=404, detail="Project niet gevonden")
    
    # Calculate totals
    uren_pipeline = [
        {"$match": {"user_id": user_id, "project_id": project_id}},
        {"$group": {
            "_id": None,
            "totaal_uren": {"$sum": "$aantal_uren"},
            "totaal_intern": {"$sum": {"$multiply": ["$aantal_uren", "$intern_tarief"]}},
            "totaal_extern": {"$sum": {"$multiply": ["$aantal_uren", "$extern_tarief"]}}
        }}
    ]
    
    uren_result = await db.boekhouding_uren.aggregate(uren_pipeline).to_list(1)
    
    totaal_uren = uren_result[0].get("totaal_uren", 0) if uren_result else 0
    kosten_uren = uren_result[0].get("totaal_intern", 0) if uren_result else 0
    omzet_uren = uren_result[0].get("totaal_extern", 0) if uren_result else 0
    
    budget_uren = project.get("budget_uren", 0)
    budget_kosten = project.get("budget_kosten", 0)
    
    return {
        "project": {
            "projectnummer": project.get("projectnummer"),
            "naam": project.get("naam"),
            "status": project.get("status")
        },
        "budget": {
            "uren": budget_uren,
            "kosten": budget_kosten
        },
        "gerealiseerd": {
            "uren": totaal_uren,
            "kosten": kosten_uren,
            "omzet": omzet_uren
        },
        "afwijking": {
            "uren": totaal_uren - budget_uren,
            "kosten": kosten_uren - budget_kosten
        },
        "resultaat": omzet_uren - kosten_uren
    }

# ==================== DOCUMENTEN ENDPOINTS ====================

@router.post("/documenten/upload")
async def upload_document(
    file: UploadFile = File(...),
    type: str = Query("overig"),
    referentie_type: Optional[str] = None,
    referentie_id: Optional[str] = None,
    omschrijving: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Upload a document"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    content = await file.read()
    
    document = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "naam": file.filename,
        "type": type,
        "referentie_type": referentie_type,
        "referentie_id": referentie_id,
        "omschrijving": omschrijving,
        "bestandsnaam": file.filename,
        "bestandsgrootte": len(content),
        "mime_type": file.content_type,
        "content": content,  # In production, store in file storage
        "upload_datum": now,
        "geupload_door": user_id
    }
    
    await db.boekhouding_documenten.insert_one(document)
    
    # Remove content from response
    document.pop("content", None)
    document.pop("_id", None)
    return document

@router.get("/documenten")
async def list_documenten(
    type: Optional[str] = None,
    referentie_type: Optional[str] = None,
    referentie_id: Optional[str] = None,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """List documents"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    query = {"user_id": user_id}
    if type:
        query["type"] = type
    if referentie_type:
        query["referentie_type"] = referentie_type
    if referentie_id:
        query["referentie_id"] = referentie_id
    
    documenten = []
    async for doc in db.boekhouding_documenten.find(query, {"content": 0}).sort("upload_datum", -1):
        doc.pop("_id", None)
        documenten.append(doc)
    
    return documenten

@router.get("/documenten/{document_id}/download")
async def download_document(document_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Download a document"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    document = await db.boekhouding_documenten.find_one({
        "user_id": user_id,
        "id": document_id
    })
    if not document:
        raise HTTPException(status_code=404, detail="Document niet gevonden")
    
    return StreamingResponse(
        io.BytesIO(document.get("content", b"")),
        media_type=document.get("mime_type", "application/octet-stream"),
        headers={
            "Content-Disposition": f"attachment; filename={document.get('bestandsnaam', 'document')}"
        }
    )

# ==================== PERIODE BEHEER ENDPOINTS ====================

@router.get("/periodes")
async def list_periodes(db=Depends(get_db), current_user=Depends(get_current_user)):
    """List accounting periods"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    periodes = []
    async for periode in db.boekhouding_periodes.find({"user_id": user_id}).sort([("jaar", -1), ("maand", -1)]):
        periode.pop("_id", None)
        periodes.append(periode)
    
    return periodes

@router.post("/periodes/afsluiten")
async def sluit_periode_af(
    jaar: int = Query(...),
    maand: int = Query(...),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Close an accounting period"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    periode_naam = f"{jaar}-{maand:02d}"
    
    # Check if already closed
    existing = await db.boekhouding_periodes.find_one({
        "user_id": user_id,
        "jaar": jaar,
        "maand": maand
    })
    
    if existing and existing.get("status") == "gesloten":
        raise HTTPException(status_code=400, detail="Periode is al gesloten")
    
    # Create or update periode
    periode = {
        "id": str(uuid.uuid4()) if not existing else existing["id"],
        "user_id": user_id,
        "jaar": jaar,
        "maand": maand,
        "naam": periode_naam,
        "status": "gesloten",
        "afgesloten_op": now,
        "afgesloten_door": user_id
    }
    
    if existing:
        await db.boekhouding_periodes.update_one(
            {"id": existing["id"]},
            {"$set": periode}
        )
    else:
        await db.boekhouding_periodes.insert_one(periode)
    
    periode.pop("_id", None)
    return {"message": f"Periode {periode_naam} afgesloten", "periode": periode}



# ==================== PDF FACTUUR GENERATIE ====================

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
import base64

@router.get("/verkoopfacturen/{factuur_id}/pdf")
async def generate_factuur_pdf(
    factuur_id: str,
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Generate PDF invoice with company logo"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    # Get factuur
    factuur = await db.boekhouding_verkoopfacturen.find_one({
        "user_id": user_id,
        "id": factuur_id
    })
    if not factuur:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    
    # Get debiteur
    debiteur = await db.boekhouding_debiteuren.find_one({"id": factuur.get("debiteur_id")})
    
    # Get company info
    user = await db.users.find_one({"id": user_id})
    company_name = user.get("company_name", user.get("name", "Uw Bedrijf"))
    company_address = user.get("address", "Paramaribo, Suriname")
    company_phone = user.get("phone", "")
    company_email = user.get("email", "")
    company_btw = user.get("btw_nummer", "")
    company_kvk = user.get("kvk_nummer", "")
    company_logo = user.get("logo_base64")
    
    # Create PDF buffer
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='RightAlign', alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='CenterAlign', alignment=TA_CENTER))
    styles.add(ParagraphStyle(name='Header', fontSize=24, spaceAfter=10, textColor=colors.HexColor('#1E40AF')))
    styles.add(ParagraphStyle(name='SubHeader', fontSize=12, textColor=colors.HexColor('#6B7280')))
    
    elements = []
    
    # Header with logo
    header_data = []
    
    # Company info (left side)
    company_info = f"""
    <b>{company_name}</b><br/>
    {company_address}<br/>
    Tel: {company_phone}<br/>
    Email: {company_email}<br/>
    """
    if company_btw:
        company_info += f"BTW: {company_btw}<br/>"
    if company_kvk:
        company_info += f"KvK: {company_kvk}"
    
    header_left = Paragraph(company_info, styles['Normal'])
    
    # Invoice title (right side)
    header_right = Paragraph(f"""
    <font size="20" color="#1E40AF"><b>FACTUUR</b></font><br/><br/>
    <b>Factuurnummer:</b> {factuur.get('factuurnummer')}<br/>
    <b>Factuurdatum:</b> {factuur.get('factuurdatum')}<br/>
    <b>Vervaldatum:</b> {factuur.get('vervaldatum')}<br/>
    <b>Valuta:</b> {factuur.get('valuta', 'SRD')}
    """, styles['RightAlign'])
    
    header_table = Table([[header_left, header_right]], colWidths=[90*mm, 80*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15*mm))
    
    # Customer info
    customer_info = f"""
    <b>Factuur aan:</b><br/>
    <b>{debiteur.get('bedrijfsnaam', 'N/A') if debiteur else 'N/A'}</b><br/>
    {debiteur.get('adres', '') if debiteur else ''}<br/>
    {debiteur.get('postcode', '')} {debiteur.get('plaats', '') if debiteur else ''}<br/>
    {debiteur.get('land', 'Suriname') if debiteur else 'Suriname'}<br/>
    """
    if debiteur and debiteur.get('btw_nummer'):
        customer_info += f"BTW-nummer: {debiteur.get('btw_nummer')}"
    
    elements.append(Paragraph(customer_info, styles['Normal']))
    elements.append(Spacer(1, 10*mm))
    
    # Invoice lines table
    table_data = [['Omschrijving', 'Aantal', 'Eenheid', 'Prijs', 'BTW%', 'Totaal']]
    
    for regel in factuur.get('regels', []):
        aantal = regel.get('aantal', 1)
        prijs = regel.get('prijs_per_eenheid', 0)
        btw_pct = regel.get('btw_percentage', 0)
        korting = regel.get('korting_percentage', 0)
        
        subtotaal = aantal * prijs
        if korting > 0:
            subtotaal = subtotaal * (1 - korting/100)
        
        valuta = factuur.get('valuta', 'SRD')
        table_data.append([
            regel.get('omschrijving', ''),
            f"{aantal:.2f}",
            regel.get('eenheid', 'stuk'),
            f"{valuta} {prijs:,.2f}",
            f"{btw_pct:.0f}%",
            f"{valuta} {subtotaal:,.2f}"
        ])
    
    line_table = Table(table_data, colWidths=[70*mm, 20*mm, 20*mm, 30*mm, 15*mm, 30*mm])
    line_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E40AF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 10*mm))
    
    # Totals
    valuta = factuur.get('valuta', 'SRD')
    totals_data = [
        ['', 'Subtotaal:', f"{valuta} {factuur.get('subtotaal', 0):,.2f}"],
        ['', 'BTW:', f"{valuta} {factuur.get('btw_totaal', 0):,.2f}"],
        ['', 'Totaal:', f"{valuta} {factuur.get('totaal', 0):,.2f}"],
    ]
    
    if factuur.get('openstaand_bedrag', 0) != factuur.get('totaal', 0):
        totals_data.append(['', 'Reeds betaald:', f"{valuta} {factuur.get('totaal', 0) - factuur.get('openstaand_bedrag', 0):,.2f}"])
        totals_data.append(['', 'Openstaand:', f"{valuta} {factuur.get('openstaand_bedrag', 0):,.2f}"])
    
    totals_table = Table(totals_data, colWidths=[105*mm, 40*mm, 40*mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('FONTNAME', (1, -1), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEABOVE', (1, -1), (2, -1), 1, colors.HexColor('#1E40AF')),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 15*mm))
    
    # Payment info
    payment_info = f"""
    <b>Betalingsgegevens:</b><br/>
    Betaalreferentie: {factuur.get('betaalreferentie', factuur.get('factuurnummer'))}<br/>
    Vervaldatum: {factuur.get('vervaldatum')}<br/><br/>
    Gelieve het factuurnummer te vermelden bij uw betaling.<br/>
    """
    elements.append(Paragraph(payment_info, styles['Normal']))
    
    if factuur.get('opmerkingen'):
        elements.append(Spacer(1, 5*mm))
        elements.append(Paragraph(f"<b>Opmerkingen:</b><br/>{factuur.get('opmerkingen')}", styles['Normal']))
    
    # Footer
    elements.append(Spacer(1, 20*mm))
    footer_text = f"""
    <font size="8" color="#6B7280">
    Bedankt voor uw vertrouwen in {company_name}.<br/>
    Bij vragen over deze factuur kunt u contact opnemen via {company_email}.
    </font>
    """
    elements.append(Paragraph(footer_text, styles['CenterAlign']))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Factuur_{factuur.get('factuurnummer')}.pdf"
        }
    )

# ==================== BANK IMPORT PER BANK ====================

# Bank-specific CSV parsers
BANK_PARSERS = {
    "DSB": {
        "delimiter": ";",
        "columns": {
            "datum": ["Datum", "Date", "Boekdatum"],
            "bedrag": ["Bedrag", "Amount", "Waarde"],
            "omschrijving": ["Omschrijving", "Description", "Mededeling"],
            "tegenrekening": ["Tegenrekening", "Counter Account", "IBAN"],
            "naam": ["Naam", "Name", "Begunstigde"]
        },
        "date_format": "%d-%m-%Y"
    },
    "Finabank": {
        "delimiter": ",",
        "columns": {
            "datum": ["Transaction Date", "Date", "Datum"],
            "bedrag": ["Amount", "Bedrag", "Value"],
            "omschrijving": ["Description", "Omschrijving", "Narrative"],
            "tegenrekening": ["Account", "Tegenrekening"],
            "naam": ["Beneficiary", "Name", "Naam"]
        },
        "date_format": "%Y-%m-%d"
    },
    "Hakrinbank": {
        "delimiter": ";",
        "columns": {
            "datum": ["Valutadatum", "Datum", "Date"],
            "bedrag": ["Bedrag", "Amount"],
            "omschrijving": ["Omschrijving", "Mededeling"],
            "tegenrekening": ["Tegenrekening"],
            "naam": ["Naam"]
        },
        "date_format": "%d/%m/%Y"
    },
    "Republic": {
        "delimiter": ",",
        "columns": {
            "datum": ["Post Date", "Date"],
            "bedrag": ["Amount", "Debit/Credit"],
            "omschrijving": ["Description", "Narrative"],
            "tegenrekening": ["Reference"],
            "naam": ["Payee"]
        },
        "date_format": "%m/%d/%Y"
    },
    "SPSB": {
        "delimiter": ";",
        "columns": {
            "datum": ["Datum", "Boekingsdatum"],
            "bedrag": ["Bedrag"],
            "omschrijving": ["Omschrijving"],
            "tegenrekening": ["Tegenrekening"],
            "naam": ["Naam begunstigde"]
        },
        "date_format": "%d-%m-%Y"
    }
}

def parse_bank_csv(content: str, bank_naam: str) -> list:
    """Parse CSV content based on bank-specific format"""
    parser = BANK_PARSERS.get(bank_naam, BANK_PARSERS.get("DSB"))  # Default to DSB format
    
    delimiter = parser.get("delimiter", ";")
    column_mapping = parser.get("columns", {})
    date_format = parser.get("date_format", "%d-%m-%Y")
    
    # Try to detect delimiter if not working
    lines = content.strip().split('\n')
    if len(lines) < 2:
        return []
    
    # Check if delimiter works
    header_line = lines[0]
    if delimiter not in header_line:
        # Try other delimiters
        for delim in [';', ',', '\t']:
            if delim in header_line:
                delimiter = delim
                break
    
    reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)
    
    mutaties = []
    for row in reader:
        mutatie = {}
        
        # Find datum
        for key in column_mapping.get("datum", []):
            if key in row:
                mutatie["datum"] = row[key]
                break
        
        # Find bedrag
        for key in column_mapping.get("bedrag", []):
            if key in row:
                bedrag_str = row[key].replace(',', '.').replace(' ', '').replace('SRD', '').replace('USD', '').replace('EUR', '')
                try:
                    mutatie["bedrag"] = float(bedrag_str)
                except:
                    mutatie["bedrag"] = 0.0
                break
        
        # Find omschrijving
        for key in column_mapping.get("omschrijving", []):
            if key in row:
                mutatie["omschrijving"] = row[key]
                break
        
        # Find tegenrekening
        for key in column_mapping.get("tegenrekening", []):
            if key in row:
                mutatie["tegenrekening"] = row[key]
                break
        
        # Find naam
        for key in column_mapping.get("naam", []):
            if key in row:
                mutatie["naam"] = row[key]
                break
        
        if mutatie.get("datum") and mutatie.get("bedrag") is not None:
            mutaties.append(mutatie)
    
    return mutaties

@router.post("/bankrekeningen/{rekening_id}/import-bank")
async def import_bank_mutaties_enhanced(
    rekening_id: str,
    bank_naam: str = Query(..., description="DSB, Finabank, Hakrinbank, Republic, SPSB"),
    file: UploadFile = File(...),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Import bank mutations with bank-specific parsing"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    # Verify bank account exists
    bankrekening = await db.boekhouding_bankrekeningen.find_one({
        "user_id": user_id,
        "id": rekening_id
    })
    if not bankrekening:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    
    # Read and parse file
    content = await file.read()
    decoded = content.decode('utf-8', errors='ignore')
    
    # Parse based on bank
    mutaties_parsed = parse_bank_csv(decoded, bank_naam)
    
    if not mutaties_parsed:
        raise HTTPException(status_code=400, detail="Geen geldige mutaties gevonden in bestand")
    
    imported = 0
    duplicates = 0
    errors = []
    
    for mut in mutaties_parsed:
        try:
            # Generate unique reference
            trans_ref = f"{mut.get('datum', '')}-{abs(mut.get('bedrag', 0))}-{mut.get('omschrijving', '')[:20]}"
            
            # Check for duplicate
            existing = await db.boekhouding_bankmutaties.find_one({
                "user_id": user_id,
                "bankrekening_id": rekening_id,
                "transactie_ref": trans_ref
            })
            
            if existing:
                duplicates += 1
                continue
            
            mutatie = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "bankrekening_id": rekening_id,
                "datum": mut.get("datum", ""),
                "valutadatum": mut.get("datum", ""),
                "bedrag": mut.get("bedrag", 0),
                "omschrijving": mut.get("omschrijving", ""),
                "tegenrekening": mut.get("tegenrekening", ""),
                "naam_tegenpartij": mut.get("naam", ""),
                "transactie_ref": trans_ref,
                "status": "te_verwerken",
                "bron_bank": bank_naam,
                "created_at": now
            }
            
            await db.boekhouding_bankmutaties.insert_one(mutatie)
            imported += 1
            
        except Exception as e:
            errors.append(str(e))
    
    return {
        "message": f"{imported} mutaties geïmporteerd van {bank_naam}",
        "imported": imported,
        "duplicates": duplicates,
        "errors": errors[:5] if errors else [],
        "bank": bank_naam
    }

# MT940 Parser
def parse_mt940(content: str) -> list:
    """Parse MT940 bank statement format"""
    mutaties = []
    
    # MT940 uses specific tags
    # :60F: Opening balance
    # :61: Transaction
    # :86: Description
    
    lines = content.split('\n')
    current_mutatie = None
    
    for line in lines:
        line = line.strip()
        
        if line.startswith(':61:'):
            # New transaction
            if current_mutatie:
                mutaties.append(current_mutatie)
            
            # Parse :61: line
            # Format: YYMMDDYYMMDDCDAMOUNT...
            data = line[4:]
            try:
                # Extract date (first 6 chars)
                date_str = data[:6]
                year = int("20" + date_str[:2])
                month = int(date_str[2:4])
                day = int(date_str[4:6])
                datum = f"{year}-{month:02d}-{day:02d}"
                
                # Find C (credit) or D (debit)
                sign_pos = 12
                for i, char in enumerate(data[6:], 6):
                    if char in ['C', 'D']:
                        sign_pos = i
                        break
                
                sign = data[sign_pos]
                
                # Extract amount (after sign)
                amount_str = ""
                for char in data[sign_pos + 1:]:
                    if char.isdigit() or char in [',', '.']:
                        amount_str += char
                    else:
                        break
                
                bedrag = float(amount_str.replace(',', '.'))
                if sign == 'D':
                    bedrag = -bedrag
                
                current_mutatie = {
                    "datum": datum,
                    "bedrag": bedrag,
                    "omschrijving": ""
                }
            except Exception as e:
                print(f"MT940 parse error on :61: line: {e}")
                continue
        
        elif line.startswith(':86:') and current_mutatie:
            # Description
            current_mutatie["omschrijving"] = line[4:]
        
        elif current_mutatie and not line.startswith(':') and current_mutatie.get("omschrijving"):
            # Continuation of description
            current_mutatie["omschrijving"] += " " + line
    
    if current_mutatie:
        mutaties.append(current_mutatie)
    
    return mutaties

@router.post("/bankrekeningen/{rekening_id}/import-mt940")
async def import_mt940_mutaties(
    rekening_id: str,
    file: UploadFile = File(...),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Import bank mutations from MT940 file"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    
    bankrekening = await db.boekhouding_bankrekeningen.find_one({
        "user_id": user_id,
        "id": rekening_id
    })
    if not bankrekening:
        raise HTTPException(status_code=404, detail="Bankrekening niet gevonden")
    
    content = await file.read()
    decoded = content.decode('utf-8', errors='ignore')
    
    mutaties_parsed = parse_mt940(decoded)
    
    if not mutaties_parsed:
        raise HTTPException(status_code=400, detail="Geen geldige MT940 mutaties gevonden")
    
    imported = 0
    duplicates = 0
    
    for mut in mutaties_parsed:
        trans_ref = f"MT940-{mut.get('datum', '')}-{abs(mut.get('bedrag', 0)):.2f}"
        
        existing = await db.boekhouding_bankmutaties.find_one({
            "user_id": user_id,
            "bankrekening_id": rekening_id,
            "transactie_ref": trans_ref
        })
        
        if existing:
            duplicates += 1
            continue
        
        mutatie = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "bankrekening_id": rekening_id,
            "datum": mut.get("datum", ""),
            "valutadatum": mut.get("datum", ""),
            "bedrag": mut.get("bedrag", 0),
            "omschrijving": mut.get("omschrijving", ""),
            "transactie_ref": trans_ref,
            "status": "te_verwerken",
            "bron": "mt940",
            "created_at": now
        }
        
        await db.boekhouding_bankmutaties.insert_one(mutatie)
        imported += 1
    
    return {
        "message": f"{imported} MT940 mutaties geïmporteerd",
        "imported": imported,
        "duplicates": duplicates
    }

# ==================== CENTRALE BANK SURINAME API ====================

@router.get("/wisselkoersen/centrale-bank-live")
async def fetch_centrale_bank_koersen_live(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Fetch live exchange rates from Central Bank of Suriname website"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now().strftime("%Y-%m-%d")
    
    try:
        from bs4 import BeautifulSoup
        
        # CBvS website URL for exchange rates
        url = "https://www.cbvs.sr"
        
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            try:
                response = await client.get(url)
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'lxml')
                    
                    # Try to find exchange rate data
                    # Note: Actual parsing depends on CBvS website structure
                    # This is a placeholder that would need adjustment based on actual HTML
                    
                    rates = []
                    
                    # Look for common exchange rate table patterns
                    tables = soup.find_all('table')
                    for table in tables:
                        rows = table.find_all('tr')
                        for row in rows:
                            cells = row.find_all(['td', 'th'])
                            text = ' '.join([cell.get_text().strip() for cell in cells])
                            
                            # Look for USD and EUR rates
                            if 'USD' in text.upper() or 'DOLLAR' in text.upper():
                                # Try to extract rate
                                import re
                                numbers = re.findall(r'\d+[.,]\d+', text)
                                if numbers:
                                    try:
                                        rate = float(numbers[0].replace(',', '.'))
                                        if rate > 1 and rate < 100:  # Reasonable SRD rate
                                            rates.append({
                                                "van_valuta": "USD",
                                                "naar_valuta": "SRD",
                                                "koers": rate
                                            })
                                    except:
                                        pass
                            
                            if 'EUR' in text.upper() or 'EURO' in text.upper():
                                import re
                                numbers = re.findall(r'\d+[.,]\d+', text)
                                if numbers:
                                    try:
                                        rate = float(numbers[0].replace(',', '.'))
                                        if rate > 1 and rate < 100:
                                            rates.append({
                                                "van_valuta": "EUR",
                                                "naar_valuta": "SRD",
                                                "koers": rate
                                            })
                                    except:
                                        pass
                    
                    if rates:
                        # Save rates to database
                        saved_rates = []
                        for rate in rates:
                            koers_data = {
                                "id": str(uuid.uuid4()),
                                "user_id": user_id,
                                "datum": today,
                                "van_valuta": rate["van_valuta"],
                                "naar_valuta": rate["naar_valuta"],
                                "koers": rate["koers"],
                                "bron": "centrale_bank_live",
                                "created_at": now
                            }
                            
                            await db.boekhouding_wisselkoersen.update_one(
                                {
                                    "user_id": user_id,
                                    "datum": today,
                                    "van_valuta": rate["van_valuta"],
                                    "naar_valuta": rate["naar_valuta"]
                                },
                                {"$set": koers_data},
                                upsert=True
                            )
                            saved_rates.append(koers_data)
                        
                        return {
                            "success": True,
                            "message": f"{len(saved_rates)} koersen opgehaald van CBvS",
                            "datum": today,
                            "koersen": saved_rates,
                            "bron": "centrale_bank_live"
                        }
            
            except Exception as e:
                print(f"Error fetching CBvS rates: {e}")
        
        # Fallback to mock rates if CBvS is not accessible
        mock_rates = [
            {"van_valuta": "USD", "naar_valuta": "SRD", "koers": 36.50},
            {"van_valuta": "EUR", "naar_valuta": "SRD", "koers": 39.75},
            {"van_valuta": "SRD", "naar_valuta": "USD", "koers": 0.0274},
            {"van_valuta": "SRD", "naar_valuta": "EUR", "koers": 0.0252},
        ]
        
        saved_rates = []
        for rate in mock_rates:
            koers_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "datum": today,
                "van_valuta": rate["van_valuta"],
                "naar_valuta": rate["naar_valuta"],
                "koers": rate["koers"],
                "bron": "fallback_indicatief",
                "created_at": now
            }
            
            await db.boekhouding_wisselkoersen.update_one(
                {
                    "user_id": user_id,
                    "datum": today,
                    "van_valuta": rate["van_valuta"],
                    "naar_valuta": rate["naar_valuta"]
                },
                {"$set": koers_data},
                upsert=True
            )
            saved_rates.append(koers_data)
        
        return {
            "success": True,
            "message": "Indicatieve koersen (CBvS niet bereikbaar)",
            "datum": today,
            "koersen": saved_rates,
            "bron": "fallback_indicatief",
            "note": "Dit zijn indicatieve koersen. Voor actuele koersen bezoek www.cbvs.sr"
        }
        
    except ImportError:
        # BeautifulSoup not available
        return {
            "success": False,
            "message": "Web scraping niet beschikbaar",
            "error": "BeautifulSoup module niet geïnstalleerd"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Fout bij ophalen koersen: {str(e)}",
            "error": str(e)
        }

# ==================== COMPANY LOGO UPLOAD ====================

@router.post("/instellingen/logo")
async def upload_company_logo(
    file: UploadFile = File(...),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Upload company logo for PDF invoices"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Bestand moet een afbeelding zijn")
    
    content = await file.read()
    
    # Convert to base64
    logo_base64 = base64.b64encode(content).decode('utf-8')
    
    # Save to user profile
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "logo_base64": logo_base64,
            "logo_filename": file.filename,
            "logo_content_type": file.content_type
        }}
    )
    
    return {"message": "Logo geupload", "filename": file.filename}

@router.post("/instellingen/bedrijfsgegevens")
async def update_company_info(
    company_name: str = Query(...),
    address: str = Query(None),
    phone: str = Query(None),
    email: str = Query(None),
    btw_nummer: str = Query(None),
    kvk_nummer: str = Query(None),
    bank_iban: str = Query(None),
    bank_naam: str = Query(None),
    db=Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Update company information for invoices"""
    user_id = current_user.get("id") or str(current_user.get("_id"))
    
    update_data = {
        "company_name": company_name,
    }
    
    if address:
        update_data["address"] = address
    if phone:
        update_data["phone"] = phone
    if email:
        update_data["company_email"] = email
    if btw_nummer:
        update_data["btw_nummer"] = btw_nummer
    if kvk_nummer:
        update_data["kvk_nummer"] = kvk_nummer
    if bank_iban:
        update_data["bank_iban"] = bank_iban
    if bank_naam:
        update_data["bank_naam"] = bank_naam
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    return {"message": "Bedrijfsgegevens bijgewerkt", "updated": update_data}

