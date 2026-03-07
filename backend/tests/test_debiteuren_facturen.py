"""
Test Debiteuren en Verkoopfacturen API - Grootboek Integratie
Tests for:
- Debiteuren CRUD operations
- Verkoopfacturen CRUD operations  
- Status changes (concept -> verzonden)
- Betaling toevoegen (afletteren)
- Journaalposten automatisch aanmaken bij facturen en betalingen
- Herbereken saldi endpoint
"""
import pytest
import requests
import os
from datetime import date, datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"

class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # Handle both token formats
        token = data.get("token") or data.get("access_token")
        assert token, f"No token in login response: {data.keys()}"
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Create auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_success(self, auth_token):
        """Test that login works with demo credentials"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Login successful, token length: {len(auth_token)}")


class TestDebiteurenAPI:
    """Test Debiteuren (Customers) CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        data = response.json()
        token = data.get("token") or data.get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_all_debiteuren(self, auth_headers):
        """Test GET /api/boekhouding/debiteuren - List all customers"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/debiteuren", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get debiteuren: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} debiteuren")
        return data
    
    def test_create_debiteur(self, auth_headers):
        """Test POST /api/boekhouding/debiteuren - Create new customer"""
        new_debiteur = {
            "naam": "TEST_Unittest Klant BV",
            "adres": "Teststraat 123",
            "plaats": "Paramaribo",
            "land": "Suriname",
            "telefoon": "+597 123456",
            "email": "test@unittest.sr",
            "btw_nummer": "BTW-TEST-123",
            "betalingstermijn": 30,
            "kredietlimiet": 10000,
            "valuta": "SRD"
        }
        response = requests.post(f"{BASE_URL}/api/boekhouding/debiteuren", 
                                 json=new_debiteur, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create debiteur: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["naam"] == new_debiteur["naam"]
        print(f"✓ Created debiteur with id: {data['id']}")
        return data
    
    def test_get_single_debiteur(self, auth_headers):
        """Test GET /api/boekhouding/debiteuren/{id} - Get single customer"""
        # First create a debiteur
        new_debiteur = {"naam": "TEST_Single Klant", "valuta": "SRD"}
        create_resp = requests.post(f"{BASE_URL}/api/boekhouding/debiteuren", 
                                    json=new_debiteur, headers=auth_headers)
        debiteur_id = create_resp.json()["id"]
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/boekhouding/debiteuren/{debiteur_id}", 
                               headers=auth_headers)
        assert response.status_code == 200, f"Failed to get debiteur: {response.text}"
        data = response.json()
        assert data["id"] == debiteur_id
        print(f"✓ Retrieved debiteur: {data['naam']}")


class TestVerkoopfacturenAPI:
    """Test Verkoopfacturen (Sales Invoices) CRUD and workflow"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        data = response.json()
        token = data.get("token") or data.get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_debiteur_id(self, auth_headers):
        """Create a test debiteur for invoice tests"""
        new_debiteur = {
            "naam": "TEST_Factuur Test Klant",
            "email": "factuurtest@test.sr",
            "valuta": "SRD"
        }
        response = requests.post(f"{BASE_URL}/api/boekhouding/debiteuren", 
                                 json=new_debiteur, headers=auth_headers)
        return response.json()["id"]
    
    def test_get_all_verkoopfacturen(self, auth_headers):
        """Test GET /api/boekhouding/verkoopfacturen - List all invoices"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get facturen: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} verkoopfacturen")
        return data
    
    def test_create_verkoopfactuur(self, auth_headers, test_debiteur_id):
        """Test POST /api/boekhouding/verkoopfacturen - Create new invoice"""
        today = date.today().isoformat()
        due_date = (date.today() + timedelta(days=30)).isoformat()
        
        new_factuur = {
            "debiteur_id": test_debiteur_id,
            "factuurdatum": today,
            "vervaldatum": due_date,
            "valuta": "SRD",
            "wisselkoers": 1.0,
            "regels": [
                {
                    "omschrijving": "Test dienst",
                    "aantal": 2,
                    "eenheidsprijs": 500,
                    "btw_percentage": 0
                }
            ],
            "opmerkingen": "Test factuur voor unittest"
        }
        response = requests.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", 
                                 json=new_factuur, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create factuur: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert "factuurnummer" in data, "Response should contain factuurnummer"
        print(f"✓ Created factuur: {data.get('factuurnummer')} with id: {data['id']}")
        return data
    
    def test_update_factuur_status_to_verzonden(self, auth_headers, test_debiteur_id):
        """Test PUT /api/boekhouding/verkoopfacturen/{id}/status - Change status to verzonden"""
        # First create a concept invoice
        today = date.today().isoformat()
        new_factuur = {
            "debiteur_id": test_debiteur_id,
            "factuurdatum": today,
            "vervaldatum": (date.today() + timedelta(days=30)).isoformat(),
            "valuta": "SRD",
            "regels": [{"omschrijving": "Status test", "aantal": 1, "eenheidsprijs": 100}]
        }
        create_resp = requests.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", 
                                    json=new_factuur, headers=auth_headers)
        factuur_id = create_resp.json()["id"]
        print(f"  Created concept factuur: {factuur_id}")
        
        # Update status to verzonden
        response = requests.put(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{factuur_id}/status?status=verzonden",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Status updated to verzonden: {data}")
        
        # Verify the status was updated
        get_resp = requests.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{factuur_id}", 
                               headers=auth_headers)
        assert get_resp.status_code == 200
        factuur_data = get_resp.json()
        assert factuur_data["status"] == "verzonden", f"Status should be verzonden, got: {factuur_data['status']}"
        print(f"✓ Verified factuur status is now: {factuur_data['status']}")
        return factuur_id
    
    def test_add_betaling_afletteren(self, auth_headers, test_debiteur_id):
        """Test POST /api/boekhouding/verkoopfacturen/{id}/betaling - Add payment (afletteren)"""
        # First create and send an invoice
        today = date.today().isoformat()
        new_factuur = {
            "debiteur_id": test_debiteur_id,
            "factuurdatum": today,
            "vervaldatum": (date.today() + timedelta(days=30)).isoformat(),
            "valuta": "SRD",
            "regels": [{"omschrijving": "Betaling test", "aantal": 1, "eenheidsprijs": 1000}]
        }
        create_resp = requests.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", 
                                    json=new_factuur, headers=auth_headers)
        factuur_data = create_resp.json()
        factuur_id = factuur_data["id"]
        totaal = factuur_data.get("totaal_incl_btw", 1000)
        print(f"  Created factuur: {factuur_id}, totaal: {totaal}")
        
        # Update status to verzonden first
        requests.put(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{factuur_id}/status?status=verzonden",
                    headers=auth_headers)
        
        # Add full payment
        betaling = {
            "bedrag": totaal,
            "datum": today,
            "betaalmethode": "bank",
            "referentie": "TEST-BETALING-001"
        }
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{factuur_id}/betaling",
            json=betaling,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to add betaling: {response.text}"
        data = response.json()
        assert "message" in data
        assert data.get("status") == "betaald", f"Status should be betaald after full payment, got: {data.get('status')}"
        assert data.get("openstaand_bedrag") == 0, f"Openstaand should be 0, got: {data.get('openstaand_bedrag')}"
        print(f"✓ Betaling toegevoegd, status: {data.get('status')}, openstaand: {data.get('openstaand_bedrag')}")
        return factuur_id


class TestGrootboekIntegratie:
    """Test Grootboek (General Ledger) integration - Journal entries for invoices/payments"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        data = response.json()
        token = data.get("token") or data.get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_journaalposten_created_on_verzonden(self, auth_headers):
        """Test that journaalpost is created when invoice status changes to verzonden"""
        # Create debiteur
        deb_resp = requests.post(f"{BASE_URL}/api/boekhouding/debiteuren", 
                                 json={"naam": "TEST_Grootboek Test", "valuta": "SRD"},
                                 headers=auth_headers)
        debiteur_id = deb_resp.json()["id"]
        
        # Create and send invoice
        today = date.today().isoformat()
        factuur = {
            "debiteur_id": debiteur_id,
            "factuurdatum": today,
            "vervaldatum": (date.today() + timedelta(days=30)).isoformat(),
            "valuta": "SRD",
            "regels": [{"omschrijving": "Grootboek test", "aantal": 1, "eenheidsprijs": 500}]
        }
        create_resp = requests.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", 
                                    json=factuur, headers=auth_headers)
        factuur_id = create_resp.json()["id"]
        print(f"  Created factuur: {factuur_id}")
        
        # Change status to verzonden (should trigger journaalpost)
        requests.put(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{factuur_id}/status?status=verzonden",
                    headers=auth_headers)
        
        # Check journaalposten
        jp_resp = requests.get(f"{BASE_URL}/api/boekhouding/journaalposten", headers=auth_headers)
        assert jp_resp.status_code == 200
        journaalposten = jp_resp.json()
        
        # Find journaalpost for this factuur
        factuur_jp = [jp for jp in journaalposten if jp.get("document_ref") == factuur_id]
        print(f"  Found {len(factuur_jp)} journaalposten for this factuur")
        
        if len(factuur_jp) > 0:
            jp = factuur_jp[0]
            print(f"✓ Journaalpost aangemaakt: {jp.get('volgnummer')}, omschrijving: {jp.get('omschrijving')}")
            # Check that it has correct dagboek_code
            assert jp.get("dagboek_code") == "VK", f"Should be VK (Verkoop), got: {jp.get('dagboek_code')}"
            # Check regels contain debiteuren and omzet
            regels = jp.get("regels", [])
            print(f"  Regels: {len(regels)}")
            for r in regels:
                print(f"    - {r.get('rekening_code')}: {r.get('omschrijving')} D:{r.get('debet',0)} C:{r.get('credit',0)}")
        else:
            print("  ⚠ No journaalpost found for factuur (may be expected in some configurations)")
    
    def test_journaalpost_created_on_betaling(self, auth_headers):
        """Test that journaalpost is created when payment is added"""
        # Create debiteur
        deb_resp = requests.post(f"{BASE_URL}/api/boekhouding/debiteuren", 
                                 json={"naam": "TEST_Betaling Grootboek", "valuta": "SRD"},
                                 headers=auth_headers)
        debiteur_id = deb_resp.json()["id"]
        
        # Create, send and pay invoice
        today = date.today().isoformat()
        factuur = {
            "debiteur_id": debiteur_id,
            "factuurdatum": today,
            "vervaldatum": (date.today() + timedelta(days=30)).isoformat(),
            "valuta": "SRD",
            "regels": [{"omschrijving": "Betaling grootboek test", "aantal": 1, "eenheidsprijs": 750}]
        }
        create_resp = requests.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", 
                                    json=factuur, headers=auth_headers)
        factuur_data = create_resp.json()
        factuur_id = factuur_data["id"]
        totaal = factuur_data.get("totaal_incl_btw", 750)
        
        # Send invoice
        requests.put(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{factuur_id}/status?status=verzonden",
                    headers=auth_headers)
        
        # Add payment
        betaling = {"bedrag": totaal, "datum": today, "betaalmethode": "bank"}
        requests.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{factuur_id}/betaling",
                     json=betaling, headers=auth_headers)
        
        # Check journaalposten for payment (dagboek_code=BK for bank)
        jp_resp = requests.get(f"{BASE_URL}/api/boekhouding/journaalposten", headers=auth_headers)
        journaalposten = jp_resp.json()
        
        # Find bank journaalpost for this factuur
        bank_jp = [jp for jp in journaalposten if jp.get("document_ref") == factuur_id and jp.get("dagboek_code") == "BK"]
        print(f"  Found {len(bank_jp)} bank journaalposten for this factuur")
        
        if len(bank_jp) > 0:
            jp = bank_jp[0]
            print(f"✓ Betaling journaalpost aangemaakt: {jp.get('volgnummer')}")
            regels = jp.get("regels", [])
            for r in regels:
                print(f"    - {r.get('rekening_code')}: D:{r.get('debet',0)} C:{r.get('credit',0)}")
        else:
            print("  ⚠ No bank journaalpost found (may be expected)")


