"""
Test Kiosk Company Slug/URL Update Feature
Tests the bug fix where company_id (URL slug) should update when company name changes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API = f"{BASE_URL}/api/kiosk"

# Test credentials from test_credentials.md
KIOSK_EMAIL = "shyam@kewalbansing.net"
KIOSK_PASSWORD = "Bharat7755"
KIOSK_PIN = "5678"
COMPANY_SLUG = "kewalbansing"


class TestKioskPublicEndpoints:
    """Test public kiosk endpoints with the new slug"""
    
    def test_public_company_endpoint(self):
        """GET /api/kiosk/public/{company_id}/company returns valid data"""
        response = requests.get(f"{API}/public/{COMPANY_SLUG}/company")
        print(f"Public company endpoint: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "name" in data, "Response should contain 'name'"
        assert "company_id" in data, "Response should contain 'company_id'"
        assert data["company_id"] == COMPANY_SLUG, f"Expected company_id '{COMPANY_SLUG}', got '{data.get('company_id')}'"
        assert "has_pin" in data, "Response should contain 'has_pin'"
        print(f"Company name: {data.get('name')}, company_id: {data.get('company_id')}, has_pin: {data.get('has_pin')}")
    
    def test_public_apartments_endpoint(self):
        """GET /api/kiosk/public/{company_id}/apartments returns apartments"""
        response = requests.get(f"{API}/public/{COMPANY_SLUG}/apartments")
        print(f"Public apartments endpoint: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} apartments")
        
        if len(data) > 0:
            apt = data[0]
            assert "apartment_id" in apt, "Apartment should have apartment_id"
            assert "number" in apt, "Apartment should have number"
            print(f"First apartment: {apt.get('number')}")
    
    def test_public_tenants_endpoint(self):
        """GET /api/kiosk/public/{company_id}/tenants returns tenants"""
        response = requests.get(f"{API}/public/{COMPANY_SLUG}/tenants")
        print(f"Public tenants endpoint: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} active tenants")


class TestKioskAuthentication:
    """Test kiosk authentication endpoints"""
    
    def test_login_with_password(self):
        """POST /api/kiosk/auth/login with valid credentials"""
        response = requests.post(f"{API}/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        print(f"Login endpoint: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain 'token'"
        assert "company_id" in data, "Response should contain 'company_id'"
        assert data["company_id"] == COMPANY_SLUG, f"Expected company_id '{COMPANY_SLUG}', got '{data.get('company_id')}'"
        print(f"Login successful, company_id: {data.get('company_id')}")
        return data["token"]
    
    def test_login_with_pin(self):
        """POST /api/kiosk/auth/pin with valid PIN"""
        response = requests.post(f"{API}/auth/pin", json={
            "pin": KIOSK_PIN
        })
        print(f"PIN login endpoint: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain 'token'"
        assert "company_id" in data, "Response should contain 'company_id'"
        assert data["company_id"] == COMPANY_SLUG, f"Expected company_id '{COMPANY_SLUG}', got '{data.get('company_id')}'"
        print(f"PIN login successful, company_id: {data.get('company_id')}")


class TestKioskAdminEndpoints:
    """Test authenticated admin endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{API}/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_current_company_info(self, auth_token):
        """GET /api/kiosk/auth/me returns company info"""
        response = requests.get(f"{API}/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        print(f"Auth/me endpoint: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "company_id" in data, "Response should contain 'company_id'"
        assert data["company_id"] == COMPANY_SLUG, f"Expected company_id '{COMPANY_SLUG}', got '{data.get('company_id')}'"
        assert "name" in data, "Response should contain 'name'"
        assert "email" in data, "Response should contain 'email'"
        print(f"Company: {data.get('name')}, company_id: {data.get('company_id')}")
    
    def test_get_admin_tenants(self, auth_token):
        """GET /api/kiosk/admin/tenants returns tenants with new token"""
        response = requests.get(f"{API}/admin/tenants", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        print(f"Admin tenants endpoint: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} tenants")
        
        if len(data) > 0:
            tenant = data[0]
            assert "tenant_id" in tenant, "Tenant should have tenant_id"
            assert "name" in tenant, "Tenant should have name"
    
    def test_get_admin_dashboard_data(self, auth_token):
        """GET /api/kiosk/admin/dashboard-data returns combined data"""
        response = requests.get(f"{API}/admin/dashboard-data", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        print(f"Admin dashboard-data endpoint: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "apartments" in data, "Response should contain 'apartments'"
        assert "payments" in data, "Response should contain 'payments'"
        assert "leases" in data, "Response should contain 'leases'"
        print(f"Dashboard data: {len(data.get('apartments', []))} apartments, {len(data.get('payments', []))} payments")
    
    def test_get_admin_dashboard(self, auth_token):
        """GET /api/kiosk/admin/dashboard returns dashboard stats"""
        response = requests.get(f"{API}/admin/dashboard", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        print(f"Admin dashboard endpoint: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Dashboard stats received")


class TestPinVerification:
    """Test PIN verification for kiosk access"""
    
    def test_verify_pin_correct(self):
        """POST /api/kiosk/public/{company_id}/verify-pin with correct PIN"""
        response = requests.post(f"{API}/public/{COMPANY_SLUG}/verify-pin", json={
            "pin": KIOSK_PIN
        })
        print(f"Verify PIN endpoint: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("valid") == True, "PIN should be valid"
        assert "token" in data, "Response should contain token for admin access"
        print(f"PIN verification successful")
    
    def test_verify_pin_incorrect(self):
        """POST /api/kiosk/public/{company_id}/verify-pin with incorrect PIN"""
        response = requests.post(f"{API}/public/{COMPANY_SLUG}/verify-pin", json={
            "pin": "0000"
        })
        print(f"Verify incorrect PIN endpoint: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401 for incorrect PIN, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
