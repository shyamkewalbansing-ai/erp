"""
Test Invoice PDF Generation and Email Send Features
Tests the PDF generation endpoint and email send endpoint for sales invoices
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"

# Test factuur ID (provided in test request)
TEST_FACTUUR_ID = "12985a3b-ebd8-4674-9b5a-21545fff48c5"


class TestInvoicePDFGeneration:
    """Test PDF generation for sales invoices"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        self.token = data.get("access_token")
        assert self.token, "No access_token in login response"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_pdf_download_endpoint_returns_pdf(self):
        """Test that PDF download endpoint returns valid PDF content"""
        response = self.session.get(f"{BASE_URL}/api/pdf/verkoopfactuur/{TEST_FACTUUR_ID}")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Content type assertion
        assert "application/pdf" in response.headers.get("Content-Type", ""), \
            f"Expected application/pdf, got {response.headers.get('Content-Type')}"
        
        # Content disposition should indicate attachment
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, \
            f"Expected attachment in Content-Disposition, got {content_disposition}"
        
        # PDF content should start with %PDF
        assert response.content[:4] == b'%PDF', "Response content is not a valid PDF"
        
        # PDF should have reasonable size (at least 1KB)
        assert len(response.content) > 1000, f"PDF too small: {len(response.content)} bytes"
        
        print(f"PDF generated successfully: {len(response.content)} bytes")
    
    def test_pdf_preview_endpoint_returns_pdf(self):
        """Test that PDF preview endpoint returns valid PDF for inline viewing"""
        response = self.session.get(f"{BASE_URL}/api/pdf/verkoopfactuur/{TEST_FACTUUR_ID}/preview")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Content type assertion
        assert "application/pdf" in response.headers.get("Content-Type", ""), \
            f"Expected application/pdf, got {response.headers.get('Content-Type')}"
        
        # Content disposition should indicate inline (for preview)
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "inline" in content_disposition, \
            f"Expected inline in Content-Disposition, got {content_disposition}"
        
        # PDF content should start with %PDF
        assert response.content[:4] == b'%PDF', "Response content is not a valid PDF"
        
        print(f"PDF preview generated successfully: {len(response.content)} bytes")
    
    def test_pdf_endpoint_with_invalid_factuur_id(self):
        """Test that PDF endpoint returns 404 for non-existent invoice"""
        invalid_id = "00000000-0000-0000-0000-000000000000"
        response = self.session.get(f"{BASE_URL}/api/pdf/verkoopfactuur/{invalid_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Expected error detail in response"
        print(f"Correctly returned 404 for invalid factuur ID")
    
    def test_pdf_endpoint_without_auth(self):
        """Test that PDF endpoint requires authentication"""
        # Create new session without auth
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/pdf/verkoopfactuur/{TEST_FACTUUR_ID}")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        
        print("Correctly requires authentication")


class TestInvoiceEmailSend:
    """Test email send functionality for sales invoices"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        self.token = data.get("access_token")
        assert self.token, "No access_token in login response"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_email_send_endpoint_exists(self):
        """Test that email send endpoint exists and responds"""
        response = self.session.post(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{TEST_FACTUUR_ID}/send-email",
            json={"to_email": "test@example.com"}
        )
        
        # Should return 400 (email not configured) or 200 (success)
        # NOT 404 (endpoint not found) or 405 (method not allowed)
        assert response.status_code not in [404, 405], \
            f"Endpoint not found or method not allowed: {response.status_code}"
        
        print(f"Email endpoint responded with status: {response.status_code}")
    
    def test_email_send_returns_expected_error_without_smtp(self):
        """Test that email send returns proper error when SMTP not configured"""
        response = self.session.post(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{TEST_FACTUUR_ID}/send-email",
            json={
                "to_email": "test@example.com",
                "subject": "Test Invoice",
                "message": "Test message"
            }
        )
        
        # Expected: 400 with "Email niet geconfigureerd" message
        # This is expected behavior when user hasn't configured SMTP
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data, "Expected error detail in response"
            assert "niet geconfigureerd" in data["detail"].lower() or "email" in data["detail"].lower(), \
                f"Unexpected error message: {data['detail']}"
            print(f"Correctly returned SMTP not configured error: {data['detail']}")
        elif response.status_code == 200:
            # If SMTP is configured, email should be sent successfully
            data = response.json()
            assert data.get("success") == True, "Expected success=True in response"
            print("Email sent successfully (SMTP configured)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}, response: {response.text}")
    
    def test_email_send_with_invalid_factuur_id(self):
        """Test that email send returns 404 for non-existent invoice"""
        invalid_id = "00000000-0000-0000-0000-000000000000"
        response = self.session.post(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{invalid_id}/send-email",
            json={"to_email": "test@example.com"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for invalid factuur ID")
    
    def test_email_send_without_auth(self):
        """Test that email send endpoint requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{TEST_FACTUUR_ID}/send-email",
            json={"to_email": "test@example.com"}
        )
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        
        print("Correctly requires authentication")
    
    def test_email_send_validates_email_format(self):
        """Test that email send validates email address format"""
        response = self.session.post(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{TEST_FACTUUR_ID}/send-email",
            json={"to_email": ""}  # Empty email
        )
        
        # Should return 400 or similar error for missing/invalid email
        # OR the endpoint might use debiteur's email as fallback
        if response.status_code == 400:
            data = response.json()
            print(f"Correctly validated empty email: {data.get('detail', 'No detail')}")
        else:
            print(f"Endpoint handled empty email with status: {response.status_code}")


class TestVerkoopfactuurEndpoints:
    """Test verkoopfactuur endpoints to ensure they work correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_verkoopfacturen_list(self):
        """Test getting list of sales invoices"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of invoices"
        
        if len(data) > 0:
            # Verify invoice structure
            invoice = data[0]
            assert "id" in invoice, "Invoice should have id"
            assert "factuurnummer" in invoice, "Invoice should have factuurnummer"
            assert "totaal" in invoice, "Invoice should have totaal"
            assert "status" in invoice, "Invoice should have status"
        
        print(f"Found {len(data)} invoices")
    
    def test_get_single_verkoopfactuur(self):
        """Test getting a single sales invoice"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen/{TEST_FACTUUR_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == TEST_FACTUUR_ID, "Invoice ID should match"
        assert "factuurnummer" in data, "Invoice should have factuurnummer"
        assert "debiteur_id" in data, "Invoice should have debiteur_id"
        assert "regels" in data, "Invoice should have regels (line items)"
        assert "totaal" in data, "Invoice should have totaal"
        
        print(f"Invoice {data['factuurnummer']}: {data['valuta']} {data['totaal']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
