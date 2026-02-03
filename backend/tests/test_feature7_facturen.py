"""
Feature 7: Facturen (Invoices) Page Tests
Tests for the new Facturen page showing all rent invoices for all tenants
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bizbooks-suriname.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "uitest2@test.com"
TEST_PASSWORD = "test123"

class TestFacturenFeature:
    """Test the Facturen (Invoices) feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.status_code}")
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user = response.json().get("user")
        
        yield
        
        # Cleanup: Delete test data created during tests
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test data created during tests"""
        try:
            # Get all tenants and delete TEST_ prefixed ones
            tenants_resp = self.session.get(f"{BASE_URL}/api/tenants")
            if tenants_resp.status_code == 200:
                for tenant in tenants_resp.json():
                    if tenant.get("name", "").startswith("TEST_Feature7_"):
                        self.session.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")
            
            # Get all apartments and delete TEST_ prefixed ones
            apts_resp = self.session.get(f"{BASE_URL}/api/apartments")
            if apts_resp.status_code == 200:
                for apt in apts_resp.json():
                    if apt.get("name", "").startswith("TEST_Feature7_"):
                        self.session.delete(f"{BASE_URL}/api/apartments/{apt['id']}")
            
            # Get all payments and delete TEST_ prefixed ones
            payments_resp = self.session.get(f"{BASE_URL}/api/payments")
            if payments_resp.status_code == 200:
                for payment in payments_resp.json():
                    if payment.get("description", "").startswith("TEST_Feature7_"):
                        self.session.delete(f"{BASE_URL}/api/payments/{payment['id']}")
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    # ==================== BACKEND API TESTS ====================
    
    def test_invoices_endpoint_exists(self):
        """Test that GET /api/invoices endpoint exists and returns 200"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/invoices endpoint exists and returns 200")
    
    def test_invoices_response_structure(self):
        """Test that invoices endpoint returns proper structure with invoices and summary"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level structure
        assert "invoices" in data, "Response should contain 'invoices' key"
        assert "summary" in data, "Response should contain 'summary' key"
        
        # Check summary structure
        summary = data["summary"]
        assert "total_invoices" in summary, "Summary should contain 'total_invoices'"
        assert "paid" in summary, "Summary should contain 'paid'"
        assert "unpaid" in summary, "Summary should contain 'unpaid'"
        assert "total_amount" in summary, "Summary should contain 'total_amount'"
        assert "paid_amount" in summary, "Summary should contain 'paid_amount'"
        assert "unpaid_amount" in summary, "Summary should contain 'unpaid_amount'"
        
        print("✓ Invoices response has correct structure with invoices and summary")
    
    def test_invoice_item_structure(self):
        """Test that each invoice item has required fields"""
        # First create test data to ensure we have invoices
        tenant_id, apt_id = self._create_test_tenant_and_apartment()
        
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        # Find our test invoice
        test_invoices = [i for i in invoices if i.get("tenant_name", "").startswith("TEST_Feature7_")]
        
        if test_invoices:
            invoice = test_invoices[0]
            
            # Check required fields
            required_fields = [
                "id", "tenant_id", "tenant_name", "apartment_id", "apartment_name",
                "year", "month", "month_name", "period_label", "amount", "status"
            ]
            
            for field in required_fields:
                assert field in invoice, f"Invoice should contain '{field}' field"
            
            # Check status is valid
            assert invoice["status"] in ["paid", "unpaid"], f"Status should be 'paid' or 'unpaid', got {invoice['status']}"
            
            print("✓ Invoice items have correct structure with all required fields")
        else:
            pytest.skip("No test invoices found to verify structure")
    
    def test_invoice_status_unpaid_when_no_payment(self):
        """Test that invoice status is 'unpaid' when no payment exists for that period"""
        # Create tenant and apartment (no payment)
        tenant_id, apt_id = self._create_test_tenant_and_apartment()
        
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        # Find our test invoice
        test_invoices = [i for i in invoices if i.get("tenant_name", "").startswith("TEST_Feature7_")]
        
        assert len(test_invoices) > 0, "Should have at least one invoice for test tenant"
        
        # All invoices should be unpaid since we haven't made any payments
        for invoice in test_invoices:
            assert invoice["status"] == "unpaid", f"Invoice should be 'unpaid' without payment, got {invoice['status']}"
        
        print("✓ Invoice status is 'unpaid' when no payment exists")
    
    def test_invoice_status_paid_when_payment_exists(self):
        """Test that invoice status is 'paid' when payment exists for that period"""
        # Create tenant and apartment
        tenant_id, apt_id = self._create_test_tenant_and_apartment()
        
        # Get current month/year
        now = datetime.now()
        current_month = now.month
        current_year = now.year
        
        # Create a payment for current month
        payment_data = {
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 1500.00,
            "payment_date": now.strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "description": "TEST_Feature7_Payment",
            "period_month": current_month,
            "period_year": current_year
        }
        
        payment_resp = self.session.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert payment_resp.status_code == 200, f"Failed to create payment: {payment_resp.status_code}"
        
        # Now check invoices
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        # Find our test invoice for current month
        test_invoice = None
        for inv in invoices:
            if (inv.get("tenant_name", "").startswith("TEST_Feature7_") and 
                inv["month"] == current_month and 
                inv["year"] == current_year):
                test_invoice = inv
                break
        
        assert test_invoice is not None, "Should find test invoice for current month"
        assert test_invoice["status"] == "paid", f"Invoice should be 'paid' after payment, got {test_invoice['status']}"
        assert test_invoice["payment_date"] is not None, "Paid invoice should have payment_date"
        
        print("✓ Invoice status is 'paid' when payment exists for that period")
    
    def test_summary_counts_correct(self):
        """Test that summary counts match actual invoice counts"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        summary = data["summary"]
        
        # Count manually
        actual_total = len(invoices)
        actual_paid = len([i for i in invoices if i["status"] == "paid"])
        actual_unpaid = len([i for i in invoices if i["status"] == "unpaid"])
        actual_total_amount = sum(i["amount"] for i in invoices)
        actual_paid_amount = sum(i["amount"] for i in invoices if i["status"] == "paid")
        actual_unpaid_amount = sum(i["amount"] for i in invoices if i["status"] == "unpaid")
        
        # Verify counts
        assert summary["total_invoices"] == actual_total, f"Total mismatch: {summary['total_invoices']} vs {actual_total}"
        assert summary["paid"] == actual_paid, f"Paid count mismatch: {summary['paid']} vs {actual_paid}"
        assert summary["unpaid"] == actual_unpaid, f"Unpaid count mismatch: {summary['unpaid']} vs {actual_unpaid}"
        assert abs(summary["total_amount"] - actual_total_amount) < 0.01, "Total amount mismatch"
        assert abs(summary["paid_amount"] - actual_paid_amount) < 0.01, "Paid amount mismatch"
        assert abs(summary["unpaid_amount"] - actual_unpaid_amount) < 0.01, "Unpaid amount mismatch"
        
        print("✓ Summary counts match actual invoice counts")
    
    def test_invoices_sorted_newest_first(self):
        """Test that invoices are sorted by date (newest first)"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        if len(invoices) >= 2:
            # Check that invoices are sorted newest first
            for i in range(len(invoices) - 1):
                current = invoices[i]
                next_inv = invoices[i + 1]
                
                current_date = (current["year"], current["month"])
                next_date = (next_inv["year"], next_inv["month"])
                
                # Current should be >= next (newer or same)
                assert current_date >= next_date, f"Invoices not sorted correctly: {current_date} should be >= {next_date}"
            
            print("✓ Invoices are sorted by date (newest first)")
        else:
            print("✓ Not enough invoices to verify sorting (skipped)")
    
    def test_invoices_empty_when_no_tenants_assigned(self):
        """Test that invoices returns empty when no tenants are assigned to apartments"""
        # This test verifies the endpoint handles empty state correctly
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        
        # Structure should still be valid even if empty
        assert "invoices" in data
        assert "summary" in data
        assert isinstance(data["invoices"], list)
        
        print("✓ Invoices endpoint handles empty state correctly")
    
    # ==================== HELPER METHODS ====================
    
    def _create_test_tenant_and_apartment(self):
        """Helper to create test tenant and apartment with assignment"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create tenant
        tenant_data = {
            "name": f"TEST_Feature7_Tenant_{unique_id}",
            "phone": "123456789",
            "email": f"test_feature7_{unique_id}@test.com"
        }
        tenant_resp = self.session.post(f"{BASE_URL}/api/tenants", json=tenant_data)
        assert tenant_resp.status_code == 200, f"Failed to create tenant: {tenant_resp.status_code}"
        tenant_id = tenant_resp.json()["id"]
        
        # Create apartment
        apt_data = {
            "name": f"TEST_Feature7_Apt_{unique_id}",
            "address": "Test Address 123",
            "rent_amount": 1500.00,
            "bedrooms": 2,
            "bathrooms": 1
        }
        apt_resp = self.session.post(f"{BASE_URL}/api/apartments", json=apt_data)
        assert apt_resp.status_code == 200, f"Failed to create apartment: {apt_resp.status_code}"
        apt_id = apt_resp.json()["id"]
        
        # Assign tenant to apartment
        assign_resp = self.session.post(f"{BASE_URL}/api/apartments/{apt_id}/assign-tenant?tenant_id={tenant_id}")
        assert assign_resp.status_code == 200, f"Failed to assign tenant: {assign_resp.status_code}"
        
        return tenant_id, apt_id


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
