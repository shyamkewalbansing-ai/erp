"""
Test suite for Workspace Backup & Restore functionality
Tests: GET /api/workspace/backups, POST /api/workspace/backups, 
       POST /api/workspace/backups/{id}/restore, DELETE /api/workspace/backups/{id},
       GET /api/workspace/backups/{id}/download
"""
import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "shyam@kewalbansing.net"
TEST_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    # Note: API returns 'access_token' not 'token'
    token = data.get("access_token")
    assert token, "No access_token in response"
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestWorkspaceBackupsAPI:
    """Test Workspace Backup API endpoints"""
    
    created_backup_id = None  # Store for cleanup
    
    def test_01_get_backups_list(self, auth_headers):
        """GET /api/workspace/backups - List all backups"""
        response = requests.get(
            f"{BASE_URL}/api/workspace/backups",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get backups: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list"
        
        # If there are backups, verify structure
        if len(data) > 0:
            backup = data[0]
            assert "id" in backup, "Backup should have id"
            assert "workspace_id" in backup, "Backup should have workspace_id"
            assert "name" in backup, "Backup should have name"
            assert "size_bytes" in backup, "Backup should have size_bytes"
            assert "records_count" in backup, "Backup should have records_count"
            assert "created_at" in backup, "Backup should have created_at"
            assert "status" in backup, "Backup should have status"
        
        print(f"✓ Found {len(data)} existing backups")
    
    def test_02_create_backup(self, auth_headers):
        """POST /api/workspace/backups - Create a new backup"""
        backup_name = f"TEST_Backup_{int(time.time())}"
        backup_data = {
            "name": backup_name,
            "description": "Test backup created by pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/workspace/backups",
            headers=auth_headers,
            json=backup_data
        )
        
        assert response.status_code == 200, f"Failed to create backup: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should have id"
        assert "workspace_id" in data, "Response should have workspace_id"
        assert data["name"] == backup_name, f"Name mismatch: {data['name']} != {backup_name}"
        assert data["description"] == "Test backup created by pytest", "Description mismatch"
        assert "size_bytes" in data, "Response should have size_bytes"
        assert data["size_bytes"] > 0, "Size should be > 0"
        assert "records_count" in data, "Response should have records_count"
        assert data["status"] == "completed", f"Status should be completed, got: {data['status']}"
        
        # Store for later tests
        TestWorkspaceBackupsAPI.created_backup_id = data["id"]
        
        print(f"✓ Created backup: {data['name']} (ID: {data['id'][:8]}...)")
        print(f"  Size: {data['size_bytes']} bytes, Records: {data['records_count']}")
    
    def test_03_verify_backup_in_list(self, auth_headers):
        """Verify created backup appears in list"""
        assert TestWorkspaceBackupsAPI.created_backup_id, "No backup ID from previous test"
        
        response = requests.get(
            f"{BASE_URL}/api/workspace/backups",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find our backup
        backup_ids = [b["id"] for b in data]
        assert TestWorkspaceBackupsAPI.created_backup_id in backup_ids, \
            "Created backup not found in list"
        
        print(f"✓ Backup {TestWorkspaceBackupsAPI.created_backup_id[:8]}... found in list")
    
    def test_04_download_backup(self, auth_headers):
        """GET /api/workspace/backups/{id}/download - Download backup as JSON"""
        assert TestWorkspaceBackupsAPI.created_backup_id, "No backup ID from previous test"
        
        response = requests.get(
            f"{BASE_URL}/api/workspace/backups/{TestWorkspaceBackupsAPI.created_backup_id}/download",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to download backup: {response.text}"
        data = response.json()
        
        # Verify download structure
        assert "backup_info" in data, "Response should have backup_info"
        assert "data" in data, "Response should have data"
        
        backup_info = data["backup_info"]
        assert backup_info["id"] == TestWorkspaceBackupsAPI.created_backup_id
        assert "name" in backup_info
        assert "created_at" in backup_info
        
        # Verify data structure
        backup_data = data["data"]
        assert "workspace" in backup_data, "Data should have workspace info"
        assert "collections" in backup_data, "Data should have collections"
        
        # Verify collections are present
        expected_collections = [
            "tenants", "apartments", "payments", "deposits", "loans",
            "kasgeld", "maintenance", "employees", "salaries",
            "meter_readings", "contracts", "invoices", "workspace_users", "workspace_logs"
        ]
        for coll in expected_collections:
            assert coll in backup_data["collections"], f"Missing collection: {coll}"
        
        print(f"✓ Downloaded backup with {len(backup_data['collections'])} collections")
    
    def test_05_restore_backup_without_confirm(self, auth_headers):
        """POST /api/workspace/backups/{id}/restore - Should fail without confirm=true"""
        assert TestWorkspaceBackupsAPI.created_backup_id, "No backup ID from previous test"
        
        # Try restore without confirm (confirm is a query parameter)
        response = requests.post(
            f"{BASE_URL}/api/workspace/backups/{TestWorkspaceBackupsAPI.created_backup_id}/restore",
            headers=auth_headers
        )
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "confirm" in data["detail"].lower() or "bevestig" in data["detail"].lower()
        
        print("✓ Restore correctly rejected without confirm=true")
    
    def test_06_restore_backup_with_confirm(self, auth_headers):
        """POST /api/workspace/backups/{id}/restore - Restore with confirm=true (query param)"""
        assert TestWorkspaceBackupsAPI.created_backup_id, "No backup ID from previous test"
        
        # confirm is a query parameter, not body
        response = requests.post(
            f"{BASE_URL}/api/workspace/backups/{TestWorkspaceBackupsAPI.created_backup_id}/restore?confirm=true",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to restore backup: {response.text}"
        data = response.json()
        
        # Verify response
        assert "message" in data, "Response should have message"
        assert "records_restored" in data, "Response should have records_restored"
        assert "safety_backup_id" in data, "Response should have safety_backup_id"
        
        # Safety backup should be created
        assert data["safety_backup_id"], "Safety backup ID should not be empty"
        
        print(f"✓ Backup restored: {data['records_restored']} records")
        print(f"  Safety backup created: {data['safety_backup_id'][:8]}...")
    
    def test_07_restore_nonexistent_backup(self, auth_headers):
        """POST /api/workspace/backups/{id}/restore - Should fail for non-existent backup"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        response = requests.post(
            f"{BASE_URL}/api/workspace/backups/{fake_id}/restore",
            headers=auth_headers,
            json={"confirm": True}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ Correctly returned 404 for non-existent backup")
    
    def test_08_delete_backup(self, auth_headers):
        """DELETE /api/workspace/backups/{id} - Delete a backup"""
        assert TestWorkspaceBackupsAPI.created_backup_id, "No backup ID from previous test"
        
        response = requests.delete(
            f"{BASE_URL}/api/workspace/backups/{TestWorkspaceBackupsAPI.created_backup_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to delete backup: {response.text}"
        data = response.json()
        
        assert "message" in data
        
        print(f"✓ Deleted backup {TestWorkspaceBackupsAPI.created_backup_id[:8]}...")
    
    def test_09_verify_backup_deleted(self, auth_headers):
        """Verify deleted backup no longer in list"""
        assert TestWorkspaceBackupsAPI.created_backup_id, "No backup ID from previous test"
        
        response = requests.get(
            f"{BASE_URL}/api/workspace/backups",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Backup should not be in list
        backup_ids = [b["id"] for b in data]
        assert TestWorkspaceBackupsAPI.created_backup_id not in backup_ids, \
            "Deleted backup still in list"
        
        print("✓ Backup correctly removed from list")
    
    def test_10_delete_nonexistent_backup(self, auth_headers):
        """DELETE /api/workspace/backups/{id} - Should fail for non-existent backup"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        response = requests.delete(
            f"{BASE_URL}/api/workspace/backups/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ Correctly returned 404 for non-existent backup")
    
    def test_11_download_nonexistent_backup(self, auth_headers):
        """GET /api/workspace/backups/{id}/download - Should fail for non-existent backup"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        response = requests.get(
            f"{BASE_URL}/api/workspace/backups/{fake_id}/download",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ Correctly returned 404 for non-existent backup download")


class TestBackupValidation:
    """Test backup validation and edge cases"""
    
    def test_create_backup_without_name(self, auth_headers):
        """POST /api/workspace/backups - Should fail without name"""
        response = requests.post(
            f"{BASE_URL}/api/workspace/backups",
            headers=auth_headers,
            json={"description": "No name provided"}
        )
        
        # Should fail with 422 (validation error)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        
        print("✓ Correctly rejected backup without name")
    
    def test_create_backup_empty_name(self, auth_headers):
        """POST /api/workspace/backups - Should handle empty name"""
        response = requests.post(
            f"{BASE_URL}/api/workspace/backups",
            headers=auth_headers,
            json={"name": "", "description": "Empty name"}
        )
        
        # May succeed or fail depending on validation
        # Just verify we get a response
        assert response.status_code in [200, 400, 422], f"Unexpected status: {response.status_code}"
        
        print(f"✓ Empty name handled with status {response.status_code}")


class TestBackupWithoutAuth:
    """Test backup endpoints without authentication"""
    
    def test_get_backups_no_auth(self):
        """GET /api/workspace/backups - Should fail without auth"""
        response = requests.get(f"{BASE_URL}/api/workspace/backups")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("✓ Correctly rejected unauthenticated request")
    
    def test_create_backup_no_auth(self):
        """POST /api/workspace/backups - Should fail without auth"""
        response = requests.post(
            f"{BASE_URL}/api/workspace/backups",
            json={"name": "Unauthorized backup"}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("✓ Correctly rejected unauthenticated create request")


# Cleanup fixture to remove any test backups
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_backups(auth_headers):
    """Cleanup any TEST_ prefixed backups after tests"""
    yield
    
    # After all tests, cleanup
    try:
        response = requests.get(
            f"{BASE_URL}/api/workspace/backups",
            headers=auth_headers
        )
        if response.status_code == 200:
            backups = response.json()
            for backup in backups:
                if backup.get("name", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/workspace/backups/{backup['id']}",
                        headers=auth_headers
                    )
                    print(f"Cleaned up test backup: {backup['name']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
