"""
Test: Auto-create lease when creating tenant with lease dates
Tests the new feature: POST /api/kiosk/admin/tenants with lease_start_date and lease_end_date
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTenantLeaseAutoCreate:
    """Test auto-creation of lease when creating tenant with lease dates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": "test1774285001@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get available apartments
        apt_response = requests.get(f"{BASE_URL}/api/kiosk/admin/apartments", headers=self.headers)
        assert apt_response.status_code == 200
        self.apartments = apt_response.json()
        
        # Find an available apartment
        self.available_apt = None
        for apt in self.apartments:
            if apt.get("status") == "available":
                self.available_apt = apt
                break
        
        yield
        
        # Cleanup: Delete test tenant if created
        if hasattr(self, 'created_tenant_id'):
            requests.delete(f"{BASE_URL}/api/kiosk/admin/tenants/{self.created_tenant_id}", headers=self.headers)
        if hasattr(self, 'created_lease_id'):
            requests.delete(f"{BASE_URL}/api/kiosk/admin/leases/{self.created_lease_id}", headers=self.headers)
    
    def test_create_tenant_with_lease_dates_creates_both(self):
        """Test that creating tenant with lease dates auto-creates a lease"""
        if not self.available_apt:
            pytest.skip("No available apartment for testing")
        
        # Calculate dates
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        
        # Create tenant with lease dates
        tenant_data = {
            "name": "TEST_AutoLease_Tenant",
            "apartment_id": self.available_apt["apartment_id"],
            "monthly_rent": 1500.00,
            "deposit_required": 3000.00,
            "lease_start_date": start_date,
            "lease_end_date": end_date
        }
        
        response = requests.post(f"{BASE_URL}/api/kiosk/admin/tenants", json=tenant_data, headers=self.headers)
        assert response.status_code == 200, f"Create tenant failed: {response.text}"
        
        result = response.json()
        assert "tenant_id" in result, "Response should contain tenant_id"
        assert "lease_id" in result, "Response should contain lease_id when lease dates provided"
        assert result["lease_id"] is not None, "lease_id should not be None"
        
        self.created_tenant_id = result["tenant_id"]
        self.created_lease_id = result["lease_id"]
        
        print(f"✓ Tenant created with ID: {self.created_tenant_id}")
        print(f"✓ Lease auto-created with ID: {self.created_lease_id}")
        
        # Verify lease was created with correct data
        leases_response = requests.get(f"{BASE_URL}/api/kiosk/admin/leases", headers=self.headers)
        assert leases_response.status_code == 200
        leases = leases_response.json()
        
        created_lease = None
        for lease in leases:
            if lease.get("lease_id") == self.created_lease_id:
                created_lease = lease
                break
        
        assert created_lease is not None, "Created lease should be in leases list"
        assert created_lease["tenant_name"] == "TEST_AutoLease_Tenant"
        assert created_lease["start_date"] == start_date
        assert created_lease["end_date"] == end_date
        assert created_lease["monthly_rent"] == 1500.00
        assert created_lease["apartment_number"] == self.available_apt["number"]
        
        print(f"✓ Lease verified: {created_lease['tenant_name']} - {created_lease['start_date']} to {created_lease['end_date']}")
    
    def test_create_tenant_without_lease_dates_no_lease(self):
        """Test that creating tenant without lease dates does NOT create a lease"""
        if not self.available_apt:
            pytest.skip("No available apartment for testing")
        
        # Create tenant WITHOUT lease dates
        tenant_data = {
            "name": "TEST_NoLease_Tenant",
            "apartment_id": self.available_apt["apartment_id"],
            "monthly_rent": 1200.00,
            "deposit_required": 2400.00
        }
        
        response = requests.post(f"{BASE_URL}/api/kiosk/admin/tenants", json=tenant_data, headers=self.headers)
        assert response.status_code == 200, f"Create tenant failed: {response.text}"
        
        result = response.json()
        assert "tenant_id" in result
        # lease_id should be None or not present when no dates provided
        lease_id = result.get("lease_id")
        assert lease_id is None, f"lease_id should be None when no dates provided, got: {lease_id}"
        
        self.created_tenant_id = result["tenant_id"]
        print(f"✓ Tenant created without lease (lease_id is None)")
    
    def test_create_tenant_with_only_start_date_no_lease(self):
        """Test that providing only start_date (no end_date) does NOT create a lease"""
        if not self.available_apt:
            pytest.skip("No available apartment for testing")
        
        start_date = datetime.now().strftime("%Y-%m-%d")
        
        tenant_data = {
            "name": "TEST_PartialDate_Tenant",
            "apartment_id": self.available_apt["apartment_id"],
            "monthly_rent": 1000.00,
            "lease_start_date": start_date
            # No lease_end_date
        }
        
        response = requests.post(f"{BASE_URL}/api/kiosk/admin/tenants", json=tenant_data, headers=self.headers)
        assert response.status_code == 200, f"Create tenant failed: {response.text}"
        
        result = response.json()
        lease_id = result.get("lease_id")
        assert lease_id is None, "lease_id should be None when only start_date provided"
        
        self.created_tenant_id = result["tenant_id"]
        print(f"✓ Tenant created without lease (only start_date provided)")


