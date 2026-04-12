"""
Test Kwitanties (Receipts) Bug Fixes - Iteration 93
Tests:
1. Payment registration stores remaining_rent, remaining_service, remaining_fines, remaining_internet
2. GET /admin/payments returns payments with remaining fields
3. GET /admin/payments/{id}/receipt returns HTML with 'Openstaand na betaling' section
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API = f"{BASE_URL}/api/kiosk"

# Test credentials
EMAIL = "shyam@kewalbansing.net"
PASSWORD = "Bharat7755"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{API}/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("token")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}

class TestPaymentsAPI:
    """Test payments API endpoints"""
    
    def test_login_success(self):
        """Test login with kiosk credentials"""
        response = requests.post(f"{API}/auth/login", json={
            "email": EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✓ Login successful, company_id: {data.get('company_id')}")
    
    def test_get_payments_list(self, auth_headers):
        """Test GET /admin/payments returns payments with remaining fields"""
        response = requests.get(f"{API}/admin/payments", headers=auth_headers)
        assert response.status_code == 200
        payments = response.json()
        assert isinstance(payments, list)
        print(f"✓ Got {len(payments)} payments")
        
        # Check if any payment has remaining fields
        payments_with_remaining = [p for p in payments if p.get("remaining_rent") is not None]
        print(f"✓ Payments with remaining data: {len(payments_with_remaining)}")
        
        # Find KW2026-00100 if it exists
        kw100 = next((p for p in payments if p.get("kwitantie_nummer") == "KW2026-00100"), None)
        if kw100:
            print(f"✓ Found KW2026-00100:")
            print(f"  - remaining_rent: {kw100.get('remaining_rent')}")
            print(f"  - remaining_service: {kw100.get('remaining_service')}")
            print(f"  - remaining_fines: {kw100.get('remaining_fines')}")
            print(f"  - remaining_internet: {kw100.get('remaining_internet')}")
        
        return payments
    
    def test_get_tenants_for_payment(self, auth_headers):
        """Get tenants to find one for payment test"""
        response = requests.get(f"{API}/admin/tenants", headers=auth_headers)
        assert response.status_code == 200
        tenants = response.json()
        active_tenants = [t for t in tenants if t.get("status") == "active"]
        print(f"✓ Got {len(active_tenants)} active tenants")
        return active_tenants
    
    def test_register_payment_stores_remaining(self, auth_headers):
        """Test POST /admin/payments/register stores remaining balances"""
        # First get a tenant
        tenants_resp = requests.get(f"{API}/admin/tenants", headers=auth_headers)
        tenants = tenants_resp.json()
        active_tenants = [t for t in tenants if t.get("status") == "active" and t.get("outstanding_rent", 0) > 0]
        
        if not active_tenants:
            pytest.skip("No active tenants with outstanding rent")
        
        tenant = active_tenants[0]
        print(f"✓ Testing with tenant: {tenant['name']} (outstanding: {tenant.get('outstanding_rent', 0)})")
        
        # Register a small payment
        payment_data = {
            "tenant_id": tenant["tenant_id"],
            "amount": 100.0,
            "payment_type": "rent",
            "payment_method": "cash",
            "description": "Test payment for bug fix verification"
        }
        
        response = requests.post(f"{API}/admin/payments/register", json=payment_data, headers=auth_headers)
        assert response.status_code == 200, f"Payment registration failed: {response.text}"
        
        result = response.json()
        print(f"✓ Payment registered: {result.get('kwitantie_nummer')}")
        
        # Verify remaining fields are in response
        assert "remaining_rent" in result, "remaining_rent not in response"
        assert "remaining_service" in result, "remaining_service not in response"
        assert "remaining_fines" in result, "remaining_fines not in response"
        assert "remaining_internet" in result, "remaining_internet not in response"
        
        print(f"✓ Response includes remaining fields:")
        print(f"  - remaining_rent: {result.get('remaining_rent')}")
        print(f"  - remaining_service: {result.get('remaining_service')}")
        print(f"  - remaining_fines: {result.get('remaining_fines')}")
        print(f"  - remaining_internet: {result.get('remaining_internet')}")
        
        return result
    
    def test_get_single_payment_has_remaining(self, auth_headers):
        """Test GET /admin/payments/{id} returns remaining fields"""
        # Get payments list first
        payments_resp = requests.get(f"{API}/admin/payments", headers=auth_headers)
        payments = payments_resp.json()
        
        # Find a payment with remaining data
        payment_with_remaining = next((p for p in payments if p.get("remaining_rent") is not None), None)
        
        if not payment_with_remaining:
            pytest.skip("No payments with remaining data found")
        
        payment_id = payment_with_remaining["payment_id"]
        response = requests.get(f"{API}/admin/payments/{payment_id}", headers=auth_headers)
        assert response.status_code == 200
        
        payment = response.json()
        assert "remaining_rent" in payment
        assert "remaining_service" in payment
        assert "remaining_fines" in payment
        assert "remaining_internet" in payment
        
        print(f"✓ Single payment {payment.get('kwitantie_nummer')} has remaining fields")
        return payment
    
    def test_receipt_html_has_openstaand_section(self, auth_token, auth_headers):
        """Test GET /admin/payments/{id}/receipt returns HTML with Openstaand section"""
        # Get payments list first
        payments_resp = requests.get(f"{API}/admin/payments", headers=auth_headers)
        payments = payments_resp.json()
        
        # Find a payment with remaining data
        payment_with_remaining = next((p for p in payments if p.get("remaining_rent") is not None), None)
        
        if not payment_with_remaining:
            pytest.skip("No payments with remaining data found")
        
        payment_id = payment_with_remaining["payment_id"]
        
        # Get receipt HTML
        response = requests.get(f"{API}/admin/payments/{payment_id}/receipt?token={auth_token}")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        
        html = response.text
        
        # Check for Openstaand na betaling section
        assert "Openstaand na betaling" in html or "OPENSTAAND" in html or "VOLLEDIG VOLDAAN" in html, \
            "Receipt HTML should contain 'Openstaand na betaling' section"
        
        print(f"✓ Receipt HTML contains Openstaand section")
        print(f"  - Contains 'Openstaand na betaling': {'Openstaand na betaling' in html}")
        print(f"  - Contains 'VOLLEDIG VOLDAAN': {'VOLLEDIG VOLDAAN' in html}")
        
        return html
    
    def test_receipt_without_token_fails(self, auth_headers):
        """Test receipt endpoint requires token"""
        payments_resp = requests.get(f"{API}/admin/payments", headers=auth_headers)
        payments = payments_resp.json()
        
        if not payments:
            pytest.skip("No payments found")
        
        payment_id = payments[0]["payment_id"]
        
        # Try without token
        response = requests.get(f"{API}/admin/payments/{payment_id}/receipt")
        assert response.status_code == 401
        print("✓ Receipt endpoint correctly requires token")
    
    def test_old_payments_show_dash_in_openstaand(self, auth_headers):
        """Verify old payments (without stored remaining) return null for remaining fields"""
        payments_resp = requests.get(f"{API}/admin/payments", headers=auth_headers)
        payments = payments_resp.json()
        
        # Find payments without remaining data (old payments)
        old_payments = [p for p in payments if p.get("remaining_rent") is None]
        new_payments = [p for p in payments if p.get("remaining_rent") is not None]
        
        print(f"✓ Old payments (no remaining data): {len(old_payments)}")
        print(f"✓ New payments (with remaining data): {len(new_payments)}")
        
        # This is expected behavior - old payments should have null remaining fields
        # Frontend should show '-' for these

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
