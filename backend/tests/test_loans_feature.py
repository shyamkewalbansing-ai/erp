"""
Test suite for Leningen (Loans) feature
Tests:
- Create new loan
- View loans list with status
- Loan repayment via Payments
- Loan status updates (open -> partial -> paid)
- Tenant loans dropdown in Payments modal
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLoansFeature:
    """Test Leningen (Loans) feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with admin credentials
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@facturatie.sr",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup: Delete test data
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test data created during tests"""
        try:
            # Get all loans and delete TEST_ prefixed ones
            loans_resp = self.session.get(f"{BASE_URL}/api/loans")
            if loans_resp.status_code == 200:
                for loan in loans_resp.json():
                    if loan.get("description", "").startswith("TEST_"):
                        self.session.delete(f"{BASE_URL}/api/loans/{loan['id']}")
            
            # Get all tenants and delete TEST_ prefixed ones
            tenants_resp = self.session.get(f"{BASE_URL}/api/tenants")
            if tenants_resp.status_code == 200:
                for tenant in tenants_resp.json():
                    if tenant.get("name", "").startswith("TEST_"):
                        self.session.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")
            
            # Get all payments and delete TEST_ prefixed ones
            payments_resp = self.session.get(f"{BASE_URL}/api/payments")
            if payments_resp.status_code == 200:
                for payment in payments_resp.json():
                    if payment.get("description", "").startswith("TEST_"):
                        self.session.delete(f"{BASE_URL}/api/payments/{payment['id']}")
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    # ==================== GET /api/loans ====================
    def test_get_loans_endpoint_returns_200(self):
        """Test GET /api/loans returns 200"""
        response = self.session.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert isinstance(response.json(), list), "Response should be a list"
        print("✓ GET /api/loans returns 200 with list")
    
    def test_get_loans_returns_correct_structure(self):
        """Test GET /api/loans returns correct loan structure"""
        response = self.session.get(f"{BASE_URL}/api/loans")
        assert response.status_code == 200
        
        loans = response.json()
        if len(loans) > 0:
            loan = loans[0]
            required_fields = ["id", "tenant_id", "amount", "loan_date", "tenant_name", "amount_paid", "remaining", "status"]
            for field in required_fields:
                assert field in loan, f"Missing field: {field}"
            print(f"✓ Loan structure verified with fields: {list(loan.keys())}")
        else:
            print("✓ GET /api/loans returns empty list (no loans yet)")
    
    # ==================== POST /api/loans ====================
    def test_create_loan_success(self):
        """Test creating a new loan"""
        # First create a test tenant
        tenant_resp = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Loan_Tenant",
            "email": "test_loan_tenant@test.com",
            "phone": "123456789"
        })
        assert tenant_resp.status_code == 200, f"Failed to create tenant: {tenant_resp.text}"
        tenant_id = tenant_resp.json()["id"]
        
        # Create loan
        loan_data = {
            "tenant_id": tenant_id,
            "amount": 1000.00,
            "description": "TEST_Loan_Description",
            "loan_date": datetime.now().strftime("%Y-%m-%d")
        }
        response = self.session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        loan = response.json()
        assert loan["amount"] == 1000.00, f"Amount mismatch: {loan['amount']}"
        assert loan["status"] == "open", f"New loan should have status 'open', got: {loan['status']}"
        assert loan["amount_paid"] == 0, f"New loan should have amount_paid=0, got: {loan['amount_paid']}"
        assert loan["remaining"] == 1000.00, f"Remaining should equal amount, got: {loan['remaining']}"
        print(f"✓ Created loan with id={loan['id']}, status={loan['status']}")
    
    def test_create_loan_invalid_tenant(self):
        """Test creating loan with invalid tenant returns 404"""
        loan_data = {
            "tenant_id": "invalid-tenant-id",
            "amount": 500.00,
            "description": "TEST_Invalid_Tenant_Loan",
            "loan_date": datetime.now().strftime("%Y-%m-%d")
        }
        response = self.session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Create loan with invalid tenant returns 404")
    
    # ==================== PUT /api/loans/{loan_id} ====================
    def test_update_loan_success(self):
        """Test updating an existing loan"""
        # Create tenant and loan first
        tenant_resp = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Update_Loan_Tenant",
            "email": "test_update_loan@test.com",
            "phone": "123456789"
        })
        tenant_id = tenant_resp.json()["id"]
        
        loan_resp = self.session.post(f"{BASE_URL}/api/loans", json={
            "tenant_id": tenant_id,
            "amount": 500.00,
            "description": "TEST_Original_Description",
            "loan_date": datetime.now().strftime("%Y-%m-%d")
        })
        loan_id = loan_resp.json()["id"]
        
        # Update loan
        update_data = {
            "amount": 750.00,
            "description": "TEST_Updated_Description"
        }
        response = self.session.put(f"{BASE_URL}/api/loans/{loan_id}", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated_loan = response.json()
        assert updated_loan["amount"] == 750.00, f"Amount not updated: {updated_loan['amount']}"
        assert updated_loan["description"] == "TEST_Updated_Description"
        print(f"✓ Updated loan amount to {updated_loan['amount']}")
    
    # ==================== DELETE /api/loans/{loan_id} ====================
    def test_delete_loan_success(self):
        """Test deleting a loan"""
        # Create tenant and loan first
        tenant_resp = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Delete_Loan_Tenant",
            "email": "test_delete_loan@test.com",
            "phone": "123456789"
        })
        tenant_id = tenant_resp.json()["id"]
        
        loan_resp = self.session.post(f"{BASE_URL}/api/loans", json={
            "tenant_id": tenant_id,
            "amount": 300.00,
            "description": "TEST_To_Delete",
            "loan_date": datetime.now().strftime("%Y-%m-%d")
        })
        loan_id = loan_resp.json()["id"]
        
        # Delete loan
        response = self.session.delete(f"{BASE_URL}/api/loans/{loan_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify deletion
        get_resp = self.session.get(f"{BASE_URL}/api/loans")
        loans = get_resp.json()
        loan_ids = [loan_item["id"] for loan_item in loans]
        assert loan_id not in loan_ids, "Loan should be deleted"
        print(f"✓ Deleted loan {loan_id}")
    
    # ==================== GET /api/tenants/{tenant_id}/loans ====================
    def test_get_tenant_loans_endpoint(self):
        """Test GET /api/tenants/{tenant_id}/loans returns tenant's loans"""
        # Create tenant and loan
        tenant_resp = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Tenant_Loans_Endpoint",
            "email": "test_tenant_loans@test.com",
            "phone": "123456789"
        })
        tenant_id = tenant_resp.json()["id"]
        
        # Create two loans for this tenant
        for i in range(2):
            self.session.post(f"{BASE_URL}/api/loans", json={
                "tenant_id": tenant_id,
                "amount": 200.00 * (i + 1),
                "description": f"TEST_Tenant_Loan_{i}",
                "loan_date": datetime.now().strftime("%Y-%m-%d")
            })
        
        # Get tenant loans
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant_id}/loans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "loans" in data, "Response should have 'loans' field"
        assert "total_loans" in data, "Response should have 'total_loans' field"
        assert "total_paid" in data, "Response should have 'total_paid' field"
        assert "total_remaining" in data, "Response should have 'total_remaining' field"
        
        assert len(data["loans"]) >= 2, f"Expected at least 2 loans, got {len(data['loans'])}"
        print(f"✓ GET /api/tenants/{tenant_id}/loans returns {len(data['loans'])} loans")
    
    # ==================== Loan Status Updates ====================
    def test_loan_status_open_to_partial(self):
        """Test loan status changes from 'open' to 'partial' after partial payment"""
        # Create tenant, apartment, and loan
        tenant_resp = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Status_Partial_Tenant",
            "email": "test_status_partial@test.com",
            "phone": "123456789"
        })
        tenant_id = tenant_resp.json()["id"]
        
        apt_resp = self.session.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Status_Partial_Apt",
            "address": "Test Address",
            "rent_amount": 1000.00
        })
        apt_id = apt_resp.json()["id"]
        
        loan_resp = self.session.post(f"{BASE_URL}/api/loans", json={
            "tenant_id": tenant_id,
            "amount": 500.00,
            "description": "TEST_Status_Partial_Loan",
            "loan_date": datetime.now().strftime("%Y-%m-%d")
        })
        loan_id = loan_resp.json()["id"]
        assert loan_resp.json()["status"] == "open", "Initial status should be 'open'"
        
        # Make partial payment
        payment_resp = self.session.post(f"{BASE_URL}/api/payments", json={
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 200.00,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_type": "loan",
            "loan_id": loan_id,
            "description": "TEST_Partial_Payment"
        })
        assert payment_resp.status_code == 200, f"Payment failed: {payment_resp.text}"
        
        # Check loan status
        loans_resp = self.session.get(f"{BASE_URL}/api/loans")
        loans = loans_resp.json()
        loan = next((item for item in loans if item["id"] == loan_id), None)
        
        assert loan is not None, "Loan not found"
        assert loan["status"] == "partial", f"Expected status 'partial', got: {loan['status']}"
        assert loan["amount_paid"] == 200.00, f"Expected amount_paid=200, got: {loan['amount_paid']}"
        assert loan["remaining"] == 300.00, f"Expected remaining=300, got: {loan['remaining']}"
        print("✓ Loan status changed to 'partial' after partial payment")
    
    def test_loan_status_partial_to_paid(self):
        """Test loan status changes from 'partial' to 'paid' after full payment"""
        # Create tenant, apartment, and loan
        tenant_resp = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Status_Paid_Tenant",
            "email": "test_status_paid@test.com",
            "phone": "123456789"
        })
        tenant_id = tenant_resp.json()["id"]
        
        apt_resp = self.session.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Status_Paid_Apt",
            "address": "Test Address",
            "rent_amount": 1000.00
        })
        apt_id = apt_resp.json()["id"]
        
        loan_resp = self.session.post(f"{BASE_URL}/api/loans", json={
            "tenant_id": tenant_id,
            "amount": 400.00,
            "description": "TEST_Status_Paid_Loan",
            "loan_date": datetime.now().strftime("%Y-%m-%d")
        })
        loan_id = loan_resp.json()["id"]
        
        # Make first partial payment
        self.session.post(f"{BASE_URL}/api/payments", json={
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 200.00,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_type": "loan",
            "loan_id": loan_id,
            "description": "TEST_First_Payment"
        })
        
        # Make second payment to complete
        self.session.post(f"{BASE_URL}/api/payments", json={
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 200.00,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_type": "loan",
            "loan_id": loan_id,
            "description": "TEST_Second_Payment"
        })
        
        # Check loan status
        loans_resp = self.session.get(f"{BASE_URL}/api/loans")
        loans = loans_resp.json()
        loan = next((item for item in loans if item["id"] == loan_id), None)
        
        assert loan is not None, "Loan not found"
        assert loan["status"] == "paid", f"Expected status 'paid', got: {loan['status']}"
        assert loan["amount_paid"] == 400.00, f"Expected amount_paid=400, got: {loan['amount_paid']}"
        assert loan["remaining"] == 0, f"Expected remaining=0, got: {loan['remaining']}"
        print("✓ Loan status changed to 'paid' after full payment")
    
    # ==================== Tenant Loans in Payments ====================
    def test_tenant_loans_for_payment_dropdown(self):
        """Test that tenant loans endpoint returns open loans for payment dropdown"""
        # Create tenant with loans
        tenant_resp = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Dropdown_Tenant",
            "email": "test_dropdown@test.com",
            "phone": "123456789"
        })
        tenant_id = tenant_resp.json()["id"]
        
        # Create open loan
        self.session.post(f"{BASE_URL}/api/loans", json={
            "tenant_id": tenant_id,
            "amount": 600.00,
            "description": "TEST_Open_Loan",
            "loan_date": datetime.now().strftime("%Y-%m-%d")
        })
        
        # Get tenant loans
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant_id}/loans")
        assert response.status_code == 200
        
        data = response.json()
        loans = data["loans"]
        
        # Filter open loans (status != 'paid')
        open_loans = [item for item in loans if item["status"] != "paid"]
        assert len(open_loans) >= 1, "Should have at least 1 open loan"
        
        # Verify loan has required fields for dropdown
        loan = open_loans[0]
        assert "id" in loan, "Loan should have 'id'"
        assert "loan_date" in loan, "Loan should have 'loan_date'"
        assert "description" in loan, "Loan should have 'description'"
        assert "remaining" in loan, "Loan should have 'remaining'"
        print(f"✓ Tenant loans endpoint returns open loans for dropdown: {len(open_loans)} open loans")


