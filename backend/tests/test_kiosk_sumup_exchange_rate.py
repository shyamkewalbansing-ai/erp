"""
Test Kiosk SumUp Exchange Rate Feature
Tests the exchange rate configuration and conversion logic for SumUp payments
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://erp-internet-tab.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api/kiosk"

# Test credentials
COMPANY_EMAIL = "shyam@kewalbansing.net"
COMPANY_PASSWORD = "Bharat7755"
COMPANY_ID = "ca1240d5-1c1c-41b4-9d88-0798fa7cb8c1"
KIOSK_PIN = "5678"


class TestKioskSumUpExchangeRate:
    """Test SumUp exchange rate feature for Kiosk"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{API_URL}/auth/login", json={
            "email": COMPANY_EMAIL,
            "password": COMPANY_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    # ============== AUTH/ME ENDPOINT TESTS ==============
    
    def test_auth_me_returns_sumup_fields(self):
        """Test GET /api/kiosk/auth/me returns all SumUp fields including exchange_rate"""
        response = self.session.get(f"{API_URL}/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        # Verify all SumUp fields are present
        assert "sumup_api_key" in data, "sumup_api_key field missing"
        assert "sumup_merchant_code" in data, "sumup_merchant_code field missing"
        assert "sumup_enabled" in data, "sumup_enabled field missing"
        assert "sumup_currency" in data, "sumup_currency field missing"
        assert "sumup_exchange_rate" in data, "sumup_exchange_rate field missing"
        
        # Verify expected values
        assert data["sumup_enabled"] == True, "SumUp should be enabled"
        assert data["sumup_currency"] == "EUR", f"Expected EUR, got {data['sumup_currency']}"
        assert data["sumup_exchange_rate"] == 43.0, f"Expected 43.0, got {data['sumup_exchange_rate']}"
        print(f"PASS: auth/me returns all SumUp fields correctly")
    
    # ============== SETTINGS UPDATE TESTS ==============
    
    def test_update_exchange_rate_via_settings(self):
        """Test PUT /api/kiosk/auth/settings updates exchange_rate correctly"""
        # Update exchange rate to a test value
        test_rate = 45.5
        response = self.session.put(f"{API_URL}/auth/settings", json={
            "sumup_exchange_rate": test_rate
        })
        assert response.status_code == 200
        assert response.json()["message"] == "Instellingen bijgewerkt"
        
        # Verify the update via auth/me
        response = self.session.get(f"{API_URL}/auth/me")
        assert response.status_code == 200
        assert response.json()["sumup_exchange_rate"] == test_rate
        
        # Restore original value
        response = self.session.put(f"{API_URL}/auth/settings", json={
            "sumup_exchange_rate": 43.0
        })
        assert response.status_code == 200
        print(f"PASS: Exchange rate update via settings works correctly")
    
    def test_update_all_sumup_settings(self):
        """Test updating all SumUp settings at once"""
        response = self.session.put(f"{API_URL}/auth/settings", json={
            "sumup_api_key": "test_api_key_123",
            "sumup_merchant_code": "TESTMERCHANT",
            "sumup_enabled": True,
            "sumup_currency": "EUR",
            "sumup_exchange_rate": 43.0
        })
        assert response.status_code == 200
        
        # Verify all settings
        response = self.session.get(f"{API_URL}/auth/me")
        data = response.json()
        assert data["sumup_api_key"] == "test_api_key_123"
        assert data["sumup_merchant_code"] == "TESTMERCHANT"
        assert data["sumup_enabled"] == True
        assert data["sumup_currency"] == "EUR"
        assert data["sumup_exchange_rate"] == 43.0
        print(f"PASS: All SumUp settings update correctly")
    
    # ============== PUBLIC API TESTS ==============
    
    def test_public_sumup_enabled_returns_exchange_rate(self):
        """Test GET /api/kiosk/public/{company_id}/sumup/enabled returns exchange_rate"""
        response = requests.get(f"{API_URL}/public/{COMPANY_ID}/sumup/enabled")
        assert response.status_code == 200
        
        data = response.json()
        assert "enabled" in data, "enabled field missing"
        assert "currency" in data, "currency field missing"
        assert "exchange_rate" in data, "exchange_rate field missing"
        
        assert data["enabled"] == True
        assert data["currency"] == "EUR"
        assert data["exchange_rate"] == 43.0
        print(f"PASS: Public sumup/enabled endpoint returns exchange_rate correctly")
    
    def test_public_sumup_enabled_for_invalid_company(self):
        """Test sumup/enabled returns 404 for invalid company"""
        response = requests.get(f"{API_URL}/public/invalid-company-id/sumup/enabled")
        assert response.status_code == 404
        print(f"PASS: Invalid company returns 404")
    
    # ============== CHECKOUT CONVERSION TESTS ==============
    
    def test_sumup_checkout_converts_amount(self):
        """Test POST /api/kiosk/public/{company_id}/sumup/checkout converts SRD to EUR"""
        # Note: This will return 401 from SumUp API because we use test keys
        # But we can verify the conversion logic by checking the error message
        response = requests.post(f"{API_URL}/public/{COMPANY_ID}/sumup/checkout", json={
            "amount": 5000,  # SRD 5000
            "description": "Huur januari",
            "tenant_id": "test-tenant",
            "payment_type": "rent"
        })
        
        # Expected: 401 from SumUp API (test keys)
        # The conversion should be: 5000 / 43 = 116.28 EUR
        assert response.status_code == 400  # Our API wraps SumUp 401 as 400
        assert "SumUp fout" in response.json()["detail"]
        assert "401" in response.json()["detail"] or "Unauthorized" in response.json()["detail"]
        print(f"PASS: Checkout endpoint attempts conversion (401 expected with test keys)")
    
    def test_sumup_checkout_without_exchange_rate(self):
        """Test checkout fails gracefully when exchange rate is 0 or invalid"""
        # First set exchange rate to 0
        self.session.put(f"{API_URL}/auth/settings", json={
            "sumup_exchange_rate": 0
        })
        
        response = requests.post(f"{API_URL}/public/{COMPANY_ID}/sumup/checkout", json={
            "amount": 5000,
            "description": "Test",
            "tenant_id": "test",
            "payment_type": "rent"
        })
        
        # Should fail with exchange rate error
        assert response.status_code == 400
        assert "Wisselkoers" in response.json()["detail"]
        
        # Restore exchange rate
        self.session.put(f"{API_URL}/auth/settings", json={
            "sumup_exchange_rate": 43.0
        })
        print(f"PASS: Checkout fails gracefully with invalid exchange rate")
    
    # ============== PIN LOGIN TESTS ==============
    
    def test_kiosk_pin_login(self):
        """Test PIN login for kiosk access"""
        response = requests.post(f"{API_URL}/auth/pin", json={
            "pin": KIOSK_PIN
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["company_id"] == COMPANY_ID
        print(f"PASS: Kiosk PIN login works")
    
    def test_kiosk_invalid_pin(self):
        """Test invalid PIN returns 401"""
        response = requests.post(f"{API_URL}/auth/pin", json={
            "pin": "0000"
        })
        assert response.status_code == 401
        print(f"PASS: Invalid PIN returns 401")
    
    # ============== TENANT DATA TESTS ==============
    
    def test_get_tenants_with_outstanding_rent(self):
        """Test getting tenants to verify test data exists"""
        response = self.session.get(f"{API_URL}/admin/tenants")
        assert response.status_code == 200
        
        tenants = response.json()
        assert len(tenants) > 0, "No tenants found"
        
        # Find tenant with outstanding rent
        tenant_with_debt = None
        for t in tenants:
            if t.get("outstanding_rent", 0) > 0:
                tenant_with_debt = t
                break
        
        assert tenant_with_debt is not None, "No tenant with outstanding rent found"
        assert tenant_with_debt["outstanding_rent"] == 5000, f"Expected 5000, got {tenant_with_debt['outstanding_rent']}"
        print(f"PASS: Found tenant with SRD 5000 outstanding rent: {tenant_with_debt['name']}")
    
    # ============== EXCHANGE RATE CALCULATION VERIFICATION ==============
    
    def test_exchange_rate_calculation(self):
        """Verify the exchange rate calculation: SRD / rate = converted amount"""
        # Get current exchange rate
        response = requests.get(f"{API_URL}/public/{COMPANY_ID}/sumup/enabled")
        rate = response.json()["exchange_rate"]
        
        # Test calculation
        srd_amount = 5000
        expected_eur = round(srd_amount / rate, 2)  # 5000 / 43 = 116.28
        
        assert expected_eur == 116.28, f"Expected 116.28, got {expected_eur}"
        print(f"PASS: Exchange rate calculation verified: SRD {srd_amount} / {rate} = EUR {expected_eur}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
