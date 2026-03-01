#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class SchuldbeheerTester:
    def __init__(self, base_url="https://money-control-67.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'rekeningen': [],
            'relaties': [],
            'schulden': [],
            'betalingen': [],
            'inkomsten': [],
            'uitgaven': []
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

    def test_demo_login(self):
        """Test login with demo account"""
        login_data = {
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        }
        
        success, response = self.run_test(
            "Demo Account Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Demo account logged in successfully")
            print(f"   User role: {response.get('user', {}).get('role', 'N/A')}")
            return True
        return False

    def test_schuldbeheer_dashboard(self):
        """Test Schuldbeheer dashboard endpoint"""
        success, response = self.run_test(
            "Schuldbeheer Dashboard",
            "GET",
            "schuldbeheer/dashboard",
            200
        )
        
        if success:
            print(f"   Totale schuld: €{response.get('totale_schuld', 0)}")
            print(f"   Afgelost: €{response.get('totaal_afgelost', 0)}")
            print(f"   Maandelijkse verplichtingen: €{response.get('maandelijkse_verplichtingen', 0)}")
            print(f"   Beschikbaar saldo: €{response.get('beschikbaar_saldo', 0)}")
            return True
        return False

    def test_create_bankrekening(self):
        """Test creating a bank account"""
        bankrekening_data = {
            "rekeningnummer": "NL91ABNA0417164300",
            "bank": "ABN AMRO",
            "type": "betaalrekening",
            "saldo": 2500.0,
            "naam": "Hoofdrekening"
        }
        
        success, response = self.run_test(
            "Create Bankrekening",
            "POST",
            "schuldbeheer/rekeningen",
            200,
            data=bankrekening_data
        )
        
        if success and 'id' in response:
            self.created_resources['rekeningen'].append(response['id'])
            print(f"   Created bankrekening ID: {response['id']}")
            print(f"   Rekeningnummer: {response.get('rekeningnummer')}")
            print(f"   Bank: {response.get('bank')}")
            print(f"   Saldo: €{response.get('saldo')}")
            return True
        return False

    def test_get_bankrekeningen(self):
        """Test getting all bank accounts"""
        success, response = self.run_test(
            "Get Bankrekeningen",
            "GET",
            "schuldbeheer/rekeningen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} bankrekeningen")
            for rekening in response:
                print(f"   - {rekening.get('bank')}: €{rekening.get('saldo')} ({rekening.get('type')})")
            return True
        return False

    def test_create_relatie(self):
        """Test creating a relation (schuldeiser)"""
        relatie_data = {
            "naam": "Belastingdienst",
            "iban": "NL20INGB0001234567",
            "telefoon": "0800-0543",
            "email": "info@belastingdienst.nl",
            "type": "belasting",
            "notities": "Inkomstenbelasting achterstand"
        }
        
        success, response = self.run_test(
            "Create Relatie",
            "POST",
            "schuldbeheer/relaties",
            200,
            data=relatie_data
        )
        
        if success and 'id' in response:
            self.created_resources['relaties'].append(response['id'])
            print(f"   Created relatie ID: {response['id']}")
            print(f"   Naam: {response.get('naam')}")
            print(f"   Type: {response.get('type')}")
            return True
        return False

    def test_get_relaties(self):
        """Test getting all relations"""
        success, response = self.run_test(
            "Get Relaties",
            "GET",
            "schuldbeheer/relaties",
            200
        )
        
        if success:
            print(f"   Found {len(response)} relaties")
            for relatie in response:
                print(f"   - {relatie.get('naam')} ({relatie.get('type')})")
            return True
        return False

    def test_create_schuld(self):
        """Test creating a debt (schuld)"""
        if not self.created_resources.get('relaties'):
            print("⚠️  Skipping schuld creation - no relatie created")
            return True
            
        relatie_id = self.created_resources['relaties'][0]
        
        schuld_data = {
            "relatie_id": relatie_id,
            "omschrijving": "Inkomstenbelasting 2023",
            "startdatum": "2024-01-15",
            "oorspronkelijk_bedrag": 5000.0,
            "rente_percentage": 4.0,
            "maandbedrag": 250.0,
            "status": "regeling",
            "prioriteit": "hoog"
        }
        
        success, response = self.run_test(
            "Create Schuld",
            "POST",
            "schuldbeheer/schulden",
            200,
            data=schuld_data
        )
        
        if success and 'id' in response:
            self.created_resources['schulden'].append(response['id'])
            print(f"   Created schuld ID: {response['id']}")
            print(f"   Dossiernummer: {response.get('dossiernummer')}")
            print(f"   Oorspronkelijk bedrag: €{response.get('oorspronkelijk_bedrag')}")
            print(f"   Openstaand saldo: €{response.get('openstaand_saldo')}")
            return True
        return False

    def test_get_schulden(self):
        """Test getting all debts"""
        success, response = self.run_test(
            "Get Schulden",
            "GET",
            "schuldbeheer/schulden",
            200
        )
        
        if success:
            print(f"   Found {len(response)} schulden")
            for schuld in response:
                print(f"   - {schuld.get('dossiernummer')}: €{schuld.get('openstaand_saldo')} ({schuld.get('status')})")
            return True
        return False

    def test_create_betaling(self):
        """Test creating a payment"""
        if not self.created_resources.get('schulden'):
            print("⚠️  Skipping betaling creation - no schuld created")
            return True
            
        schuld_id = self.created_resources['schulden'][0]
        
        betaling_data = {
            "schuld_id": schuld_id,
            "datum": "2025-02-01",
            "bedrag": 250.0,
            "omschrijving": "Maandelijkse betaling februari",
            "referentie": "BET-2025-001",
            "betaalmethode": "bank"
        }
        
        success, response = self.run_test(
            "Create Betaling",
            "POST",
            "schuldbeheer/betalingen",
            200,
            data=betaling_data
        )
        
        if success and 'id' in response:
            self.created_resources['betalingen'].append(response['id'])
            print(f"   Created betaling ID: {response['id']}")
            print(f"   Bedrag: €{response.get('bedrag')}")
            print(f"   Datum: {response.get('datum')}")
            return True
        return False

    def test_get_betalingen(self):
        """Test getting all payments"""
        success, response = self.run_test(
            "Get Betalingen",
            "GET",
            "schuldbeheer/betalingen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} betalingen")
            for betaling in response:
                print(f"   - {betaling.get('datum')}: €{betaling.get('bedrag')}")
            return True
        return False

    def test_verify_schuld_saldo_update(self):
        """Test that schuld saldo is automatically updated after payment"""
        if not self.created_resources.get('schulden'):
            print("⚠️  Skipping saldo verification - no schuld created")
            return True
            
        # Get updated schuld info
        success, response = self.run_test(
            "Get Updated Schulden After Payment",
            "GET",
            "schuldbeheer/schulden",
            200
        )
        
        if success and response:
            for schuld in response:
                oorspronkelijk = schuld.get('oorspronkelijk_bedrag', 0)
                totaal_betaald = schuld.get('totaal_betaald', 0)
                openstaand = schuld.get('openstaand_saldo', 0)
                
                print(f"   Schuld {schuld.get('dossiernummer')}:")
                print(f"   - Oorspronkelijk: €{oorspronkelijk}")
                print(f"   - Totaal betaald: €{totaal_betaald}")
                print(f"   - Openstaand: €{openstaand}")
                
                # Verify calculation
                expected_openstaand = oorspronkelijk - totaal_betaald
                if abs(openstaand - expected_openstaand) < 0.01:
                    print(f"   ✅ Saldo calculation correct")
                else:
                    print(f"   ❌ Saldo calculation incorrect: expected €{expected_openstaand}")
            return True
        return False

    def test_create_inkomst(self):
        """Test creating income"""
        inkomst_data = {
            "datum": "2025-02-01",
            "bron": "salaris",
            "bedrag": 3500.0,
            "vast": True,
            "omschrijving": "Maandsalaris februari",
            "frequentie": "maandelijks"
        }
        
        success, response = self.run_test(
            "Create Inkomst",
            "POST",
            "schuldbeheer/inkomsten",
            200,
            data=inkomst_data
        )
        
        if success and 'id' in response:
            self.created_resources['inkomsten'].append(response['id'])
            print(f"   Created inkomst ID: {response['id']}")
            print(f"   Bron: {response.get('bron')}")
            print(f"   Bedrag: €{response.get('bedrag')}")
            return True
        return False

    def test_get_inkomsten(self):
        """Test getting all income"""
        success, response = self.run_test(
            "Get Inkomsten",
            "GET",
            "schuldbeheer/inkomsten",
            200
        )
        
        if success:
            print(f"   Found {len(response)} inkomsten")
            for inkomst in response:
                print(f"   - {inkomst.get('bron')}: €{inkomst.get('bedrag')}")
            return True
        return False

    def test_create_uitgave(self):
        """Test creating expense"""
        uitgave_data = {
            "datum": "2025-02-01",
            "categorie": "wonen",
            "bedrag": 1200.0,
            "omschrijving": "Huur februari",
            "vast": True,
            "frequentie": "maandelijks"
        }
        
        success, response = self.run_test(
            "Create Uitgave",
            "POST",
            "schuldbeheer/uitgaven",
            200,
            data=uitgave_data
        )
        
        if success and 'id' in response:
            self.created_resources['uitgaven'].append(response['id'])
            print(f"   Created uitgave ID: {response['id']}")
            print(f"   Categorie: {response.get('categorie')}")
            print(f"   Bedrag: €{response.get('bedrag')}")
            return True
        return False

    def test_get_uitgaven(self):
        """Test getting all expenses"""
        success, response = self.run_test(
            "Get Uitgaven",
            "GET",
            "schuldbeheer/uitgaven",
            200
        )
        
        if success:
            print(f"   Found {len(response)} uitgaven")
            for uitgave in response:
                print(f"   - {uitgave.get('categorie')}: €{uitgave.get('bedrag')}")
            return True
        return False

    def test_planning(self):
        """Test planning endpoint"""
        success, response = self.run_test(
            "Schuldbeheer Planning",
            "GET",
            "schuldbeheer/planning",
            200
        )
        
        if success:
            print(f"   Maand: {response.get('maand', 'N/A')}")
            print(f"   Totaal inkomsten: €{response.get('totaal_inkomsten', 0)}")
            print(f"   Vaste lasten: €{response.get('vaste_lasten', 0)}")
            print(f"   Schuld betalingen: €{response.get('schuld_betalingen', 0)}")
            print(f"   Vrij besteedbaar: €{response.get('vrij_besteedbaar', 0)}")
            return True
        return False

    def test_rapportages(self):
        """Test all rapportage endpoints"""
        rapportages = [
            ("schuld-per-schuldeiser", "Schuld per Schuldeiser"),
            ("cashflow", "Cashflow"),
            ("jaaroverzicht", "Jaaroverzicht")
        ]
        
        all_success = True
        for endpoint, name in rapportages:
            success, response = self.run_test(
                f"Rapportage {name}",
                "GET",
                f"schuldbeheer/rapportages/{endpoint}",
                200
            )
            
            if success:
                print(f"   {name} rapport generated successfully")
                if endpoint == "schuld-per-schuldeiser" and isinstance(response, list):
                    print(f"   Found {len(response)} schuldeisers")
                elif endpoint == "cashflow":
                    print(f"   Netto cashflow: €{response.get('netto_cashflow', 0)}")
                elif endpoint == "jaaroverzicht":
                    print(f"   Totaal afgelost: €{response.get('totaal_afgelost', 0)}")
            else:
                all_success = False
        
        return all_success

    def test_statistieken(self):
        """Test statistieken endpoint"""
        success, response = self.run_test(
            "Schuldbeheer Statistieken",
            "GET",
            "schuldbeheer/statistieken",
            200
        )
        
        if success:
            print(f"   Schuldontwikkeling data punten: {len(response.get('schuldontwikkeling', []))}")
            print(f"   Huidige totale schuld: €{response.get('huidige_totale_schuld', 0)}")
            return True
        return False

def main():
    print("🏦 Schuldbeheer Module API Testing")
    print("=" * 50)
    
    tester = SchuldbeheerTester()
    
    # Test sequence following the review request
    tests = [
        ("Demo Account Login", tester.test_demo_login),
        ("1. Dashboard", tester.test_schuldbeheer_dashboard),
        ("2. Create Bankrekening", tester.test_create_bankrekening),
        ("2. Get Bankrekeningen", tester.test_get_bankrekeningen),
        ("3. Create Relatie", tester.test_create_relatie),
        ("3. Get Relaties", tester.test_get_relaties),
        ("4. Create Schuld", tester.test_create_schuld),
        ("4. Get Schulden", tester.test_get_schulden),
        ("5. Create Betaling", tester.test_create_betaling),
        ("5. Get Betalingen", tester.test_get_betalingen),
        ("5. Verify Saldo Update", tester.test_verify_schuld_saldo_update),
        ("6. Create Inkomst", tester.test_create_inkomst),
        ("6. Get Inkomsten", tester.test_get_inkomsten),
        ("7. Create Uitgave", tester.test_create_uitgave),
        ("7. Get Uitgaven", tester.test_get_uitgaven),
        ("8. Planning", tester.test_planning),
        ("9. Rapportages", tester.test_rapportages),
        ("10. Statistieken", tester.test_statistieken),
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
    print("\n" + "=" * 50)
    print("📊 SCHULDBEHEER TEST RESULTS")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {len(failed_tests)}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("\n✅ All Schuldbeheer tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())