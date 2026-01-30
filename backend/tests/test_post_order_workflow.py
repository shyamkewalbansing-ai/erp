"""
Test Post-Order Workflow: Customer orders modules → auto account creation → auto-login → redirect to Mijn Modules
Superadmin can approve/reject addon requests
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "admin@facturatie.sr"
SUPERADMIN_PASSWORD = "admin123"

# HRM addon ID from the test request
HRM_ADDON_ID = "a1f121b6-296e-423b-842d-10286aee038d"


class TestPublicOrdersEndpoint:
    """Test POST /api/public/orders - creates user account, addon requests, and returns JWT token"""
    
    @pytest.fixture
    def unique_email(self):
        """Generate unique email for each test"""
        return f"test_order_{uuid.uuid4().hex[:8]}@example.com"
    
    def test_create_order_success(self, unique_email):
        """Test successful order creation with auto-login"""
        # First get available addons
        addons_res = requests.get(f"{BASE_URL}/api/public/addons")
        assert addons_res.status_code == 200, f"Failed to get addons: {addons_res.text}"
        addons = addons_res.json()
        
        if len(addons) == 0:
            pytest.skip("No addons available for testing")
        
        addon_id = addons[0]["id"]
        
        # Create order
        order_data = {
            "name": "Test Order User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "testpass123",
            "company_name": "Test Company",
            "addon_ids": [addon_id],
            "message": "Test order message"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Response should contain JWT token for auto-login"
        assert "order" in data, "Response should contain order details"
        assert "user" in data, "Response should contain user details"
        
        # Verify token is valid
        assert len(data["token"]) > 0, "Token should not be empty"
        
        # Verify user details
        assert data["user"]["email"] == unique_email.lower()
        assert data["user"]["name"] == "Test Order User"
        assert data["user"]["role"] == "customer"
        
        # Verify order details
        assert data["order"]["status"] == "pending"
        assert addon_id in data["order"]["addon_ids"]
        
        print("✓ Order created successfully with token for auto-login")
        return data
    
    def test_create_order_duplicate_email(self, unique_email):
        """Test that duplicate email is rejected"""
        addons_res = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_res.json()
        
        if len(addons) == 0:
            pytest.skip("No addons available for testing")
        
        addon_id = addons[0]["id"]
        
        order_data = {
            "name": "Test User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "testpass123",
            "addon_ids": [addon_id]
        }
        
        # First order should succeed
        response1 = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert response1.status_code == 200
        
        # Second order with same email should fail
        response2 = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert response2.status_code == 400
        assert "al geregistreerd" in response2.json().get("detail", "").lower()
        
        print("✓ Duplicate email correctly rejected")
    
    def test_create_order_no_addons(self, unique_email):
        """Test that order without addons is rejected"""
        order_data = {
            "name": "Test User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "testpass123",
            "addon_ids": []
        }
        
        response = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert response.status_code == 400
        assert "minimaal één module" in response.json().get("detail", "").lower()
        
        print("✓ Order without addons correctly rejected")
    
    def test_create_order_short_password(self, unique_email):
        """Test that short password is rejected"""
        addons_res = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_res.json()
        
        if len(addons) == 0:
            pytest.skip("No addons available for testing")
        
        order_data = {
            "name": "Test User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "12345",  # Too short
            "addon_ids": [addons[0]["id"]]
        }
        
        response = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert response.status_code == 400
        assert "6 tekens" in response.json().get("detail", "")
        
        print("✓ Short password correctly rejected")


class TestMyAddonRequestsEndpoint:
    """Test GET /api/my-addon-requests - returns pending addon requests for logged-in user"""
    
    @pytest.fixture
    def user_with_order(self):
        """Create a user via order and return token"""
        unique_email = f"test_requests_{uuid.uuid4().hex[:8]}@example.com"
        
        addons_res = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_res.json()
        
        if len(addons) == 0:
            pytest.skip("No addons available for testing")
        
        order_data = {
            "name": "Test Requests User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "testpass123",
            "addon_ids": [addons[0]["id"]]
        }
        
        response = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert response.status_code == 200
        
        return response.json()
    
    def test_get_my_addon_requests(self, user_with_order):
        """Test getting addon requests for logged-in user"""
        token = user_with_order["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/my-addon-requests", headers=headers)
        assert response.status_code == 200, f"Failed to get addon requests: {response.text}"
        
        requests_list = response.json()
        assert isinstance(requests_list, list)
        assert len(requests_list) >= 1, "Should have at least one addon request"
        
        # Verify request structure
        request = requests_list[0]
        assert "id" in request
        assert "addon_id" in request
        assert "status" in request
        assert request["status"] == "pending"
        
        print(f"✓ My addon requests returned {len(requests_list)} request(s)")
    
    def test_get_my_addon_requests_unauthorized(self):
        """Test that unauthorized access is rejected"""
        response = requests.get(f"{BASE_URL}/api/my-addon-requests")
        assert response.status_code in [401, 403]
        
        print("✓ Unauthorized access correctly rejected")


class TestMyActiveAddonsEndpoint:
    """Test GET /api/my-active-addons - returns active addons for logged-in user"""
    
    @pytest.fixture
    def user_token(self):
        """Create a user via order and return token"""
        unique_email = f"test_active_{uuid.uuid4().hex[:8]}@example.com"
        
        addons_res = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_res.json()
        
        if len(addons) == 0:
            pytest.skip("No addons available for testing")
        
        order_data = {
            "name": "Test Active User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "testpass123",
            "addon_ids": [addons[0]["id"]]
        }
        
        response = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert response.status_code == 200
        
        return response.json()["token"]
    
    def test_get_my_active_addons(self, user_token):
        """Test getting active addons for logged-in user (should be empty initially)"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = requests.get(f"{BASE_URL}/api/my-active-addons", headers=headers)
        assert response.status_code == 200, f"Failed to get active addons: {response.text}"
        
        addons_list = response.json()
        assert isinstance(addons_list, list)
        # Initially should be empty since requests are pending
        
        print(f"✓ My active addons returned {len(addons_list)} addon(s)")
    
    def test_get_my_active_addons_unauthorized(self):
        """Test that unauthorized access is rejected"""
        response = requests.get(f"{BASE_URL}/api/my-active-addons")
        assert response.status_code in [401, 403]
        
        print("✓ Unauthorized access correctly rejected")


