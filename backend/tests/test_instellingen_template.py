"""
Test Instellingen API - Factuur Template Fields
Tests for P0/P1 tasks: Template settings and PDF generation with custom colors
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bookkeep-suriname.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"


class TestInstellingenTemplateAPI:
    """Test Instellingen API for factuur template fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_get_instellingen_returns_template_fields(self):
        """GET /api/boekhouding/instellingen should return factuur template fields"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/instellingen")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify template fields exist
        assert "factuur_primaire_kleur" in data, "Missing factuur_primaire_kleur field"
        assert "factuur_secundaire_kleur" in data, "Missing factuur_secundaire_kleur field"
        assert "factuur_template" in data, "Missing factuur_template field"
        
        # Verify default values if not set
        print(f"factuur_primaire_kleur: {data.get('factuur_primaire_kleur')}")
        print(f"factuur_secundaire_kleur: {data.get('factuur_secundaire_kleur')}")
        print(f"factuur_template: {data.get('factuur_template')}")
        
        # Check that values are valid hex colors or template names
        primaire_kleur = data.get('factuur_primaire_kleur', '')
        secundaire_kleur = data.get('factuur_secundaire_kleur', '')
        template = data.get('factuur_template', '')
        
        # Validate hex color format (should start with #)
        if primaire_kleur:
            assert primaire_kleur.startswith('#'), f"Primary color should be hex: {primaire_kleur}"
        if secundaire_kleur:
            assert secundaire_kleur.startswith('#'), f"Secondary color should be hex: {secundaire_kleur}"
        
        # Validate template value
        valid_templates = ['standaard', 'modern', 'kleurrijk']
        if template:
            assert template in valid_templates, f"Invalid template: {template}"
    
    def test_update_instellingen_template_fields(self):
        """PUT /api/boekhouding/instellingen should update factuur template fields"""
        # First get current settings
        get_response = self.session.get(f"{BASE_URL}/api/boekhouding/instellingen")
        assert get_response.status_code == 200
        
        original_data = get_response.json()
        
        # Update with new template settings
        update_data = {
            "factuur_primaire_kleur": "#2563eb",  # Blue
            "factuur_secundaire_kleur": "#dbeafe",  # Light blue
            "factuur_template": "modern",
            "factuur_voorwaarden": "Test voorwaarden - Betaling binnen 14 dagen."
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/boekhouding/instellingen",
            json=update_data
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.status_code}"
        
        # Verify the update persisted
        verify_response = self.session.get(f"{BASE_URL}/api/boekhouding/instellingen")
        assert verify_response.status_code == 200
        
        updated_data = verify_response.json()
        
        assert updated_data.get('factuur_primaire_kleur') == "#2563eb", "Primary color not updated"
        assert updated_data.get('factuur_secundaire_kleur') == "#dbeafe", "Secondary color not updated"
        assert updated_data.get('factuur_template') == "modern", "Template not updated"
        assert "Test voorwaarden" in updated_data.get('factuur_voorwaarden', ''), "Voorwaarden not updated"
        
        print("Template settings updated successfully!")
        
        # Restore original settings
        restore_data = {
            "factuur_primaire_kleur": original_data.get('factuur_primaire_kleur', '#1e293b'),
            "factuur_secundaire_kleur": original_data.get('factuur_secundaire_kleur', '#f1f5f9'),
            "factuur_template": original_data.get('factuur_template', 'standaard'),
            "factuur_voorwaarden": original_data.get('factuur_voorwaarden', '')
        }
        self.session.put(f"{BASE_URL}/api/boekhouding/instellingen", json=restore_data)


class TestVerkoopfacturenAPI:
    """Test Verkoopfacturen API - Create and PDF download"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_get_debiteuren(self):
        """GET /api/boekhouding/debiteuren - Get customers for invoice creation"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Found {len(data)} debiteuren")
        
        if len(data) > 0:
            print(f"First debiteur: {data[0].get('naam')} (ID: {data[0].get('id')})")
    
    def test_create_verkoopfactuur(self):
        """POST /api/boekhouding/verkoopfacturen - Create a sales invoice"""
        # First get a debiteur
        deb_response = self.session.get(f"{BASE_URL}/api/boekhouding/debiteuren")
        assert deb_response.status_code == 200
        
        debiteuren = deb_response.json()
        
        # Create a debiteur if none exists
        if len(debiteuren) == 0:
            create_deb = self.session.post(
                f"{BASE_URL}/api/boekhouding/debiteuren",
                json={
                    "naam": "TEST_Klant voor Factuur",
                    "email": "test@example.com",
                    "betalingstermijn": 30
                }
            )
            assert create_deb.status_code == 200 or create_deb.status_code == 201
            debiteur_id = create_deb.json().get('id')
        else:
            debiteur_id = debiteuren[0].get('id')
        
        # Create invoice
        from datetime import date, timedelta
        today = date.today()
        
        invoice_data = {
            "debiteur_id": debiteur_id,
            "factuurdatum": today.isoformat(),
            "vervaldatum": (today + timedelta(days=30)).isoformat(),
            "valuta": "SRD",
            "wisselkoers": 1.0,
            "regels": [
                {
                    "omschrijving": "Test Product",
                    "aantal": 2,
                    "eenheidsprijs": 100.00,
                    "btw_percentage": 10
                }
            ],
            "opmerkingen": "Test factuur voor template verificatie"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen",
            json=invoice_data
        )
        
        assert response.status_code == 200 or response.status_code == 201, f"Create failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "id" in data, "Invoice ID not returned"
        assert "factuurnummer" in data, "Invoice number not returned"
        
        print(f"Created invoice: {data.get('factuurnummer')} (ID: {data.get('id')})")
        print(f"Totaal incl BTW: {data.get('totaal_incl_btw')}")
        
        # Store for PDF test
        self.created_invoice_id = data.get('id')
        return data.get('id')
    
    def test_get_verkoopfacturen(self):
        """GET /api/boekhouding/verkoopfacturen - List all invoices"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Found {len(data)} verkoopfacturen")
        
        if len(data) > 0:
            print(f"First factuur: {data[0].get('factuurnummer')} - Status: {data[0].get('status')}")
    
    def test_pdf_download_endpoint(self):
        """GET /api/boekhouding/verkoopfacturen/{id}/pdf - Download PDF"""
        # First get an existing invoice
        list_response = self.session.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen")
        assert list_response.status_code == 200
        
        facturen = list_response.json()
        
        if len(facturen) == 0:
            # Create one first
            invoice_id = self.test_create_verkoopfactuur()
        else:
            invoice_id = facturen[0].get('id')
        
        # Download PDF
        pdf_response = self.session.get(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{invoice_id}/pdf"
        )
        
        assert pdf_response.status_code == 200, f"PDF download failed: {pdf_response.status_code}"
        
        # Verify it's a PDF
        content_type = pdf_response.headers.get('content-type', '')
        assert 'pdf' in content_type.lower() or len(pdf_response.content) > 0, "Response is not a PDF"
        
        # Check PDF magic bytes
        pdf_content = pdf_response.content
        assert pdf_content[:4] == b'%PDF', "Response does not start with PDF magic bytes"
        
        print(f"PDF downloaded successfully! Size: {len(pdf_content)} bytes")


