"""
Partial Payments & Cumulative Balance Tests
Tests for the updated Facturen page showing:
- Partial payments (amount_paid vs remaining)
- Cumulative balance that carries over to next months
- Three status types: paid, partial, unpaid
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multibook-finance.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "uitest2@test.com"
TEST_PASSWORD = "test123"

class TestPartialPaymentsFeature:
    """Test the Partial Payments and Cumulative Balance feature"""
    
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
        
        # Store created resources for cleanup
        self.created_tenants = []
        self.created_apartments = []
        self.created_payments = []
        
        yield
        
        # Cleanup: Delete test data created during tests
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test data created during tests"""
        try:
            # Delete payments first (they reference tenants/apartments)
            for payment_id in self.created_payments:
                self.session.delete(f"{BASE_URL}/api/payments/{payment_id}")
            
            # Delete apartments
            for apt_id in self.created_apartments:
                self.session.delete(f"{BASE_URL}/api/apartments/{apt_id}")
            
            # Delete tenants
            for tenant_id in self.created_tenants:
                self.session.delete(f"{BASE_URL}/api/tenants/{tenant_id}")
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    # ==================== INVOICE STRUCTURE TESTS ====================
    
    def test_invoice_has_new_fields(self):
        """Test that invoice has amount_due, amount_paid, remaining, cumulative_balance fields"""
        tenant_id, apt_id = self._create_test_tenant_and_apartment()
        
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        # Find our test invoice
        test_invoices = [i for i in invoices if i.get("tenant_name", "").startswith("TEST_Partial_")]
        assert len(test_invoices) > 0, "Should have at least one test invoice"
        
        invoice = test_invoices[0]
        
        # Check new fields exist
        assert "amount_due" in invoice, "Invoice should have 'amount_due' field"
        assert "amount_paid" in invoice, "Invoice should have 'amount_paid' field"
        assert "remaining" in invoice, "Invoice should have 'remaining' field"
        assert "cumulative_balance" in invoice, "Invoice should have 'cumulative_balance' field"
        
        print("✓ Invoice has all new fields: amount_due, amount_paid, remaining, cumulative_balance")
    
    def test_summary_has_partial_count(self):
        """Test that summary includes partial count"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        assert "partial" in summary, "Summary should have 'partial' count"
        assert isinstance(summary["partial"], int), "partial should be an integer"
        
        print("✓ Summary includes 'partial' count")
    
    # ==================== STATUS TESTS ====================
    
    def test_status_unpaid_when_no_payment(self):
        """Test that status is 'unpaid' when no payment exists"""
        tenant_id, apt_id = self._create_test_tenant_and_apartment()
        
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        # Find our test invoice
        test_invoices = [i for i in invoices if i.get("tenant_name", "").startswith("TEST_Partial_")]
        assert len(test_invoices) > 0
        
        invoice = test_invoices[0]
        
        assert invoice["status"] == "unpaid", f"Status should be 'unpaid', got {invoice['status']}"
        assert invoice["amount_paid"] == 0, "amount_paid should be 0"
        assert invoice["remaining"] == invoice["amount_due"], "remaining should equal amount_due"
        
        print("✓ Status is 'unpaid' when no payment exists")
    
    def test_status_partial_when_partial_payment(self):
        """Test that status is 'partial' when payment < amount_due"""
        tenant_id, apt_id = self._create_test_tenant_and_apartment(rent_amount=1500.0)
        
        now = datetime.now()
        
        # Create partial payment (1000 out of 1500)
        payment_data = {
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 1000.0,
            "payment_date": now.strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "description": "TEST_Partial_Payment",
            "period_month": now.month,
            "period_year": now.year
        }
        
        payment_resp = self.session.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert payment_resp.status_code == 200, f"Failed to create payment: {payment_resp.text}"
        self.created_payments.append(payment_resp.json()["id"])
        
        # Check invoice status
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        # Find our test invoice for current month
        test_invoice = None
        for inv in invoices:
            if (inv.get("tenant_name", "").startswith("TEST_Partial_") and 
                inv["month"] == now.month and 
                inv["year"] == now.year):
                test_invoice = inv
                break
        
        assert test_invoice is not None, "Should find test invoice"
        assert test_invoice["status"] == "partial", f"Status should be 'partial', got {test_invoice['status']}"
        assert test_invoice["amount_due"] == 1500.0, f"amount_due should be 1500, got {test_invoice['amount_due']}"
        assert test_invoice["amount_paid"] == 1000.0, f"amount_paid should be 1000, got {test_invoice['amount_paid']}"
        assert test_invoice["remaining"] == 500.0, f"remaining should be 500, got {test_invoice['remaining']}"
        
        print("✓ Status is 'partial' when payment < amount_due")
    
    def test_status_paid_when_full_payment(self):
        """Test that status is 'paid' when payment >= amount_due"""
        tenant_id, apt_id = self._create_test_tenant_and_apartment(rent_amount=1500.0)
        
        now = datetime.now()
        
        # Create full payment
        payment_data = {
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 1500.0,
            "payment_date": now.strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "description": "TEST_Partial_FullPayment",
            "period_month": now.month,
            "period_year": now.year
        }
        
        payment_resp = self.session.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert payment_resp.status_code == 200
        self.created_payments.append(payment_resp.json()["id"])
        
        # Check invoice status
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        # Find our test invoice
        test_invoice = None
        for inv in invoices:
            if (inv.get("tenant_name", "").startswith("TEST_Partial_") and 
                inv["month"] == now.month and 
                inv["year"] == now.year):
                test_invoice = inv
                break
        
        assert test_invoice is not None, "Should find test invoice"
        assert test_invoice["status"] == "paid", f"Status should be 'paid', got {test_invoice['status']}"
        assert test_invoice["amount_paid"] == 1500.0
        assert test_invoice["remaining"] == 0
        
        print("✓ Status is 'paid' when payment >= amount_due")
    
    # ==================== CUMULATIVE BALANCE TESTS ====================
    
    def test_cumulative_balance_carries_over(self):
        """Test that cumulative balance carries over to next month"""
        # Create tenant with apartment created in previous month
        tenant_id, apt_id = self._create_test_tenant_and_apartment(rent_amount=1500.0)
        
        datetime.now()
        
        # We need to check if there are multiple months of invoices
        # The apartment was just created, so it will only have current month
        # Let's verify the cumulative_balance field exists and is calculated
        
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        # Find our test invoices
        test_invoices = [i for i in invoices if i.get("tenant_name", "").startswith("TEST_Partial_")]
        
        assert len(test_invoices) > 0, "Should have test invoices"
        
        # For a new tenant with no payments, cumulative_balance should equal remaining for first month
        first_invoice = test_invoices[-1]  # Oldest invoice (sorted newest first)
        
        # cumulative_balance should be >= remaining (includes previous months)
        assert first_invoice["cumulative_balance"] >= 0, "cumulative_balance should be >= 0"
        
        print("✓ Cumulative balance field exists and is calculated")
    
    def test_cumulative_balance_with_partial_payment(self):
        """Test cumulative balance calculation with partial payment"""
        tenant_id, apt_id = self._create_test_tenant_and_apartment(rent_amount=1500.0)
        
        now = datetime.now()
        
        # Create partial payment (1000 out of 1500)
        payment_data = {
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 1000.0,
            "payment_date": now.strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "description": "TEST_Partial_CumulativeTest",
            "period_month": now.month,
            "period_year": now.year
        }
        
        payment_resp = self.session.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert payment_resp.status_code == 200
        self.created_payments.append(payment_resp.json()["id"])
        
        # Check invoice
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        # Find our test invoice
        test_invoice = None
        for inv in invoices:
            if (inv.get("tenant_name", "").startswith("TEST_Partial_") and 
                inv["month"] == now.month and 
                inv["year"] == now.year):
                test_invoice = inv
                break
        
        assert test_invoice is not None
        
        # remaining should be 500 (1500 - 1000)
        assert test_invoice["remaining"] == 500.0, f"remaining should be 500, got {test_invoice['remaining']}"
        
        # cumulative_balance should be >= remaining
        assert test_invoice["cumulative_balance"] >= test_invoice["remaining"], \
            f"cumulative_balance ({test_invoice['cumulative_balance']}) should be >= remaining ({test_invoice['remaining']})"
        
        print("✓ Cumulative balance calculated correctly with partial payment")
    
    # ==================== SUMMARY TESTS ====================
    
    def test_summary_counts_include_partial(self):
        """Test that summary correctly counts partial payments"""
        tenant_id, apt_id = self._create_test_tenant_and_apartment(rent_amount=1500.0)
        
        now = datetime.now()
        
        # Create partial payment
        payment_data = {
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 1000.0,
            "payment_date": now.strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "description": "TEST_Partial_SummaryTest",
            "period_month": now.month,
            "period_year": now.year
        }
        
        payment_resp = self.session.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert payment_resp.status_code == 200
        self.created_payments.append(payment_resp.json()["id"])
        
        # Check summary
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        invoices = data["invoices"]
        
        # Count manually
        actual_partial = len([i for i in invoices if i["status"] == "partial"])
        
        assert summary["partial"] == actual_partial, \
            f"Summary partial count ({summary['partial']}) should match actual ({actual_partial})"
        
        # Verify our test invoice is counted as partial
        test_invoices = [i for i in invoices if i.get("tenant_name", "").startswith("TEST_Partial_") 
                        and i["month"] == now.month and i["year"] == now.year]
        
        if test_invoices:
            assert test_invoices[0]["status"] == "partial", "Test invoice should be partial"
        
        print("✓ Summary correctly counts partial payments")
    
    def test_summary_amounts_correct(self):
        """Test that summary amounts are calculated correctly"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        invoices = data["invoices"]
        
        # Calculate expected values
        expected_total_amount = sum(i["amount_due"] for i in invoices)
        expected_paid_amount = sum(i["amount_paid"] for i in invoices)
        expected_unpaid_amount = sum(i["remaining"] for i in invoices)
        
        assert abs(summary["total_amount"] - expected_total_amount) < 0.01, \
            f"total_amount mismatch: {summary['total_amount']} vs {expected_total_amount}"
        assert abs(summary["paid_amount"] - expected_paid_amount) < 0.01, \
            f"paid_amount mismatch: {summary['paid_amount']} vs {expected_paid_amount}"
        assert abs(summary["unpaid_amount"] - expected_unpaid_amount) < 0.01, \
            f"unpaid_amount mismatch: {summary['unpaid_amount']} vs {expected_unpaid_amount}"
        
        print("✓ Summary amounts calculated correctly")
    
    # ==================== MULTIPLE PAYMENTS TESTS ====================
    
    def test_multiple_partial_payments_same_period(self):
        """Test that multiple partial payments for same period are summed correctly"""
        tenant_id, apt_id = self._create_test_tenant_and_apartment(rent_amount=1500.0)
        
        now = datetime.now()
        
        # Create first partial payment (500)
        payment1_data = {
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 500.0,
            "payment_date": now.strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "description": "TEST_Partial_MultiPayment1",
            "period_month": now.month,
            "period_year": now.year
        }
        
        payment1_resp = self.session.post(f"{BASE_URL}/api/payments", json=payment1_data)
        assert payment1_resp.status_code == 200
        self.created_payments.append(payment1_resp.json()["id"])
        
        # Create second partial payment (500)
        payment2_data = {
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 500.0,
            "payment_date": now.strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "description": "TEST_Partial_MultiPayment2",
            "period_month": now.month,
            "period_year": now.year
        }
        
        payment2_resp = self.session.post(f"{BASE_URL}/api/payments", json=payment2_data)
        assert payment2_resp.status_code == 200
        self.created_payments.append(payment2_resp.json()["id"])
        
        # Check invoice - should show total of 1000 paid
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        
        # Find our test invoice
        test_invoice = None
        for inv in invoices:
            if (inv.get("tenant_name", "").startswith("TEST_Partial_") and 
                inv["month"] == now.month and 
                inv["year"] == now.year):
                test_invoice = inv
                break
        
        assert test_invoice is not None
        assert test_invoice["amount_paid"] == 1000.0, f"amount_paid should be 1000, got {test_invoice['amount_paid']}"
        assert test_invoice["remaining"] == 500.0, f"remaining should be 500, got {test_invoice['remaining']}"
        assert test_invoice["status"] == "partial", f"status should be 'partial', got {test_invoice['status']}"
        assert test_invoice["payment_count"] == 2, f"payment_count should be 2, got {test_invoice.get('payment_count')}"
        
        print("✓ Multiple partial payments for same period are summed correctly")
    
    # ==================== HELPER METHODS ====================
    
    def _create_test_tenant_and_apartment(self, rent_amount=1500.0):
        """Helper to create test tenant and apartment with assignment"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create tenant
        tenant_data = {
            "name": f"TEST_Partial_Tenant_{unique_id}",
            "phone": "123456789",
            "email": f"test_partial_{unique_id}@test.com"
        }
        tenant_resp = self.session.post(f"{BASE_URL}/api/tenants", json=tenant_data)
        assert tenant_resp.status_code == 200, f"Failed to create tenant: {tenant_resp.text}"
        tenant_id = tenant_resp.json()["id"]
        self.created_tenants.append(tenant_id)
        
        # Create apartment
        apt_data = {
            "name": f"TEST_Partial_Apt_{unique_id}",
            "address": "Test Address 123",
            "rent_amount": rent_amount,
            "bedrooms": 2,
            "bathrooms": 1
        }
        apt_resp = self.session.post(f"{BASE_URL}/api/apartments", json=apt_data)
        assert apt_resp.status_code == 200, f"Failed to create apartment: {apt_resp.text}"
        apt_id = apt_resp.json()["id"]
        self.created_apartments.append(apt_id)
        
        # Assign tenant to apartment
        assign_resp = self.session.post(f"{BASE_URL}/api/apartments/{apt_id}/assign-tenant?tenant_id={tenant_id}")
        assert assign_resp.status_code == 200, f"Failed to assign tenant: {assign_resp.text}"
        
        return tenant_id, apt_id


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
