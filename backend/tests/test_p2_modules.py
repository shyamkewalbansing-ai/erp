"""
Test suite for P2 Modules: Vaste Activa, Kostenplaatsen, Wisselkoersen
- Vaste Activa: Fixed assets with depreciation (linear/declining)
- Kostenplaatsen: Cost centers with budget tracking
- Wisselkoersen: Exchange rate management with currency conversion
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://srd-ledger.preview.emergentagent.com').rstrip('/')

class TestAuthentication:
    """Test authentication for P2 modules"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_vaste_activa_requires_auth(self):
        """Test that vaste-activa endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/vaste-activa/")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_kostenplaatsen_requires_auth(self):
        """Test that kostenplaatsen endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/kostenplaatsen/")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_wisselkoersen_requires_auth(self):
        """Test that wisselkoersen endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/wisselkoersen/")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestWisselkoersen:
    """Test Wisselkoersen (Exchange Rates) module"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_koers_id(self, auth_headers):
        """Create a test exchange rate and return its ID"""
        test_date = f"2025-01-{datetime.now().day:02d}"
        response = requests.post(f"{BASE_URL}/api/wisselkoersen/", headers=auth_headers, json={
            "valuta": "USD",
            "koers": 36.50,
            "datum": test_date,
            "bron": "TEST_CBvS"
        })
        if response.status_code == 200:
            return response.json()["id"]
        return None
    
    def test_get_wisselkoersen_list(self, auth_headers):
        """Test GET /api/wisselkoersen/ - list all exchange rates"""
        response = requests.get(f"{BASE_URL}/api/wisselkoersen/", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Found {len(data)} exchange rates")
    
    def test_get_standaard_koersen_no_auth(self):
        """Test GET /api/wisselkoersen/standaard-koersen - no auth required"""
        response = requests.get(f"{BASE_URL}/api/wisselkoersen/standaard-koersen")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "koersen" in data
        assert len(data["koersen"]) >= 2  # At least USD and EUR
        print(f"Standaard koersen: {data['koersen']}")
    
    def test_create_wisselkoers(self, auth_headers):
        """Test POST /api/wisselkoersen/ - create new exchange rate"""
        test_date = "2025-06-15"
        response = requests.post(f"{BASE_URL}/api/wisselkoersen/", headers=auth_headers, json={
            "valuta": "EUR",
            "koers": 39.00,
            "datum": test_date,
            "bron": "TEST_CBvS"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["valuta"] == "EUR"
        assert data["koers"] == 39.00
        assert data["datum"] == test_date
        assert "id" in data
        print(f"Created exchange rate: {data['valuta']} = {data['koers']} SRD")
    
    def test_create_wisselkoers_srd_fails(self, auth_headers):
        """Test that creating SRD exchange rate fails (SRD is base currency)"""
        response = requests.post(f"{BASE_URL}/api/wisselkoersen/", headers=auth_headers, json={
            "valuta": "SRD",
            "koers": 1.0,
            "datum": "2025-01-15"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "basis valuta" in response.json().get("detail", "").lower()
    
    def test_get_actuele_koers(self, auth_headers):
        """Test GET /api/wisselkoersen/actueel/{valuta} - get current rate"""
        response = requests.get(f"{BASE_URL}/api/wisselkoersen/actueel/USD", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["valuta"] == "USD"
        assert "koers" in data
        assert data["koers"] > 0
        print(f"Current USD rate: {data['koers']} SRD")
    
    def test_get_wisselkoers_historie(self, auth_headers):
        """Test GET /api/wisselkoersen/historie/{valuta} - get rate history"""
        response = requests.get(f"{BASE_URL}/api/wisselkoersen/historie/USD?limit=10", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} historical USD rates")
    
    def test_converteer_usd_to_srd(self, auth_headers):
        """Test POST /api/wisselkoersen/converteer - USD to SRD conversion"""
        response = requests.post(f"{BASE_URL}/api/wisselkoersen/converteer", headers=auth_headers, json={
            "bedrag": 100,
            "van_valuta": "USD",
            "naar_valuta": "SRD"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["origineel"]["bedrag"] == 100
        assert data["origineel"]["valuta"] == "USD"
        assert data["geconverteerd"]["valuta"] == "SRD"
        assert data["geconverteerd"]["bedrag"] > 0
        print(f"100 USD = {data['geconverteerd']['bedrag']} SRD")
    
    def test_converteer_srd_to_eur(self, auth_headers):
        """Test POST /api/wisselkoersen/converteer - SRD to EUR conversion"""
        response = requests.post(f"{BASE_URL}/api/wisselkoersen/converteer", headers=auth_headers, json={
            "bedrag": 1000,
            "van_valuta": "SRD",
            "naar_valuta": "EUR"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["origineel"]["valuta"] == "SRD"
        assert data["geconverteerd"]["valuta"] == "EUR"
        print(f"1000 SRD = {data['geconverteerd']['bedrag']} EUR")
    
    def test_converteer_usd_to_eur(self, auth_headers):
        """Test POST /api/wisselkoersen/converteer - USD to EUR (cross-rate via SRD)"""
        response = requests.post(f"{BASE_URL}/api/wisselkoersen/converteer", headers=auth_headers, json={
            "bedrag": 100,
            "van_valuta": "USD",
            "naar_valuta": "EUR"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["origineel"]["valuta"] == "USD"
        assert data["geconverteerd"]["valuta"] == "EUR"
        assert "via_srd" in data["geconverteerd"]  # Cross-rate conversion
        print(f"100 USD = {data['geconverteerd']['bedrag']} EUR (via {data['geconverteerd']['via_srd']} SRD)")
    
    def test_converteer_same_currency(self, auth_headers):
        """Test conversion of same currency returns same amount"""
        response = requests.post(f"{BASE_URL}/api/wisselkoersen/converteer", headers=auth_headers, json={
            "bedrag": 100,
            "van_valuta": "USD",
            "naar_valuta": "USD"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["geconverteerd"]["bedrag"] == 100
        assert data["geconverteerd"]["koers"] == 1
    
    def test_bulk_import_koersen(self, auth_headers):
        """Test POST /api/wisselkoersen/bulk-import - import multiple rates"""
        response = requests.post(f"{BASE_URL}/api/wisselkoersen/bulk-import", headers=auth_headers, json=[
            {"valuta": "USD", "koers": 36.55, "datum": "2025-07-01", "bron": "TEST_bulk"},
            {"valuta": "EUR", "koers": 39.10, "datum": "2025-07-01", "bron": "TEST_bulk"}
        ])
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "toegevoegd" in data or "bijgewerkt" in data
        print(f"Bulk import: {data}")


class TestKostenplaatsen:
    """Test Kostenplaatsen (Cost Centers) module"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_kostenplaats(self, auth_headers):
        """Create a test kostenplaats and return it"""
        unique_code = f"TEST_{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/kostenplaatsen/", headers=auth_headers, json={
            "code": unique_code,
            "naam": "TEST Afdeling Marketing",
            "type": "afdeling",
            "omschrijving": "Test kostenplaats voor marketing",
            "budget_jaar": 50000.00,
            "verantwoordelijke": "Test Manager"
        })
        assert response.status_code == 200, f"Failed to create test kostenplaats: {response.text}"
        return response.json()
    
    def test_get_kostenplaatsen_list(self, auth_headers):
        """Test GET /api/kostenplaatsen/ - list all cost centers"""
        response = requests.get(f"{BASE_URL}/api/kostenplaatsen/", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} kostenplaatsen")
        if data:
            # Verify structure
            kp = data[0]
            assert "id" in kp
            assert "code" in kp
            assert "naam" in kp
    
    def test_create_kostenplaats(self, auth_headers):
        """Test POST /api/kostenplaatsen/ - create new cost center"""
        unique_code = f"TEST_{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/kostenplaatsen/", headers=auth_headers, json={
            "code": unique_code,
            "naam": "TEST IT Afdeling",
            "type": "afdeling",
            "omschrijving": "Test IT department",
            "budget_jaar": 75000.00,
            "verantwoordelijke": "IT Manager"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["code"] == unique_code
        assert data["naam"] == "TEST IT Afdeling"
        assert data["budget_jaar"] == 75000.00
        assert data["status"] == "actief"
        assert "id" in data
        print(f"Created kostenplaats: {data['code']} - {data['naam']}")
        return data
    
    def test_create_kostenplaats_duplicate_code_fails(self, auth_headers, test_kostenplaats):
        """Test that duplicate code fails"""
        response = requests.post(f"{BASE_URL}/api/kostenplaatsen/", headers=auth_headers, json={
            "code": test_kostenplaats["code"],  # Same code
            "naam": "Duplicate Test",
            "type": "afdeling"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "bestaat al" in response.json().get("detail", "").lower()
    
    def test_get_kostenplaats_by_id(self, auth_headers, test_kostenplaats):
        """Test GET /api/kostenplaatsen/{id} - get single cost center"""
        kp_id = test_kostenplaats["id"]
        response = requests.get(f"{BASE_URL}/api/kostenplaatsen/{kp_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["id"] == kp_id
        assert data["code"] == test_kostenplaats["code"]
        assert "actuele_kosten" in data
        assert "budget_resterend" in data
        print(f"Kostenplaats {data['code']}: budget={data['budget_jaar']}, actueel={data['actuele_kosten']}")
    
    def test_update_kostenplaats(self, auth_headers, test_kostenplaats):
        """Test PUT /api/kostenplaatsen/{id} - update cost center"""
        kp_id = test_kostenplaats["id"]
        response = requests.put(f"{BASE_URL}/api/kostenplaatsen/{kp_id}", headers=auth_headers, json={
            "naam": "TEST Updated Marketing",
            "budget_jaar": 60000.00
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["naam"] == "TEST Updated Marketing"
        assert data["budget_jaar"] == 60000.00
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/kostenplaatsen/{kp_id}", headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json()["naam"] == "TEST Updated Marketing"
    
    def test_create_kostenboeking(self, auth_headers, test_kostenplaats):
        """Test POST /api/kostenplaatsen/{id}/boeking - create cost booking"""
        kp_id = test_kostenplaats["id"]
        response = requests.post(f"{BASE_URL}/api/kostenplaatsen/{kp_id}/boeking", headers=auth_headers, json={
            "kostenplaats_id": kp_id,
            "datum": "2025-01-15",
            "bedrag": 1500.00,
            "omschrijving": "TEST Marketing campagne kosten",
            "categorie": "reclame"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["bedrag"] == 1500.00
        assert data["kostenplaats_id"] == kp_id
        assert "id" in data
        print(f"Created kostenboeking: {data['bedrag']} - {data['omschrijving']}")
    
    def test_get_kostenboekingen(self, auth_headers, test_kostenplaats):
        """Test GET /api/kostenplaatsen/{id}/boekingen - get cost bookings"""
        kp_id = test_kostenplaats["id"]
        response = requests.get(f"{BASE_URL}/api/kostenplaatsen/{kp_id}/boekingen", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} boekingen for kostenplaats")
    
    def test_get_kostenplaatsen_stats(self, auth_headers):
        """Test GET /api/kostenplaatsen/stats - get statistics"""
        response = requests.get(f"{BASE_URL}/api/kostenplaatsen/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "totaal_kostenplaatsen" in data
        assert "totaal_budget" in data
        assert "totaal_kosten" in data
        assert "budget_benutting_percentage" in data
        print(f"Stats: {data['totaal_kostenplaatsen']} kostenplaatsen, budget={data['totaal_budget']}, kosten={data['totaal_kosten']}")
    
    def test_get_kostenplaatsen_rapportage(self, auth_headers):
        """Test GET /api/kostenplaatsen/rapportage/overzicht - get report"""
        response = requests.get(f"{BASE_URL}/api/kostenplaatsen/rapportage/overzicht", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "rapportage" in data
        assert "totalen" in data
        assert isinstance(data["rapportage"], list)
        print(f"Rapportage: {len(data['rapportage'])} kostenplaatsen in report")
    
    def test_delete_kostenplaats_with_boekingen_fails(self, auth_headers, test_kostenplaats):
        """Test that deleting kostenplaats with boekingen fails"""
        kp_id = test_kostenplaats["id"]
        # First ensure there's a boeking
        requests.post(f"{BASE_URL}/api/kostenplaatsen/{kp_id}/boeking", headers=auth_headers, json={
            "kostenplaats_id": kp_id,
            "datum": "2025-01-16",
            "bedrag": 500.00,
            "omschrijving": "TEST boeking for delete test"
        })
        
        # Try to delete
        response = requests.delete(f"{BASE_URL}/api/kostenplaatsen/{kp_id}", headers=auth_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "boekingen" in response.json().get("detail", "").lower()


class TestVasteActiva:
    """Test Vaste Activa (Fixed Assets) module"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_activum(self, auth_headers):
        """Create a test vast activum and return it"""
        response = requests.post(f"{BASE_URL}/api/vaste-activa/", headers=auth_headers, json={
            "naam": "TEST Computer Server",
            "omschrijving": "Test server voor afschrijving tests",
            "categorie": "computers",
            "aanschafdatum": "2025-01-01",
            "aanschafwaarde": 10000.00,
            "restwaarde": 1000.00,
            "levensduur_jaren": 5,
            "afschrijvings_methode": "lineair",
            "locatie": "Serverruimte",
            "serienummer": "TEST-SRV-001"
        })
        assert response.status_code == 200, f"Failed to create test activum: {response.text}"
        return response.json()
    
    def test_get_vaste_activa_list(self, auth_headers):
        """Test GET /api/vaste-activa/ - list all fixed assets"""
        response = requests.get(f"{BASE_URL}/api/vaste-activa/", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} vaste activa")
        if data:
            # Verify structure
            activum = data[0]
            assert "id" in activum
            assert "naam" in activum
            assert "boekwaarde" in activum
    
    def test_create_vast_activum_lineair(self, auth_headers):
        """Test POST /api/vaste-activa/ - create asset with linear depreciation"""
        response = requests.post(f"{BASE_URL}/api/vaste-activa/", headers=auth_headers, json={
            "naam": "TEST Kantoormeubels",
            "omschrijving": "Test kantoormeubels",
            "categorie": "inventaris",
            "aanschafdatum": "2025-01-01",
            "aanschafwaarde": 5000.00,
            "restwaarde": 500.00,
            "levensduur_jaren": 10,
            "afschrijvings_methode": "lineair",
            "locatie": "Kantoor"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["naam"] == "TEST Kantoormeubels"
        assert data["aanschafwaarde"] == 5000.00
        assert data["status"] == "actief"
        
        # Verify linear depreciation calculation: (5000 - 500) / 10 = 450 per year
        assert data["jaarlijkse_afschrijving"] == 450.00
        assert data["maandelijkse_afschrijving"] == 37.50  # 450 / 12
        assert data["boekwaarde"] == 5000.00  # Initial book value = purchase value
        print(f"Created activum: {data['naam']}, jaarlijks={data['jaarlijkse_afschrijving']}")
    
    def test_create_vast_activum_degressief(self, auth_headers):
        """Test POST /api/vaste-activa/ - create asset with declining depreciation"""
        response = requests.post(f"{BASE_URL}/api/vaste-activa/", headers=auth_headers, json={
            "naam": "TEST Bedrijfsauto",
            "omschrijving": "Test auto met degressieve afschrijving",
            "categorie": "voertuigen",
            "aanschafdatum": "2025-01-01",
            "aanschafwaarde": 50000.00,
            "restwaarde": 10000.00,
            "levensduur_jaren": 5,
            "afschrijvings_methode": "degressief",
            "degressief_percentage": 25.0,
            "serienummer": "TEST-AUTO-001"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["afschrijvings_methode"] == "degressief"
        assert data["degressief_percentage"] == 25.0
        
        # Verify degressief calculation: 50000 * 25% = 12500 first year
        assert data["jaarlijkse_afschrijving"] == 12500.00
        print(f"Created degressief activum: {data['naam']}, jaarlijks={data['jaarlijkse_afschrijving']}")
    
    def test_create_vast_activum_geen_afschrijving(self, auth_headers):
        """Test POST /api/vaste-activa/ - create asset without depreciation (e.g., land)"""
        response = requests.post(f"{BASE_URL}/api/vaste-activa/", headers=auth_headers, json={
            "naam": "TEST Grond Perceel",
            "omschrijving": "Test grond - geen afschrijving",
            "categorie": "grond",
            "aanschafdatum": "2025-01-01",
            "aanschafwaarde": 100000.00,
            "restwaarde": 100000.00,
            "levensduur_jaren": 0,
            "afschrijvings_methode": "geen"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["afschrijvings_methode"] == "geen"
        assert data["jaarlijkse_afschrijving"] == 0
        assert data["maandelijkse_afschrijving"] == 0
        print(f"Created grond activum: {data['naam']}, geen afschrijving")
    
    def test_get_vast_activum_by_id(self, auth_headers, test_activum):
        """Test GET /api/vaste-activa/{id} - get single asset"""
        activum_id = test_activum["id"]
        response = requests.get(f"{BASE_URL}/api/vaste-activa/{activum_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["id"] == activum_id
        assert data["naam"] == test_activum["naam"]
        assert "boekwaarde" in data
        assert "afschrijvingen" in data
        print(f"Activum {data['naam']}: boekwaarde={data['boekwaarde']}")
    
    def test_update_vast_activum(self, auth_headers, test_activum):
        """Test PUT /api/vaste-activa/{id} - update asset"""
        activum_id = test_activum["id"]
        response = requests.put(f"{BASE_URL}/api/vaste-activa/{activum_id}", headers=auth_headers, json={
            "naam": "TEST Updated Server",
            "locatie": "Nieuwe Serverruimte"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["naam"] == "TEST Updated Server"
        assert data["locatie"] == "Nieuwe Serverruimte"
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/vaste-activa/{activum_id}", headers=auth_headers)
        assert get_response.json()["naam"] == "TEST Updated Server"
    
    def test_boek_afschrijving(self, auth_headers, test_activum):
        """Test POST /api/vaste-activa/{id}/afschrijving - book depreciation"""
        activum_id = test_activum["id"]
        
        # Get current book value
        get_response = requests.get(f"{BASE_URL}/api/vaste-activa/{activum_id}", headers=auth_headers)
        boekwaarde_voor = get_response.json()["boekwaarde"]
        
        response = requests.post(f"{BASE_URL}/api/vaste-activa/{activum_id}/afschrijving", headers=auth_headers, json={
            "activum_id": activum_id,
            "datum": "2025-01-31",
            "bedrag": 150.00,
            "omschrijving": "TEST Maandelijkse afschrijving januari"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["bedrag"] == 150.00
        assert data["boekwaarde_voor"] == boekwaarde_voor
        assert data["boekwaarde_na"] == boekwaarde_voor - 150.00
        print(f"Booked depreciation: {data['bedrag']}, boekwaarde: {data['boekwaarde_voor']} -> {data['boekwaarde_na']}")
        
        # Verify activum is updated
        get_response = requests.get(f"{BASE_URL}/api/vaste-activa/{activum_id}", headers=auth_headers)
        assert get_response.json()["totaal_afgeschreven"] >= 150.00
    
    def test_get_afschrijvingen(self, auth_headers, test_activum):
        """Test GET /api/vaste-activa/{id}/afschrijvingen - get depreciation history"""
        activum_id = test_activum["id"]
        response = requests.get(f"{BASE_URL}/api/vaste-activa/{activum_id}/afschrijvingen", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} afschrijvingen for activum")
    
    def test_get_vaste_activa_stats(self, auth_headers):
        """Test GET /api/vaste-activa/stats - get statistics"""
        response = requests.get(f"{BASE_URL}/api/vaste-activa/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "totaal_activa" in data
        assert "totaal_aanschafwaarde" in data
        assert "totaal_afgeschreven" in data
        assert "totaal_boekwaarde" in data
        assert "per_categorie" in data
        print(f"Stats: {data['totaal_activa']} activa, aanschaf={data['totaal_aanschafwaarde']}, boekwaarde={data['totaal_boekwaarde']}")
    
    def test_maandelijkse_afschrijvingen(self, auth_headers):
        """Test POST /api/vaste-activa/maandelijkse-afschrijvingen - book monthly depreciation"""
        response = requests.post(
            f"{BASE_URL}/api/vaste-activa/maandelijkse-afschrijvingen?maand=2025-02",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "maand" in data
        assert "geboekt" in data
        assert "overgeslagen" in data
        print(f"Maandelijkse afschrijvingen {data['maand']}: geboekt={data['geboekt']}, overgeslagen={data['overgeslagen']}")
    
    def test_delete_vast_activum_with_afschrijvingen_fails(self, auth_headers, test_activum):
        """Test that deleting activum with afschrijvingen fails"""
        activum_id = test_activum["id"]
        
        # Ensure there's an afschrijving
        requests.post(f"{BASE_URL}/api/vaste-activa/{activum_id}/afschrijving", headers=auth_headers, json={
            "activum_id": activum_id,
            "datum": "2025-02-28",
            "bedrag": 100.00,
            "omschrijving": "TEST afschrijving for delete test"
        })
        
        # Try to delete
        response = requests.delete(f"{BASE_URL}/api/vaste-activa/{activum_id}", headers=auth_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "afschrijvingen" in response.json().get("detail", "").lower()
    
    def test_filter_vaste_activa_by_categorie(self, auth_headers):
        """Test GET /api/vaste-activa/?categorie=... - filter by category"""
        response = requests.get(f"{BASE_URL}/api/vaste-activa/?categorie=computers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for activum in data:
            assert activum["categorie"] == "computers"
        print(f"Found {len(data)} computers")
    
    def test_filter_vaste_activa_by_status(self, auth_headers):
        """Test GET /api/vaste-activa/?status=... - filter by status"""
        response = requests.get(f"{BASE_URL}/api/vaste-activa/?status=actief", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for activum in data:
            assert activum["status"] == "actief"
        print(f"Found {len(data)} active assets")


class TestCleanup:
    """Cleanup test data after all tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_cleanup_test_data(self, auth_headers):
        """Clean up TEST_ prefixed data"""
        # Note: In production, we'd clean up test data here
        # For now, we just verify we can list the data
        
        # List vaste activa
        response = requests.get(f"{BASE_URL}/api/vaste-activa/", headers=auth_headers)
        activa = response.json()
        test_activa = [a for a in activa if a.get("naam", "").startswith("TEST")]
        print(f"Found {len(test_activa)} TEST vaste activa (not deleted to preserve afschrijvingen)")
        
        # List kostenplaatsen
        response = requests.get(f"{BASE_URL}/api/kostenplaatsen/", headers=auth_headers)
        kps = response.json()
        test_kps = [k for k in kps if k.get("code", "").startswith("TEST")]
        print(f"Found {len(test_kps)} TEST kostenplaatsen (not deleted to preserve boekingen)")
        
        print("Cleanup complete - test data preserved for audit trail")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
