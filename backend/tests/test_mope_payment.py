"""
Test Mope Payment Integration for Vastgoed Kiosk
- Tests Mope enabled check endpoint
- Tests Mope checkout creation (mock mode)
- Tests Mope payment status polling with auto-transitions
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
COMPANY_ID = "ca1240d5-1c1c-41b4-9d88-0798fa7cb8c1"
TENANT_ID = "ee3aa6a4-dcaa-4fcf-b774-2716a7c3dc98"


class TestMopeEnabled:
    """Test Mope enabled check endpoint"""
    
    def test_mope_enabled_returns_true_when_configured(self):
        """GET /api/kiosk/public/{company_id}/mope/enabled should return enabled: true"""
        response = requests.get(f"{BASE_URL}/api/kiosk/public/{COMPANY_ID}/mope/enabled")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "enabled" in data, "Response should contain 'enabled' field"
        assert data["enabled"] == True, f"Mope should be enabled, got {data['enabled']}"
        print(f"✓ Mope enabled check passed: {data}")
    
    def test_mope_enabled_returns_false_for_invalid_company(self):
        """GET /api/kiosk/public/{invalid_company}/mope/enabled should return 404"""
        response = requests.get(f"{BASE_URL}/api/kiosk/public/invalid-company-id/mope/enabled")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid company returns 404")


class TestMopeCheckout:
    """Test Mope checkout creation endpoint"""
    
    def test_create_mope_checkout_mock_mode(self):
        """POST /api/kiosk/public/{company_id}/mope/checkout creates mock checkout"""
        payload = {
            "amount": 5000.0,
            "description": "Huurbetaling test",
            "tenant_id": TENANT_ID,
            "payment_type": "rent"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kiosk/public/{COMPANY_ID}/mope/checkout",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "payment_id" in data, "Response should contain 'payment_id'"
        assert "payment_url" in data, "Response should contain 'payment_url'"
        assert "order_id" in data, "Response should contain 'order_id'"
        assert "amount" in data, "Response should contain 'amount'"
        assert "mock" in data, "Response should contain 'mock' field for mock mode"
        
        # Verify values
        assert data["mock"] == True, "Should be in mock mode"
        assert data["amount"] == 5000.0, f"Amount should be 5000, got {data['amount']}"
        assert data["payment_url"].startswith("https://mope.sr/p/"), f"Payment URL should start with https://mope.sr/p/, got {data['payment_url']}"
        
        print(f"✓ Mock checkout created: payment_id={data['payment_id']}, url={data['payment_url']}")
        return data["payment_id"]
    
    def test_create_mope_checkout_invalid_company(self):
        """POST /api/kiosk/public/{invalid}/mope/checkout should return 404"""
        payload = {
            "amount": 100.0,
            "description": "Test",
            "tenant_id": "test-tenant",
            "payment_type": "rent"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/kiosk/public/invalid-company/mope/checkout",
            json=payload
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid company checkout returns 404")


class TestMopePaymentStatus:
    """Test Mope payment status polling with auto-transitions"""
    
    def test_mope_status_transitions(self):
        """Test mock payment status transitions: open -> scanned (8s) -> paid (12s)"""
        # First create a checkout
        payload = {
            "amount": 1000.0,
            "description": "Status transition test",
            "tenant_id": TENANT_ID,
            "payment_type": "rent"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/kiosk/public/{COMPANY_ID}/mope/checkout",
            json=payload
        )
        assert create_response.status_code == 200
        payment_id = create_response.json()["payment_id"]
        print(f"✓ Created checkout with payment_id: {payment_id}")
        
        # Check initial status (should be 'open')
        status_response = requests.get(
            f"{BASE_URL}/api/kiosk/public/{COMPANY_ID}/mope/status/{payment_id}"
        )
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert "status" in status_data, "Response should contain 'status'"
        initial_status = status_data["status"]
        print(f"✓ Initial status: {initial_status}")
        assert initial_status == "open", f"Initial status should be 'open', got {initial_status}"
        
        # Wait 9 seconds and check for 'scanned' status
        print("  Waiting 9 seconds for 'scanned' status...")
        time.sleep(9)
        
        status_response = requests.get(
            f"{BASE_URL}/api/kiosk/public/{COMPANY_ID}/mope/status/{payment_id}"
        )
        assert status_response.status_code == 200
        status_data = status_response.json()
        scanned_status = status_data["status"]
        print(f"✓ Status after 9s: {scanned_status}")
        assert scanned_status == "scanned", f"Status should be 'scanned' after 9s, got {scanned_status}"
        
        # Wait 5 more seconds (total 14s) and check for 'paid' status
        print("  Waiting 5 more seconds for 'paid' status...")
        time.sleep(5)
        
        status_response = requests.get(
            f"{BASE_URL}/api/kiosk/public/{COMPANY_ID}/mope/status/{payment_id}"
        )
        assert status_response.status_code == 200
        status_data = status_response.json()
        paid_status = status_data["status"]
        print(f"✓ Status after 14s: {paid_status}")
        assert paid_status == "paid", f"Status should be 'paid' after 14s, got {paid_status}"
        
        print("✓ All status transitions verified: open -> scanned -> paid")
    
    def test_mope_status_invalid_payment_id(self):
        """GET /api/kiosk/public/{company}/mope/status/{invalid} should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/public/{COMPANY_ID}/mope/status/invalid-payment-id"
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid payment_id returns 404")


class TestMopeIntegrationFlow:
    """Test complete Mope payment flow"""
    
    def test_full_mope_payment_flow(self):
        """Test complete flow: check enabled -> create checkout -> poll until paid"""
        # Step 1: Check Mope is enabled
        enabled_response = requests.get(f"{BASE_URL}/api/kiosk/public/{COMPANY_ID}/mope/enabled")
        assert enabled_response.status_code == 200
        assert enabled_response.json()["enabled"] == True
        print("✓ Step 1: Mope is enabled")
        
        # Step 2: Create checkout
        checkout_response = requests.post(
            f"{BASE_URL}/api/kiosk/public/{COMPANY_ID}/mope/checkout",
            json={
                "amount": 500.0,
                "description": "Full flow test",
                "tenant_id": TENANT_ID,
                "payment_type": "rent"
            }
        )
        assert checkout_response.status_code == 200
        checkout_data = checkout_response.json()
        payment_id = checkout_data["payment_id"]
        payment_url = checkout_data["payment_url"]
        print(f"✓ Step 2: Checkout created - payment_id={payment_id}")
        print(f"  QR code URL: {payment_url}")
        
        # Step 3: Poll for payment status (simulate frontend polling)
        print("✓ Step 3: Polling for payment status...")
        max_polls = 10
        poll_interval = 2
        final_status = None
        
        for i in range(max_polls):
            status_response = requests.get(
                f"{BASE_URL}/api/kiosk/public/{COMPANY_ID}/mope/status/{payment_id}"
            )
            assert status_response.status_code == 200
            status = status_response.json()["status"]
            print(f"  Poll {i+1}: status = {status}")
            
            if status == "paid":
                final_status = status
                break
            
            time.sleep(poll_interval)
        
        assert final_status == "paid", f"Payment should complete with 'paid' status, got {final_status}"
        print("✓ Step 4: Payment completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
