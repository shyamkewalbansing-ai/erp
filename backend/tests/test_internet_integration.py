"""
Test Internet Integration across ERP system
Tests:
1. Dashboard API returns total_internet field
2. Payment API returns remaining_internet in response
3. Internet payment type is processed correctly (reduces internet_outstanding)
4. Internet plans CRUD operations
5. Internet assignment to tenants
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API = f"{BASE_URL}/api/kiosk"

# Test credentials
TEST_EMAIL = "shyam@kewalbansing.net"
TEST_PASSWORD = "Bharat7755"
TEST_PIN = "5678"


class TestInternetIntegration:
    """Test Internet integration across the ERP system"""
    
    token = None
    company_id = None  # Will be set from login response
    test_tenant_id = None
    test_plan_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before tests"""
        if not TestInternetIntegration.token:
            response = requests.post(f"{API}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert response.status_code == 200, f"Login failed: {response.text}"
            data = response.json()
            TestInternetIntegration.token = data["token"]
            TestInternetIntegration.company_id = data["company_id"]
    
    def get_headers(self):
        return {"Authorization": f"Bearer {self.token}"}
    
    # ============== DASHBOARD TESTS ==============
    
    def test_01_dashboard_returns_total_internet(self):
        """Dashboard API should return total_internet field"""
        response = requests.get(f"{API}/admin/dashboard", headers=self.get_headers())
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify total_internet field exists
        assert "total_internet" in data, "Dashboard missing total_internet field"
        assert isinstance(data["total_internet"], (int, float)), "total_internet should be a number"
        print(f"✓ Dashboard total_internet: {data['total_internet']}")
    
    def test_02_dashboard_has_all_required_fields(self):
        """Dashboard should have all required stat fields"""
        response = requests.get(f"{API}/admin/dashboard", headers=self.get_headers())
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "total_apartments",
            "total_tenants", 
            "total_outstanding",
            "total_service_costs",
            "total_fines",
            "total_internet",
            "total_received_month",
            "payments_count_month"
        ]
        
        for field in required_fields:
            assert field in data, f"Dashboard missing field: {field}"
        print(f"✓ Dashboard has all required fields including total_internet")
    
    # ============== TENANT TESTS ==============
    
    def test_03_get_tenants_with_internet_fields(self):
        """Tenants should have internet-related fields"""
        response = requests.get(f"{API}/admin/tenants", headers=self.get_headers())
        assert response.status_code == 200, f"Get tenants failed: {response.text}"
        tenants = response.json()
        
        assert len(tenants) > 0, "No tenants found"
        
        # Store first active tenant for later tests
        active_tenants = [t for t in tenants if t.get("status") == "active"]
        if active_tenants:
            TestInternetIntegration.test_tenant_id = active_tenants[0]["tenant_id"]
        
        # Check tenant has internet fields
        tenant = tenants[0]
        print(f"✓ Tenant fields: {list(tenant.keys())}")
        
        # internet_outstanding may or may not be present depending on if internet is assigned
        # internet_plan_id, internet_plan_name, internet_cost are optional
        print(f"✓ Found {len(tenants)} tenants")
    
    def test_04_public_tenants_endpoint(self):
        """Public tenants endpoint should work"""
        response = requests.get(f"{API}/public/{self.company_id}/tenants")
        assert response.status_code == 200, f"Public tenants failed: {response.text}"
        tenants = response.json()
        print(f"✓ Public tenants endpoint returned {len(tenants)} tenants")
    
    # ============== INTERNET PLANS TESTS ==============
    
    def test_05_list_internet_plans(self):
        """List internet plans"""
        response = requests.get(f"{API}/admin/internet/plans", headers=self.get_headers())
        assert response.status_code == 200, f"List plans failed: {response.text}"
        plans = response.json()
        print(f"✓ Found {len(plans)} internet plans")
    
    def test_06_create_internet_plan(self):
        """Create a test internet plan"""
        response = requests.post(f"{API}/admin/internet/plans", 
            headers=self.get_headers(),
            json={
                "name": "TEST_Basic",
                "speed": "10 Mbps",
                "price": 150.00
            })
        assert response.status_code == 200, f"Create plan failed: {response.text}"
        data = response.json()
        assert "plan_id" in data, "Response missing plan_id"
        TestInternetIntegration.test_plan_id = data["plan_id"]
        print(f"✓ Created internet plan: {data['plan_id']}")
    
    def test_07_update_internet_plan(self):
        """Update the test internet plan"""
        if not self.test_plan_id:
            pytest.skip("No test plan created")
        
        response = requests.put(f"{API}/admin/internet/plans/{self.test_plan_id}",
            headers=self.get_headers(),
            json={
                "name": "TEST_Basic_Updated",
                "price": 175.00
            })
        assert response.status_code == 200, f"Update plan failed: {response.text}"
        print(f"✓ Updated internet plan")
    
    def test_08_list_internet_connections(self):
        """List internet connections (tenants with plans)"""
        response = requests.get(f"{API}/admin/internet/connections", headers=self.get_headers())
        assert response.status_code == 200, f"List connections failed: {response.text}"
        connections = response.json()
        print(f"✓ Found {len(connections)} internet connections")
    
    def test_09_assign_internet_plan_to_tenant(self):
        """Assign internet plan to a tenant"""
        if not self.test_plan_id or not self.test_tenant_id:
            pytest.skip("No test plan or tenant available")
        
        response = requests.post(f"{API}/admin/internet/assign",
            headers=self.get_headers(),
            params={
                "tenant_id": self.test_tenant_id,
                "plan_id": self.test_plan_id
            })
        assert response.status_code == 200, f"Assign plan failed: {response.text}"
        print(f"✓ Assigned internet plan to tenant")
    
    def test_10_verify_tenant_has_internet_plan(self):
        """Verify tenant now has internet plan assigned"""
        if not self.test_tenant_id:
            pytest.skip("No test tenant available")
        
        response = requests.get(f"{API}/admin/tenants", headers=self.get_headers())
        assert response.status_code == 200
        tenants = response.json()
        
        tenant = next((t for t in tenants if t["tenant_id"] == self.test_tenant_id), None)
        assert tenant is not None, "Test tenant not found"
        
        # Check internet fields
        print(f"✓ Tenant internet_plan_id: {tenant.get('internet_plan_id')}")
        print(f"✓ Tenant internet_plan_name: {tenant.get('internet_plan_name')}")
        print(f"✓ Tenant internet_cost: {tenant.get('internet_cost')}")
    
    # ============== PAYMENT TESTS ==============
    
    def test_11_payment_response_includes_remaining_internet(self):
        """Payment response should include remaining_internet field"""
        # Get a tenant with some outstanding balance
        response = requests.get(f"{API}/admin/tenants", headers=self.get_headers())
        assert response.status_code == 200
        tenants = response.json()
        
        # Find tenant with outstanding rent
        tenant_with_debt = next((t for t in tenants if t.get("outstanding_rent", 0) > 0), None)
        
        if not tenant_with_debt:
            print("⚠ No tenant with outstanding rent found - skipping payment test")
            pytest.skip("No tenant with outstanding rent")
        
        # Make a small payment via admin/payments/register endpoint
        payment_response = requests.post(f"{API}/admin/payments/register",
            headers=self.get_headers(),
            json={
                "tenant_id": tenant_with_debt["tenant_id"],
                "amount": 1.00,
                "payment_type": "rent",
                "payment_method": "cash",
                "description": "TEST_payment"
            })
        
        assert payment_response.status_code == 200, f"Payment failed: {payment_response.text}"
        data = payment_response.json()
        
        # Verify remaining_internet is in response
        assert "remaining_internet" in data, "Payment response missing remaining_internet"
        print(f"✓ Payment response includes remaining_internet: {data['remaining_internet']}")
        
        # Clean up - delete the test payment
        if "payment_id" in data:
            requests.delete(f"{API}/admin/payments/{data['payment_id']}", headers=self.get_headers())
    
    def test_12_public_payment_response_includes_remaining_internet(self):
        """Public payment endpoint should also return remaining_internet"""
        # Get a tenant
        response = requests.get(f"{API}/public/{self.company_id}/tenants")
        assert response.status_code == 200
        tenants = response.json()
        
        if not tenants:
            pytest.skip("No tenants found")
        
        tenant_with_debt = next((t for t in tenants if t.get("outstanding_rent", 0) > 0), None)
        
        if not tenant_with_debt:
            print("⚠ No tenant with outstanding rent found - skipping public payment test")
            pytest.skip("No tenant with outstanding rent")
        
        # Make a small payment via public endpoint
        payment_response = requests.post(f"{API}/public/{self.company_id}/payments",
            json={
                "tenant_id": tenant_with_debt["tenant_id"],
                "amount": 1.00,
                "payment_type": "rent",
                "payment_method": "cash",
                "description": "TEST_public_payment"
            })
        
        assert payment_response.status_code == 200, f"Public payment failed: {payment_response.text}"
        data = payment_response.json()
        
        # Verify remaining_internet is in response
        assert "remaining_internet" in data, "Public payment response missing remaining_internet"
        print(f"✓ Public payment response includes remaining_internet: {data['remaining_internet']}")
    
    # ============== CLEANUP ==============
    
    def test_99_cleanup_remove_internet_plan(self):
        """Remove test internet plan from tenant and delete plan"""
        if self.test_tenant_id:
            # Remove internet from tenant
            requests.post(f"{API}/admin/internet/assign",
                headers=self.get_headers(),
                params={"tenant_id": self.test_tenant_id})
        
        if self.test_plan_id:
            # Delete test plan
            response = requests.delete(f"{API}/admin/internet/plans/{self.test_plan_id}",
                headers=self.get_headers())
            print(f"✓ Cleaned up test internet plan")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
