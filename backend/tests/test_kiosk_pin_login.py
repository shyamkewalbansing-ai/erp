"""
Test Kiosk PIN Login Feature
Tests the POST /api/kiosk/auth/pin endpoint for PIN-based authentication
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://lease-sync.preview.emergentagent.com')

class TestKioskPinLogin:
    """Tests for PIN login on /vastgoed landing page"""
    
    def test_pin_login_valid_pin(self):
        """Test login with valid PIN (1234) returns company info and token"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/pin",
            json={"pin": "1234"},
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "company_id" in data, "Response should contain company_id"
        assert "name" in data, "Response should contain name"
        assert "email" in data, "Response should contain email"
        assert "token" in data, "Response should contain token"
        
        # Verify token is a non-empty string
        assert isinstance(data["token"], str), "Token should be a string"
        assert len(data["token"]) > 0, "Token should not be empty"
        
        # Verify company_id matches expected (Test Vastgoed BV)
        assert data["company_id"] == "95a0cd46-b374-4bda-9118-f1e2f6cb4835", "PIN 1234 should map to Test Vastgoed BV"
        assert data["name"] == "Test Vastgoed BV", "Company name should be Test Vastgoed BV"
        
        print(f"PASS - Valid PIN login returned: company_id={data['company_id']}, name={data['name']}")
    
    def test_pin_login_invalid_pin(self):
        """Test login with invalid PIN returns 401 error"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/pin",
            json={"pin": "9999"},
            headers={"Content-Type": "application/json"}
        )
        
        # Status code assertion
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        # Data assertion - verify error message
        data = response.json()
        assert "detail" in data, "Response should contain detail field"
        assert "Ongeldige PIN" in data["detail"], f"Error message should mention invalid PIN, got: {data['detail']}"
        
        print(f"PASS - Invalid PIN returned 401 with message: {data['detail']}")
    
    def test_pin_login_empty_pin(self):
        """Test login with empty PIN returns error"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/pin",
            json={"pin": ""},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 401 or 422 (validation error)
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}: {response.text}"
        
        print(f"PASS - Empty PIN returned {response.status_code}")
    
    def test_pin_login_short_pin(self):
        """Test login with PIN shorter than 4 digits"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/pin",
            json={"pin": "123"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 401 (invalid PIN)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        print(f"PASS - Short PIN returned 401")


class TestKioskCompanyPublicEndpoint:
    """Tests for public company endpoint that indicates if PIN is required"""
    
    def test_company_with_pin_shows_has_pin_true(self):
        """Test that company with PIN set shows has_pin: true"""
        company_id = "95a0cd46-b374-4bda-9118-f1e2f6cb4835"  # Test Vastgoed BV
        response = requests.get(f"{BASE_URL}/api/kiosk/public/{company_id}/company")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "has_pin" in data, "Response should contain has_pin field"
        assert data["has_pin"] == True, "Company with PIN should have has_pin: true"
        assert data["name"] == "Test Vastgoed BV", "Company name should match"
        
        print(f"PASS - Company {data['name']} has_pin={data['has_pin']}")
    
    def test_company_not_found(self):
        """Test that non-existent company returns 404"""
        response = requests.get(f"{BASE_URL}/api/kiosk/public/non-existent-id/company")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS - Non-existent company returns 404")


class TestKioskPinVerifyEndpoint:
    """Tests for PIN verification endpoint used by kiosk page"""
    
    def test_verify_pin_valid(self):
        """Test PIN verification with valid PIN"""
        company_id = "95a0cd46-b374-4bda-9118-f1e2f6cb4835"
        response = requests.post(
            f"{BASE_URL}/api/kiosk/public/{company_id}/verify-pin",
            json={"pin": "1234"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["valid"] == True, "Valid PIN should return valid: true"
        assert "token" in data, "Response should contain token for admin access"
        
        print(f"PASS - PIN verification successful: {data['message']}")
    
    def test_verify_pin_invalid(self):
        """Test PIN verification with invalid PIN"""
        company_id = "95a0cd46-b374-4bda-9118-f1e2f6cb4835"
        response = requests.post(
            f"{BASE_URL}/api/kiosk/public/{company_id}/verify-pin",
            json={"pin": "0000"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should contain detail field"
        
        print(f"PASS - Invalid PIN verification returned 401: {data['detail']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
