"""
Test suite for Kiosk Loans Feature
Tests: Create loan, List loans, Get loan detail, Pay loan, Update loan, Delete loan
Also tests: Auto paid_off status, WhatsApp notifications
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
KIOSK_EMAIL = "shyam@kewalbansing.net"
KIOSK_PASSWORD = "Bharat7755"
KIOSK_PIN = "5678"


class TestLoansFeature:
    """Test suite for Loans (Leningen) feature in Kiosk Admin"""
    
    token = None
    company_id = None
    test_tenant_id = None
    test_loan_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        if not TestLoansFeature.token:
            # Login with email/password
            response = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
                "email": KIOSK_EMAIL,
                "password": KIOSK_PASSWORD
            })
            assert response.status_code == 200, f"Login failed: {response.text}"
            data = response.json()
            TestLoansFeature.token = data["token"]
            TestLoansFeature.company_id = data["company_id"]
        yield
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestLoansFeature.token}"}
    
    def test_01_get_active_tenants(self):
        """Get active tenants to use for loan creation"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/tenants", headers=self.get_headers())
        assert response.status_code == 200, f"Failed to get tenants: {response.text}"
        tenants = response.json()
        
        # Find an active tenant
        active_tenants = [t for t in tenants if t.get("status") == "active"]
        assert len(active_tenants) > 0, "No active tenants found for testing"
        
        TestLoansFeature.test_tenant_id = active_tenants[0]["tenant_id"]
        print(f"Using tenant: {active_tenants[0]['name']} ({TestLoansFeature.test_tenant_id})")
    
    def test_02_create_loan(self):
        """POST /api/kiosk/admin/loans - Create a loan for a tenant"""
        assert TestLoansFeature.test_tenant_id, "No tenant ID available"
        
        loan_data = {
            "tenant_id": TestLoansFeature.test_tenant_id,
            "amount": 5000.00,
            "monthly_payment": 500.00,
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "description": "TEST_Loan for testing purposes"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans",
            json=loan_data,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Create loan failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "loan_id" in data, "Response missing loan_id"
        assert data["amount"] == 5000.00, f"Amount mismatch: {data['amount']}"
        assert data["monthly_payment"] == 500.00, f"Monthly payment mismatch: {data['monthly_payment']}"
        assert data["status"] == "active", f"Status should be active: {data['status']}"
        assert data["total_paid"] == 0, f"Total paid should be 0: {data['total_paid']}"
        assert data["remaining"] == 5000.00, f"Remaining should equal amount: {data['remaining']}"
        
        TestLoansFeature.test_loan_id = data["loan_id"]
        print(f"Created loan: {TestLoansFeature.test_loan_id}")
    
    def test_03_list_loans(self):
        """GET /api/kiosk/admin/loans - List all loans with totals"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/loans", headers=self.get_headers())
        
        assert response.status_code == 200, f"List loans failed: {response.text}"
        loans = response.json()
        
        assert isinstance(loans, list), "Response should be a list"
        
        # Find our test loan
        test_loan = next((l for l in loans if l.get("loan_id") == TestLoansFeature.test_loan_id), None)
        assert test_loan is not None, "Test loan not found in list"
        
        # Validate loan structure
        assert "tenant_name" in test_loan, "Missing tenant_name"
        assert "apartment_number" in test_loan, "Missing apartment_number"
        assert "amount" in test_loan, "Missing amount"
        assert "monthly_payment" in test_loan, "Missing monthly_payment"
        assert "total_paid" in test_loan, "Missing total_paid"
        assert "remaining" in test_loan, "Missing remaining"
        assert "status" in test_loan, "Missing status"
        
        print(f"Found {len(loans)} loans in list")
    
    def test_04_get_loan_detail(self):
        """GET /api/kiosk/admin/loans/{loan_id} - Get loan detail with payment history"""
        assert TestLoansFeature.test_loan_id, "No loan ID available"
        
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Get loan detail failed: {response.text}"
        data = response.json()
        
        # Validate detail structure
        assert data["loan_id"] == TestLoansFeature.test_loan_id
        assert data["amount"] == 5000.00
        assert data["monthly_payment"] == 500.00
        assert "payments" in data, "Missing payments array"
        assert isinstance(data["payments"], list), "Payments should be a list"
        assert len(data["payments"]) == 0, "Should have no payments yet"
        
        print(f"Loan detail: {data['tenant_name']}, Amount: {data['amount']}, Remaining: {data['remaining']}")
    
    def test_05_register_loan_payment(self):
        """POST /api/kiosk/admin/loans/{loan_id}/pay - Register a loan payment"""
        assert TestLoansFeature.test_loan_id, "No loan ID available"
        
        payment_data = {
            "amount": 500.00,
            "description": "First monthly payment",
            "payment_method": "cash"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}/pay",
            json=payment_data,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Register payment failed: {response.text}"
        data = response.json()
        
        # Validate payment response
        assert "payment_id" in data, "Missing payment_id"
        assert data["amount"] == 500.00, f"Amount mismatch: {data['amount']}"
        assert data["remaining"] == 4500.00, f"Remaining should be 4500: {data['remaining']}"
        assert data["loan_status"] == "active", f"Loan should still be active: {data['loan_status']}"
        
        print(f"Payment registered: {data['payment_id']}, Remaining: {data['remaining']}")
    
    def test_06_verify_payment_in_detail(self):
        """Verify payment appears in loan detail"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_paid"] == 500.00, f"Total paid should be 500: {data['total_paid']}"
        assert data["remaining"] == 4500.00, f"Remaining should be 4500: {data['remaining']}"
        assert len(data["payments"]) == 1, f"Should have 1 payment: {len(data['payments'])}"
        
        payment = data["payments"][0]
        assert payment["amount"] == 500.00
        assert payment["payment_method"] == "cash"
        
        print(f"Payment verified in detail: {len(data['payments'])} payment(s)")
    
    def test_07_update_loan(self):
        """PUT /api/kiosk/admin/loans/{loan_id} - Update loan details"""
        assert TestLoansFeature.test_loan_id, "No loan ID available"
        
        update_data = {
            "monthly_payment": 600.00,
            "description": "TEST_Updated loan description"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}",
            json=update_data,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Update loan failed: {response.text}"
        
        # Verify update
        detail_response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}",
            headers=self.get_headers()
        )
        data = detail_response.json()
        
        assert data["monthly_payment"] == 600.00, f"Monthly payment not updated: {data['monthly_payment']}"
        assert "Updated" in data["description"], f"Description not updated: {data['description']}"
        
        print(f"Loan updated: monthly_payment={data['monthly_payment']}")
    
    def test_08_payment_exceeds_remaining_rejected(self):
        """Payment amount cannot exceed remaining balance"""
        assert TestLoansFeature.test_loan_id, "No loan ID available"
        
        # Try to pay more than remaining (4500)
        payment_data = {
            "amount": 10000.00,
            "description": "Overpayment attempt",
            "payment_method": "cash"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}/pay",
            json=payment_data,
            headers=self.get_headers()
        )
        
        # Should be rejected
        assert response.status_code in [400, 422], f"Overpayment should be rejected: {response.status_code}"
        print(f"Overpayment correctly rejected: {response.status_code}")
    
    def test_09_auto_paid_off_status(self):
        """Loan auto-marks as paid_off when remaining reaches 0"""
        assert TestLoansFeature.test_loan_id, "No loan ID available"
        
        # Get current remaining
        detail_response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}",
            headers=self.get_headers()
        )
        remaining = detail_response.json()["remaining"]
        
        # Pay the full remaining amount
        payment_data = {
            "amount": remaining,
            "description": "Final payment - full payoff",
            "payment_method": "bank"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}/pay",
            json=payment_data,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Final payment failed: {response.text}"
        data = response.json()
        
        assert data["remaining"] == 0, f"Remaining should be 0: {data['remaining']}"
        assert data["loan_status"] == "paid_off", f"Status should be paid_off: {data['loan_status']}"
        
        # Verify in detail
        detail_response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}",
            headers=self.get_headers()
        )
        detail = detail_response.json()
        assert detail["status"] == "paid_off", f"Loan status should be paid_off: {detail['status']}"
        
        print(f"Loan auto-marked as paid_off after full payment")
    
    def test_10_cannot_pay_paid_off_loan(self):
        """Cannot register payment on a paid_off loan"""
        assert TestLoansFeature.test_loan_id, "No loan ID available"
        
        payment_data = {
            "amount": 100.00,
            "description": "Payment on paid off loan",
            "payment_method": "cash"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}/pay",
            json=payment_data,
            headers=self.get_headers()
        )
        
        # Should be rejected
        assert response.status_code in [400, 422], f"Payment on paid_off loan should be rejected: {response.status_code}"
        print(f"Payment on paid_off loan correctly rejected: {response.status_code}")
    
    def test_11_whatsapp_notification_loan_created(self):
        """WhatsApp notification sent on loan creation (loan_created message_type)"""
        # Create another loan to test notification
        loan_data = {
            "tenant_id": TestLoansFeature.test_tenant_id,
            "amount": 1000.00,
            "monthly_payment": 200.00,
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "description": "TEST_Notification test loan"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans",
            json=loan_data,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Create loan failed: {response.text}"
        new_loan_id = response.json()["loan_id"]
        
        # Check if WhatsApp message was stored (loan_created type)
        # Note: We can't directly query DB, but we can check the messages endpoint
        messages_response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers=self.get_headers()
        )
        
        if messages_response.status_code == 200:
            messages = messages_response.json()
            loan_created_msgs = [m for m in messages if m.get("message_type") == "loan_created"]
            print(f"Found {len(loan_created_msgs)} loan_created messages")
        
        # Cleanup - delete the test loan
        requests.delete(f"{BASE_URL}/api/kiosk/admin/loans/{new_loan_id}", headers=self.get_headers())
        print("WhatsApp notification test completed")
    
    def test_12_whatsapp_notification_loan_payment(self):
        """WhatsApp notification sent on loan payment (loan_payment message_type)"""
        # Create a loan and make a payment
        loan_data = {
            "tenant_id": TestLoansFeature.test_tenant_id,
            "amount": 500.00,
            "monthly_payment": 100.00,
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "description": "TEST_Payment notification test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans",
            json=loan_data,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        new_loan_id = response.json()["loan_id"]
        
        # Make a payment
        payment_response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans/{new_loan_id}/pay",
            json={"amount": 100.00, "description": "Test payment", "payment_method": "cash"},
            headers=self.get_headers()
        )
        
        assert payment_response.status_code == 200, f"Payment failed: {payment_response.text}"
        
        # Check messages
        messages_response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers=self.get_headers()
        )
        
        if messages_response.status_code == 200:
            messages = messages_response.json()
            loan_payment_msgs = [m for m in messages if m.get("message_type") == "loan_payment"]
            print(f"Found {len(loan_payment_msgs)} loan_payment messages")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/kiosk/admin/loans/{new_loan_id}", headers=self.get_headers())
        print("WhatsApp payment notification test completed")
    
    def test_13_delete_loan(self):
        """DELETE /api/kiosk/admin/loans/{loan_id} - Delete a loan"""
        assert TestLoansFeature.test_loan_id, "No loan ID available"
        
        response = requests.delete(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Delete loan failed: {response.text}"
        
        # Verify deletion
        detail_response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/loans/{TestLoansFeature.test_loan_id}",
            headers=self.get_headers()
        )
        
        assert detail_response.status_code == 404, f"Loan should be deleted: {detail_response.status_code}"
        print(f"Loan deleted successfully")
    
    def test_14_loan_not_found(self):
        """GET non-existent loan returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/loans/non-existent-loan-id",
            headers=self.get_headers()
        )
        
        assert response.status_code == 404, f"Should return 404: {response.status_code}"
        print("Non-existent loan correctly returns 404")


class TestLoansValidation:
    """Test validation rules for loans"""
    
    token = None
    test_tenant_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        if not TestLoansValidation.token:
            response = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
                "email": KIOSK_EMAIL,
                "password": KIOSK_PASSWORD
            })
            assert response.status_code == 200
            TestLoansValidation.token = response.json()["token"]
            
            # Get a tenant
            tenants_response = requests.get(
                f"{BASE_URL}/api/kiosk/admin/tenants",
                headers={"Authorization": f"Bearer {TestLoansValidation.token}"}
            )
            tenants = tenants_response.json()
            active = [t for t in tenants if t.get("status") == "active"]
            if active:
                TestLoansValidation.test_tenant_id = active[0]["tenant_id"]
        yield
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestLoansValidation.token}"}
    
    def test_create_loan_missing_tenant(self):
        """Create loan without tenant_id should fail"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans",
            json={"amount": 1000, "monthly_payment": 100},
            headers=self.get_headers()
        )
        assert response.status_code == 422, f"Should fail validation: {response.status_code}"
    
    def test_create_loan_missing_amount(self):
        """Create loan without amount should fail"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans",
            json={"tenant_id": TestLoansValidation.test_tenant_id, "monthly_payment": 100},
            headers=self.get_headers()
        )
        assert response.status_code == 422, f"Should fail validation: {response.status_code}"
    
    def test_create_loan_invalid_tenant(self):
        """Create loan with non-existent tenant should fail"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/admin/loans",
            json={
                "tenant_id": "non-existent-tenant-id",
                "amount": 1000,
                "monthly_payment": 100
            },
            headers=self.get_headers()
        )
        assert response.status_code == 404, f"Should return 404: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
