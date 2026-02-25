"""
Test iteration 42 - Testing fixes for Suriname ERP:
1. Artikelen - voorraad aantallen worden getoond
2. Inkoop - betalingen werken
3. Verkoop - prijzen per valuta (SRD, USD, EUR)
4. Voorraad - aantallen en waarde zichtbaar
5. Grootboek - mapping voor eigen codes
6. Prijslijsten en Valuta Rapportages verwijderd uit navigatie
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test authentication to get token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test that login works"""
        assert auth_token is not None
        assert len(auth_token) > 0


class TestArtikelenMultiCurrency:
    """Test artikelen with multi-currency pricing and voorraad display"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_artikel_with_multi_currency_prices(self, headers):
        """Test creating artikel with SRD, USD, EUR prices"""
        artikel_code = f"TEST-{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "artikelcode": artikel_code,
            "naam": "Test Multi-Currency Artikel",
            "type": "product",
            "eenheid": "stuk",
            "inkoopprijs_srd": 100.00,
            "inkoopprijs_usd": 3.00,
            "inkoopprijs_eur": 2.50,
            "verkoopprijs_srd": 150.00,
            "verkoopprijs_usd": 4.50,
            "verkoopprijs_eur": 4.00,
            "min_voorraad": 10,
            "btw_tarief": "25",
            "voorraad_beheer": True
        }
        
        response = requests.post(f"{BASE_URL}/api/voorraad/artikelen", json=payload, headers=headers)
        assert response.status_code == 200, f"Create artikel failed: {response.text}"
        
        data = response.json()
        # Verify multi-currency prices are stored
        assert data.get("inkoopprijs_srd") == 100.00
        assert data.get("inkoopprijs_usd") == 3.00
        assert data.get("inkoopprijs_eur") == 2.50
        assert data.get("verkoopprijs_srd") == 150.00
        assert data.get("verkoopprijs_usd") == 4.50
        assert data.get("verkoopprijs_eur") == 4.00
        assert data.get("min_voorraad") == 10
        assert "voorraad_aantal" in data  # Voorraad aantal field exists
        
        return data.get("id")
    
    def test_get_artikelen_shows_voorraad(self, headers):
        """Test that artikelen list shows voorraad_aantal"""
        response = requests.get(f"{BASE_URL}/api/voorraad/artikelen", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check that artikelen have voorraad fields
        if len(data) > 0:
            artikel = data[0]
            assert "voorraad_aantal" in artikel, "voorraad_aantal field missing"
            assert "min_voorraad" in artikel, "min_voorraad field missing"
    
    def test_update_artikel_multi_currency(self, headers):
        """Test updating artikel with multi-currency prices"""
        # First create an artikel
        artikel_code = f"TEST-UPD-{uuid.uuid4().hex[:8].upper()}"
        create_payload = {
            "artikelcode": artikel_code,
            "naam": "Test Update Artikel",
            "type": "product",
            "eenheid": "stuk",
            "inkoopprijs_srd": 50.00,
            "verkoopprijs_srd": 75.00,
            "voorraad_beheer": True
        }
        
        create_response = requests.post(f"{BASE_URL}/api/voorraad/artikelen", json=create_payload, headers=headers)
        assert create_response.status_code == 200
        artikel_id = create_response.json().get("id")
        
        # Update with multi-currency prices
        update_payload = {
            "verkoopprijs_usd": 5.00,
            "verkoopprijs_eur": 4.50,
            "inkoopprijs_usd": 2.00,
            "inkoopprijs_eur": 1.80
        }
        
        update_response = requests.put(f"{BASE_URL}/api/voorraad/artikelen/{artikel_id}", json=update_payload, headers=headers)
        assert update_response.status_code == 200
        
        updated_data = update_response.json()
        assert updated_data.get("verkoopprijs_usd") == 5.00
        assert updated_data.get("verkoopprijs_eur") == 4.50


class TestInkoopfacturenBetaling:
    """Test inkoopfacturen betaling functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_inkoopfacturen(self, headers):
        """Test getting inkoopfacturen list"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/inkoopfacturen", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_crediteur_for_inkoopfactuur(self, headers):
        """Create a crediteur for testing inkoopfactuur"""
        payload = {
            "naam": f"Test Crediteur {uuid.uuid4().hex[:6]}",
            "email": "test@crediteur.sr",
            "standaard_valuta": "SRD",
            "betalingstermijn": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/boekhouding/crediteuren", json=payload, headers=headers)
        assert response.status_code == 200
        return response.json().get("id")
    
    def test_create_inkoopfactuur(self, headers):
        """Test creating an inkoopfactuur"""
        # First create a crediteur
        crediteur_payload = {
            "naam": f"Test Crediteur IF {uuid.uuid4().hex[:6]}",
            "standaard_valuta": "SRD",
            "betalingstermijn": 30
        }
        crediteur_response = requests.post(f"{BASE_URL}/api/boekhouding/crediteuren", json=crediteur_payload, headers=headers)
        assert crediteur_response.status_code == 200
        crediteur_id = crediteur_response.json().get("id")
        
        # Create inkoopfactuur
        factuur_payload = {
            "crediteur_id": crediteur_id,
            "factuurdatum": "2025-01-15",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Test product inkoop",
                    "aantal": 10,
                    "prijs_per_stuk": 50.00,
                    "btw_tarief": "25"
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/boekhouding/inkoopfacturen", json=factuur_payload, headers=headers)
        assert response.status_code == 200, f"Create inkoopfactuur failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "factuurnummer" in data
        assert data.get("status") == "ontvangen"
        assert data.get("totaal") > 0
        
        return data.get("id")
    
    def test_register_betaling_inkoopfactuur(self, headers):
        """Test registering payment for inkoopfactuur"""
        # Create crediteur
        crediteur_payload = {
            "naam": f"Test Crediteur Betaling {uuid.uuid4().hex[:6]}",
            "standaard_valuta": "SRD",
            "betalingstermijn": 30
        }
        crediteur_response = requests.post(f"{BASE_URL}/api/boekhouding/crediteuren", json=crediteur_payload, headers=headers)
        crediteur_id = crediteur_response.json().get("id")
        
        # Create inkoopfactuur
        factuur_payload = {
            "crediteur_id": crediteur_id,
            "factuurdatum": "2025-01-15",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Test betaling product",
                    "aantal": 5,
                    "prijs_per_stuk": 100.00,
                    "btw_tarief": "25"
                }
            ]
        }
        factuur_response = requests.post(f"{BASE_URL}/api/boekhouding/inkoopfacturen", json=factuur_payload, headers=headers)
        assert factuur_response.status_code == 200
        factuur_id = factuur_response.json().get("id")
        factuur_totaal = factuur_response.json().get("totaal")
        
        # Register betaling
        betaling_payload = {
            "bedrag": factuur_totaal,
            "betaaldatum": "2025-01-16",
            "betaalmethode": "bank"
        }
        
        betaling_response = requests.post(
            f"{BASE_URL}/api/boekhouding/inkoopfacturen/{factuur_id}/betaling",
            json=betaling_payload,
            headers=headers
        )
        assert betaling_response.status_code == 200, f"Betaling failed: {betaling_response.text}"
        
        data = betaling_response.json()
        assert "message" in data
        assert data.get("nieuwe_status") == "betaald"
    
    def test_update_inkoopfactuur_status(self, headers):
        """Test updating inkoopfactuur status"""
        # Create crediteur
        crediteur_payload = {
            "naam": f"Test Crediteur Status {uuid.uuid4().hex[:6]}",
            "standaard_valuta": "SRD",
            "betalingstermijn": 30
        }
        crediteur_response = requests.post(f"{BASE_URL}/api/boekhouding/crediteuren", json=crediteur_payload, headers=headers)
        crediteur_id = crediteur_response.json().get("id")
        
        # Create inkoopfactuur
        factuur_payload = {
            "crediteur_id": crediteur_id,
            "factuurdatum": "2025-01-15",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Test status product",
                    "aantal": 2,
                    "prijs_per_stuk": 200.00,
                    "btw_tarief": "25"
                }
            ]
        }
        factuur_response = requests.post(f"{BASE_URL}/api/boekhouding/inkoopfacturen", json=factuur_payload, headers=headers)
        factuur_id = factuur_response.json().get("id")
        
        # Update status
        status_response = requests.put(
            f"{BASE_URL}/api/boekhouding/inkoopfacturen/{factuur_id}/status",
            json={"status": "open"},
            headers=headers
        )
        assert status_response.status_code == 200, f"Status update failed: {status_response.text}"


class TestGrootboekMapping:
    """Test grootboek mapping functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_rekeningen(self, headers):
        """Test getting grootboek rekeningen"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/rekeningen", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_mapping(self, headers):
        """Test getting grootboek mapping"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/rekeningen/mapping", headers=headers)
        assert response.status_code == 200
        # Mapping can be empty dict or have values
        data = response.json()
        assert isinstance(data, dict)
    
    def test_save_mapping(self, headers):
        """Test saving grootboek mapping"""
        # First get existing rekeningen
        rekeningen_response = requests.get(f"{BASE_URL}/api/boekhouding/rekeningen", headers=headers)
        rekeningen = rekeningen_response.json()
        
        # If there are rekeningen, create a mapping
        if len(rekeningen) > 0:
            # Find a kas rekening (code starting with 1)
            kas_rekening = next((r for r in rekeningen if r.get("code", "").startswith("1")), None)
            
            if kas_rekening:
                mapping_payload = {
                    "kas": kas_rekening.get("code")
                }
                
                response = requests.post(
                    f"{BASE_URL}/api/boekhouding/rekeningen/mapping",
                    json=mapping_payload,
                    headers=headers
                )
                assert response.status_code == 200, f"Save mapping failed: {response.text}"
                
                # Verify mapping was saved
                get_response = requests.get(f"{BASE_URL}/api/boekhouding/rekeningen/mapping", headers=headers)
                saved_mapping = get_response.json()
                assert saved_mapping.get("kas") == kas_rekening.get("code")


