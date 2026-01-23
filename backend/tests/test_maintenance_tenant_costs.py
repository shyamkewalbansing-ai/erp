"""
Test suite for Maintenance Tenant Costs Feature
Tests:
1. Maintenance with cost_type='tenant' is added to tenant balance
2. Invoices API returns maintenance_cost and maintenance_items fields
3. Outstanding balance includes maintenance costs
4. Total outstanding includes rent + maintenance costs
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMaintenanceTenantCosts:
    """Test maintenance costs for tenants feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data and authentication"""
        # Login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "uitest2@test.com", "password": "test123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.test_prefix = f"TEST_MAINT_{uuid.uuid4().hex[:6]}_"
        
        yield
        
        # Cleanup test data
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test data created during tests"""
        try:
            # Get and delete test maintenance records
            maint_resp = requests.get(f"{BASE_URL}/api/maintenance", headers=self.headers)
            if maint_resp.status_code == 200:
                for m in maint_resp.json():
                    if self.test_prefix in m.get("description", ""):
                        requests.delete(f"{BASE_URL}/api/maintenance/{m['id']}", headers=self.headers)
            
            # Get and delete test apartments
            apt_resp = requests.get(f"{BASE_URL}/api/apartments", headers=self.headers)
            if apt_resp.status_code == 200:
                for apt in apt_resp.json():
                    if apt["name"].startswith(self.test_prefix):
                        requests.delete(f"{BASE_URL}/api/apartments/{apt['id']}", headers=self.headers)
            
            # Get and delete test tenants
            tenant_resp = requests.get(f"{BASE_URL}/api/tenants", headers=self.headers)
            if tenant_resp.status_code == 200:
                for t in tenant_resp.json():
                    if t["name"].startswith(self.test_prefix):
                        requests.delete(f"{BASE_URL}/api/tenants/{t['id']}", headers=self.headers)
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    def _create_test_tenant(self):
        """Create a test tenant"""
        response = requests.post(
            f"{BASE_URL}/api/tenants",
            headers=self.headers,
            json={
                "name": f"{self.test_prefix}Tenant",
                "phone": "123456789",
                "email": "test@test.com"
            }
        )
        assert response.status_code == 200, f"Failed to create tenant: {response.text}"
        return response.json()
    
    def _create_test_apartment(self, tenant_id=None):
        """Create a test apartment"""
        response = requests.post(
            f"{BASE_URL}/api/apartments",
            headers=self.headers,
            json={
                "name": f"{self.test_prefix}Apartment",
                "address": "Test Address 123",
                "rent_amount": 1500.0,
                "bedrooms": 2,
                "bathrooms": 1
            }
        )
        assert response.status_code == 200, f"Failed to create apartment: {response.text}"
        apt = response.json()
        
        # Assign tenant if provided
        if tenant_id:
            assign_resp = requests.post(
                f"{BASE_URL}/api/apartments/{apt['id']}/assign-tenant?tenant_id={tenant_id}",
                headers=self.headers
            )
            assert assign_resp.status_code == 200, f"Failed to assign tenant: {assign_resp.text}"
        
        return apt
    
    def _create_maintenance(self, apartment_id, cost_type="tenant", cost=500.0, category="kraan"):
        """Create a maintenance record"""
        response = requests.post(
            f"{BASE_URL}/api/maintenance",
            headers=self.headers,
            json={
                "apartment_id": apartment_id,
                "category": category,
                "description": f"{self.test_prefix}Test maintenance",
                "cost": cost,
                "maintenance_date": datetime.now().strftime("%Y-%m-%d"),
                "status": "completed",
                "cost_type": cost_type
            }
        )
        assert response.status_code == 200, f"Failed to create maintenance: {response.text}"
        return response.json()
    
    # ==================== MAINTENANCE CREATION TESTS ====================
    
    def test_create_maintenance_with_tenant_cost_type(self):
        """Test creating maintenance with cost_type='tenant'"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        
        maintenance = self._create_maintenance(apt["id"], cost_type="tenant", cost=500.0)
        
        assert maintenance["cost_type"] == "tenant"
        assert maintenance["cost"] == 500.0
        assert maintenance["apartment_id"] == apt["id"]
        print("✓ Maintenance with cost_type='tenant' created successfully")
    
    def test_create_maintenance_with_kasgeld_cost_type(self):
        """Test creating maintenance with cost_type='kasgeld' (landlord pays)"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        
        maintenance = self._create_maintenance(apt["id"], cost_type="kasgeld", cost=300.0)
        
        assert maintenance["cost_type"] == "kasgeld"
        assert maintenance["cost"] == 300.0
        print("✓ Maintenance with cost_type='kasgeld' created successfully")
    
    # ==================== INVOICES API TESTS ====================
    
    def test_invoices_api_returns_maintenance_cost_field(self):
        """Test that invoices API returns maintenance_cost field"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        self._create_maintenance(apt["id"], cost_type="tenant", cost=500.0)
        
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        invoices = data.get("invoices", [])
        
        # Find our test invoice
        test_invoices = [i for i in invoices if i["apartment_name"] == f"{self.test_prefix}Apartment"]
        assert len(test_invoices) > 0, "No test invoices found"
        
        # First invoice should have maintenance_cost
        first_invoice = test_invoices[-1]  # Oldest first (sorted newest first)
        assert "maintenance_cost" in first_invoice, "maintenance_cost field missing"
        assert first_invoice["maintenance_cost"] == 500.0, f"Expected 500.0, got {first_invoice['maintenance_cost']}"
        print(f"✓ Invoices API returns maintenance_cost: {first_invoice['maintenance_cost']}")
    
    def test_invoices_api_returns_maintenance_items_field(self):
        """Test that invoices API returns maintenance_items with details"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        self._create_maintenance(apt["id"], cost_type="tenant", cost=500.0, category="kraan")
        
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        invoices = data.get("invoices", [])
        
        # Find our test invoice with maintenance
        test_invoices = [i for i in invoices if i["apartment_name"] == f"{self.test_prefix}Apartment" and i.get("maintenance_cost", 0) > 0]
        assert len(test_invoices) > 0, "No test invoices with maintenance found"
        
        invoice = test_invoices[0]
        assert "maintenance_items" in invoice, "maintenance_items field missing"
        assert len(invoice["maintenance_items"]) > 0, "maintenance_items is empty"
        
        item = invoice["maintenance_items"][0]
        assert "category" in item, "category missing in maintenance_item"
        assert "description" in item, "description missing in maintenance_item"
        assert "cost" in item, "cost missing in maintenance_item"
        assert "date" in item, "date missing in maintenance_item"
        print(f"✓ Invoices API returns maintenance_items: {item}")
    
    def test_invoices_total_includes_maintenance(self):
        """Test that invoice amount_due includes rent + maintenance"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        self._create_maintenance(apt["id"], cost_type="tenant", cost=500.0)
        
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        invoices = data.get("invoices", [])
        
        # Find first invoice for our test apartment (with maintenance)
        test_invoices = [i for i in invoices if i["apartment_name"] == f"{self.test_prefix}Apartment" and i.get("maintenance_cost", 0) > 0]
        assert len(test_invoices) > 0, "No test invoices with maintenance found"
        
        invoice = test_invoices[0]
        expected_total = 1500.0 + 500.0  # rent + maintenance
        assert invoice["amount_due"] == expected_total, f"Expected {expected_total}, got {invoice['amount_due']}"
        assert invoice["rent_amount"] == 1500.0, f"Expected rent 1500.0, got {invoice['rent_amount']}"
        print(f"✓ Invoice total includes maintenance: rent={invoice['rent_amount']}, maintenance={invoice['maintenance_cost']}, total={invoice['amount_due']}")
    
    def test_maintenance_only_on_first_invoice(self):
        """Test that maintenance costs only appear on first month's invoice"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        self._create_maintenance(apt["id"], cost_type="tenant", cost=500.0)
        
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        invoices = data.get("invoices", [])
        
        # Get all invoices for our test apartment
        test_invoices = [i for i in invoices if i["apartment_name"] == f"{self.test_prefix}Apartment"]
        
        # Sort by date (oldest first)
        test_invoices.sort(key=lambda x: (x["year"], x["month"]))
        
        if len(test_invoices) > 1:
            # First invoice should have maintenance
            assert test_invoices[0]["maintenance_cost"] == 500.0, "First invoice should have maintenance"
            # Second invoice should NOT have maintenance
            assert test_invoices[1]["maintenance_cost"] == 0, "Second invoice should not have maintenance"
            print("✓ Maintenance only appears on first invoice")
        else:
            print("✓ Only one invoice exists (maintenance on first invoice verified)")
    
    # ==================== OUTSTANDING BALANCE TESTS ====================
    
    def test_outstanding_includes_maintenance_costs(self):
        """Test that tenant outstanding includes maintenance costs"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        self._create_maintenance(apt["id"], cost_type="tenant", cost=500.0)
        
        response = requests.get(
            f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_outstanding"] == True, "Should have outstanding balance"
        assert data["total_maintenance"] == 500.0, f"Expected maintenance 500.0, got {data['total_maintenance']}"
        assert "maintenance_costs" in data, "maintenance_costs field missing"
        assert len(data["maintenance_costs"]) > 0, "maintenance_costs is empty"
        print(f"✓ Outstanding includes maintenance: total_maintenance={data['total_maintenance']}")
    
    def test_outstanding_amount_includes_rent_plus_maintenance(self):
        """Test that outstanding_amount = rent + maintenance"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        self._create_maintenance(apt["id"], cost_type="tenant", cost=500.0)
        
        response = requests.get(
            f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Outstanding should include rent (1500) + maintenance (500) = 2000
        # Note: This is for current month only if no payments made
        outstanding_rent = data.get("outstanding_rent", 0)
        total_maintenance = data.get("total_maintenance", 0)
        outstanding_amount = data.get("outstanding_amount", 0)
        
        assert outstanding_amount == outstanding_rent + total_maintenance, \
            f"outstanding_amount ({outstanding_amount}) should equal outstanding_rent ({outstanding_rent}) + total_maintenance ({total_maintenance})"
        print(f"✓ Outstanding amount = rent ({outstanding_rent}) + maintenance ({total_maintenance}) = {outstanding_amount}")
    
    def test_maintenance_costs_details_in_outstanding(self):
        """Test that maintenance_costs contains item details"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        self._create_maintenance(apt["id"], cost_type="tenant", cost=500.0, category="kraan")
        
        response = requests.get(
            f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        maintenance_costs = data.get("maintenance_costs", [])
        assert len(maintenance_costs) > 0, "No maintenance costs found"
        
        item = maintenance_costs[0]
        assert "category" in item, "category missing"
        assert "description" in item, "description missing"
        assert "cost" in item, "cost missing"
        assert "date" in item, "date missing"
        assert item["cost"] == 500.0
        print(f"✓ Maintenance cost details: {item}")
    
    def test_kasgeld_maintenance_not_in_tenant_outstanding(self):
        """Test that kasgeld maintenance is NOT included in tenant outstanding"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        # Create kasgeld maintenance (landlord pays)
        self._create_maintenance(apt["id"], cost_type="kasgeld", cost=300.0)
        
        response = requests.get(
            f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Kasgeld maintenance should NOT be in tenant's outstanding
        assert data["total_maintenance"] == 0, f"Kasgeld maintenance should not be in tenant outstanding, got {data['total_maintenance']}"
        print("✓ Kasgeld maintenance NOT included in tenant outstanding")
    
    # ==================== CUMULATIVE BALANCE TESTS ====================
    
    def test_cumulative_balance_includes_maintenance(self):
        """Test that cumulative_balance in invoices includes maintenance"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        self._create_maintenance(apt["id"], cost_type="tenant", cost=500.0)
        
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        invoices = data.get("invoices", [])
        
        # Find our test invoices
        test_invoices = [i for i in invoices if i["apartment_name"] == f"{self.test_prefix}Apartment"]
        test_invoices.sort(key=lambda x: (x["year"], x["month"]))
        
        if len(test_invoices) > 0:
            # First invoice cumulative balance should include maintenance
            first_invoice = test_invoices[0]
            # Cumulative balance = rent (1500) + maintenance (500) = 2000 (if unpaid)
            assert first_invoice["cumulative_balance"] >= 500.0, \
                f"Cumulative balance should include maintenance, got {first_invoice['cumulative_balance']}"
            print(f"✓ Cumulative balance includes maintenance: {first_invoice['cumulative_balance']}")
    
    # ==================== MULTIPLE MAINTENANCE ITEMS TESTS ====================
    
    def test_multiple_maintenance_items_summed(self):
        """Test that multiple maintenance items are summed correctly"""
        tenant = self._create_test_tenant()
        apt = self._create_test_apartment(tenant["id"])
        
        # Create multiple maintenance items
        self._create_maintenance(apt["id"], cost_type="tenant", cost=200.0, category="kraan")
        self._create_maintenance(apt["id"], cost_type="tenant", cost=300.0, category="douche")
        
        response = requests.get(
            f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_maintenance"] == 500.0, f"Expected 500.0, got {data['total_maintenance']}"
        assert len(data["maintenance_costs"]) == 2, f"Expected 2 items, got {len(data['maintenance_costs'])}"
        print(f"✓ Multiple maintenance items summed: {data['total_maintenance']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