class TestFieldNameTranslation:
    """Test that toBackendFormat/toFrontendFormat functions are available"""
    
    def test_backend_api_accepts_dutch_field_names(self):
        """Verify backend accepts Dutch field names (naam, adres, etc.)"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        
        data = login_response.json()
        token = data.get("access_token") or data.get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Test creating a debiteur with Dutch field names
        debiteur_data = {
            "naam": "TEST_Vertaling Test Klant",
            "adres": "Teststraat 123",
            "plaats": "Paramaribo",
            "land": "Suriname",
            "telefoon": "+597 123456",
            "email": "test@vertaling.sr",
            "betalingstermijn": 14
        }
        
        response = session.post(
            f"{BASE_URL}/api/boekhouding/debiteuren",
            json=debiteur_data
        )
        
        assert response.status_code in [200, 201], f"Create failed: {response.status_code}"
        
        data = response.json()
        
        # Verify Dutch field names are returned
        assert data.get('naam') == "TEST_Vertaling Test Klant", "naam field not returned correctly"
        assert data.get('adres') == "Teststraat 123", "adres field not returned correctly"
        assert data.get('plaats') == "Paramaribo", "plaats field not returned correctly"
        
        print("Dutch field names work correctly!")
        
        # Cleanup - delete test debiteur
        if data.get('id'):
            session.delete(f"{BASE_URL}/api/boekhouding/debiteuren/{data.get('id')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
