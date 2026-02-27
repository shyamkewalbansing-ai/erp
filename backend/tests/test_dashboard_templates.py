"""
Test Dashboard 500-error fix and Factuur Template Features
Tests:
1. GET /api/dashboard - should work without 500 error
2. Instellingen API - factuur_template field supports 'standaard', 'modern', 'kleurrijk'
3. PDF download with different templates
4. UnifiedEmailService exists
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDashboardAndTemplates:
    """Test dashboard fix and factuur template features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    # === Dashboard Tests ===
    def test_dashboard_no_500_error(self):
        """GET /api/dashboard should work without 500 error"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Dashboard returned {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected fields exist
        assert "total_apartments" in data
        assert "total_tenants" in data
        assert "total_income_this_month" in data
        assert "recent_payments" in data
        print(f"Dashboard OK - {data['total_apartments']} apartments, {data['total_tenants']} tenants")
    
    def test_dashboard_recent_payments_have_safe_defaults(self):
        """Recent payments should handle missing apartment_id/tenant_id gracefully"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        recent_payments = data.get("recent_payments", [])
        
        # Each payment should have required fields (even if empty string)
        for payment in recent_payments:
            assert "id" in payment
            assert "tenant_id" in payment
            assert "apartment_id" in payment
            assert "amount" in payment
            # apartment_id can be empty string but should not cause error
            print(f"Payment {payment['id']}: tenant={payment.get('tenant_name')}, apt={payment.get('apartment_name')}")
    
    # === Instellingen Template Tests ===
    def test_instellingen_returns_template_fields(self):
        """GET /api/boekhouding/instellingen should return factuur_template field"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/instellingen", headers=self.headers)
        assert response.status_code == 200, f"Instellingen failed: {response.text}"
        
        data = response.json()
        assert "factuur_template" in data, "factuur_template field missing"
        assert "factuur_primaire_kleur" in data, "factuur_primaire_kleur field missing"
        assert "factuur_secundaire_kleur" in data, "factuur_secundaire_kleur field missing"
        
        print(f"Template: {data['factuur_template']}, Primary: {data['factuur_primaire_kleur']}, Secondary: {data['factuur_secundaire_kleur']}")
    
    def test_update_template_standaard(self):
        """PUT /api/boekhouding/instellingen should accept template='standaard'"""
        response = requests.put(
            f"{BASE_URL}/api/boekhouding/instellingen",
            headers=self.headers,
            json={"factuur_template": "standaard"}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update
        verify = requests.get(f"{BASE_URL}/api/boekhouding/instellingen", headers=self.headers)
        assert verify.json()["factuur_template"] == "standaard"
        print("Template 'standaard' set successfully")
    
    def test_update_template_modern(self):
        """PUT /api/boekhouding/instellingen should accept template='modern'"""
        response = requests.put(
            f"{BASE_URL}/api/boekhouding/instellingen",
            headers=self.headers,
            json={"factuur_template": "modern"}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update
        verify = requests.get(f"{BASE_URL}/api/boekhouding/instellingen", headers=self.headers)
        assert verify.json()["factuur_template"] == "modern"
        print("Template 'modern' set successfully")
    
    def test_update_template_kleurrijk(self):
        """PUT /api/boekhouding/instellingen should accept template='kleurrijk'"""
        response = requests.put(
            f"{BASE_URL}/api/boekhouding/instellingen",
            headers=self.headers,
            json={"factuur_template": "kleurrijk"}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update
        verify = requests.get(f"{BASE_URL}/api/boekhouding/instellingen", headers=self.headers)
        assert verify.json()["factuur_template"] == "kleurrijk"
        print("Template 'kleurrijk' set successfully")
    
    # === PDF Download Tests ===
    def test_pdf_download_works(self):
        """PDF download endpoint should return valid PDF"""
        # Get list of invoices
        invoices_response = requests.get(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen",
            headers=self.headers
        )
        assert invoices_response.status_code == 200
        
        invoices = invoices_response.json()
        if not invoices:
            pytest.skip("No invoices available for PDF test")
        
        invoice_id = invoices[0]["id"]
        
        # Download PDF
        pdf_response = requests.get(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{invoice_id}/pdf",
            headers=self.headers
        )
        assert pdf_response.status_code == 200, f"PDF download failed: {pdf_response.status_code}"
        assert pdf_response.headers.get("content-type") == "application/pdf"
        
        # Check PDF magic bytes
        content = pdf_response.content
        assert content[:5] == b"%PDF-", "Response is not a valid PDF"
        print(f"PDF downloaded successfully: {len(content)} bytes")
    
    def test_pdf_download_with_different_templates(self):
        """PDF should be generated with current template setting"""
        # Get list of invoices
        invoices_response = requests.get(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen",
            headers=self.headers
        )
        invoices = invoices_response.json()
        if not invoices:
            pytest.skip("No invoices available for PDF test")
        
        invoice_id = invoices[0]["id"]
        
        # Test with each template
        for template in ["standaard", "modern", "kleurrijk"]:
            # Set template
            requests.put(
                f"{BASE_URL}/api/boekhouding/instellingen",
                headers=self.headers,
                json={"factuur_template": template}
            )
            
            # Download PDF
            pdf_response = requests.get(
                f"{BASE_URL}/api/boekhouding/verkoopfacturen/{invoice_id}/pdf",
                headers=self.headers
            )
            assert pdf_response.status_code == 200, f"PDF failed with template '{template}'"
            assert pdf_response.content[:5] == b"%PDF-"
            print(f"PDF with template '{template}': {len(pdf_response.content)} bytes")


class TestUnifiedEmailService:
    """Test that UnifiedEmailService exists and is properly structured"""
    
    def test_unified_email_service_file_exists(self):
        """unified_email_service.py should exist"""
        import os
        service_path = "/app/backend/services/unified_email_service.py"
        assert os.path.exists(service_path), f"File not found: {service_path}"
        print(f"UnifiedEmailService file exists at {service_path}")
    
    def test_unified_email_service_can_be_imported(self):
        """UnifiedEmailService should be importable"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        from services.unified_email_service import UnifiedEmailService, get_email_service
        
        # Check class exists and has expected methods
        assert hasattr(UnifiedEmailService, 'send_email')
        assert hasattr(UnifiedEmailService, 'get_smtp_settings')
        assert hasattr(UnifiedEmailService, 'generate_reminder_html')
        assert hasattr(UnifiedEmailService, 'generate_invoice_html')
        
        # Check factory function
        service = get_email_service()
        assert isinstance(service, UnifiedEmailService)
        print("UnifiedEmailService imported and instantiated successfully")
    
    def test_unified_email_service_has_templates(self):
        """UnifiedEmailService should have email templates"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        from services.unified_email_service import EMAIL_TEMPLATES
        
        # Check expected templates exist
        assert "welcome" in EMAIL_TEMPLATES
        assert "password_reset" in EMAIL_TEMPLATES
        assert "module_expiring" in EMAIL_TEMPLATES
        assert "module_expired" in EMAIL_TEMPLATES
        
        print(f"Email templates found: {list(EMAIL_TEMPLATES.keys())}")
