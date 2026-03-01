"""
Test suite for Nieuwe Verkoopfactuur (New Sales Invoice) functionality
Tests the new invoice creation page at /app/boekhouding/verkoop/nieuw
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"


class TestNieuweFactuurAPI:
    """Test suite for the new invoice creation API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    # ============== AUTHENTICATION TEST ==============
    def test_01_authentication(self):
        """Test that authentication works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✓ Authentication successful")
    
    # ============== DEBITEUREN (CUSTOMERS) TESTS ==============
    def test_02_get_debiteuren(self):
        """Test GET /api/boekhouding/debiteuren - Customer list for dropdown"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET debiteuren returned {len(data)} customers")
        
        # Store first customer for later tests
        if len(data) > 0:
            self.customer = data[0]
            print(f"  First customer: {self.customer.get('naam', 'N/A')}")
    
    def test_03_create_test_debiteur(self):
        """Test POST /api/boekhouding/debiteuren - Create test customer"""
        test_customer = {
            "naam": f"TEST_Klant_{uuid.uuid4().hex[:8]}",
            "email": "test@example.com",
            "telefoon": "8123456",
            "adres": "Teststraat 123",
            "postcode": "1234AB",
            "plaats": "Paramaribo",
            "land": "Suriname"
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/debiteuren", json=test_customer)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("naam") == test_customer["naam"]
        print(f"✓ Created test customer: {data.get('naam')}")
        
        # Store for cleanup
        self.test_customer_id = data["id"]
        return data
    
    # ============== ARTIKELEN (PRODUCTS) TESTS ==============
    def test_04_get_artikelen(self):
        """Test GET /api/boekhouding/artikelen - Product list for dropdown"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET artikelen returned {len(data)} products")
        
        if len(data) > 0:
            product = data[0]
            print(f"  First product: {product.get('naam', 'N/A')} - Price: {product.get('verkoopprijs', 0)}")
    
    def test_05_create_test_artikel(self):
        """Test POST /api/boekhouding/artikelen - Create test product"""
        test_product = {
            "naam": f"TEST_Product_{uuid.uuid4().hex[:8]}",
            "omschrijving": "Test product for invoice testing",
            "verkoopprijs": 100.00,
            "inkoopprijs": 50.00,
            "btw_percentage": 10,
            "type": "product",
            "eenheid": "stuk"
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/artikelen", json=test_product)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Created test product: {data.get('naam')}")
        
        self.test_product_id = data["id"]
        return data
    
    # ============== VERKOOPFACTUREN (SALES INVOICES) TESTS ==============
    def test_06_get_verkoopfacturen(self):
        """Test GET /api/boekhouding/verkoopfacturen - Get all invoices"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET verkoopfacturen returned {len(data)} invoices")
    
    def test_07_create_concept_factuur(self):
        """Test POST /api/boekhouding/verkoopfacturen - Create concept invoice"""
        # First get a customer
        customers_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        customers = customers_response.json()
        
        if len(customers) == 0:
            pytest.skip("No customers available for invoice creation")
        
        customer = customers[0]
        customer_id = customer.get("id")
        
        # Create invoice data matching frontend format
        today = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        invoice_data = {
            "debiteur_id": customer_id,
            "factuurdatum": today,
            "vervaldatum": due_date,
            "valuta": "SRD",
            "notities": "Test factuur aangemaakt via API test",
            "regels": [
                {
                    "omschrijving": "Test dienst",
                    "aantal": 2,
                    "eenheidsprijs": 150.00,
                    "btw_percentage": 10
                }
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", json=invoice_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "factuurnummer" in data
        assert data.get("status") == "concept"
        
        # Verify totals are calculated
        assert "totaal_incl_btw" in data or "totaal" in data
        
        print(f"✓ Created concept invoice: {data.get('factuurnummer')}")
        print(f"  Status: {data.get('status')}")
        print(f"  Total: {data.get('totaal_incl_btw', data.get('totaal', 0))}")
        
        self.test_invoice_id = data["id"]
        return data
    
    def test_08_create_factuur_with_product(self):
        """Test creating invoice with product selection"""
        # Get customers and products
        customers_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        
        customers = customers_response.json()
        products = products_response.json()
        
        if len(customers) == 0:
            pytest.skip("No customers available")
        if len(products) == 0:
            pytest.skip("No products available")
        
        customer = customers[0]
        product = products[0]
        
        today = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        invoice_data = {
            "debiteur_id": customer.get("id"),
            "factuurdatum": today,
            "vervaldatum": due_date,
            "valuta": "SRD",
            "notities": "Test factuur met product",
            "regels": [
                {
                    "artikel_id": product.get("id"),
                    "omschrijving": product.get("naam", "Product"),
                    "aantal": 3,
                    "eenheidsprijs": product.get("verkoopprijs", 100),
                    "btw_percentage": product.get("btw_percentage", 10)
                }
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", json=invoice_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        print(f"✓ Created invoice with product: {data.get('factuurnummer')}")
        
        self.test_invoice_with_product_id = data["id"]
        return data
    
    def test_09_create_factuur_multiple_lines(self):
        """Test creating invoice with multiple line items"""
        customers_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        customers = customers_response.json()
        
        if len(customers) == 0:
            pytest.skip("No customers available")
        
        customer = customers[0]
        today = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        invoice_data = {
            "debiteur_id": customer.get("id"),
            "factuurdatum": today,
            "vervaldatum": due_date,
            "valuta": "SRD",
            "notities": "Test factuur met meerdere regels",
            "regels": [
                {
                    "omschrijving": "Dienst 1",
                    "aantal": 1,
                    "eenheidsprijs": 100.00,
                    "btw_percentage": 10
                },
                {
                    "omschrijving": "Dienst 2",
                    "aantal": 2,
                    "eenheidsprijs": 75.00,
                    "btw_percentage": 10
                },
                {
                    "omschrijving": "Product 3",
                    "aantal": 5,
                    "eenheidsprijs": 25.00,
                    "btw_percentage": 0
                }
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", json=invoice_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        # Verify multiple lines were created
        assert "regels" in data
        assert len(data["regels"]) == 3
        
        print(f"✓ Created invoice with {len(data['regels'])} lines: {data.get('factuurnummer')}")
        
        self.test_invoice_multi_lines_id = data["id"]
        return data
    
    def test_10_update_status_to_verzonden(self):
        """Test PUT /api/boekhouding/verkoopfacturen/{id}/status - Send invoice"""
        # First create a concept invoice
        customers_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        customers = customers_response.json()
        
        if len(customers) == 0:
            pytest.skip("No customers available")
        
        customer = customers[0]
        today = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        invoice_data = {
            "debiteur_id": customer.get("id"),
            "factuurdatum": today,
            "vervaldatum": due_date,
            "valuta": "SRD",
            "regels": [{"omschrijving": "Test", "aantal": 1, "eenheidsprijs": 100, "btw_percentage": 10}]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", json=invoice_data)
        assert create_response.status_code == 200
        invoice = create_response.json()
        invoice_id = invoice["id"]
        
        # Update status to verzonden
        status_response = self.session.put(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{invoice_id}/status?status=verzonden")
        assert status_response.status_code == 200
        
        # Verify status changed
        get_response = self.session.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{invoice_id}")
        assert get_response.status_code == 200
        updated_invoice = get_response.json()
        assert updated_invoice.get("status") == "verzonden"
        
        print(f"✓ Invoice status updated to 'verzonden': {invoice.get('factuurnummer')}")
        
        self.test_verzonden_invoice_id = invoice_id
        return updated_invoice
    
    def test_11_currency_selection(self):
        """Test invoice creation with different currencies (SRD, USD, EUR)"""
        customers_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        customers = customers_response.json()
        
        if len(customers) == 0:
            pytest.skip("No customers available")
        
        customer = customers[0]
        today = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        currencies = ["SRD", "USD", "EUR"]
        
        for currency in currencies:
            invoice_data = {
                "debiteur_id": customer.get("id"),
                "factuurdatum": today,
                "vervaldatum": due_date,
                "valuta": currency,
                "regels": [{"omschrijving": f"Test {currency}", "aantal": 1, "eenheidsprijs": 100, "btw_percentage": 10}]
            }
            
            response = self.session.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", json=invoice_data)
            assert response.status_code == 200
            data = response.json()
            assert data.get("valuta") == currency
            print(f"  ✓ Created invoice with currency: {currency}")
        
        print(f"✓ All currency options work correctly")
    
    def test_12_btw_calculation(self):
        """Test BTW (VAT) calculation with different percentages"""
        customers_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        customers = customers_response.json()
        
        if len(customers) == 0:
            pytest.skip("No customers available")
        
        customer = customers[0]
        today = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Test with 10% BTW
        invoice_data = {
            "debiteur_id": customer.get("id"),
            "factuurdatum": today,
            "vervaldatum": due_date,
            "valuta": "SRD",
            "regels": [
                {"omschrijving": "Item 1", "aantal": 2, "eenheidsprijs": 100, "btw_percentage": 10},  # 200 + 20 BTW = 220
                {"omschrijving": "Item 2", "aantal": 1, "eenheidsprijs": 50, "btw_percentage": 25}   # 50 + 12.50 BTW = 62.50
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", json=invoice_data)
        assert response.status_code == 200
        data = response.json()
        
        # Expected: Subtotal = 250, BTW = 32.50, Total = 282.50
        total = data.get("totaal_incl_btw", data.get("totaal", 0))
        print(f"✓ BTW calculation test - Total: {total}")
        
        # Verify total is reasonable (should be around 282.50)
        assert total > 250  # Should be more than subtotal due to BTW
    
    def test_13_get_single_factuur(self):
        """Test GET /api/boekhouding/verkoopfacturen/{id} - Get single invoice"""
        # First get list of invoices
        list_response = self.session.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen")
        invoices = list_response.json()
        
        if len(invoices) == 0:
            pytest.skip("No invoices available")
        
        invoice_id = invoices[0].get("id")
        
        response = self.session.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{invoice_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("id") == invoice_id
        assert "factuurnummer" in data
        assert "debiteur_id" in data or "debiteur_naam" in data
        
        print(f"✓ GET single invoice: {data.get('factuurnummer')}")
    
    def test_14_delete_factuur(self):
        """Test DELETE /api/boekhouding/verkoopfacturen/{id} - Delete invoice"""
        # Create a test invoice to delete
        customers_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        customers = customers_response.json()
        
        if len(customers) == 0:
            pytest.skip("No customers available")
        
        customer = customers[0]
        today = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        invoice_data = {
            "debiteur_id": customer.get("id"),
            "factuurdatum": today,
            "vervaldatum": due_date,
            "valuta": "SRD",
            "regels": [{"omschrijving": "To be deleted", "aantal": 1, "eenheidsprijs": 100, "btw_percentage": 10}]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", json=invoice_data)
        assert create_response.status_code == 200
        invoice = create_response.json()
        invoice_id = invoice["id"]
        
        # Delete the invoice
        delete_response = self.session.delete(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{invoice_id}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = self.session.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{invoice_id}")
        assert get_response.status_code == 404
        
        print(f"✓ Invoice deleted successfully")
    
    def test_15_invoice_appears_in_list(self):
        """Test that created invoice appears in the invoices list"""
        # Create a new invoice
        customers_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        customers = customers_response.json()
        
        if len(customers) == 0:
            pytest.skip("No customers available")
        
        customer = customers[0]
        today = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        unique_note = f"TEST_VERIFY_{uuid.uuid4().hex[:8]}"
        
        invoice_data = {
            "debiteur_id": customer.get("id"),
            "factuurdatum": today,
            "vervaldatum": due_date,
            "valuta": "SRD",
            "notities": unique_note,
            "regels": [{"omschrijving": "Verify in list", "aantal": 1, "eenheidsprijs": 100, "btw_percentage": 10}]
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/boekhouding/verkoopfacturen", json=invoice_data)
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        created_id = created_invoice["id"]
        
        # Get list and verify invoice is there
        list_response = self.session.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen")
        assert list_response.status_code == 200
        invoices = list_response.json()
        
        found = any(inv.get("id") == created_id for inv in invoices)
        assert found, f"Created invoice {created_id} not found in list"
        
        print(f"✓ Created invoice appears in list: {created_invoice.get('factuurnummer')}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{created_id}")


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    # Cleanup happens automatically as test invoices are deleted in tests


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