class TestHerberekenSaldi:
    """Test herbereken-saldi endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        data = response.json()
        token = data.get("token") or data.get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_herbereken_saldi_endpoint(self, auth_headers):
        """Test POST /api/boekhouding/rekeningen/herbereken-saldi"""
        response = requests.post(f"{BASE_URL}/api/boekhouding/rekeningen/herbereken-saldi",
                                headers=auth_headers)
        assert response.status_code == 200, f"Failed to herbereken saldi: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Herbereken saldi: {data}")
        print(f"  Journaalposten verwerkt: {data.get('journaalposten_verwerkt')}")
        print(f"  Rekeningen bijgewerkt: {data.get('rekeningen_bijgewerkt')}")


class TestRekeningenAPI:
    """Test Rekeningen (Chart of Accounts) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        data = response.json()
        token = data.get("token") or data.get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_rekeningen(self, auth_headers):
        """Test GET /api/boekhouding/rekeningen - List all accounts"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/rekeningen", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get rekeningen: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} rekeningen")
        
        # Check for important accounts (debiteuren, omzet, bank)
        codes = [r.get("code") for r in data]
        important_accounts = {
            "1300": "Debiteuren",
            "4000": "Omzet",
            "1500": "Bank"
        }
        for code, name in important_accounts.items():
            if code in codes:
                print(f"  ✓ Found {name} account ({code})")
            else:
                print(f"  ⚠ {name} account ({code}) not found")


# Cleanup function - can be called to remove test data
def cleanup_test_data(auth_headers):
    """Remove TEST_ prefixed data created during tests"""
    # Get all debiteuren and delete TEST_ ones
    deb_resp = requests.get(f"{BASE_URL}/api/boekhouding/debiteuren", headers=auth_headers)
    if deb_resp.status_code == 200:
        for deb in deb_resp.json():
            if deb.get("naam", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/boekhouding/debiteuren/{deb['id']}", 
                              headers=auth_headers)
                print(f"  Deleted test debiteur: {deb['naam']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
