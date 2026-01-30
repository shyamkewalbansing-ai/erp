"""
Test Feature 6: Outstanding balance check when registering new payment
- GET /api/tenants/{tenant_id}/outstanding endpoint
- Returns outstanding months for a tenant
- Calculates unpaid months based on rent payments
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFeature6Outstanding:
    """Test Feature 6: Outstanding balance endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with test credentials from iteration_5
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "uitest2@test.com",
            "password": "test123"
        })
        
        if login_response.status_code != 200:
            # Try creating a new test user
            register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": "feature6test@test.com",
                "password": "test123",
                "name": "Feature 6 Test User"
            })
            if register_response.status_code == 200:
                token = register_response.json().get("access_token")
            else:
                pytest.skip("Could not authenticate - skipping tests")
        else:
            token = login_response.json().get("access_token")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Store created IDs for cleanup
        self.created_tenant_id = None
        self.created_apartment_id = None
        self.created_payment_ids = []
        
        yield
        
        # Cleanup
        for payment_id in self.created_payment_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/payments/{payment_id}")
            except Exception:
                pass
        
        if self.created_apartment_id:
            try:
                self.session.delete(f"{BASE_URL}/api/apartments/{self.created_apartment_id}")
            except Exception:
                pass
        
        if self.created_tenant_id:
            try:
                self.session.delete(f"{BASE_URL}/api/tenants/{self.created_tenant_id}")
            except Exception:
                pass
    
    def test_outstanding_endpoint_exists(self):
        """Test that the outstanding endpoint exists and returns proper structure"""
        # First create a tenant
        tenant_response = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Outstanding_Tenant",
            "phone": "123456789"
        })
        assert tenant_response.status_code == 200, f"Failed to create tenant: {tenant_response.text}"
        tenant_id = tenant_response.json()["id"]
        self.created_tenant_id = tenant_id
        
        # Call outstanding endpoint
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant_id}/outstanding")
        assert response.status_code == 200, f"Outstanding endpoint failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "tenant_id" in data
        assert "tenant_name" in data
        assert "has_outstanding" in data
        assert "outstanding_amount" in data
        assert "outstanding_months" in data
        assert data["tenant_id"] == tenant_id
        assert data["tenant_name"] == "TEST_Outstanding_Tenant"
    
    def test_outstanding_returns_empty_when_no_apartment(self):
        """Test that outstanding returns empty when tenant has no apartment"""
        # Create tenant without apartment
        tenant_response = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_NoApt_Tenant",
            "phone": "123456789"
        })
        assert tenant_response.status_code == 200
        tenant_id = tenant_response.json()["id"]
        self.created_tenant_id = tenant_id
        
        # Call outstanding endpoint
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant_id}/outstanding")
        assert response.status_code == 200
        
        data = response.json()
        assert not data["has_outstanding"]
        assert data["outstanding_amount"] == 0
        assert data["outstanding_months"] == []
        assert data["suggestion"] is None
    
    def test_outstanding_returns_unpaid_months(self):
        """Test that outstanding returns unpaid months when tenant has apartment but no payments"""
        # Create tenant
        tenant_response = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Unpaid_Tenant",
            "phone": "123456789"
        })
        assert tenant_response.status_code == 200
        tenant_id = tenant_response.json()["id"]
        self.created_tenant_id = tenant_id
        
        # Create apartment and assign tenant
        apt_response = self.session.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Unpaid_Apt",
            "address": "Test Address",
            "rent_amount": 1500.00
        })
        assert apt_response.status_code == 200
        apt_id = apt_response.json()["id"]
        self.created_apartment_id = apt_id
        
        # Assign tenant to apartment
        assign_response = self.session.post(f"{BASE_URL}/api/apartments/{apt_id}/assign-tenant?tenant_id={tenant_id}")
        assert assign_response.status_code == 200
        
        # Call outstanding endpoint
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant_id}/outstanding")
        assert response.status_code == 200
        
        data = response.json()
        # Should have at least current month as outstanding
        assert data["has_outstanding"]
        assert data["outstanding_amount"] > 0
        assert len(data["outstanding_months"]) >= 1
        assert data["rent_amount"] == 1500.00
        assert data["apartment_name"] == "TEST_Unpaid_Apt"
        
        # Verify outstanding month structure
        first_month = data["outstanding_months"][0]
        assert "year" in first_month
        assert "month" in first_month
        assert "month_name" in first_month
        assert "label" in first_month
        assert "amount" in first_month
    
    def test_outstanding_excludes_paid_months(self):
        """Test that outstanding excludes months that have been paid"""
        # Create tenant
        tenant_response = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Paid_Tenant",
            "phone": "123456789"
        })
        assert tenant_response.status_code == 200
        tenant_id = tenant_response.json()["id"]
        self.created_tenant_id = tenant_id
        
        # Create apartment and assign tenant
        apt_response = self.session.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Paid_Apt",
            "address": "Test Address",
            "rent_amount": 2000.00
        })
        assert apt_response.status_code == 200
        apt_id = apt_response.json()["id"]
        self.created_apartment_id = apt_id
        
        # Assign tenant to apartment
        assign_response = self.session.post(f"{BASE_URL}/api/apartments/{apt_id}/assign-tenant?tenant_id={tenant_id}")
        assert assign_response.status_code == 200
        
        # Get current month/year
        now = datetime.now()
        current_month = now.month
        current_year = now.year
        
        # Create a rent payment for current month
        payment_response = self.session.post(f"{BASE_URL}/api/payments", json={
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 2000.00,
            "payment_date": now.strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "period_month": current_month,
            "period_year": current_year
        })
        assert payment_response.status_code == 200
        self.created_payment_ids.append(payment_response.json()["id"])
        
        # Call outstanding endpoint
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant_id}/outstanding")
        assert response.status_code == 200
        
        data = response.json()
        
        # Current month should NOT be in outstanding list
        for month in data["outstanding_months"]:
            if month["year"] == current_year and month["month"] == current_month:
                pytest.fail(f"Current month {current_month}/{current_year} should not be in outstanding list after payment")
    
    def test_outstanding_returns_404_for_invalid_tenant(self):
        """Test that outstanding returns 404 for non-existent tenant"""
        response = self.session.get(f"{BASE_URL}/api/tenants/invalid-tenant-id-12345/outstanding")
        assert response.status_code == 404
    
    def test_outstanding_suggestion_message(self):
        """Test that outstanding returns a suggestion message when there are unpaid months"""
        # Create tenant
        tenant_response = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Suggestion_Tenant",
            "phone": "123456789"
        })
        assert tenant_response.status_code == 200
        tenant_id = tenant_response.json()["id"]
        self.created_tenant_id = tenant_id
        
        # Create apartment and assign tenant
        apt_response = self.session.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Suggestion_Apt",
            "address": "Test Address",
            "rent_amount": 1000.00
        })
        assert apt_response.status_code == 200
        apt_id = apt_response.json()["id"]
        self.created_apartment_id = apt_id
        
        # Assign tenant to apartment
        assign_response = self.session.post(f"{BASE_URL}/api/apartments/{apt_id}/assign-tenant?tenant_id={tenant_id}")
        assert assign_response.status_code == 200
        
        # Call outstanding endpoint
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant_id}/outstanding")
        assert response.status_code == 200
        
        data = response.json()
        
        if data["has_outstanding"]:
            # Should have a suggestion message
            assert data["suggestion"] is not None
            assert "openstaande maand" in data["suggestion"].lower()
            assert "SRD" in data["suggestion"]  # Should contain currency