class TestLeaseExpiryWarnings:
    """Test dashboard warnings for expiring/expired leases"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": "test1774285001@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_get_leases_returns_dates_for_expiry_check(self):
        """Test that GET /admin/leases returns end_date for frontend expiry check"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/leases", headers=self.headers)
        assert response.status_code == 200
        
        leases = response.json()
        if len(leases) > 0:
            lease = leases[0]
            assert "end_date" in lease, "Lease should have end_date field"
            assert "start_date" in lease, "Lease should have start_date field"
            assert "tenant_name" in lease, "Lease should have tenant_name field"
            assert "status" in lease, "Lease should have status field"
            print(f"✓ Lease data structure verified: {lease.get('tenant_name')} ends {lease.get('end_date')}")
        else:
            print("✓ No leases found, but endpoint works correctly")
    
    def test_dashboard_returns_data_for_warnings(self):
        """Test that dashboard endpoint returns data needed for warnings"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total_apartments" in data
        assert "total_tenants" in data
        print(f"✓ Dashboard data: {data['total_apartments']} apartments, {data['total_tenants']} tenants")


class TestExistingLeaseCRUD:
    """Test that existing lease CRUD still works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": "test1774285001@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get tenants for lease creation
        tenants_response = requests.get(f"{BASE_URL}/api/kiosk/admin/tenants", headers=self.headers)
        self.tenants = [t for t in tenants_response.json() if t.get("status") == "active"]
        
        yield
        
        # Cleanup
        if hasattr(self, 'created_lease_id'):
            requests.delete(f"{BASE_URL}/api/kiosk/admin/leases/{self.created_lease_id}", headers=self.headers)
    
    def test_create_lease_directly(self):
        """Test creating lease via POST /admin/leases still works"""
        if not self.tenants:
            pytest.skip("No active tenants for testing")
        
        tenant = self.tenants[0]
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")  # Expiring in 30 days
        
        lease_data = {
            "tenant_id": tenant["tenant_id"],
            "apartment_id": tenant["apartment_id"],
            "start_date": start_date,
            "end_date": end_date,
            "monthly_rent": tenant.get("monthly_rent", 1000),
            "voorwaarden": "TEST lease for CRUD verification"
        }
        
        response = requests.post(f"{BASE_URL}/api/kiosk/admin/leases", json=lease_data, headers=self.headers)
        assert response.status_code == 200, f"Create lease failed: {response.text}"
        
        result = response.json()
        assert "lease_id" in result
        self.created_lease_id = result["lease_id"]
        
        print(f"✓ Lease created directly: {result.get('tenant_name')} - {start_date} to {end_date}")
    
    def test_update_lease(self):
        """Test updating lease via PUT /admin/leases/{id}"""
        # First create a lease
        if not self.tenants:
            pytest.skip("No active tenants for testing")
        
        tenant = self.tenants[0]
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        create_response = requests.post(f"{BASE_URL}/api/kiosk/admin/leases", json={
            "tenant_id": tenant["tenant_id"],
            "apartment_id": tenant["apartment_id"],
            "start_date": start_date,
            "end_date": end_date,
            "monthly_rent": 1000
        }, headers=self.headers)
        
        assert create_response.status_code == 200
        lease_id = create_response.json()["lease_id"]
        self.created_lease_id = lease_id
        
        # Update the lease
        new_end_date = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        update_response = requests.put(f"{BASE_URL}/api/kiosk/admin/leases/{lease_id}", json={
            "end_date": new_end_date,
            "monthly_rent": 1200
        }, headers=self.headers)
        
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["end_date"] == new_end_date
        assert updated["monthly_rent"] == 1200
        
        print(f"✓ Lease updated: new end_date={new_end_date}, new rent=1200")
    
    def test_delete_lease(self):
        """Test deleting lease via DELETE /admin/leases/{id}"""
        if not self.tenants:
            pytest.skip("No active tenants for testing")
        
        tenant = self.tenants[0]
        
        # Create a lease to delete
        create_response = requests.post(f"{BASE_URL}/api/kiosk/admin/leases", json={
            "tenant_id": tenant["tenant_id"],
            "apartment_id": tenant["apartment_id"],
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "monthly_rent": 500
        }, headers=self.headers)
        
        assert create_response.status_code == 200
        lease_id = create_response.json()["lease_id"]
        
        # Delete the lease
        delete_response = requests.delete(f"{BASE_URL}/api/kiosk/admin/leases/{lease_id}", headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        leases_response = requests.get(f"{BASE_URL}/api/kiosk/admin/leases", headers=self.headers)
        leases = leases_response.json()
        lease_ids = [l["lease_id"] for l in leases]
        assert lease_id not in lease_ids, "Deleted lease should not be in list"
        
        print(f"✓ Lease deleted successfully")
    
    def test_lease_document_generation(self):
        """Test lease document generation still works"""
        # Get existing leases
        leases_response = requests.get(f"{BASE_URL}/api/kiosk/admin/leases", headers=self.headers)
        assert leases_response.status_code == 200
        leases = leases_response.json()
        
        if not leases:
            pytest.skip("No leases to test document generation")
        
        lease_id = leases[0]["lease_id"]
        
        # Get document
        doc_response = requests.get(f"{BASE_URL}/api/kiosk/admin/leases/{lease_id}/document?token={self.token}")
        assert doc_response.status_code == 200
        assert "text/html" in doc_response.headers.get("content-type", "")
        assert "HUUROVEREENKOMST" in doc_response.text
        
        print(f"✓ Lease document generated for lease {lease_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