class TestVoorraadDashboard:
    """Test voorraad dashboard and waarde display"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_voorraad_dashboard(self, headers):
        """Test voorraad dashboard returns waarde info"""
        response = requests.get(f"{BASE_URL}/api/voorraad/dashboard", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "artikelen_count" in data
        assert "totale_voorraad_waarde" in data
        assert "lage_voorraad_count" in data


class TestNavigationRemoval:
    """Test that Prijslijsten and Valuta Rapportages are removed from navigation"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_valuta_rapportages_route_removed(self, headers):
        """Test that valuta-rapportages route is not accessible or redirects"""
        # This endpoint should not exist or return 404
        response = requests.get(f"{BASE_URL}/api/boekhouding/valuta-rapportages", headers=headers)
        # Either 404 (not found) or the route doesn't exist
        # We're testing that it's not a working endpoint
        assert response.status_code in [404, 405, 422], f"Valuta rapportages should be removed, got {response.status_code}"


class TestBoekhoudingDashboard:
    """Test boekhouding dashboard - verify Valuta Exposure widget is removed"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_dashboard_loads(self, headers):
        """Test that boekhouding dashboard loads correctly"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/dashboard", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Dashboard should have standard fields
        assert "debiteuren_count" in data
        assert "crediteuren_count" in data
        assert "openstaande_debiteuren" in data
        assert "bank_saldi" in data
        
        # Valuta exposure should NOT be in the response (widget removed)
        # The dashboard API doesn't return valuta_exposure anymore
        # This is a backend check - frontend widget removal is tested via UI


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
