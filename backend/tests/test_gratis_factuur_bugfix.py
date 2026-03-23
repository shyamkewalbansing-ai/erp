"""
Test Suite for Gratis Factuur Bug Fixes
Tests: 
1. Klanten creation and listing
2. Bedrijfsgegevens auto-fill on invoice page
"""
import pytest
import requests
import os
import random
import string
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vastgoed-pay.preview.emergentagent.com').rstrip('/')
API_BASE = f"{BASE_URL}/api/invoice"

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"


def generate_unique_name():
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"TEST_Klant_{suffix}"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{API_BASE}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert data.get("success") == True
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers for requests"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestKlantenBugFix:
    """Test klanten creation and listing bug fix"""
    
    def test_login_works(self):
        """Verify login endpoint works"""
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert "user" in data
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_get_klanten_list(self, auth_headers):
        """Test getting klanten list"""
        response = requests.get(f"{API_BASE}/klanten", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} klanten")
    
    def test_create_klant_and_verify(self, auth_headers):
        """Test creating a new klant and verify it's returned in list"""
        klant_name = generate_unique_name()
        klant_email = f"test_{klant_name.lower()}@test.com"
        
        # Step 1: Create klant
        create_response = requests.post(
            f"{API_BASE}/klanten",
            headers=auth_headers,
            json={
                "naam": klant_name,
                "email": klant_email,
                "telefoon": "0612345678"
            }
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        create_data = create_response.json()
        assert create_data.get("success") == True
        assert "klant" in create_data
        assert create_data["klant"]["naam"] == klant_name
        assert "id" in create_data["klant"]
        
        created_klant_id = create_data["klant"]["id"]
        print(f"✓ Klant created: {klant_name} with ID: {created_klant_id}")
        
        # Step 2: Verify klant appears in list
        list_response = requests.get(f"{API_BASE}/klanten", headers=auth_headers)
        assert list_response.status_code == 200
        klanten_list = list_response.json()
        
        # Find the created klant in list
        found_klant = None
        for klant in klanten_list:
            if klant.get("id") == created_klant_id:
                found_klant = klant
                break
        
        assert found_klant is not None, f"Created klant {klant_name} not found in list!"
        assert found_klant["naam"] == klant_name
        print(f"✓ Klant found in list: {found_klant['naam']}")
        
        # Step 3: Verify via single GET
        single_response = requests.get(
            f"{API_BASE}/klanten/{created_klant_id}",
            headers=auth_headers
        )
        assert single_response.status_code == 200
        single_data = single_response.json()
        assert single_data["naam"] == klant_name
        print(f"✓ Klant verified via single GET")
        
        # Clean up - delete klant
        delete_response = requests.delete(
            f"{API_BASE}/klanten/{created_klant_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Klant deleted for cleanup")


class TestBedrijfsgegevensAutoFill:
    """Test bedrijfsgegevens auto-fill on invoice page"""
    
    def test_get_user_profile(self, auth_headers):
        """Test getting user profile with bedrijfsgegevens"""
        response = requests.get(f"{API_BASE}/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify profile has required fields
        assert "email" in data
        assert "bedrijfsnaam" in data
        assert data["email"] == TEST_EMAIL
        
        # Check bedrijfsgegevens fields exist
        expected_fields = [
            "bedrijfsnaam", "adres", "postcode", "plaats",
            "telefoon", "kvk_nummer", "btw_nummer",
            "bank_naam", "iban"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ User profile retrieved with all bedrijfsgegevens fields")
        print(f"  - bedrijfsnaam: {data.get('bedrijfsnaam', 'N/A')}")
        print(f"  - email: {data.get('email', 'N/A')}")
    
    def test_update_bedrijfsgegevens(self, auth_headers):
        """Test updating bedrijfsgegevens"""
        # Get current profile
        before_response = requests.get(f"{API_BASE}/auth/me", headers=auth_headers)
        before_data = before_response.json()
        
        # Update with test data
        update_data = {
            "adres": "Test Straat 123",
            "postcode": "12345",
            "plaats": "Test Stad",
            "telefoon": "0612345678",
            "bank_naam": "Test Bank",
            "iban": "NL00TEST0000000000"
        }
        
        update_response = requests.put(
            f"{API_BASE}/auth/profile",
            headers=auth_headers,
            json=update_data
        )
        
        assert update_response.status_code == 200
        result = update_response.json()
        assert result.get("success") == True
        
        # Verify update
        after_response = requests.get(f"{API_BASE}/auth/me", headers=auth_headers)
        after_data = after_response.json()
        
        assert after_data["adres"] == update_data["adres"]
        assert after_data["postcode"] == update_data["postcode"]
        assert after_data["plaats"] == update_data["plaats"]
        assert after_data["bank_naam"] == update_data["bank_naam"]
        
        print(f"✓ Bedrijfsgegevens updated successfully")
        
        # Restore original values
        restore_data = {
            "adres": before_data.get("adres", ""),
            "postcode": before_data.get("postcode", ""),
            "plaats": before_data.get("plaats", ""),
            "telefoon": before_data.get("telefoon", ""),
            "bank_naam": before_data.get("bank_naam", ""),
            "iban": before_data.get("iban", "")
        }
        requests.put(f"{API_BASE}/auth/profile", headers=auth_headers, json=restore_data)
        print(f"✓ Original values restored")


class TestKlantenInInvoiceDropdown:
    """Test klanten appearing in invoice dropdown"""
    
    def test_klanten_available_for_invoice(self, auth_headers):
        """Verify klanten are available for invoice creation"""
        # Create a test klant
        klant_name = generate_unique_name()
        create_response = requests.post(
            f"{API_BASE}/klanten",
            headers=auth_headers,
            json={"naam": klant_name}
        )
        
        assert create_response.status_code == 200
        klant_id = create_response.json()["klant"]["id"]
        
        # Verify klant exists in list
        list_response = requests.get(f"{API_BASE}/klanten", headers=auth_headers)
        assert list_response.status_code == 200
        klanten = list_response.json()
        
        klant_ids = [k["id"] for k in klanten]
        assert klant_id in klant_ids, "Created klant not found in list"
        
        print(f"✓ Klant {klant_name} available for invoice selection")
        
        # Clean up
        requests.delete(f"{API_BASE}/klanten/{klant_id}", headers=auth_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