class TestFacturenPage:
    """Test Facturen (Invoices) page API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with admin credentials
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@facturatie.sr",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
    
    def test_get_invoices_endpoint(self):
        """Test GET /api/invoices returns 200"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # API returns object with 'invoices' key
        assert "invoices" in data, "Response should have 'invoices' key"
        assert isinstance(data["invoices"], list), "invoices should be a list"
        print("✓ GET /api/invoices returns 200 with invoices list")
    
    def test_invoices_structure(self):
        """Test invoices have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data.get("invoices", [])
        if len(invoices) > 0:
            invoice = invoices[0]
            required_fields = ["tenant_id", "tenant_name", "apartment_name", "rent_amount", "amount_due", "status"]
            for field in required_fields:
                assert field in invoice, f"Missing field: {field}"
            print(f"✓ Invoice structure verified with fields: {list(invoice.keys())}")
        else:
            print("✓ GET /api/invoices returns empty invoices list")
    
    def test_invoices_summary(self):
        """Test invoices endpoint returns summary"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data, "Response should have 'summary' key"
        summary = data["summary"]
        required_summary_fields = ["total_amount", "paid_amount", "unpaid_amount"]
        for field in required_summary_fields:
            assert field in summary, f"Missing summary field: {field}"
        print(f"✓ Invoices summary verified: {summary}")


