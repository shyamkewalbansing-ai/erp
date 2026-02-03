"""
Domain Management API Tests
Tests for:
- GET /api/domains/status - Get all custom domain statuses
- POST /api/domains/setup-automated - Automated domain setup for a customer
- POST /api/domains/verify-dns/{workspace_id} - DNS verification
- POST /api/domains/provision/nginx/{workspace_id} - Nginx configuration preview
- GET /api/admin/customers - Get customers list (for setup dialog)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "admin@facturatie.sr"
SUPERADMIN_PASSWORD = "admin123"


class TestDomainManagementAuth:
    """Test authentication for domain management endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get superadmin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_superadmin(self, auth_token):
        """Test superadmin login works"""
        assert auth_token is not None
        assert len(auth_token) > 0


class TestDomainStatusEndpoint:
    """Tests for GET /api/domains/status"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get superadmin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_domain_status_success(self, auth_token):
        """Test GET /api/domains/status returns list of domain statuses"""
        response = requests.get(
            f"{BASE_URL}/api/domains/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are domains, verify structure
        if len(data) > 0:
            domain = data[0]
            assert "workspace_id" in domain
            assert "workspace_name" in domain
            assert "domain" in domain
            assert "dns_verified" in domain
            assert "ssl_active" in domain
            assert "nginx_configured" in domain
    
    def test_get_domain_status_unauthorized(self):
        """Test GET /api/domains/status without auth returns 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/domains/status")
        assert response.status_code in [401, 403]


class TestCustomersEndpoint:
    """Tests for GET /api/admin/customers - needed for setup dialog"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get superadmin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_customers_success(self, auth_token):
        """Test GET /api/admin/customers returns customer list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify customer structure if any exist
        if len(data) > 0:
            customer = data[0]
            assert "id" in customer
            assert "name" in customer or "email" in customer


class TestAutomatedDomainSetup:
    """Tests for POST /api/domains/setup-automated"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get superadmin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_customer_id(self, auth_token):
        """Get a customer ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200:
            customers = response.json()
            if len(customers) > 0:
                return customers[0]["id"]
        return None
    
    def test_setup_automated_missing_fields(self, auth_token):
        """Test setup-automated with missing fields returns error"""
        response = requests.post(
            f"{BASE_URL}/api/domains/setup-automated",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"domain": ""}  # Missing user_id
        )
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
    
    def test_setup_automated_invalid_user(self, auth_token):
        """Test setup-automated with invalid user_id returns error"""
        response = requests.post(
            f"{BASE_URL}/api/domains/setup-automated",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "domain": "test-invalid.example.com",
                "user_id": "non-existent-user-id"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["success"] == False
        assert "niet gevonden" in data["message"].lower() or "not found" in data["message"].lower()
    
    def test_setup_automated_invalid_domain(self, auth_token, test_customer_id):
        """Test setup-automated with invalid domain format"""
        if not test_customer_id:
            pytest.skip("No customer available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/domains/setup-automated",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "domain": "invalid",  # No dot in domain
                "user_id": test_customer_id
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "ongeldig" in data["message"].lower() or "invalid" in data["message"].lower()
    
    def test_setup_automated_success(self, auth_token, test_customer_id):
        """Test setup-automated with valid data creates workspace and domain"""
        if not test_customer_id:
            pytest.skip("No customer available for testing")
        
        # Use unique domain to avoid conflicts
        test_domain = f"test-{uuid.uuid4().hex[:8]}.example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/domains/setup-automated",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "domain": test_domain,
                "user_id": test_customer_id
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True, f"Setup failed: {data.get('message')}"
        assert data["domain"] == test_domain
        assert data["workspace_id"] is not None
        assert len(data["steps_completed"]) > 0
        
        # Verify steps include expected actions
        steps_text = " ".join(data["steps_completed"]).lower()
        assert "gebruiker" in steps_text or "user" in steps_text  # User verified
        assert "domein" in steps_text or "domain" in steps_text  # Domain validated
    
    def test_setup_automated_unauthorized(self):
        """Test setup-automated without auth returns 401 or 403"""
        response = requests.post(
            f"{BASE_URL}/api/domains/setup-automated",
            headers={"Content-Type": "application/json"},
            json={
                "domain": "test.example.com",
                "user_id": "some-id"
            }
        )
        assert response.status_code in [401, 403]


class TestDNSVerification:
    """Tests for POST /api/domains/verify-dns/{workspace_id}"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get superadmin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def workspace_with_domain(self, auth_token):
        """Get a workspace ID that has a custom domain configured"""
        response = requests.get(
            f"{BASE_URL}/api/domains/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200:
            domains = response.json()
            if len(domains) > 0:
                return domains[0]["workspace_id"]
        return None
    
    def test_verify_dns_invalid_workspace(self, auth_token):
        """Test verify-dns with invalid workspace_id returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/domains/verify-dns/non-existent-workspace",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404
    
    def test_verify_dns_success(self, auth_token, workspace_with_domain):
        """Test verify-dns returns DNS verification result"""
        if not workspace_with_domain:
            pytest.skip("No workspace with custom domain available")
        
        response = requests.post(
            f"{BASE_URL}/api/domains/verify-dns/{workspace_with_domain}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "domain" in data
        assert "expected_ip" in data
        assert "verified" in data
        assert "message" in data


class TestNginxConfigPreview:
    """Tests for POST /api/domains/provision/nginx/{workspace_id}"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get superadmin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def workspace_with_domain(self, auth_token):
        """Get a workspace ID that has a custom domain configured"""
        response = requests.get(
            f"{BASE_URL}/api/domains/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200:
            domains = response.json()
            if len(domains) > 0:
                return domains[0]["workspace_id"]
        return None
    
    def test_nginx_preview_invalid_workspace(self, auth_token):
        """Test nginx preview with invalid workspace_id returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/domains/provision/nginx/non-existent-workspace?preview_only=true",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404
    
    def test_nginx_preview_success(self, auth_token, workspace_with_domain):
        """Test nginx preview returns config preview"""
        if not workspace_with_domain:
            pytest.skip("No workspace with custom domain available")
        
        response = requests.post(
            f"{BASE_URL}/api/domains/provision/nginx/{workspace_with_domain}?preview_only=true",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "config_preview" in data
        assert data["config_preview"] is not None
        # Verify nginx config contains expected directives
        config = data["config_preview"]
        assert "server" in config
        assert "location" in config


class TestAdminDomainsEndpoint:
    """Tests for GET /api/admin/domains - verify fix for 500 error"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get superadmin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_admin_domains_success(self, auth_token):
        """Test GET /api/admin/domains returns list without 500 error"""
        response = requests.get(
            f"{BASE_URL}/api/admin/domains",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure if domains exist
        if len(data) > 0:
            domain = data[0]
            assert "id" in domain
            assert "domain" in domain
            assert "user_id" in domain
            assert "status" in domain
            assert "dns_record_type" in domain
            assert "dns_record_value" in domain


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
