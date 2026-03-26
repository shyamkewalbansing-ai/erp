"""
Face ID API Tests for Vastgoed Kiosk
Tests Face ID registration, verification, and deletion for both admin and tenants
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFaceIdEndpoints:
    """Test Face ID endpoints for admin and tenants"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login with PIN and get company_id"""
        # Login with PIN to get token
        login_res = requests.post(f"{BASE_URL}/api/kiosk/auth/pin", json={"pin": "5678"})
        assert login_res.status_code == 200, f"PIN login failed: {login_res.text}"
        self.token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get company info
        me_res = requests.get(f"{BASE_URL}/api/kiosk/auth/me", headers=self.headers)
        assert me_res.status_code == 200, f"Get company info failed: {me_res.text}"
        self.company_id = me_res.json()["company_id"]
        print(f"Setup complete: company_id={self.company_id}")
    
    def test_admin_tenants_returns_face_id_enabled(self):
        """Test GET /api/kiosk/admin/tenants returns face_id_enabled field"""
        res = requests.get(f"{BASE_URL}/api/kiosk/admin/tenants", headers=self.headers)
        assert res.status_code == 200, f"Get tenants failed: {res.text}"
        
        tenants = res.json()
        assert isinstance(tenants, list), "Response should be a list"
        
        if len(tenants) > 0:
            # Check that face_id_enabled field exists in tenant response
            first_tenant = tenants[0]
            assert "face_id_enabled" in first_tenant, f"face_id_enabled field missing from tenant response. Keys: {first_tenant.keys()}"
            assert isinstance(first_tenant["face_id_enabled"], bool), "face_id_enabled should be a boolean"
            print(f"PASS: face_id_enabled field present in tenant response. Value: {first_tenant['face_id_enabled']}")
            print(f"Total tenants: {len(tenants)}")
            
            # Count tenants with face_id_enabled
            face_enabled_count = sum(1 for t in tenants if t.get("face_id_enabled"))
            print(f"Tenants with Face ID enabled: {face_enabled_count}/{len(tenants)}")
        else:
            print("No tenants found - skipping face_id_enabled check")
    
    def test_admin_face_status(self):
        """Test GET /api/kiosk/public/{company_id}/face/admin-status"""
        res = requests.get(f"{BASE_URL}/api/kiosk/public/{self.company_id}/face/admin-status")
        assert res.status_code == 200, f"Get admin face status failed: {res.text}"
        
        data = res.json()
        assert "enabled" in data, f"enabled field missing from response. Keys: {data.keys()}"
        assert isinstance(data["enabled"], bool), "enabled should be a boolean"
        print(f"PASS: Admin face status endpoint working. Enabled: {data['enabled']}")
    
    def test_register_admin_face(self):
        """Test POST /api/kiosk/public/{company_id}/face/register-admin"""
        # Create a mock face descriptor (128-dimensional vector)
        mock_descriptor = [0.1] * 128
        
        res = requests.post(
            f"{BASE_URL}/api/kiosk/public/{self.company_id}/face/register-admin",
            json={"descriptor": mock_descriptor}
        )
        assert res.status_code == 200, f"Register admin face failed: {res.text}"
        
        data = res.json()
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        print(f"PASS: Admin face registration successful. Response: {data}")
        
        # Verify status changed
        status_res = requests.get(f"{BASE_URL}/api/kiosk/public/{self.company_id}/face/admin-status")
        assert status_res.status_code == 200
        assert status_res.json()["enabled"] == True, "Admin face should be enabled after registration"
        print("PASS: Admin face status shows enabled after registration")
    
    def test_delete_admin_face(self):
        """Test DELETE /api/kiosk/public/{company_id}/face/admin"""
        # First register a face
        mock_descriptor = [0.2] * 128
        requests.post(
            f"{BASE_URL}/api/kiosk/public/{self.company_id}/face/register-admin",
            json={"descriptor": mock_descriptor}
        )
        
        # Now delete it
        res = requests.delete(f"{BASE_URL}/api/kiosk/public/{self.company_id}/face/admin")
        assert res.status_code == 200, f"Delete admin face failed: {res.text}"
        
        data = res.json()
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        print(f"PASS: Admin face deletion successful. Response: {data}")
        
        # Verify status changed
        status_res = requests.get(f"{BASE_URL}/api/kiosk/public/{self.company_id}/face/admin-status")
        assert status_res.status_code == 200
        assert status_res.json()["enabled"] == False, "Admin face should be disabled after deletion"
        print("PASS: Admin face status shows disabled after deletion")
    
    def test_register_tenant_face(self):
        """Test POST /api/kiosk/public/{company_id}/tenant/{tenant_id}/face/register"""
        # Get a tenant to test with
        tenants_res = requests.get(f"{BASE_URL}/api/kiosk/admin/tenants", headers=self.headers)
        assert tenants_res.status_code == 200
        tenants = tenants_res.json()
        
        if len(tenants) == 0:
            pytest.skip("No tenants available for testing")
        
        tenant = tenants[0]
        tenant_id = tenant["tenant_id"]
        print(f"Testing with tenant: {tenant['name']} (ID: {tenant_id})")
        
        # Register face for tenant
        mock_descriptor = [0.3] * 128
        res = requests.post(
            f"{BASE_URL}/api/kiosk/public/{self.company_id}/tenant/{tenant_id}/face/register",
            json={"descriptor": mock_descriptor}
        )
        assert res.status_code == 200, f"Register tenant face failed: {res.text}"
        
        data = res.json()
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        print(f"PASS: Tenant face registration successful. Response: {data}")
        
        # Verify tenant now has face_id_enabled
        tenants_res2 = requests.get(f"{BASE_URL}/api/kiosk/admin/tenants", headers=self.headers)
        updated_tenant = next((t for t in tenants_res2.json() if t["tenant_id"] == tenant_id), None)
        assert updated_tenant is not None
        assert updated_tenant["face_id_enabled"] == True, "Tenant face_id_enabled should be True after registration"
        print("PASS: Tenant face_id_enabled shows True after registration")
    
    def test_delete_tenant_face(self):
        """Test DELETE /api/kiosk/public/{company_id}/tenant/{tenant_id}/face"""
        # Get a tenant to test with
        tenants_res = requests.get(f"{BASE_URL}/api/kiosk/admin/tenants", headers=self.headers)
        assert tenants_res.status_code == 200
        tenants = tenants_res.json()
        
        if len(tenants) == 0:
            pytest.skip("No tenants available for testing")
        
        tenant = tenants[0]
        tenant_id = tenant["tenant_id"]
        
        # First register a face
        mock_descriptor = [0.4] * 128
        requests.post(
            f"{BASE_URL}/api/kiosk/public/{self.company_id}/tenant/{tenant_id}/face/register",
            json={"descriptor": mock_descriptor}
        )
        
        # Now delete it
        res = requests.delete(f"{BASE_URL}/api/kiosk/public/{self.company_id}/tenant/{tenant_id}/face")
        assert res.status_code == 200, f"Delete tenant face failed: {res.text}"
        
        data = res.json()
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        print(f"PASS: Tenant face deletion successful. Response: {data}")
        
        # Verify tenant now has face_id_enabled = False
        tenants_res2 = requests.get(f"{BASE_URL}/api/kiosk/admin/tenants", headers=self.headers)
        updated_tenant = next((t for t in tenants_res2.json() if t["tenant_id"] == tenant_id), None)
        assert updated_tenant is not None
        assert updated_tenant["face_id_enabled"] == False, "Tenant face_id_enabled should be False after deletion"
        print("PASS: Tenant face_id_enabled shows False after deletion")
    
    def test_verify_tenant_face(self):
        """Test POST /api/kiosk/public/{company_id}/face/verify-tenant"""
        # Get a tenant and register face
        tenants_res = requests.get(f"{BASE_URL}/api/kiosk/admin/tenants", headers=self.headers)
        assert tenants_res.status_code == 200
        tenants = tenants_res.json()
        
        if len(tenants) == 0:
            pytest.skip("No tenants available for testing")
        
        tenant = tenants[0]
        tenant_id = tenant["tenant_id"]
        
        # Register face with specific descriptor
        mock_descriptor = [0.5] * 128
        requests.post(
            f"{BASE_URL}/api/kiosk/public/{self.company_id}/tenant/{tenant_id}/face/register",
            json={"descriptor": mock_descriptor}
        )
        
        # Verify with same descriptor (should match)
        res = requests.post(
            f"{BASE_URL}/api/kiosk/public/{self.company_id}/face/verify-tenant",
            json={"descriptor": mock_descriptor}
        )
        assert res.status_code == 200, f"Verify tenant face failed: {res.text}"
        
        data = res.json()
        assert "tenant_id" in data, f"tenant_id missing from response. Keys: {data.keys()}"
        assert data["tenant_id"] == tenant_id, f"Expected tenant_id {tenant_id}, got {data['tenant_id']}"
        assert "distance" in data, "distance field missing from response"
        print(f"PASS: Tenant face verification successful. Matched tenant: {data.get('name')}, distance: {data.get('distance')}")
    
    def test_verify_tenant_face_no_match(self):
        """Test POST /api/kiosk/public/{company_id}/face/verify-tenant with non-matching face"""
        # Use a completely different descriptor that won't match
        non_matching_descriptor = [0.9] * 128
        
        res = requests.post(
            f"{BASE_URL}/api/kiosk/public/{self.company_id}/face/verify-tenant",
            json={"descriptor": non_matching_descriptor}
        )
        
        # Should return 401 for no match
        assert res.status_code == 401, f"Expected 401 for non-matching face, got {res.status_code}: {res.text}"
        print("PASS: Non-matching face correctly returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