class TestFeature6Integration:
    """Integration tests for Feature 6 - Outstanding balance in payment flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "uitest2@test.com",
            "password": "test123"
        })
        
        if login_response.status_code != 200:
            register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": "feature6int@test.com",
                "password": "test123",
                "name": "Feature 6 Integration Test"
            })
            if register_response.status_code == 200:
                token = register_response.json().get("access_token")
            else:
                pytest.skip("Could not authenticate")
        else:
            token = login_response.json().get("access_token")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        self.created_tenant_id = None
        self.created_apartment_id = None
        self.created_payment_ids = []
        
        yield
        
        # Cleanup
        for payment_id in self.created_payment_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/payments/{payment_id}")
            except Exception:
                pass
        
        if self.created_apartment_id:
            try:
                self.session.delete(f"{BASE_URL}/api/apartments/{self.created_apartment_id}")
            except Exception:
                pass
        
        if self.created_tenant_id:
            try:
                self.session.delete(f"{BASE_URL}/api/tenants/{self.created_tenant_id}")
            except Exception:
                pass
    
    def test_outstanding_oldest_month_first(self):
        """Test that outstanding months are sorted with oldest first"""
        # Create tenant
        tenant_response = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Sort_Tenant",
            "phone": "123456789"
        })
        assert tenant_response.status_code == 200
        tenant_id = tenant_response.json()["id"]
        self.created_tenant_id = tenant_id
        
        # Create apartment and assign tenant
        apt_response = self.session.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Sort_Apt",
            "address": "Test Address",
            "rent_amount": 1500.00
        })
        assert apt_response.status_code == 200
        apt_id = apt_response.json()["id"]
        self.created_apartment_id = apt_id
        
        # Assign tenant
        self.session.post(f"{BASE_URL}/api/apartments/{apt_id}/assign-tenant?tenant_id={tenant_id}")
        
        # Create payment for current month only (leaving previous months unpaid)
        now = datetime.now()
        payment_response = self.session.post(f"{BASE_URL}/api/payments", json={
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 1500.00,
            "payment_date": now.strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "period_month": now.month,
            "period_year": now.year
        })
        if payment_response.status_code == 200:
            self.created_payment_ids.append(payment_response.json()["id"])
        
        # Call outstanding endpoint
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant_id}/outstanding")
        assert response.status_code == 200
        
        data = response.json()
        
        # If there are multiple outstanding months, verify they are sorted oldest first
        if len(data["outstanding_months"]) > 1:
            for i in range(len(data["outstanding_months"]) - 1):
                current = data["outstanding_months"][i]
                next_month = data["outstanding_months"][i + 1]
                current_date = current["year"] * 100 + current["month"]
                next_date = next_month["year"] * 100 + next_month["month"]
                assert current_date <= next_date, "Outstanding months should be sorted oldest first"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