class TestLeningenSummaryCards:
    """Test Leningen page summary cards data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with admin credentials
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@facturatie.sr",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test data"""
        try:
            loans_resp = self.session.get(f"{BASE_URL}/api/loans")
            if loans_resp.status_code == 200:
                for loan in loans_resp.json():
                    if loan.get("description", "").startswith("TEST_"):
                        self.session.delete(f"{BASE_URL}/api/loans/{loan['id']}")
            
            tenants_resp = self.session.get(f"{BASE_URL}/api/tenants")
            if tenants_resp.status_code == 200:
                for tenant in tenants_resp.json():
                    if tenant.get("name", "").startswith("TEST_"):
                        self.session.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    def test_loans_summary_calculation(self):
        """Test that loans data can be used to calculate summary cards"""
        # Create tenant
        tenant_resp = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Summary_Tenant",
            "email": "test_summary@test.com",
            "phone": "123456789"
        })
        tenant_id = tenant_resp.json()["id"]
        
        # Create apartment for payments
        apt_resp = self.session.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Summary_Apt",
            "address": "Test Address",
            "rent_amount": 1000.00
        })
        apt_id = apt_resp.json()["id"]
        
        # Create loans with different statuses
        # Loan 1: Open (no payments)
        self.session.post(f"{BASE_URL}/api/loans", json={
            "tenant_id": tenant_id,
            "amount": 500.00,
            "description": "TEST_Summary_Open",
            "loan_date": datetime.now().strftime("%Y-%m-%d")
        })
        
        # Loan 2: Partial (some payment)
        loan2_resp = self.session.post(f"{BASE_URL}/api/loans", json={
            "tenant_id": tenant_id,
            "amount": 400.00,
            "description": "TEST_Summary_Partial",
            "loan_date": datetime.now().strftime("%Y-%m-%d")
        })
        loan2_id = loan2_resp.json()["id"]
        
        # Make partial payment on loan 2
        self.session.post(f"{BASE_URL}/api/payments", json={
            "tenant_id": tenant_id,
            "apartment_id": apt_id,
            "amount": 150.00,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_type": "loan",
            "loan_id": loan2_id,
            "description": "TEST_Summary_Payment"
        })
        
        # Get all loans
        loans_resp = self.session.get(f"{BASE_URL}/api/loans")
        assert loans_resp.status_code == 200
        
        loans = loans_resp.json()
        test_loans = [l for loan_item in loans if l.get("description", "").startswith("TEST_Summary")]
        
        # Calculate summary
        total_amount = sum(loan_item["amount"] for loan_item in test_loans)
        total_paid = sum(l["amount_paid"] for loan_item in test_loans)
        total_remaining = sum(loan_item["remaining"] for loan_item in test_loans)
        open_count = len([l for loan_item in test_loans if loan_item["status"] == "open"])
        partial_count = len([l for loan_item in test_loans if loan_item["status"] == "partial"])
        paid_count = len([l for loan_item in test_loans if loan_item["status"] == "paid"])
        
        assert total_amount == 900.00, f"Expected total=900, got: {total_amount}"
        assert total_paid == 150.00, f"Expected paid=150, got: {total_paid}"
        assert total_remaining == 750.00, f"Expected remaining=750, got: {total_remaining}"
        assert open_count == 1, f"Expected 1 open loan, got: {open_count}"
        assert partial_count == 1, f"Expected 1 partial loan, got: {partial_count}"
        
        print("✓ Summary cards data verified:")
        print(f"  - Total: {total_amount}")
        print(f"  - Paid: {total_paid}")
        print(f"  - Remaining: {total_remaining}")
        print(f"  - Open: {open_count}, Partial: {partial_count}, Paid: {paid_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
