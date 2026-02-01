"""
Test Invoice PDF Download Feature
Tests the /api/invoices/pdf/{tenant_id}/{year}/{month} endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://modular-erp-23.preview.emergentagent.com')

class TestInvoicePdfDownload:
    """Tests for Invoice PDF Download feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get auth token"""
        # Login as customer
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "klant@test.com", "password": "test123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get tenant ID
        tenants_response = requests.get(f"{BASE_URL}/api/tenants", headers=self.headers)
        assert tenants_response.status_code == 200
        tenants = tenants_response.json()
        assert len(tenants) > 0, "No tenants found for testing"
        self.tenant_id = tenants[0]["id"]
        self.tenant_name = tenants[0]["name"]
    
    def test_invoice_pdf_endpoint_returns_200(self):
        """Test that invoice PDF endpoint returns 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/pdf/{self.tenant_id}/2026/1",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_invoice_pdf_returns_pdf_content_type(self):
        """Test that response has application/pdf content type"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/pdf/{self.tenant_id}/2026/1",
            headers=self.headers
        )
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
    
    def test_invoice_pdf_returns_valid_pdf(self):
        """Test that response is a valid PDF file"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/pdf/{self.tenant_id}/2026/1",
            headers=self.headers
        )
        assert response.status_code == 200
        # PDF files start with %PDF
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF file"
    
    def test_invoice_pdf_has_content(self):
        """Test that PDF has reasonable content size"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/pdf/{self.tenant_id}/2026/1",
            headers=self.headers
        )
        assert response.status_code == 200
        # PDF should be at least 1KB
        assert len(response.content) > 1000, f"PDF too small: {len(response.content)} bytes"
    
    def test_invoice_pdf_requires_authentication(self):
        """Test that endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/pdf/{self.tenant_id}/2026/1"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_invoice_pdf_invalid_tenant_returns_404(self):
        """Test that invalid tenant ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/pdf/invalid-tenant-id/2026/1",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_invoice_pdf_different_months(self):
        """Test PDF generation for different months"""
        for month in [1, 2]:  # Test January and February
            response = requests.get(
                f"{BASE_URL}/api/invoices/pdf/{self.tenant_id}/2026/{month}",
                headers=self.headers
            )
            assert response.status_code == 200, f"Failed for month {month}: {response.status_code}"
            assert response.content[:4] == b'%PDF', f"Invalid PDF for month {month}"
    
    def test_invoice_pdf_different_years(self):
        """Test PDF generation for different years"""
        for year in [2025, 2026]:
            response = requests.get(
                f"{BASE_URL}/api/invoices/pdf/{self.tenant_id}/{year}/1",
                headers=self.headers
            )
            assert response.status_code == 200, f"Failed for year {year}: {response.status_code}"
            assert response.content[:4] == b'%PDF', f"Invalid PDF for year {year}"


class TestInvoicePdfWithSuperAdmin:
    """Test Invoice PDF with superadmin account"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login as superadmin"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@facturatie.sr", "password": "admin123"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Superadmin login failed - skipping superadmin tests")
        
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_superadmin_can_access_invoice_pdf(self):
        """Test that superadmin can access invoice PDF endpoint"""
        # First get tenants
        tenants_response = requests.get(f"{BASE_URL}/api/tenants", headers=self.headers)
        
        if tenants_response.status_code != 200 or len(tenants_response.json()) == 0:
            pytest.skip("No tenants available for superadmin")
        
        tenant_id = tenants_response.json()[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/invoices/pdf/{tenant_id}/2026/1",
            headers=self.headers
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
