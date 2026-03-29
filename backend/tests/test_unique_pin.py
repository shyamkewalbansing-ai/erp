"""
Test Unique PIN Enforcement for Kiosk Settings
Tests the PUT /api/kiosk/auth/settings endpoint for duplicate PIN rejection
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://erp-vastgoed.preview.emergentagent.com')

class TestUniquePinEnforcement:
    """Tests for unique PIN enforcement on PUT /auth/settings"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for testnzf3ku@vastgoed.sr"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/login",
            json={"email": "testnzf3ku@vastgoed.sr", "password": "test123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    def test_duplicate_pin_rejected(self, auth_token):
        """Test that setting PIN 1234 (already used by Test Vastgoed BV) is rejected"""
        response = requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={"kiosk_pin": "1234"},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        
        # Should return 400 with duplicate PIN error
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        # Verify error message
        data = response.json()
        assert "detail" in data, "Response should contain detail field"
        assert "PIN code is al in gebruik" in data["detail"], f"Error should mention PIN in use, got: {data['detail']}"
        
        print(f"PASS - Duplicate PIN rejected with message: {data['detail']}")
    
    def test_same_company_can_keep_own_pin(self):
        """Test that a company can update settings without changing their own PIN"""
        # First login with Test Vastgoed BV (which has PIN 1234)
        login_response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/login",
            json={"email": "testnzf3ku@vastgoed.sr", "password": "test123"},
            headers={"Content-Type": "application/json"}
        )
        
        # Check if this is the company with PIN 1234
        if login_response.status_code != 200:
            pytest.skip("Could not login to test company")
        
        token = login_response.json().get("token")
        
        # Get current company info
        me_response = requests.get(
            f"{BASE_URL}/api/kiosk/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if me_response.status_code == 200:
            company_data = me_response.json()
            current_pin = company_data.get("kiosk_pin", "")
            print(f"Current company PIN: {current_pin}")
            
            # If this company has PIN 1234, try to update other settings without changing PIN
            if current_pin == "1234":
                # Update only name, not PIN
                update_response = requests.put(
                    f"{BASE_URL}/api/kiosk/auth/settings",
                    json={"stamp_company_name": "Test Vastgoed BV Updated"},
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {token}"
                    }
                )
                
                assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
                print("PASS - Company can update other settings without PIN conflict")
                
                # Revert the change
                requests.put(
                    f"{BASE_URL}/api/kiosk/auth/settings",
                    json={"stamp_company_name": "Test Vastgoed BV"},
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {token}"
                    }
                )
            else:
                print(f"INFO - This company doesn't have PIN 1234, skipping same-company test")
    
    def test_unique_pin_allowed(self, auth_token):
        """Test that setting a unique PIN (not used by others) is allowed"""
        # Try setting a unique PIN
        unique_pin = "9876"
        
        response = requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={"kiosk_pin": unique_pin},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )
        
        # Should succeed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS - Unique PIN {unique_pin} was accepted")
        
        # Verify the PIN was set
        me_response = requests.get(
            f"{BASE_URL}/api/kiosk/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if me_response.status_code == 200:
            data = me_response.json()
            assert data.get("kiosk_pin") == unique_pin, f"PIN should be {unique_pin}, got {data.get('kiosk_pin')}"
            print(f"PASS - PIN verified as {unique_pin}")
        
        # Clean up - remove the PIN
        requests.put(
            f"{BASE_URL}/api/kiosk/auth/settings",
            json={"kiosk_pin": ""},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {auth_token}"
            }
        )


class TestValidPinLogin:
    """Tests for valid PIN login flow"""
    
    def test_valid_pin_login_redirects(self):
        """Test that valid PIN (1234) login returns token and company info"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/pin",
            json={"pin": "1234"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "company_id" in data, "Response should contain company_id"
        assert "name" in data, "Response should contain name"
        
        print(f"PASS - Valid PIN login returned company: {data['name']}")


class TestPasswordLogin:
    """Tests for password login flow"""
    
    def test_password_login_works(self):
        """Test that password login still works correctly"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/login",
            json={"email": "testnzf3ku@vastgoed.sr", "password": "test123"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "company_id" in data, "Response should contain company_id"
        
        print(f"PASS - Password login works, company: {data.get('name')}")
    
    def test_invalid_password_rejected(self):
        """Test that invalid password is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/login",
            json={"email": "testnzf3ku@vastgoed.sr", "password": "wrongpassword"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS - Invalid password rejected with 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