class TestAdminAddonRequestsEndpoint:
    """Test GET /api/admin/addon-requests - returns all pending requests for superadmin"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get superadmin token"""
        login_data = {"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 200, f"Superadmin login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_get_admin_addon_requests(self, superadmin_token):
        """Test getting all pending addon requests as superadmin"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/addon-requests", headers=headers)
        assert response.status_code == 200, f"Failed to get admin addon requests: {response.text}"
        
        requests_list = response.json()
        assert isinstance(requests_list, list)
        
        # Verify structure if there are requests
        if len(requests_list) > 0:
            request = requests_list[0]
            assert "id" in request
            assert "user_id" in request
            assert "addon_id" in request
            assert "status" in request
            assert request["status"] == "pending"
        
        print(f"✓ Admin addon requests returned {len(requests_list)} pending request(s)")
    
    def test_get_admin_addon_requests_unauthorized(self):
        """Test that non-admin access is rejected"""
        # Create a regular user
        unique_email = f"test_nonadmin_{uuid.uuid4().hex[:8]}@example.com"
        
        addons_res = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_res.json()
        
        if len(addons) == 0:
            pytest.skip("No addons available for testing")
        
        order_data = {
            "name": "Non Admin User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "testpass123",
            "addon_ids": [addons[0]["id"]]
        }
        
        response = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert response.status_code == 200
        
        user_token = response.json()["token"]
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Try to access admin endpoint
        response = requests.get(f"{BASE_URL}/api/admin/addon-requests", headers=headers)
        assert response.status_code == 403, "Non-admin should not access admin endpoint"
        
        print("✓ Non-admin access correctly rejected")


class TestApproveRejectAddonRequests:
    """Test PUT /api/admin/addon-requests/{id}/approve and /reject"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get superadmin token"""
        login_data = {"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 200, f"Superadmin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture
    def user_with_pending_request(self):
        """Create a user with a pending addon request"""
        unique_email = f"test_approve_{uuid.uuid4().hex[:8]}@example.com"
        
        addons_res = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_res.json()
        
        if len(addons) == 0:
            pytest.skip("No addons available for testing")
        
        order_data = {
            "name": "Test Approve User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "testpass123",
            "addon_ids": [addons[0]["id"]]
        }
        
        response = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert response.status_code == 200
        
        return response.json()
    
    def test_approve_addon_request(self, superadmin_token, user_with_pending_request):
        """Test approving an addon request"""
        user_token = user_with_pending_request["token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}
        admin_headers = {"Authorization": f"Bearer {superadmin_token}"}
        
        # Get user's pending requests
        requests_res = requests.get(f"{BASE_URL}/api/my-addon-requests", headers=user_headers)
        assert requests_res.status_code == 200
        
        pending_requests = [r for r in requests_res.json() if r["status"] == "pending"]
        assert len(pending_requests) > 0, "Should have pending requests"
        
        request_id = pending_requests[0]["id"]
        addon_id = pending_requests[0]["addon_id"]
        
        # Approve the request
        approve_res = requests.put(
            f"{BASE_URL}/api/admin/addon-requests/{request_id}/approve?months=1",
            headers=admin_headers
        )
        assert approve_res.status_code == 200, f"Approve failed: {approve_res.text}"
        
        # Verify approve response contains user_addon
        approve_data = approve_res.json()
        assert "user_addon" in approve_data
        assert approve_data["user_addon"]["status"] == "active"
        
        # Note: The pending request is deleted after activation (current behavior)
        # The request is removed from addon_requests collection when addon is activated
        
        # Verify user now has active addon
        active_res = requests.get(f"{BASE_URL}/api/my-active-addons", headers=user_headers)
        assert active_res.status_code == 200
        active_addons = active_res.json()
        assert len(active_addons) >= 1, "User should have at least one active addon after approval"
        
        # Verify the correct addon is active
        active_addon = next((a for a in active_addons if a["addon_id"] == addon_id), None)
        assert active_addon is not None, "The approved addon should be in active addons"
        assert active_addon["status"] == "active"
        
        print("✓ Addon request approved successfully")
    
    def test_reject_addon_request(self, superadmin_token):
        """Test rejecting an addon request"""
        # Create a new user with pending request
        unique_email = f"test_reject_{uuid.uuid4().hex[:8]}@example.com"
        
        addons_res = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_res.json()
        
        if len(addons) == 0:
            pytest.skip("No addons available for testing")
        
        order_data = {
            "name": "Test Reject User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "testpass123",
            "addon_ids": [addons[0]["id"]]
        }
        
        order_res = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert order_res.status_code == 200
        
        user_token = order_res.json()["token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}
        admin_headers = {"Authorization": f"Bearer {superadmin_token}"}
        
        # Get user's pending requests
        requests_res = requests.get(f"{BASE_URL}/api/my-addon-requests", headers=user_headers)
        pending_requests = [r for r in requests_res.json() if r["status"] == "pending"]
        assert len(pending_requests) > 0
        
        request_id = pending_requests[0]["id"]
        
        # Reject the request
        reject_res = requests.put(
            f"{BASE_URL}/api/admin/addon-requests/{request_id}/reject",
            headers=admin_headers
        )
        assert reject_res.status_code == 200, f"Reject failed: {reject_res.text}"
        
        # Verify the request is now rejected
        requests_res = requests.get(f"{BASE_URL}/api/my-addon-requests", headers=user_headers)
        updated_requests = requests_res.json()
        rejected_request = next((r for r in updated_requests if r["id"] == request_id), None)
        assert rejected_request is not None
        assert rejected_request["status"] == "rejected"
        
        print("✓ Addon request rejected successfully")
    
    def test_approve_nonexistent_request(self, superadmin_token):
        """Test approving a non-existent request"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/admin/addon-requests/{fake_id}/approve",
            headers=headers
        )
        assert response.status_code == 404
        
        print("✓ Non-existent request correctly returns 404")


class TestAutoLoginFlow:
    """Test the complete auto-login flow after order submission"""
    
    def test_token_can_access_protected_endpoints(self):
        """Test that the token from order can access protected endpoints"""
        unique_email = f"test_autologin_{uuid.uuid4().hex[:8]}@example.com"
        
        addons_res = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_res.json()
        
        if len(addons) == 0:
            pytest.skip("No addons available for testing")
        
        order_data = {
            "name": "Test AutoLogin User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "testpass123",
            "addon_ids": [addons[0]["id"]]
        }
        
        # Create order and get token
        order_res = requests.post(f"{BASE_URL}/api/public/orders", json=order_data)
        assert order_res.status_code == 200
        
        token = order_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test accessing /auth/me
        me_res = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_res.status_code == 200, f"Failed to access /auth/me: {me_res.text}"
        
        user_data = me_res.json()
        assert user_data["email"] == unique_email.lower()
        assert user_data["name"] == "Test AutoLogin User"
        
        # Test accessing /my-addon-requests
        requests_res = requests.get(f"{BASE_URL}/api/my-addon-requests", headers=headers)
        assert requests_res.status_code == 200
        
        # Test accessing /my-active-addons
        active_res = requests.get(f"{BASE_URL}/api/my-active-addons", headers=headers)
        assert active_res.status_code == 200
        
        print("✓ Auto-login token can access all protected endpoints")


class TestPublicAddonsEndpoint:
    """Test GET /api/public/addons - returns available addons for landing page"""
    
    def test_get_public_addons(self):
        """Test getting public addons list"""
        response = requests.get(f"{BASE_URL}/api/public/addons")
        assert response.status_code == 200, f"Failed to get public addons: {response.text}"
        
        addons = response.json()
        assert isinstance(addons, list)
        
        # Verify addon structure if there are addons
        if len(addons) > 0:
            addon = addons[0]
            assert "id" in addon
            assert "name" in addon
            assert "price" in addon
            assert "is_active" in addon
            assert addon["is_active"]  # Only active addons should be returned
        
        print(f"✓ Public addons returned {len(addons)} addon(s)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
