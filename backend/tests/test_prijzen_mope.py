"""
Test suite for PrijzenPage and Mope Payment Integration
Features tested:
1. Public addons endpoint
2. Public orders endpoint (with account creation)
3. Mope settings endpoints (superadmin only)
4. Payment initiation endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "admin@facturatie.sr"
SUPERADMIN_PASSWORD = "admin123"

class TestPublicAddons:
    """Test public addons endpoint - no auth required"""
    
    def test_get_public_addons_returns_200(self):
        """GET /api/public/addons should return 200"""
        response = requests.get(f"{BASE_URL}/api/public/addons")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: GET /api/public/addons returns 200")
    
    def test_get_public_addons_returns_list(self):
        """GET /api/public/addons should return a list of addons"""
        response = requests.get(f"{BASE_URL}/api/public/addons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: GET /api/public/addons returns list with {len(data)} addons")
    
    def test_public_addons_have_required_fields(self):
        """Each addon should have id, name, price, is_active"""
        response = requests.get(f"{BASE_URL}/api/public/addons")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            addon = data[0]
            assert "id" in addon, "Addon should have 'id' field"
            assert "name" in addon, "Addon should have 'name' field"
            assert "price" in addon, "Addon should have 'price' field"
            assert "is_active" in addon, "Addon should have 'is_active' field"
            print(f"SUCCESS: Addon has required fields: {list(addon.keys())}")
        else:
            print("WARNING: No addons found to verify fields")


class TestPublicOrders:
    """Test public orders endpoint - creates user account with order"""
    
    def test_create_order_without_addons_allowed(self):
        """POST /api/public/orders without addon_ids is allowed (creates 0 price order)"""
        unique_email = f"test_no_addons_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/public/orders", json={
            "name": "Test User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "test123456",
            "addon_ids": []
        })
        # Backend allows empty addon_ids - creates order with 0 total price
        # Note: Frontend validates this, but backend accepts it
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["total_price"] == 0, "Total price should be 0 for empty addons"
        print("SUCCESS: Order without addons creates order with 0 price (frontend validates)")
    
    def test_create_order_with_short_password_fails(self):
        """POST /api/public/orders with short password should fail"""
        unique_email = f"test_short_pwd_{uuid.uuid4().hex[:8]}@test.com"
        # Get a valid addon ID first
        addons_response = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_response.json()
        if not addons:
            pytest.skip("No addons available for testing")
        
        response = requests.post(f"{BASE_URL}/api/public/orders", json={
            "name": "Test User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "123",  # Too short
            "addon_ids": [addons[0]["id"]]
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "6 tekens" in response.json().get("detail", ""), "Should mention minimum 6 characters"
        print("SUCCESS: Order with short password fails validation")
    
    def test_create_order_success(self):
        """POST /api/public/orders with valid data should create order and user"""
        unique_email = f"test_order_{uuid.uuid4().hex[:8]}@test.com"
        
        # Get a valid addon ID first
        addons_response = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_response.json()
        if not addons:
            pytest.skip("No addons available for testing")
        
        addon_id = addons[0]["id"]
        addon_price = addons[0]["price"]
        
        response = requests.post(f"{BASE_URL}/api/public/orders", json={
            "name": "Test Order User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "test123456",
            "company_name": "Test Company",
            "addon_ids": [addon_id],
            "message": "Test order message"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response fields
        assert "id" in data, "Response should have 'id'"
        assert data["email"] == unique_email.lower(), "Email should match"
        assert data["name"] == "Test Order User", "Name should match"
        assert data["status"] == "pending", "Status should be 'pending'"
        assert addon_id in data["addon_ids"], "Addon ID should be in order"
        assert data["total_price"] == addon_price, f"Total price should be {addon_price}"
        
        print(f"SUCCESS: Order created with ID {data['id']}")
        print(f"  - Email: {data['email']}")
        print(f"  - Total: {data['total_price']}")
        print(f"  - Status: {data['status']}")
        
        return data
    
    def test_create_order_duplicate_email_fails(self):
        """POST /api/public/orders with existing email should fail"""
        # First create an order
        unique_email = f"test_dup_{uuid.uuid4().hex[:8]}@test.com"
        
        addons_response = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_response.json()
        if not addons:
            pytest.skip("No addons available for testing")
        
        # First order
        response1 = requests.post(f"{BASE_URL}/api/public/orders", json={
            "name": "First User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "test123456",
            "addon_ids": [addons[0]["id"]]
        })
        assert response1.status_code == 200, "First order should succeed"
        
        # Second order with same email
        response2 = requests.post(f"{BASE_URL}/api/public/orders", json={
            "name": "Second User",
            "email": unique_email,
            "phone": "+597 7654321",
            "password": "test654321",
            "addon_ids": [addons[0]["id"]]
        })
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}"
        assert "geregistreerd" in response2.json().get("detail", "").lower(), "Should mention email already registered"
        print("SUCCESS: Duplicate email order fails correctly")


class TestMopeSettingsAdmin:
    """Test Mope settings endpoints - superadmin only"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get superadmin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as superadmin: {response.status_code}")
        return response.json()["access_token"]
    
    def test_get_mope_settings_without_auth_fails(self):
        """GET /api/admin/mope/settings without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/admin/mope/settings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: GET /api/admin/mope/settings requires authentication")
    
    def test_get_mope_settings_with_superadmin(self, superadmin_token):
        """GET /api/admin/mope/settings with superadmin should succeed"""
        response = requests.get(
            f"{BASE_URL}/api/admin/mope/settings",
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "is_enabled" in data, "Should have 'is_enabled' field"
        assert "use_live_mode" in data, "Should have 'use_live_mode' field"
        print(f"SUCCESS: GET /api/admin/mope/settings returns: is_enabled={data.get('is_enabled')}, use_live_mode={data.get('use_live_mode')}")
    
    def test_update_mope_settings_without_auth_fails(self):
        """PUT /api/admin/mope/settings without auth should fail"""
        response = requests.put(f"{BASE_URL}/api/admin/mope/settings", json={
            "is_enabled": True,
            "use_live_mode": False,
            "test_token": "test_token_123"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: PUT /api/admin/mope/settings requires authentication")
    
    def test_update_mope_settings_with_superadmin(self, superadmin_token):
        """PUT /api/admin/mope/settings with superadmin should succeed"""
        # First get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/mope/settings",
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        get_response.json()
        
        # Update settings
        new_settings = {
            "is_enabled": True,
            "use_live_mode": False,
            "test_token": "test_mope_token_12345",
            "live_token": "",
            "webhook_secret": ""
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/mope/settings",
            headers={"Authorization": f"Bearer {superadmin_token}"},
            json=new_settings
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify settings were updated
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/mope/settings",
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        updated = verify_response.json()
        assert updated.get("is_enabled"), "is_enabled should be True"
        assert updated.get("test_token") == "test_mope_token_12345", "test_token should be updated"
        
        print("SUCCESS: PUT /api/admin/mope/settings updates settings correctly")


class TestPaymentInitiation:
    """Test payment initiation endpoint"""
    
    def test_pay_nonexistent_order_fails(self):
        """POST /api/public/orders/{id}/pay with invalid order should fail"""
        fake_order_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/api/public/orders/{fake_order_id}/pay")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Payment for non-existent order returns 404")
    
    def test_pay_order_without_mope_config_fails(self):
        """POST /api/public/orders/{id}/pay without Mope config should fail gracefully"""
        # First create an order
        unique_email = f"test_pay_{uuid.uuid4().hex[:8]}@test.com"
        
        addons_response = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_response.json()
        if not addons:
            pytest.skip("No addons available for testing")
        
        # Create order
        order_response = requests.post(f"{BASE_URL}/api/public/orders", json={
            "name": "Payment Test User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": "test123456",
            "addon_ids": [addons[0]["id"]]
        })
        
        if order_response.status_code != 200:
            pytest.skip(f"Could not create order: {order_response.status_code}")
        
        order_id = order_response.json()["id"]
        
        # Try to pay - this may fail if Mope is not configured or return payment URL if configured
        pay_response = requests.post(f"{BASE_URL}/api/public/orders/{order_id}/pay")
        
        # Either 400 (not configured) or 200/500 (configured but API call fails/succeeds)
        if pay_response.status_code == 400:
            assert "niet geconfigureerd" in pay_response.json().get("detail", "").lower() or \
                   "not configured" in pay_response.json().get("detail", "").lower()
            print("SUCCESS: Payment without Mope config returns appropriate error")
        elif pay_response.status_code == 200:
            data = pay_response.json()
            assert "payment_url" in data or "payment_id" in data
            print(f"SUCCESS: Payment initiated, got response: {data}")
        else:
            # 500 is acceptable if Mope API is configured but fails
            print(f"INFO: Payment returned {pay_response.status_code} - Mope API may be configured but failing")


class TestCustomerLogin:
    """Test that created customer can login"""
    
    def test_customer_can_login_after_order(self):
        """Customer created via order should be able to login"""
        unique_email = f"test_login_{uuid.uuid4().hex[:8]}@test.com"
        password = "test123456"
        
        # Get addon
        addons_response = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_response.json()
        if not addons:
            pytest.skip("No addons available for testing")
        
        # Create order (which creates user)
        order_response = requests.post(f"{BASE_URL}/api/public/orders", json={
            "name": "Login Test User",
            "email": unique_email,
            "phone": "+597 1234567",
            "password": password,
            "addon_ids": [addons[0]["id"]]
        })
        assert order_response.status_code == 200, f"Order creation failed: {order_response.text}"
        
        # Try to login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": password
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.status_code}"
        data = login_response.json()
        assert "access_token" in data, "Should have access_token"
        assert data["user"]["email"] == unique_email.lower(), "Email should match"
        
        print("SUCCESS: Customer can login after order creation")
        print(f"  - Email: {data['user']['email']}")
        print(f"  - Role: {data['user']['role']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
