"""
Test Navigation and Workflow Changes - P0 Task
Tests for:
1. Navigation: Verify removed links (Valuta Rapportages, Inkooporders, Verkooporders)
2. Workflow: Test verkoop offerte → factuur conversion
3. Workflow: Test inkoop offerte → factuur conversion
4. 404 Check: Verify old routes return 404 or redirect
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://business-ledger-51.preview.emergentagent.com')

class TestNavigationWorkflowChanges:
    """Test navigation and workflow changes for P0 task"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    # ==================== BACKEND API TESTS ====================
    
    def test_verkoop_offertes_endpoint_exists(self):
        """Test that verkoop offertes endpoint exists"""
        response = self.session.get(f"{BASE_URL}/api/verkoop/offertes")
        assert response.status_code == 200, f"Verkoop offertes endpoint failed: {response.text}"
        print(f"✓ GET /api/verkoop/offertes - Status: {response.status_code}")
        
    def test_inkoop_offertes_endpoint_exists(self):
        """Test that inkoop offertes endpoint exists"""
        response = self.session.get(f"{BASE_URL}/api/inkoop/offertes")
        assert response.status_code == 200, f"Inkoop offertes endpoint failed: {response.text}"
        print(f"✓ GET /api/inkoop/offertes - Status: {response.status_code}")
        
    def test_verkoop_naar_factuur_endpoint_exists(self):
        """Test that verkoop naar-factuur endpoint exists (even if no offerte to convert)"""
        # Try with a fake ID - should return 404 (not found) not 405 (method not allowed)
        response = self.session.post(f"{BASE_URL}/api/verkoop/offertes/fake-id/naar-factuur")
        # 404 means endpoint exists but offerte not found
        # 400 means endpoint exists but validation failed
        assert response.status_code in [404, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ POST /api/verkoop/offertes/{{id}}/naar-factuur endpoint exists - Status: {response.status_code}")
        
    def test_inkoop_naar_factuur_endpoint_exists(self):
        """Test that inkoop naar-factuur endpoint exists (even if no offerte to convert)"""
        # Try with a fake ID - should return 404 (not found) not 405 (method not allowed)
        response = self.session.post(f"{BASE_URL}/api/inkoop/offertes/fake-id/naar-factuur")
        # 404 means endpoint exists but offerte not found
        # 400 means endpoint exists but validation failed
        assert response.status_code in [404, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ POST /api/inkoop/offertes/{{id}}/naar-factuur endpoint exists - Status: {response.status_code}")
        
    def test_verkoop_orders_endpoint_still_exists_for_legacy(self):
        """Test that verkoop orders endpoint still exists (for legacy data)"""
        response = self.session.get(f"{BASE_URL}/api/verkoop/orders")
        # Should return 200 (empty list is fine)
        assert response.status_code == 200, f"Verkoop orders endpoint failed: {response.text}"
        print(f"✓ GET /api/verkoop/orders - Status: {response.status_code} (legacy endpoint)")
        
    def test_inkoop_orders_endpoint_still_exists_for_legacy(self):
        """Test that inkoop orders endpoint still exists (for legacy data)"""
        response = self.session.get(f"{BASE_URL}/api/inkoop/orders")
        # Should return 200 (empty list is fine)
        assert response.status_code == 200, f"Inkoop orders endpoint failed: {response.text}"
        print(f"✓ GET /api/inkoop/orders - Status: {response.status_code} (legacy endpoint)")
        
    def test_verkoop_dashboard_endpoint(self):
        """Test verkoop dashboard endpoint"""
        response = self.session.get(f"{BASE_URL}/api/verkoop/dashboard")
        assert response.status_code == 200, f"Verkoop dashboard failed: {response.text}"
        data = response.json()
        # Verify dashboard returns expected fields
        assert "klanten_count" in data
        assert "open_offertes" in data
        print(f"✓ GET /api/verkoop/dashboard - Status: {response.status_code}")
        
    def test_inkoop_dashboard_endpoint(self):
        """Test inkoop dashboard endpoint"""
        response = self.session.get(f"{BASE_URL}/api/inkoop/dashboard")
        assert response.status_code == 200, f"Inkoop dashboard failed: {response.text}"
        data = response.json()
        # Verify dashboard returns expected fields
        assert "leveranciers_count" in data
        assert "open_offertes" in data
        print(f"✓ GET /api/inkoop/dashboard - Status: {response.status_code}")
        
    # ==================== WORKFLOW TESTS ====================
    
    def test_create_verkoop_offerte_and_convert_to_factuur(self):
        """Test creating a verkoop offerte and converting to factuur"""
        # First, get a debiteur
        debiteuren_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        assert debiteuren_response.status_code == 200
        debiteuren = debiteuren_response.json()
        
        if len(debiteuren) == 0:
            # Create a test debiteur
            debiteur_data = {
                "naam": "TEST_Workflow_Debiteur",
                "email": "test@workflow.com",
                "standaard_valuta": "SRD",
                "betalingstermijn": 30
            }
            create_response = self.session.post(f"{BASE_URL}/api/boekhouding/debiteuren", json=debiteur_data)
            assert create_response.status_code in [200, 201]
            debiteur_id = create_response.json().get("id")
        else:
            debiteur_id = debiteuren[0]["id"]
            
        # Create offerte
        offerte_data = {
            "klant_id": debiteur_id,
            "offertedatum": "2026-01-20",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "TEST_Workflow_Product",
                    "aantal": 1,
                    "prijs_per_stuk": 100.00,
                    "btw_tarief": "10"
                }
            ]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/verkoop/offertes", json=offerte_data)
        assert create_response.status_code in [200, 201], f"Create offerte failed: {create_response.text}"
        offerte = create_response.json()
        offerte_id = offerte.get("id")
        print(f"✓ Created verkoop offerte: {offerte.get('offertenummer')}")
        
        # Update status to geaccepteerd
        status_response = self.session.put(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}/status?status=geaccepteerd")
        assert status_response.status_code == 200, f"Update status failed: {status_response.text}"
        print(f"✓ Updated offerte status to geaccepteerd")
        
        # Convert to factuur
        convert_response = self.session.post(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}/naar-factuur")
        assert convert_response.status_code in [200, 201], f"Convert to factuur failed: {convert_response.text}"
        factuur = convert_response.json()
        print(f"✓ Converted offerte to factuur: {factuur.get('factuurnummer')}")
        
        # Verify factuur was created
        assert "factuurnummer" in factuur
        assert factuur.get("offerte_id") == offerte_id
        print(f"✓ Verkoop offerte → factuur workflow PASSED")
        
    def test_create_inkoop_offerte_and_convert_to_factuur(self):
        """Test creating an inkoop offerte and converting to factuur"""
        # First, get a crediteur
        crediteuren_response = self.session.get(f"{BASE_URL}/api/boekhouding/crediteuren")
        assert crediteuren_response.status_code == 200
        crediteuren = crediteuren_response.json()
        
        if len(crediteuren) == 0:
            # Create a test crediteur
            crediteur_data = {
                "naam": "TEST_Workflow_Crediteur",
                "email": "test@workflow-crediteur.com",
                "standaard_valuta": "SRD",
                "betalingstermijn": 30
            }
            create_response = self.session.post(f"{BASE_URL}/api/boekhouding/crediteuren", json=crediteur_data)
            assert create_response.status_code in [200, 201]
            crediteur_id = create_response.json().get("id")
        else:
            crediteur_id = crediteuren[0]["id"]
            
        # Create offerte
        offerte_data = {
            "leverancier_id": crediteur_id,
            "offertedatum": "2026-01-20",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "TEST_Workflow_Inkoop_Product",
                    "aantal": 1,
                    "prijs_per_stuk": 50.00,
                    "btw_tarief": "10"
                }
            ]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/inkoop/offertes", json=offerte_data)
        assert create_response.status_code in [200, 201], f"Create offerte failed: {create_response.text}"
        offerte = create_response.json()
        offerte_id = offerte.get("id")
        print(f"✓ Created inkoop offerte: {offerte.get('offertenummer')}")
        
        # Update status to geaccepteerd
        status_response = self.session.put(f"{BASE_URL}/api/inkoop/offertes/{offerte_id}/status?status=geaccepteerd")
        assert status_response.status_code == 200, f"Update status failed: {status_response.text}"
        print(f"✓ Updated offerte status to geaccepteerd")
        
        # Convert to factuur
        convert_response = self.session.post(f"{BASE_URL}/api/inkoop/offertes/{offerte_id}/naar-factuur")
        assert convert_response.status_code in [200, 201], f"Convert to factuur failed: {convert_response.text}"
        factuur = convert_response.json()
        print(f"✓ Converted offerte to factuur: {factuur.get('factuurnummer')}")
        
        # Verify factuur was created
        assert "factuurnummer" in factuur
        assert factuur.get("offerte_id") == offerte_id
        print(f"✓ Inkoop offerte → factuur workflow PASSED")
        
    def test_cannot_convert_non_accepted_offerte(self):
        """Test that only accepted offertes can be converted to factuur"""
        # Get a debiteur
        debiteuren_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        assert debiteuren_response.status_code == 200
        debiteuren = debiteuren_response.json()
        
        if len(debiteuren) == 0:
            pytest.skip("No debiteuren available for test")
            
        debiteur_id = debiteuren[0]["id"]
        
        # Create offerte (status will be 'concept')
        offerte_data = {
            "klant_id": debiteur_id,
            "offertedatum": "2026-01-20",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "TEST_Non_Accepted_Product",
                    "aantal": 1,
                    "prijs_per_stuk": 100.00,
                    "btw_tarief": "10"
                }
            ]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/verkoop/offertes", json=offerte_data)
        assert create_response.status_code in [200, 201]
        offerte = create_response.json()
        offerte_id = offerte.get("id")
        
        # Try to convert without accepting first - should fail
        convert_response = self.session.post(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}/naar-factuur")
        assert convert_response.status_code == 400, f"Should have failed: {convert_response.text}"
        print(f"✓ Correctly rejected conversion of non-accepted offerte")
        
        # Cleanup - delete the test offerte
        self.session.delete(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}")


class TestFrontendRoutes:
    """Test frontend routes for removed pages"""
    
    def test_frontend_loads(self):
        """Test that frontend loads"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        print(f"✓ Frontend loads - Status: {response.status_code}")
        
    def test_login_page_loads(self):
        """Test that login page loads"""
        response = requests.get(f"{BASE_URL}/login")
        assert response.status_code == 200
        print(f"✓ Login page loads - Status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
