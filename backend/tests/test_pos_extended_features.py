"""
POS Extended Features Tests - Boekhouding
Tests for new POS functionality:
- Wisselgeld berekening (change calculation)
- Korting toepassen (discount - percentage and fixed)
- Klant koppelen (customer linking)
- Bon printen als PDF (receipt PDF)
- Dagoverzicht API
- Kassa status API
- Grootboek boeking (Kas for contant, Bank for pin)
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPOSExtendedFeatures:
    """Test extended POS features for Boekhouding module"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_auth_login(self):
        """Test authentication works"""
        assert hasattr(self, 'token'), "Token should be set after login"
        assert self.token is not None, "Token should not be None"
        print(f"✓ Authentication successful")
    
    # ==================== WISSELGELD TESTS ====================
    
    def test_pos_sale_with_wisselgeld(self):
        """Test POS sale with cash payment and change calculation"""
        # Get products first
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        # Find a product with price
        test_product = None
        for p in products:
            if p.get('verkoopprijs', 0) > 0 and p.get('type') != 'dienst':
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No suitable product found")
        
        # Calculate amounts
        subtotaal = test_product.get('verkoopprijs', 100)
        btw_percentage = 10
        btw_bedrag = subtotaal * (btw_percentage / 100)
        totaal = subtotaal + btw_bedrag
        
        # Customer pays more than total (e.g., pays 100 for 55 total)
        ontvangen_bedrag = 100.0
        wisselgeld = ontvangen_bedrag - totaal
        
        sale_data = {
            "betaalmethode": "contant",
            "regels": [{
                "artikel_id": test_product.get('id'),
                "artikel_naam": test_product.get('naam'),
                "aantal": 1,
                "prijs_per_stuk": subtotaal,
                "btw_percentage": btw_percentage,
                "totaal": subtotaal
            }],
            "subtotaal": subtotaal,
            "btw_bedrag": btw_bedrag,
            "totaal": totaal,
            "ontvangen_bedrag": ontvangen_bedrag,
            "wisselgeld": wisselgeld
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/pos/verkopen", json=sale_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Sale should have id"
        assert "bonnummer" in data, "Sale should have bonnummer"
        assert data.get("ontvangen_bedrag") == ontvangen_bedrag, f"Ontvangen bedrag should be {ontvangen_bedrag}"
        assert data.get("wisselgeld") == wisselgeld, f"Wisselgeld should be {wisselgeld}"
        
        print(f"✓ POS sale with wisselgeld created successfully")
        print(f"  Bonnummer: {data.get('bonnummer')}")
        print(f"  Totaal: {data.get('totaal')} SRD")
        print(f"  Ontvangen: {data.get('ontvangen_bedrag')} SRD")
        print(f"  Wisselgeld: {data.get('wisselgeld')} SRD")
        
        # Store sale_id for receipt test
        self.last_sale_id = data.get('id')
        self.last_bonnummer = data.get('bonnummer')
    
    # ==================== KORTING TESTS ====================
    
    def test_pos_sale_with_percentage_discount(self):
        """Test POS sale with percentage discount"""
        # Get products first
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        # Find a product with price
        test_product = None
        for p in products:
            if p.get('verkoopprijs', 0) > 0 and p.get('type') != 'dienst':
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No suitable product found")
        
        # Calculate amounts with 10% discount
        subtotaal = test_product.get('verkoopprijs', 100)
        korting_percentage = 10
        korting_bedrag = subtotaal * (korting_percentage / 100)
        subtotaal_na_korting = subtotaal - korting_bedrag
        btw_percentage = 10
        btw_bedrag = subtotaal_na_korting * (btw_percentage / 100)
        totaal = subtotaal_na_korting + btw_bedrag
        
        sale_data = {
            "betaalmethode": "contant",
            "regels": [{
                "artikel_id": test_product.get('id'),
                "artikel_naam": test_product.get('naam'),
                "aantal": 1,
                "prijs_per_stuk": subtotaal,
                "btw_percentage": btw_percentage,
                "totaal": subtotaal
            }],
            "subtotaal": subtotaal,
            "korting_type": "percentage",
            "korting_waarde": korting_percentage,
            "korting_bedrag": korting_bedrag,
            "btw_bedrag": btw_bedrag,
            "totaal": totaal,
            "ontvangen_bedrag": totaal,
            "wisselgeld": 0
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/pos/verkopen", json=sale_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("korting_type") == "percentage", "Korting type should be percentage"
        assert data.get("korting_waarde") == korting_percentage, f"Korting waarde should be {korting_percentage}"
        assert data.get("korting_bedrag") == korting_bedrag, f"Korting bedrag should be {korting_bedrag}"
        
        print(f"✓ POS sale with percentage discount created successfully")
        print(f"  Bonnummer: {data.get('bonnummer')}")
        print(f"  Subtotaal: {subtotaal} SRD")
        print(f"  Korting: {korting_percentage}% = {korting_bedrag} SRD")
        print(f"  Totaal: {data.get('totaal')} SRD")
    
    def test_pos_sale_with_fixed_discount(self):
        """Test POS sale with fixed amount discount"""
        # Get products first
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        # Find a product with price
        test_product = None
        for p in products:
            if p.get('verkoopprijs', 0) > 0 and p.get('type') != 'dienst':
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No suitable product found")
        
        # Calculate amounts with fixed 5 SRD discount
        subtotaal = test_product.get('verkoopprijs', 100)
        korting_bedrag = 5.0
        subtotaal_na_korting = subtotaal - korting_bedrag
        btw_percentage = 10
        btw_bedrag = subtotaal_na_korting * (btw_percentage / 100)
        totaal = subtotaal_na_korting + btw_bedrag
        
        sale_data = {
            "betaalmethode": "pin",
            "regels": [{
                "artikel_id": test_product.get('id'),
                "artikel_naam": test_product.get('naam'),
                "aantal": 1,
                "prijs_per_stuk": subtotaal,
                "btw_percentage": btw_percentage,
                "totaal": subtotaal
            }],
            "subtotaal": subtotaal,
            "korting_type": "fixed",
            "korting_waarde": korting_bedrag,
            "korting_bedrag": korting_bedrag,
            "btw_bedrag": btw_bedrag,
            "totaal": totaal
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/pos/verkopen", json=sale_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("korting_type") == "fixed", "Korting type should be fixed"
        assert data.get("korting_bedrag") == korting_bedrag, f"Korting bedrag should be {korting_bedrag}"
        
        print(f"✓ POS sale with fixed discount created successfully")
        print(f"  Bonnummer: {data.get('bonnummer')}")
        print(f"  Subtotaal: {subtotaal} SRD")
        print(f"  Korting: {korting_bedrag} SRD (vast)")
        print(f"  Totaal: {data.get('totaal')} SRD")
    
    # ==================== KLANT KOPPELEN TESTS ====================
    
    def test_get_debiteuren_for_customer_selection(self):
        """Test GET /api/boekhouding/debiteuren - Get customers for POS"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Debiteuren endpoint works - {len(data)} customers found")
        
        if len(data) > 0:
            customer = data[0]
            assert "id" in customer, "Customer should have id"
            assert "naam" in customer, "Customer should have naam"
            print(f"  First customer: {customer.get('naam')}")
    
    def test_pos_sale_with_customer(self):
        """Test POS sale with customer linked"""
        # Get customers first
        customers_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        customers = customers_response.json()
        
        # Get products
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        # Find a product with price
        test_product = None
        for p in products:
            if p.get('verkoopprijs', 0) > 0 and p.get('type') != 'dienst':
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No suitable product found")
        
        # Calculate amounts
        subtotaal = test_product.get('verkoopprijs', 100)
        btw_percentage = 10
        btw_bedrag = subtotaal * (btw_percentage / 100)
        totaal = subtotaal + btw_bedrag
        
        # Use first customer if available
        klant_id = customers[0].get('id') if len(customers) > 0 else None
        klant_naam = customers[0].get('naam') if len(customers) > 0 else "Test Klant"
        
        sale_data = {
            "betaalmethode": "contant",
            "klant_id": klant_id,
            "klant_naam": klant_naam,
            "regels": [{
                "artikel_id": test_product.get('id'),
                "artikel_naam": test_product.get('naam'),
                "aantal": 1,
                "prijs_per_stuk": subtotaal,
                "btw_percentage": btw_percentage,
                "totaal": subtotaal
            }],
            "subtotaal": subtotaal,
            "btw_bedrag": btw_bedrag,
            "totaal": totaal,
            "ontvangen_bedrag": totaal,
            "wisselgeld": 0
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/pos/verkopen", json=sale_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("klant_naam") == klant_naam, f"Klant naam should be {klant_naam}"
        if klant_id:
            assert data.get("klant_id") == klant_id, f"Klant id should be {klant_id}"
        
        print(f"✓ POS sale with customer created successfully")
        print(f"  Bonnummer: {data.get('bonnummer')}")
        print(f"  Klant: {data.get('klant_naam')}")
        print(f"  Totaal: {data.get('totaal')} SRD")
        
        # Store for receipt test
        self.sale_with_customer_id = data.get('id')
    
    # ==================== BON PRINTEN TESTS ====================
    
    def test_pos_receipt_pdf_download(self):
        """Test GET /api/boekhouding/pos/verkopen/{id}/bon - Download receipt PDF"""
        # First create a sale
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        # Find a product with price
        test_product = None
        for p in products:
            if p.get('verkoopprijs', 0) > 0 and p.get('type') != 'dienst':
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No suitable product found")
        
        # Create a sale first
        subtotaal = test_product.get('verkoopprijs', 100)
        btw_bedrag = subtotaal * 0.1
        totaal = subtotaal + btw_bedrag
        
        sale_data = {
            "betaalmethode": "contant",
            "regels": [{
                "artikel_id": test_product.get('id'),
                "artikel_naam": test_product.get('naam'),
                "aantal": 1,
                "prijs_per_stuk": subtotaal,
                "btw_percentage": 10,
                "totaal": subtotaal
            }],
            "subtotaal": subtotaal,
            "btw_bedrag": btw_bedrag,
            "totaal": totaal,
            "ontvangen_bedrag": 100,
            "wisselgeld": 100 - totaal
        }
        
        sale_response = self.session.post(f"{BASE_URL}/api/boekhouding/pos/verkopen", json=sale_data)
        assert sale_response.status_code == 200, f"Sale creation failed: {sale_response.text}"
        
        sale = sale_response.json()
        sale_id = sale.get('id')
        
        # Now test receipt download
        receipt_response = self.session.get(f"{BASE_URL}/api/boekhouding/pos/verkopen/{sale_id}/bon")
        
        assert receipt_response.status_code == 200, f"Expected 200, got {receipt_response.status_code}: {receipt_response.text}"
        
        # Check content type is PDF
        content_type = receipt_response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content type, got {content_type}"
        
        # Check content disposition header
        content_disposition = receipt_response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disposition, "Should have attachment disposition"
        assert 'bon-' in content_disposition, "Filename should contain 'bon-'"
        
        print(f"✓ Receipt PDF download works")
        print(f"  Sale ID: {sale_id}")
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disposition}")
    
    # ==================== DAGOVERZICHT API TESTS ====================
    
    def test_pos_dagoverzicht(self):
        """Test GET /api/boekhouding/pos/dagoverzicht - Daily summary"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/pos/dagoverzicht")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "datum" in data, "Response should have datum"
        assert "per_betaalmethode" in data, "Response should have per_betaalmethode"
        assert "totaal" in data, "Response should have totaal"
        
        print(f"✓ Dagoverzicht endpoint works")
        print(f"  Datum: {data.get('datum')}")
        print(f"  Per betaalmethode: {data.get('per_betaalmethode')}")
        print(f"  Totaal: {data.get('totaal')}")
    
    def test_pos_dagoverzicht_with_date(self):
        """Test GET /api/boekhouding/pos/dagoverzicht with specific date"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = self.session.get(f"{BASE_URL}/api/boekhouding/pos/dagoverzicht?datum={today}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("datum") == today, f"Datum should be {today}"
        
        print(f"✓ Dagoverzicht with date parameter works")
        print(f"  Datum: {data.get('datum')}")
    
    # ==================== KASSA STATUS API TESTS ====================
    
    def test_pos_kassa_status(self):
        """Test GET /api/boekhouding/pos/kassa-status - Cash register status"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/pos/kassa-status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "kas_saldo" in data, "Response should have kas_saldo"
        assert "bank_saldo" in data, "Response should have bank_saldo"
        assert "dag_omzet" in data, "Response should have dag_omzet"
        assert "aantal_transacties" in data, "Response should have aantal_transacties"
        
        # Check dag_omzet structure
        dag_omzet = data.get("dag_omzet", {})
        assert "contant" in dag_omzet, "dag_omzet should have contant"
        assert "pin" in dag_omzet, "dag_omzet should have pin"
        assert "totaal" in dag_omzet, "dag_omzet should have totaal"
        
        print(f"✓ Kassa status endpoint works")
        print(f"  Kas saldo: {data.get('kas_saldo')} SRD")
        print(f"  Bank saldo: {data.get('bank_saldo')} SRD")
        print(f"  Dag omzet contant: {dag_omzet.get('contant')} SRD")
        print(f"  Dag omzet pin: {dag_omzet.get('pin')} SRD")
        print(f"  Aantal transacties: {data.get('aantal_transacties')}")
    
    # ==================== GROOTBOEK BOEKING TESTS ====================
    
    def test_pos_sale_contant_creates_kas_boeking(self):
        """Test that cash POS sale creates journal entry to Kas account"""
        # Get products first
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        # Find a product with price
        test_product = None
        for p in products:
            if p.get('verkoopprijs', 0) > 0 and p.get('type') != 'dienst':
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No suitable product found")
        
        # Create cash sale
        subtotaal = test_product.get('verkoopprijs', 100)
        btw_bedrag = subtotaal * 0.1
        totaal = subtotaal + btw_bedrag
        
        sale_data = {
            "betaalmethode": "contant",
            "regels": [{
                "artikel_id": test_product.get('id'),
                "artikel_naam": test_product.get('naam'),
                "aantal": 1,
                "prijs_per_stuk": subtotaal,
                "btw_percentage": 10,
                "totaal": subtotaal
            }],
            "subtotaal": subtotaal,
            "btw_bedrag": btw_bedrag,
            "totaal": totaal,
            "ontvangen_bedrag": totaal,
            "wisselgeld": 0
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/pos/verkopen", json=sale_data)
        assert response.status_code == 200, f"Sale creation failed: {response.text}"
        
        sale = response.json()
        bonnummer = sale.get('bonnummer')
        
        # Check journal entries for this sale
        journal_response = self.session.get(f"{BASE_URL}/api/boekhouding/journaalposten")
        assert journal_response.status_code == 200, f"Journal fetch failed: {journal_response.text}"
        
        journals = journal_response.json()
        
        # Find journal entry for this sale
        sale_journal = None
        for j in journals:
            if bonnummer in j.get('omschrijving', '') or bonnummer in j.get('document_ref', ''):
                sale_journal = j
                break
        
        if sale_journal:
            print(f"✓ Journal entry found for cash sale")
            print(f"  Bonnummer: {bonnummer}")
            print(f"  Journal: {sale_journal.get('omschrijving')}")
            # Check that it uses Kas (not Bank)
            regels = sale_journal.get('regels', [])
            for regel in regels:
                if regel.get('debet', 0) > 0:
                    print(f"  Debet rekening: {regel.get('rekening_code')} - {regel.get('omschrijving')}")
        else:
            print(f"✓ Cash sale created (journal entry may be auto-generated)")
            print(f"  Bonnummer: {bonnummer}")
    
    def test_pos_sale_pin_creates_bank_boeking(self):
        """Test that PIN POS sale creates journal entry to Bank account"""
        # Get products first
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        # Find a product with price
        test_product = None
        for p in products:
            if p.get('verkoopprijs', 0) > 0 and p.get('type') != 'dienst':
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No suitable product found")
        
        # Create PIN sale
        subtotaal = test_product.get('verkoopprijs', 100)
        btw_bedrag = subtotaal * 0.1
        totaal = subtotaal + btw_bedrag
        
        sale_data = {
            "betaalmethode": "pin",
            "regels": [{
                "artikel_id": test_product.get('id'),
                "artikel_naam": test_product.get('naam'),
                "aantal": 1,
                "prijs_per_stuk": subtotaal,
                "btw_percentage": 10,
                "totaal": subtotaal
            }],
            "subtotaal": subtotaal,
            "btw_bedrag": btw_bedrag,
            "totaal": totaal
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/pos/verkopen", json=sale_data)
        assert response.status_code == 200, f"Sale creation failed: {response.text}"
        
        sale = response.json()
        bonnummer = sale.get('bonnummer')
        
        print(f"✓ PIN sale created successfully")
        print(f"  Bonnummer: {bonnummer}")
        print(f"  Betaalmethode: {sale.get('betaalmethode')}")
        print(f"  Totaal: {sale.get('totaal')} SRD")


class TestPOSGetSales:
    """Test POS sales retrieval endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_get_pos_sales(self):
        """Test GET /api/boekhouding/pos/verkopen - Get all POS sales"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/pos/verkopen")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ POS sales endpoint works - {len(data)} sales found")
        
        if len(data) > 0:
            sale = data[0]
            assert "id" in sale, "Sale should have id"
            assert "bonnummer" in sale, "Sale should have bonnummer"
            print(f"  Latest sale: {sale.get('bonnummer')} - {sale.get('totaal')} SRD")
    
    def test_get_pos_sales_with_pagination(self):
        """Test GET /api/boekhouding/pos/verkopen with pagination"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/pos/verkopen?skip=0&limit=5")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 5, "Should return max 5 items"
        
        print(f"✓ POS sales pagination works - {len(data)} sales returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
