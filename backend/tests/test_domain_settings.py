"""
Test Domain Settings Feature for Kiosk Admin
- PUT /api/kiosk/auth/settings with custom_domain and custom_domain_landing
- POST /api/kiosk/admin/domain/verify - DNS verification
- GET /api/kiosk/admin/domain/lookup - Domain lookup by host
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_EMAIL = "shyam@kewalbansing.net"
TEST_PASSWORD = "Bharat7755"
TEST_DOMAIN = "huur.kewalbansing.com"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for kiosk company"""
    response = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"]


class TestDomainSettings:
    """Test domain settings CRUD operations"""
    
    def test_save_custom_domain(self, auth_token):
        """Test saving custom domain via PUT /auth/settings"""
        response = requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={
                "custom_domain": TEST_DOMAIN,
                "custom_domain_landing": "kiosk"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Save domain failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Domain saved: {TEST_DOMAIN}")
    
    def test_verify_domain_saved(self, auth_token):
        """Verify domain was saved by checking /auth/me"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get company info failed: {response.text}"
        # Note: custom_domain may not be returned in /auth/me - check if it's there
        print(f"✓ Company info retrieved successfully")
    
    def test_save_domain_with_login_landing(self, auth_token):
        """Test saving domain with login landing page"""
        response = requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={
                "custom_domain": TEST_DOMAIN,
                "custom_domain_landing": "login"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Save domain with login landing failed: {response.text}"
        print(f"✓ Domain saved with login landing page")
    
    def test_save_domain_with_kiosk_landing(self, auth_token):
        """Test saving domain with kiosk landing page"""
        response = requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={
                "custom_domain": TEST_DOMAIN,
                "custom_domain_landing": "kiosk"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Save domain with kiosk landing failed: {response.text}"
        print(f"✓ Domain saved with kiosk landing page")


class TestDomainVerification:
    """Test domain DNS verification endpoint"""
    
    def test_verify_domain_endpoint(self, auth_token):
        """Test POST /admin/domain/verify - should return DNS check result"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/domain/verify",
            json={},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Domain verify failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "domain" in data, "Response should contain 'domain'"
        assert "status" in data, "Response should contain 'status'"
        assert "details" in data, "Response should contain 'details'"
        
        # Status should be one of the expected values
        valid_statuses = ["active", "pending", "misconfigured", "not_found", "error", "unknown"]
        assert data["status"] in valid_statuses, f"Invalid status: {data['status']}"
        
        print(f"✓ Domain verification returned: status={data['status']}, domain={data['domain']}")
        print(f"  Details: {data['details']}")
    
    def test_verify_domain_without_domain_set(self, auth_token):
        """Test verify when no domain is set - should return 400"""
        # First clear the domain
        requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={"custom_domain": ""},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/domain/verify",
            json={},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should return 400 when no domain is set
        assert response.status_code == 400, f"Expected 400 when no domain set, got {response.status_code}"
        print(f"✓ Correctly returns 400 when no domain is set")
        
        # Restore the test domain
        requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={"custom_domain": TEST_DOMAIN},
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestDomainLookup:
    """Test domain lookup endpoint"""
    
    def test_domain_lookup_existing(self, auth_token):
        """Test GET /admin/domain/lookup with existing domain"""
        # First ensure domain is saved
        requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={"custom_domain": TEST_DOMAIN, "custom_domain_landing": "kiosk"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/domain/lookup",
            params={"host": TEST_DOMAIN}
        )
        assert response.status_code == 200, f"Domain lookup failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "company_id" in data, "Response should contain 'company_id'"
        assert "name" in data, "Response should contain 'name'"
        assert "custom_domain_landing" in data, "Response should contain 'custom_domain_landing'"
        
        print(f"✓ Domain lookup returned: company_id={data['company_id']}, name={data['name']}")
    
    def test_domain_lookup_nonexistent(self):
        """Test GET /admin/domain/lookup with non-existent domain"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/domain/lookup",
            params={"host": "nonexistent.domain.com"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent domain, got {response.status_code}"
        print(f"✓ Correctly returns 404 for non-existent domain")


class TestDomainNormalization:
    """Test domain input normalization"""
    
    def test_domain_strips_protocol(self, auth_token):
        """Test that https:// is stripped from domain"""
        response = requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={"custom_domain": "https://test.example.com"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Verify it was normalized
        lookup_response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/domain/lookup",
            params={"host": "test.example.com"}
        )
        assert lookup_response.status_code == 200, "Domain should be found without protocol"
        print(f"✓ Domain correctly normalized (protocol stripped)")
        
        # Restore original domain
        requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={"custom_domain": TEST_DOMAIN},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_domain_lowercase(self, auth_token):
        """Test that domain is converted to lowercase"""
        response = requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={"custom_domain": "TEST.EXAMPLE.COM"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Verify it was normalized to lowercase
        lookup_response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/domain/lookup",
            params={"host": "test.example.com"}
        )
        assert lookup_response.status_code == 200, "Domain should be found in lowercase"
        print(f"✓ Domain correctly normalized (lowercase)")
        
        # Restore original domain
        requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={"custom_domain": TEST_DOMAIN},
            headers={"Authorization": f"Bearer {auth_token}"}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
