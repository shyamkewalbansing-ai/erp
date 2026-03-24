"""
Test Kiosk Lease Agreements (Huurovereenkomsten) API
Tests CRUD operations for lease agreements in the Admin Dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test1774285001@test.com"
TEST_PASSWORD = "test123"


class TestKioskLeaseAgreements:
    """Test lease agreements CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        self.token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get tenants and apartments for lease creation
        tenants_resp = self.session.get(f"{BASE_URL}/api/kiosk/admin/tenants")
        apartments_resp = self.session.get(f"{BASE_URL}/api/kiosk/admin/apartments")
        
        if tenants_resp.status_code == 200:
            tenants = tenants_resp.json()
            active_tenants = [t for t in tenants if t.get('status') == 'active']
            self.test_tenant = active_tenants[0] if active_tenants else None
        else:
            self.test_tenant = None
            
        if apartments_resp.status_code == 200:
            self.test_apartment = apartments_resp.json()[0] if apartments_resp.json() else None
        else:
            self.test_apartment = None
    
    def test_01_login_success(self):
        """Test login with valid credentials"""
        response = self.session.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "company_id" in data
        print(f"✓ Login successful, company_id: {data['company_id']}")
    
    def test_02_get_leases_list(self):
        """Test GET /api/kiosk/admin/leases returns list"""
        response = self.session.get(f"{BASE_URL}/api/kiosk/admin/leases")
        assert response.status_code == 200, f"Get leases failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET leases returned {len(data)} leases")
        
        # Verify lease structure if any exist
        if data:
            lease = data[0]
            expected_fields = ['lease_id', 'tenant_name', 'apartment_number', 'start_date', 'end_date', 'monthly_rent', 'status']
            for field in expected_fields:
                assert field in lease, f"Missing field: {field}"
            print(f"✓ Lease structure verified: {list(lease.keys())}")
    
    def test_03_create_lease(self):
        """Test POST /api/kiosk/admin/leases creates new lease"""
        if not self.test_tenant or not self.test_apartment:
            pytest.skip("No tenant or apartment available for testing")
        
        lease_data = {
            "tenant_id": self.test_tenant['tenant_id'],
            "apartment_id": self.test_apartment['apartment_id'],
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "monthly_rent": 1500.00,
            "voorwaarden": "TEST_LEASE - Automatisch gegenereerd voor testing"
        }
        
        response = self.session.post(f"{BASE_URL}/api/kiosk/admin/leases", json=lease_data)
        assert response.status_code == 200, f"Create lease failed: {response.text}"
        
        data = response.json()
        assert "lease_id" in data, "Response should contain lease_id"
        assert data.get("tenant_name") == self.test_tenant['name'], "Tenant name mismatch"
        assert data.get("apartment_number") == self.test_apartment['number'], "Apartment number mismatch"
        assert data.get("monthly_rent") == 1500.00, "Monthly rent mismatch"
        assert data.get("start_date") == "2026-01-01", "Start date mismatch"
        assert data.get("end_date") == "2026-12-31", "End date mismatch"
        
        # Store lease_id for subsequent tests
        self.__class__.created_lease_id = data['lease_id']
        print(f"✓ Created lease: {data['lease_id']}")
    
    def test_04_verify_lease_in_list(self):
        """Verify created lease appears in list"""
        if not hasattr(self.__class__, 'created_lease_id'):
            pytest.skip("No lease created in previous test")
        
        response = self.session.get(f"{BASE_URL}/api/kiosk/admin/leases")
        assert response.status_code == 200
        
        leases = response.json()
        lease_ids = [l['lease_id'] for l in leases]
        assert self.__class__.created_lease_id in lease_ids, "Created lease not found in list"
        print(f"✓ Lease {self.__class__.created_lease_id} found in list")
    
    def test_05_update_lease(self):
        """Test PUT /api/kiosk/admin/leases/{id} updates lease"""
        if not hasattr(self.__class__, 'created_lease_id'):
            pytest.skip("No lease created in previous test")
        
        lease_id = self.__class__.created_lease_id
        update_data = {
            "monthly_rent": 1750.00,
            "voorwaarden": "TEST_LEASE - Updated voorwaarden for testing",
            "end_date": "2027-06-30"
        }
        
        response = self.session.put(f"{BASE_URL}/api/kiosk/admin/leases/{lease_id}", json=update_data)
        assert response.status_code == 200, f"Update lease failed: {response.text}"
        
        data = response.json()
        assert data.get("monthly_rent") == 1750.00, "Monthly rent not updated"
        assert data.get("end_date") == "2027-06-30", "End date not updated"
        assert "Updated voorwaarden" in data.get("voorwaarden", ""), "Voorwaarden not updated"
        print(f"✓ Lease updated: monthly_rent=1750, end_date=2027-06-30")
    
    def test_06_get_lease_document(self):
        """Test GET /api/kiosk/admin/leases/{id}/document returns HTML"""
        if not hasattr(self.__class__, 'created_lease_id'):
            pytest.skip("No lease created in previous test")
        
        lease_id = self.__class__.created_lease_id
        
        # Document endpoint requires token as query param
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/leases/{lease_id}/document",
            params={"token": self.token}
        )
        assert response.status_code == 200, f"Get document failed: {response.text}"
        assert "text/html" in response.headers.get("content-type", ""), "Response should be HTML"
        
        # Verify HTML content
        html = response.text
        assert "HUUROVEREENKOMST" in html, "Document should contain title"
        assert "Artikel 1" in html, "Document should contain articles"
        assert "SRD" in html, "Document should contain currency"
        print(f"✓ Lease document generated successfully (HTML)")
    
    def test_07_delete_lease(self):
        """Test DELETE /api/kiosk/admin/leases/{id} removes lease"""
        if not hasattr(self.__class__, 'created_lease_id'):
            pytest.skip("No lease created in previous test")
        
        lease_id = self.__class__.created_lease_id
        
        response = self.session.delete(f"{BASE_URL}/api/kiosk/admin/leases/{lease_id}")
        assert response.status_code == 200, f"Delete lease failed: {response.text}"
        
        data = response.json()
        assert "verwijderd" in data.get("message", "").lower(), "Delete message not found"
        print(f"✓ Lease deleted: {lease_id}")
    
    def test_08_verify_lease_deleted(self):
        """Verify deleted lease no longer in list"""
        if not hasattr(self.__class__, 'created_lease_id'):
            pytest.skip("No lease created in previous test")
        
        response = self.session.get(f"{BASE_URL}/api/kiosk/admin/leases")
        assert response.status_code == 200
        
        leases = response.json()
        lease_ids = [l['lease_id'] for l in leases]
        assert self.__class__.created_lease_id not in lease_ids, "Deleted lease still in list"
        print(f"✓ Lease {self.__class__.created_lease_id} confirmed deleted")
    
    def test_09_create_lease_invalid_tenant(self):
        """Test creating lease with invalid tenant returns 404"""
        if not self.test_apartment:
            pytest.skip("No apartment available for testing")
        
        lease_data = {
            "tenant_id": "invalid-tenant-id-12345",
            "apartment_id": self.test_apartment['apartment_id'],
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "monthly_rent": 1000.00
        }
        
        response = self.session.post(f"{BASE_URL}/api/kiosk/admin/leases", json=lease_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid tenant returns 404")
    
    def test_10_create_lease_invalid_apartment(self):
        """Test creating lease with invalid apartment returns 404"""
        if not self.test_tenant:
            pytest.skip("No tenant available for testing")
        
        lease_data = {
            "tenant_id": self.test_tenant['tenant_id'],
            "apartment_id": "invalid-apartment-id-12345",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "monthly_rent": 1000.00
        }
        
        response = self.session.post(f"{BASE_URL}/api/kiosk/admin/leases", json=lease_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid apartment returns 404")
    
    def test_11_document_without_token(self):
        """Test document endpoint without token returns 401"""
        # Use any lease_id - doesn't matter since auth should fail first
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/leases/any-id/document")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Document without token returns 401")
    
    def test_12_dashboard_stats(self):
        """Test dashboard endpoint returns expected stats"""
        response = self.session.get(f"{BASE_URL}/api/kiosk/admin/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        expected_fields = ['total_apartments', 'total_tenants', 'total_outstanding', 'total_service_costs', 'total_fines', 'total_received_month']
        for field in expected_fields:
            assert field in data, f"Missing dashboard field: {field}"
        print(f"✓ Dashboard stats: {data['total_apartments']} apartments, {data['total_tenants']} tenants")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
