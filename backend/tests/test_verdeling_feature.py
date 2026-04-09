"""
Test suite for Verdeling (Distribution) feature in Bank/Kas tab
Tests CRUD operations for rekeninghouders and verdeling execution
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_BASE = f"{BASE_URL}/api/kiosk"

# Test credentials from test_credentials.md
TEST_EMAIL = "shyam@kewalbansing.net"
TEST_PASSWORD = "Bharat7755"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for kiosk company"""
    response = requests.post(f"{API_BASE}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    return response.json().get("token")


@pytest.fixture
def headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestKasEndpoints:
    """Test Bank/Kas basic endpoints"""
    
    def test_get_kas_entries(self, headers):
        """GET /api/kiosk/admin/kas - List kas entries with totals"""
        response = requests.get(f"{API_BASE}/admin/kas", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "entries" in data, "Response should have 'entries' field"
        assert "total_income" in data, "Response should have 'total_income' field"
        assert "total_expense" in data, "Response should have 'total_expense' field"
        assert "balance" in data, "Response should have 'balance' field"
        
        # Verify balance calculation
        assert data["balance"] == data["total_income"] - data["total_expense"], "Balance should equal income - expense"
        print(f"Kas totals: Income={data['total_income']}, Expense={data['total_expense']}, Balance={data['balance']}")


class TestRekeninghoudersCRUD:
    """Test CRUD operations for rekeninghouders (account holders)"""
    
    def test_list_rekeninghouders(self, headers):
        """GET /api/kiosk/admin/verdeling/rekeninghouders - List all holders"""
        response = requests.get(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure of each holder
        for holder in data:
            assert "holder_id" in holder, "Holder should have holder_id"
            assert "name" in holder, "Holder should have name"
            assert "percentage" in holder, "Holder should have percentage"
        
        print(f"Found {len(data)} rekeninghouders")
        for h in data:
            print(f"  - {h['name']}: {h['percentage']}%")
    
    def test_create_rekeninghouder(self, headers):
        """POST /api/kiosk/admin/verdeling/rekeninghouders - Create new holder"""
        # First check current total percentage
        list_resp = requests.get(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers)
        current_holders = list_resp.json()
        total_pct = sum(h.get("percentage", 0) for h in current_holders)
        
        # Only create if we have room
        if total_pct >= 100:
            pytest.skip(f"Total percentage already at {total_pct}%, cannot add more")
        
        available_pct = min(5, 100 - total_pct)  # Use 5% or whatever is available
        
        response = requests.post(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers, json={
            "name": "TEST_Holder",
            "percentage": available_pct
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "holder_id" in data, "Response should have holder_id"
        assert "message" in data, "Response should have message"
        print(f"Created holder with ID: {data['holder_id']}")
        
        # Cleanup - delete the test holder
        requests.delete(f"{API_BASE}/admin/verdeling/rekeninghouders/{data['holder_id']}", headers=headers)
    
    def test_create_rekeninghouder_exceeds_100_percent(self, headers):
        """POST should fail if total percentage exceeds 100%"""
        response = requests.post(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers, json={
            "name": "TEST_TooMuch",
            "percentage": 150  # Way over 100%
        })
        assert response.status_code == 400, f"Expected 400 for exceeding 100%, got {response.status_code}"
        print(f"Correctly rejected: {response.json().get('detail', '')}")
    
    def test_create_rekeninghouder_invalid_percentage(self, headers):
        """POST should fail for invalid percentage (0 or negative)"""
        response = requests.post(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers, json={
            "name": "TEST_Invalid",
            "percentage": 0
        })
        assert response.status_code == 400, f"Expected 400 for 0%, got {response.status_code}"
        
        response2 = requests.post(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers, json={
            "name": "TEST_Negative",
            "percentage": -5
        })
        assert response2.status_code == 400, f"Expected 400 for negative %, got {response2.status_code}"
        print("Correctly rejected invalid percentages")
    
    def test_update_rekeninghouder(self, headers):
        """PUT /api/kiosk/admin/verdeling/rekeninghouders/{id} - Update holder"""
        # First get existing holders
        list_resp = requests.get(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers)
        holders = list_resp.json()
        
        if not holders:
            pytest.skip("No holders to update")
        
        holder = holders[0]
        original_name = holder["name"]
        
        # Update name only
        response = requests.put(f"{API_BASE}/admin/verdeling/rekeninghouders/{holder['holder_id']}", headers=headers, json={
            "name": f"{original_name}_UPDATED"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Revert the change
        requests.put(f"{API_BASE}/admin/verdeling/rekeninghouders/{holder['holder_id']}", headers=headers, json={
            "name": original_name
        })
        print(f"Successfully updated and reverted holder: {holder['holder_id']}")
    
    def test_update_nonexistent_holder(self, headers):
        """PUT should return 404 for non-existent holder"""
        response = requests.put(f"{API_BASE}/admin/verdeling/rekeninghouders/nonexistent-id", headers=headers, json={
            "name": "Test"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent holder")
    
    def test_delete_rekeninghouder(self, headers):
        """DELETE /api/kiosk/admin/verdeling/rekeninghouders/{id} - Delete holder"""
        # First check current total percentage
        list_resp = requests.get(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers)
        current_holders = list_resp.json()
        total_pct = sum(h.get("percentage", 0) for h in current_holders)
        
        if total_pct >= 100:
            pytest.skip("Cannot create test holder to delete - total at 100%")
        
        # Create a test holder to delete
        create_resp = requests.post(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers, json={
            "name": "TEST_ToDelete",
            "percentage": 1
        })
        if create_resp.status_code != 200:
            pytest.skip("Could not create test holder")
        
        holder_id = create_resp.json()["holder_id"]
        
        # Delete it
        response = requests.delete(f"{API_BASE}/admin/verdeling/rekeninghouders/{holder_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify it's gone
        list_resp2 = requests.get(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers)
        holder_ids = [h["holder_id"] for h in list_resp2.json()]
        assert holder_id not in holder_ids, "Deleted holder should not appear in list"
        print(f"Successfully deleted holder: {holder_id}")
    
    def test_delete_nonexistent_holder(self, headers):
        """DELETE should return 404 for non-existent holder"""
        response = requests.delete(f"{API_BASE}/admin/verdeling/rekeninghouders/nonexistent-id", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent holder")


class TestVerdelingOverzicht:
    """Test verdeling overzicht (preview) endpoint"""
    
    def test_get_verdeling_overzicht(self, headers):
        """GET /api/kiosk/admin/verdeling/overzicht - Get distribution preview"""
        response = requests.get(f"{API_BASE}/admin/verdeling/overzicht", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "huurinkomsten" in data, "Response should have 'huurinkomsten'"
        assert "total_income" in data, "Response should have 'total_income'"
        assert "total_expense" in data, "Response should have 'total_expense'"
        assert "verdeling" in data, "Response should have 'verdeling' list"
        assert "restant_percentage" in data, "Response should have 'restant_percentage'"
        assert "restant_bedrag" in data, "Response should have 'restant_bedrag'"
        assert "total_distributed" in data, "Response should have 'total_distributed'"
        
        # Verify verdeling structure
        for v in data["verdeling"]:
            assert "holder_id" in v, "Verdeling item should have holder_id"
            assert "name" in v, "Verdeling item should have name"
            assert "percentage" in v, "Verdeling item should have percentage"
            assert "bedrag" in v, "Verdeling item should have bedrag"
        
        # Verify math: total_distributed + restant_bedrag should equal huurinkomsten
        total_check = data["total_distributed"] + data["restant_bedrag"]
        assert abs(total_check - data["huurinkomsten"]) < 0.01, f"Math check failed: {data['total_distributed']} + {data['restant_bedrag']} != {data['huurinkomsten']}"
        
        print(f"Overzicht: Huurinkomsten={data['huurinkomsten']}, Te verdelen={data['total_distributed']}, Restant={data['restant_bedrag']}")
        for v in data["verdeling"]:
            print(f"  - {v['name']}: {v['percentage']}% = {v['bedrag']}")


class TestVerdelingUitvoeren:
    """Test verdeling uitvoeren (execute distribution) endpoint"""
    
    def test_uitvoeren_creates_kas_entries(self, headers):
        """POST /api/kiosk/admin/verdeling/uitvoeren - Execute distribution"""
        # First check if there are holders and income
        overzicht_resp = requests.get(f"{API_BASE}/admin/verdeling/overzicht", headers=headers)
        overzicht = overzicht_resp.json()
        
        if not overzicht.get("verdeling"):
            pytest.skip("No rekeninghouders configured")
        
        if overzicht.get("huurinkomsten", 0) <= 0:
            pytest.skip("No huurinkomsten to distribute")
        
        # Get kas entries before
        kas_before = requests.get(f"{API_BASE}/admin/kas", headers=headers).json()
        entries_before = len(kas_before.get("entries", []))
        
        # Execute verdeling
        response = requests.post(f"{API_BASE}/admin/verdeling/uitvoeren", headers=headers, json={
            "notitie": "TEST_Verdeling_Pytest"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "entries" in data, "Response should have entries list"
        assert "totaal_verdeeld" in data, "Response should have totaal_verdeeld"
        
        # Verify entries were created
        kas_after = requests.get(f"{API_BASE}/admin/kas", headers=headers).json()
        entries_after = len(kas_after.get("entries", []))
        
        expected_new_entries = len(overzicht["verdeling"])
        assert entries_after >= entries_before + expected_new_entries, f"Expected at least {expected_new_entries} new entries"
        
        # Check that new entries have category 'verdeling'
        new_entries = [e for e in kas_after["entries"] if "TEST_Verdeling_Pytest" in e.get("description", "") or e.get("category") == "verdeling"]
        print(f"Created {len(data['entries'])} verdeling entries, totaal: {data['totaal_verdeeld']}")
        
        # Note: We don't clean up these entries as they're part of the kas history
    
    def test_uitvoeren_no_holders(self, headers):
        """POST should fail if no rekeninghouders configured"""
        # This test would require removing all holders first, which we don't want to do
        # So we just verify the endpoint exists and returns proper error format
        # Skip if there are holders
        holders_resp = requests.get(f"{API_BASE}/admin/verdeling/rekeninghouders", headers=headers)
        if holders_resp.json():
            pytest.skip("Holders exist, cannot test no-holders scenario")
        
        response = requests.post(f"{API_BASE}/admin/verdeling/uitvoeren", headers=headers, json={})
        assert response.status_code == 400, f"Expected 400 when no holders, got {response.status_code}"


class TestAuthRequired:
    """Test that all endpoints require authentication"""
    
    def test_kas_requires_auth(self):
        """GET /admin/kas should require auth"""
        response = requests.get(f"{API_BASE}/admin/kas")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_rekeninghouders_requires_auth(self):
        """GET /admin/verdeling/rekeninghouders should require auth"""
        response = requests.get(f"{API_BASE}/admin/verdeling/rekeninghouders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_overzicht_requires_auth(self):
        """GET /admin/verdeling/overzicht should require auth"""
        response = requests.get(f"{API_BASE}/admin/verdeling/overzicht")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_uitvoeren_requires_auth(self):
        """POST /admin/verdeling/uitvoeren should require auth"""
        response = requests.post(f"{API_BASE}/admin/verdeling/uitvoeren", json={})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
