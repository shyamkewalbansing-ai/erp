#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class BoekhoudingTester:
    def __init__(self, base_url="https://suriname-ledger.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'debiteuren': [],
            'crediteuren': [],
            'verkoopfacturen': [],
            'inkoopfacturen': [],
            'bankrekeningen': [],
            'wisselkoersen': [],
            'artikelen': [],
            'magazijnen': [],
            'projecten': [],
            'activa': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def register_new_user(self):
        """Register a new user for testing"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "name": f"Boekhouding Test User {timestamp}",
            "email": f"boekhouding{timestamp}@test.sr",
            "password": "testpass123",
            "company_name": f"Test Bedrijf Boekhouding {timestamp}"
        }
        
        success, response = self.run_test(
            "Register New User for Boekhouding Testing",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            print(f"   User ID: {self.user_id}")
            return True
        return False

    # ==================== BOEKHOUDING TESTS ====================
    
    def test_init_volledig(self):
        """Test complete system initialization (76 accounts, 10 BTW codes, 5 journals)"""
        success, response = self.run_test(
            "Initialize Complete Boekhouding System",
            "POST",
            "boekhouding/init/volledig",
            200
        )
        
        if success:
            print(f"   {response.get('message', 'System initialized')}")
            print(f"   Rekeningen: {response.get('rekeningen_count', 0)}")
            print(f"   BTW codes: {response.get('btw_codes_count', 0)}")
            print(f"   Dagboeken: {response.get('dagboeken_count', 0)}")
            return True
        return False
    
    def test_dashboard(self):
        """Test boekhouding dashboard endpoint"""
        success, response = self.run_test(
            "Boekhouding Dashboard",
            "GET",
            "boekhouding/dashboard",
            200
        )
        
        if success:
            print(f"   Debiteuren count: {response.get('debiteuren_count', 0)}")
            print(f"   Crediteuren count: {response.get('crediteuren_count', 0)}")
            print(f"   Bank saldi: {response.get('bank_saldi', {})}")
            print(f"   BTW positie: {response.get('btw_positie', {})}")
            return True
        return False
    
    def test_dashboard_actielijst(self):
        """Test dashboard action items"""
        success, response = self.run_test(
            "Boekhouding Dashboard Actielijst",
            "GET",
            "boekhouding/dashboard/actielijst",
            200
        )
        
        if success:
            print(f"   Action items: {len(response.get('items', []))}")
            return True
        return False
    
    def test_get_rekeningen(self):
        """Test getting all chart of accounts"""
        success, response = self.run_test(
            "Get Chart of Accounts",
            "GET",
            "boekhouding/rekeningen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} accounts")
            if response:
                print(f"   Sample accounts: {response[0].get('nummer')} - {response[0].get('naam')}")
            return True
        return False
    
    def test_get_dagboeken(self):
        """Test getting all journals"""
        success, response = self.run_test(
            "Get Journals (Dagboeken)",
            "GET",
            "boekhouding/dagboeken",
            200
        )
        
        if success:
            print(f"   Found {len(response)} journals")
            for journal in response:
                print(f"   - {journal.get('code')}: {journal.get('naam')} ({journal.get('type')})")
            return True
        return False
    
    def test_create_debiteur(self):
        """Test creating a debiteur (customer)"""
        debiteur_data = {
            "bedrijfsnaam": "Suriname Business Solutions N.V.",
            "email": "info@sbs.sr",
            "telefoon": "+597 456 7890",
            "adres": "Henck Arronstraat 100, Paramaribo",
            "btw_nummer": "SR123456789",
            "valuta": "SRD",
            "betaalconditie_dagen": 30
        }
        
        success, response = self.run_test(
            "Create Debiteur",
            "POST",
            "boekhouding/debiteuren",
            200,
            data=debiteur_data
        )
        
        if success and 'id' in response:
            self.created_resources['debiteuren'].append(response['id'])
            print(f"   Created debiteur ID: {response['id']}")
            print(f"   Name: {response.get('bedrijfsnaam')}")
            print(f"   Currency: {response.get('valuta')}")
            print(f"   Payment term: {response.get('betaalconditie_dagen')} days")
            return True
        return False
    
    def test_get_debiteuren(self):
        """Test getting all debiteuren"""
        success, response = self.run_test(
            "Get Debiteuren",
            "GET",
            "boekhouding/debiteuren",
            200
        )
        
        if success:
            print(f"   Found {len(response)} debiteuren")
            for debiteur in response:
                print(f"   - {debiteur.get('bedrijfsnaam')} ({debiteur.get('valuta')})")
            return True
        return False
    
    def test_create_crediteur(self):
        """Test creating a crediteur (supplier)"""
        crediteur_data = {
            "bedrijfsnaam": "Suriname Office Supplies B.V.",
            "email": "sales@sos.sr",
            "telefoon": "+597 987 6543",
            "adres": "Industrieweg 25, Paramaribo",
            "btw_nummer": "SR987654321",
            "valuta": "USD",
            "betaalconditie_dagen": 14
        }
        
        success, response = self.run_test(
            "Create Crediteur",
            "POST",
            "boekhouding/crediteuren",
            200,
            data=crediteur_data
        )
        
        if success and 'id' in response:
            self.created_resources['crediteuren'].append(response['id'])
            print(f"   Created crediteur ID: {response['id']}")
            print(f"   Name: {response.get('bedrijfsnaam')}")
            print(f"   Currency: {response.get('valuta')}")
            return True
        return False
    
    def test_get_crediteuren(self):
        """Test getting all crediteuren"""
        success, response = self.run_test(
            "Get Crediteuren",
            "GET",
            "boekhouding/crediteuren",
            200
        )
        
        if success:
            print(f"   Found {len(response)} crediteuren")
            for crediteur in response:
                print(f"   - {crediteur.get('bedrijfsnaam')} ({crediteur.get('valuta')})")
            return True
        return False
    
    def test_create_verkoopfactuur(self):
        """Test creating a sales invoice with BTW calculation"""
        if not self.created_resources['debiteuren']:
            print("⚠️  Skipping sales invoice creation - no debiteur created")
            return True
            
        debiteur_id = self.created_resources['debiteuren'][0]
        
        factuur_data = {
            "debiteur_id": debiteur_id,
            "factuurdatum": "2026-02-27",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Consultancy Services",
                    "aantal": 10,
                    "prijs_per_eenheid": 250,
                    "btw_code": "V25",
                    "btw_percentage": 25.0
                },
                {
                    "omschrijving": "Software License",
                    "aantal": 1,
                    "prijs_per_eenheid": 1500,
                    "btw_code": "V10",
                    "btw_percentage": 10.0,
                    "korting_percentage": 5
                }
            ],
            "opmerkingen": "Test factuur met BTW berekening"
        }
        
        success, response = self.run_test(
            "Create Verkoopfactuur with BTW",
            "POST",
            "boekhouding/verkoopfacturen",
            200,
            data=factuur_data
        )
        
        if success and 'id' in response:
            self.created_resources['verkoopfacturen'].append(response['id'])
            print(f"   Created factuur ID: {response['id']}")
            print(f"   Factuurnummer: {response.get('factuurnummer')}")
            print(f"   Subtotaal: {response.get('subtotaal')} {response.get('valuta')}")
            print(f"   BTW bedrag: {response.get('btw_bedrag')} {response.get('valuta')}")
            print(f"   Totaal: {response.get('totaal')} {response.get('valuta')}")
            print(f"   Status: {response.get('status')}")
            return True
        return False
    
    def test_verzend_verkoopfactuur(self):
        """Test sending sales invoice (creates journal entry)"""
        if not self.created_resources['verkoopfacturen']:
            print("⚠️  Skipping invoice sending - no invoice created")
            return True
            
        factuur_id = self.created_resources['verkoopfacturen'][0]
        
        success, response = self.run_test(
            "Send Verkoopfactuur",
            "POST",
            f"boekhouding/verkoopfacturen/{factuur_id}/verzenden",
            200
        )
        
        if success:
            print(f"   Invoice sent: {response.get('factuurnummer')}")
            print(f"   Status: {response.get('status')}")
            print(f"   Journal entry created: {response.get('journaalpost_id', 'N/A')}")
            return True
        return False
    
    def test_create_inkoopfactuur(self):
        """Test creating a purchase invoice"""
        if not self.created_resources['crediteuren']:
            print("⚠️  Skipping purchase invoice creation - no crediteur created")
            return True
            
        crediteur_id = self.created_resources['crediteuren'][0]
        
        factuur_data = {
            "crediteur_id": crediteur_id,
            "extern_factuurnummer": "INK-2026-001",
            "factuurdatum": "2026-02-27",
            "vervaldatum": "2026-03-13",
            "valuta": "USD",
            "regels": [
                {
                    "omschrijving": "Office Supplies",
                    "aantal": 5,
                    "prijs_per_eenheid": 30,
                    "btw_code": "I25",
                    "btw_percentage": 25.0
                }
            ],
            "opmerkingen": "Monthly office supplies purchase"
        }
        
        success, response = self.run_test(
            "Create Inkoopfactuur",
            "POST",
            "boekhouding/inkoopfacturen",
            200,
            data=factuur_data
        )
        
        if success and 'id' in response:
            self.created_resources['inkoopfacturen'].append(response['id'])
            print(f"   Created inkoopfactuur ID: {response['id']}")
            print(f"   Factuurnummer: {response.get('factuurnummer')}")
            print(f"   Totaal: {response.get('totaal')} {response.get('valuta')}")
            return True
        return False
    
    def test_boek_inkoopfactuur(self):
        """Test booking purchase invoice"""
        if not self.created_resources['inkoopfacturen']:
            print("⚠️  Skipping invoice booking - no purchase invoice created")
            return True
            
        factuur_id = self.created_resources['inkoopfacturen'][0]
        
        success, response = self.run_test(
            "Book Inkoopfactuur",
            "POST",
            f"boekhouding/inkoopfacturen/{factuur_id}/boeken",
            200
        )
        
        if success:
            print(f"   Invoice booked: {response.get('factuurnummer')}")
            print(f"   Journal entry: {response.get('journaalpost_id', 'N/A')}")
            return True
        return False
    
    def test_create_bankrekening(self):
        """Test creating a bank account (DSB, Finabank, etc.)"""
        bank_data = {
            "naam": "DSB Zakelijk Rekening",
            "rekeningnummer": "123456789012",
            "bank": "DSB",
            "valuta": "SRD",
            "grootboekrekening": "1100",
            "beginsaldo": 25000,
            "actief": True
        }
        
        success, response = self.run_test(
            "Create Bank Account (DSB)",
            "POST",
            "boekhouding/bankrekeningen",
            200,
            data=bank_data
        )
        
        if success and 'id' in response:
            self.created_resources['bankrekeningen'].append(response['id'])
            print(f"   Created bankrekening ID: {response['id']}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Account number: {response.get('rekeningnummer')}")
            print(f"   Bank: {response.get('bank')}")
            print(f"   Balance: {response.get('huidig_saldo')} {response.get('valuta')}")
            return True
        return False
    
    def test_get_bankrekeningen(self):
        """Test getting all bank accounts"""
        success, response = self.run_test(
            "Get Bank Accounts",
            "GET",
            "boekhouding/bankrekeningen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} bank accounts")
            for bank in response:
                print(f"   - {bank.get('naam')}: {bank.get('huidig_saldo')} {bank.get('valuta')}")
            return True
        return False
    
    def test_get_btw_codes(self):
        """Test getting BTW codes (V25, V10, I25, etc.)"""
        success, response = self.run_test(
            "Get BTW Codes",
            "GET",
            "boekhouding/btw/codes",
            200
        )
        
        if success:
            print(f"   Found {len(response)} BTW codes")
            for code in response:
                print(f"   - {code.get('code')}: {code.get('omschrijving')} ({code.get('percentage')}%)")
            return True
        return False
    
    def test_btw_aangifte(self):
        """Test BTW declaration"""
        success, response = self.run_test(
            "BTW Aangifte",
            "GET",
            "boekhouding/btw/aangifte?periode_van=2026-01-01&periode_tot=2026-12-31",
            200
        )
        
        if success:
            print(f"   Period: {response.get('periode_van')} - {response.get('periode_tot')}")
            print(f"   Omzet hoog tarief: {response.get('omzet_hoog_tarief', 0)}")
            print(f"   BTW hoog tarief: {response.get('btw_hoog_tarief', 0)}")
            print(f"   Te betalen BTW: {response.get('te_betalen_btw', 0)}")
            return True
        return False
    
    def test_create_wisselkoers(self):
        """Test creating manual exchange rate"""
        wisselkoers_data = {
            "van_valuta": "EUR",
            "naar_valuta": "SRD",
            "koers": 38.75,
            "datum": "2026-02-27",
            "bron": "manual"
        }
        
        success, response = self.run_test(
            "Create Manual Exchange Rate",
            "POST",
            "boekhouding/wisselkoersen",
            200,
            data=wisselkoers_data
        )
        
        if success and 'id' in response:
            self.created_resources['wisselkoersen'].append(response['id'])
            print(f"   Created wisselkoers: {response.get('van_valuta')} -> {response.get('naar_valuta')}")
            print(f"   Rate: {response.get('koers')}")
            return True
        return False
    
    def test_get_actuele_wisselkoersen(self):
        """Test getting current exchange rates"""
        success, response = self.run_test(
            "Get Current Exchange Rates",
            "GET",
            "boekhouding/wisselkoersen/actueel",
            200
        )
        
        if success:
            print(f"   Current rates available: {len(response)}")
            if isinstance(response, list):
                for rate in response:
                    print(f"   - {rate.get('van_valuta')}/{rate.get('naar_valuta')}: {rate.get('koers')}")
            else:
                print(f"   Response format: {type(response)}")
            return True
        return False
    
    def test_balans_rapport(self):
        """Test balance sheet report"""
        success, response = self.run_test(
            "Balance Sheet Report",
            "GET",
            "boekhouding/rapportages/balans?datum=2026-02-27",
            200
        )
        
        if success:
            print(f"   Report date: {response.get('datum')}")
            print(f"   Total activa: {response.get('totaal_activa', 0)}")
            print(f"   Total passiva: {response.get('totaal_passiva', 0)}")
            print(f"   In balance: {response.get('in_balans', False)}")
            return True
        return False
    
    def test_winst_verlies_rapport(self):
        """Test profit & loss report"""
        success, response = self.run_test(
            "Profit & Loss Report",
            "GET",
            "boekhouding/rapportages/winst-verlies?periode_van=2026-01-01&periode_tot=2026-12-31",
            200
        )
        
        if success:
            print(f"   Period: {response.get('periode_van')} - {response.get('periode_tot')}")
            print(f"   Total omzet: {response.get('totaal_omzet', 0)}")
            print(f"   Total kosten: {response.get('totaal_kosten', 0)}")
            print(f"   Netto resultaat: {response.get('netto_resultaat', 0)}")
            return True
        return False
    
    def test_proef_saldibalans(self):
        """Test trial balance"""
        success, response = self.run_test(
            "Trial Balance",
            "GET",
            "boekhouding/rapportages/proef-saldibalans",
            200
        )
        
        if success:
            print(f"   Accounts in trial balance: {len(response.get('rekeningen', []))}")
            print(f"   Total debet: {response.get('totaal_debet', 0)}")
            print(f"   Total credit: {response.get('totaal_credit', 0)}")
            print(f"   In balance: {response.get('in_balans', False)}")
            return True
        return False
    
    def test_create_artikel(self):
        """Test creating article"""
        artikel_data = {
            "artikelcode": "ART-BH-001",
            "naam": "Consultancy Service",
            "omschrijving": "Professional consultancy services",
            "eenheid": "uur",
            "verkoopprijs": 125.00,
            "inkoopprijs": 0.00,
            "btw_code_verkoop": "V25",
            "btw_code_inkoop": "I25"
        }
        
        success, response = self.run_test(
            "Create Article",
            "POST",
            "boekhouding/artikelen",
            200,
            data=artikel_data
        )
        
        if success and 'id' in response:
            self.created_resources['artikelen'].append(response['id'])
            print(f"   Created artikel ID: {response['id']}")
            print(f"   Code: {response.get('code')}")
            print(f"   Name: {response.get('naam')}")
            return True
        return False
    
    def test_create_magazijn(self):
        """Test creating warehouse"""
        magazijn_data = {
            "code": "MAG-001",
            "naam": "Hoofdmagazijn",
            "adres": "Magazijnstraat 10, Paramaribo",
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Warehouse",
            "POST",
            "boekhouding/magazijnen",
            200,
            data=magazijn_data
        )
        
        if success and 'id' in response:
            self.created_resources['magazijnen'].append(response['id'])
            print(f"   Created magazijn ID: {response['id']}")
            print(f"   Code: {response.get('code')}")
            print(f"   Name: {response.get('naam')}")
            return True
        return False
    
    def test_create_project(self):
        """Test creating project"""
        project_data = {
            "code": "PRJ-001",
            "naam": "ERP Implementation Project",
            "omschrijving": "Complete ERP system implementation",
            "klant_id": self.created_resources['debiteuren'][0] if self.created_resources['debiteuren'] else None,
            "startdatum": "2026-02-01",
            "einddatum_gepland": "2026-12-31",
            "budget_kosten": 75000,
            "categorie": "klant"
        }
        
        success, response = self.run_test(
            "Create Project",
            "POST",
            "boekhouding/projecten",
            200,
            data=project_data
        )
        
        if success and 'id' in response:
            self.created_resources['projecten'].append(response['id'])
            print(f"   Created project ID: {response['id']}")
            print(f"   Code: {response.get('code')}")
            print(f"   Name: {response.get('naam')}")
            return True
        return False
    
    def test_register_project_hours(self):
        """Test registering hours on project"""
        if not self.created_resources['projecten']:
            print("⚠️  Skipping project hours - no project created")
            return True
            
        project_id = self.created_resources['projecten'][0]
        
        hours_data = {
            "datum": "2026-02-27",
            "medewerker_naam": "John Doe",
            "uren": 8.0,
            "tarief": 125.00,
            "omschrijving": "System analysis and design",
            "factureerbaar": True
        }
        
        success, response = self.run_test(
            "Register Project Hours",
            "POST",
            f"boekhouding/projecten/{project_id}/uren",
            200,
            data=hours_data
        )
        
        if success and 'id' in response:
            print(f"   Registered hours: {response.get('uren')} @ {response.get('tarief')}")
            print(f"   Total amount: {response.get('bedrag')}")
            return True
        return False
    
    def test_create_vast_activum(self):
        """Test creating fixed asset"""
        activum_data = {
            "omschrijving": "Server Equipment",
            "categorie": "computers",
            "aanschafwaarde": 15000.00,
            "aankoopdatum": "2026-02-01",
            "afschrijvingsmethode": "lineair",
            "afschrijvingsduur_maanden": 60,
            "restwaarde": 1000.00
        }
        
        success, response = self.run_test(
            "Create Fixed Asset",
            "POST",
            "boekhouding/vaste-activa",
            200,
            data=activum_data
        )
        
        if success and 'id' in response:
            self.created_resources['activa'].append(response['id'])
            print(f"   Created activum ID: {response['id']}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Aanschafwaarde: {response.get('aanschafwaarde')}")
            print(f"   Jaarlijkse afschrijving: {response.get('jaarlijkse_afschrijving')}")
            return True
        return False
    
    def test_run_depreciation(self):
        """Test running depreciation for period"""
        success, response = self.run_test(
            "Run Depreciation",
            "POST",
            "boekhouding/vaste-activa/afschrijven?periode=2026-02",
            200
        )
        
        if success:
            print(f"   Processed assets: {response.get('verwerkte_activa', 0)}")
            print(f"   Total depreciation: {response.get('totaal_afschrijving', 0)}")
            print(f"   Journal entries created: {response.get('journaalposten_aangemaakt', 0)}")
            return True
        return False

def main():
    """Main test runner for comprehensive Boekhouding module testing"""
    print("🏦 COMPREHENSIVE BOEKHOUDING MODULE TESTING")
    print("=" * 60)
    
    tester = BoekhoudingTester()
    
    # Test sequence as specified in review request
    tests = [
        # INITIALIZATION
        ("Register New User", tester.register_new_user),
        ("Initialize Complete System", tester.test_init_volledig),
        
        # DASHBOARD
        ("Dashboard KPIs", tester.test_dashboard),
        ("Dashboard Action Items", tester.test_dashboard_actielijst),
        
        # GROOTBOEK (Chart of Accounts)
        ("Get Chart of Accounts", tester.test_get_rekeningen),
        ("Get Journals", tester.test_get_dagboeken),
        
        # DEBITEUREN (Debtors)
        ("Create Debiteur", tester.test_create_debiteur),
        ("Get Debiteuren", tester.test_get_debiteuren),
        
        # CREDITEUREN (Creditors)
        ("Create Crediteur", tester.test_create_crediteur),
        ("Get Crediteuren", tester.test_get_crediteuren),
        
        # VERKOOPFACTUREN (Sales Invoices)
        ("Create Verkoopfactuur with BTW", tester.test_create_verkoopfactuur),
        ("Send Verkoopfactuur", tester.test_verzend_verkoopfactuur),
        
        # INKOOPFACTUREN (Purchase Invoices)
        ("Create Inkoopfactuur", tester.test_create_inkoopfactuur),
        ("Book Inkoopfactuur", tester.test_boek_inkoopfactuur),
        
        # BANK
        ("Create Bank Account", tester.test_create_bankrekening),
        ("Get Bank Accounts", tester.test_get_bankrekeningen),
        
        # BTW
        ("Get BTW Codes", tester.test_get_btw_codes),
        ("BTW Declaration", tester.test_btw_aangifte),
        
        # WISSELKOERSEN (Exchange Rates)
        ("Create Manual Exchange Rate", tester.test_create_wisselkoers),
        ("Get Current Exchange Rates", tester.test_get_actuele_wisselkoersen),
        
        # RAPPORTAGES
        ("Balance Sheet Report", tester.test_balans_rapport),
        ("Profit & Loss Report", tester.test_winst_verlies_rapport),
        ("Trial Balance", tester.test_proef_saldibalans),
        
        # VOORRAAD (Inventory)
        ("Create Article", tester.test_create_artikel),
        ("Create Warehouse", tester.test_create_magazijn),
        
        # PROJECTEN
        ("Create Project", tester.test_create_project),
        ("Register Project Hours", tester.test_register_project_hours),
        
        # VASTE ACTIVA (Fixed Assets)
        ("Create Fixed Asset", tester.test_create_vast_activum),
        ("Run Depreciation", tester.test_run_depreciation),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 BOEKHOUDING MODULE TEST RESULTS")
    print("=" * 60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {len(failed_tests)}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("\n✅ All Boekhouding module tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())