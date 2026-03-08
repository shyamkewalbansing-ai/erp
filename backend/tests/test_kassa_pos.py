"""
Kassa POS System API Tests
Tests for the Point of Sale system for Suriname (Kassasysteem)
Covers: Authentication, Products, Categories, Orders, Customers, Reports
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "demo@koffiebar.sr"
TEST_USER_PASSWORD = "Demo2026!"
SUPERADMIN_EMAIL = "admin@kassapos.sr"
SUPERADMIN_PASSWORD = "KassaAdmin2026!"

# Test registration data
TEST_REGISTER_EMAIL = f"test_{uuid.uuid4().hex[:8]}@test.sr"

class TestKassaAuth:
    """Authentication endpoint tests for Kassa POS"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, "access_token missing from response"
        assert "business" in data, "business info missing from response"
        assert "user" in data, "user info missing from response"
        
        # Verify user data
        assert data["user"]["email"] == TEST_USER_EMAIL.lower()
        assert "id" in data["user"]
        assert "name" in data["user"]
        assert "role" in data["user"]
        
        # Verify business data
        assert "name" in data["business"]
        assert "btw_percentage" in data["business"]
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": "nonexistent@test.sr",
            "password": "anypassword"
        })
        
        assert response.status_code == 401
    
    def test_register_new_business(self):
        """Test business registration"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.sr"
        
        response = requests.post(f"{BASE_URL}/api/kassa/auth/register", json={
            "business_name": "TEST_Nieuwe Winkel BV",
            "email": unique_email,
            "password": "TestPass123!",
            "phone": "+597 123 4567"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "business" in data
        assert "user" in data
        assert data["message"] == "Registratie succesvol"
        
        # Verify business was created correctly
        assert data["business"]["name"] == "TEST_Nieuwe Winkel BV"
        assert data["business"]["email"] == unique_email.lower()
        assert data["business"]["subscription_plan"] == "basic"
        assert data["business"]["subscription_status"] == "trial"
    
    def test_register_duplicate_email(self):
        """Test registration with existing email fails"""
        response = requests.post(f"{BASE_URL}/api/kassa/auth/register", json={
            "business_name": "Duplicate Test",
            "email": TEST_USER_EMAIL,  # Already exists
            "password": "TestPass123!"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "al in gebruik" in data["detail"].lower()
    
    def test_auth_me_with_token(self):
        """Test getting current user info with valid token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/kassa/auth/me", 
                              headers={"Authorization": f"Bearer {token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        assert "business" in data
        assert "subscription" in data
        assert data["user"]["email"] == TEST_USER_EMAIL.lower()
    
    def test_auth_me_without_token(self):
        """Test /auth/me endpoint fails without token"""
        response = requests.get(f"{BASE_URL}/api/kassa/auth/me")
        assert response.status_code == 401


class TestKassaSuperadmin:
    """Superadmin endpoint tests"""
    
    def test_superadmin_login_success(self):
        """Test superadmin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/kassa/superadmin/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "access_token" in data
        assert data["role"] == "superadmin"
    
    def test_superadmin_login_invalid_credentials(self):
        """Test superadmin login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/kassa/superadmin/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401


class TestKassaProducts:
    """Product management endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate for product tests")
        return response.json()["access_token"]
    
    def test_get_products(self, auth_token):
        """Test getting all products"""
        response = requests.get(f"{BASE_URL}/api/kassa/products",
                              headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Expected list of products"
        
        # Check product structure if products exist
        if len(data) > 0:
            product = data[0]
            assert "id" in product
            assert "name" in product
            assert "price" in product
    
    def test_create_product(self, auth_token):
        """Test creating a new product"""
        response = requests.post(f"{BASE_URL}/api/kassa/products",
                               headers={"Authorization": f"Bearer {auth_token}"},
                               json={
                                   "name": "TEST_Espresso Doppio",
                                   "price": 12.50,
                                   "description": "Double espresso shot",
                                   "stock_quantity": 100,
                                   "is_active": True
                               })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Espresso Doppio"
        assert data["price"] == 12.50
        assert "id" in data
        
        # Verify product was persisted by fetching it
        get_response = requests.get(f"{BASE_URL}/api/kassa/products/{data['id']}",
                                   headers={"Authorization": f"Bearer {auth_token}"})
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == "TEST_Espresso Doppio"
    
    def test_search_products(self, auth_token):
        """Test product search functionality"""
        response = requests.get(f"{BASE_URL}/api/kassa/products?search=Espresso",
                              headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestKassaCategories:
    """Category management endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate for category tests")
        return response.json()["access_token"]
    
    def test_get_categories(self, auth_token):
        """Test getting all categories"""
        response = requests.get(f"{BASE_URL}/api/kassa/categories",
                              headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Expected list of categories"
        
        # Verify default categories exist or custom categories
        if len(data) > 0:
            category = data[0]
            assert "id" in category
            assert "name" in category
    
    def test_create_category(self, auth_token):
        """Test creating a new category"""
        response = requests.post(f"{BASE_URL}/api/kassa/categories",
                               headers={"Authorization": f"Bearer {auth_token}"},
                               json={
                                   "name": "TEST_Speciale Koffies",
                                   "color": "#FF5733",
                                   "sort_order": 10
                               })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Speciale Koffies"
        assert data["color"] == "#FF5733"
        assert "id" in data


class TestKassaOrders:
    """Order/Sales endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate for order tests")
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_product(self, auth_token):
        """Create a test product for order testing"""
        response = requests.post(f"{BASE_URL}/api/kassa/products",
                               headers={"Authorization": f"Bearer {auth_token}"},
                               json={
                                   "name": f"TEST_Order_Product_{uuid.uuid4().hex[:8]}",
                                   "price": 10.00,
                                   "stock_quantity": 50
                               })
        if response.status_code != 200:
            pytest.skip("Could not create test product")
        return response.json()
    
    def test_get_orders(self, auth_token):
        """Test getting all orders"""
        response = requests.get(f"{BASE_URL}/api/kassa/orders",
                              headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_order_cash(self, auth_token, test_product):
        """Test creating a cash order"""
        order_total = test_product["price"] * 2  # 2 items
        btw = order_total * 0.08  # 8% BTW
        total_with_btw = order_total + btw
        
        response = requests.post(f"{BASE_URL}/api/kassa/orders",
                               headers={"Authorization": f"Bearer {auth_token}"},
                               json={
                                   "items": [{
                                       "product_id": test_product["id"],
                                       "product_name": test_product["name"],
                                       "quantity": 2,
                                       "unit_price": test_product["price"],
                                       "discount": 0
                                   }],
                                   "payment_method": "cash",
                                   "amount_paid": 25.00,  # Enough to cover total + BTW
                                   "discount_total": 0
                               })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "order_number" in data
        assert data["order_number"].startswith("POS-")
        assert data["payment_method"] == "cash"
        assert data["status"] == "completed"
        assert "change" in data
        assert data["total"] > 0
        
        # Verify order was persisted
        get_response = requests.get(f"{BASE_URL}/api/kassa/orders/{data['id']}",
                                   headers={"Authorization": f"Bearer {auth_token}"})
        assert get_response.status_code == 200
    
    def test_create_order_pin(self, auth_token, test_product):
        """Test creating a PIN payment order"""
        order_total = test_product["price"] * 1
        btw = order_total * 0.08
        total_with_btw = order_total + btw
        
        response = requests.post(f"{BASE_URL}/api/kassa/orders",
                               headers={"Authorization": f"Bearer {auth_token}"},
                               json={
                                   "items": [{
                                       "product_id": test_product["id"],
                                       "product_name": test_product["name"],
                                       "quantity": 1,
                                       "unit_price": test_product["price"],
                                       "discount": 0
                                   }],
                                   "payment_method": "pin",
                                   "amount_paid": total_with_btw,
                                   "discount_total": 0
                               })
        
        assert response.status_code == 200
        data = response.json()
        assert data["payment_method"] == "pin"
    
    def test_create_order_insufficient_payment(self, auth_token, test_product):
        """Test order creation fails with insufficient payment"""
        response = requests.post(f"{BASE_URL}/api/kassa/orders",
                               headers={"Authorization": f"Bearer {auth_token}"},
                               json={
                                   "items": [{
                                       "product_id": test_product["id"],
                                       "product_name": test_product["name"],
                                       "quantity": 1,
                                       "unit_price": test_product["price"],
                                       "discount": 0
                                   }],
                                   "payment_method": "cash",
                                   "amount_paid": 1.00,  # Not enough
                                   "discount_total": 0
                               })
        
        assert response.status_code == 400
        assert "Onvoldoende" in response.json()["detail"]


class TestKassaCustomers:
    """Customer management endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate for customer tests")
        return response.json()["access_token"]
    
    def test_get_customers(self, auth_token):
        """Test getting all customers"""
        response = requests.get(f"{BASE_URL}/api/kassa/customers",
                              headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_customer(self, auth_token):
        """Test creating a new customer"""
        response = requests.post(f"{BASE_URL}/api/kassa/customers",
                               headers={"Authorization": f"Bearer {auth_token}"},
                               json={
                                   "name": f"TEST_Klant_{uuid.uuid4().hex[:8]}",
                                   "email": f"test_{uuid.uuid4().hex[:8]}@klant.sr",
                                   "phone": "+597 999 8888",
                                   "loyalty_points": 0
                               })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "name" in data
        assert data["loyalty_points"] == 0
        assert data["total_spent"] == 0


class TestKassaReports:
    """Reports endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate for report tests")
        return response.json()["access_token"]
    
    def test_daily_report(self, auth_token):
        """Test getting daily sales report"""
        response = requests.get(f"{BASE_URL}/api/kassa/reports/daily",
                              headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "date" in data
        assert "total_sales" in data
        assert "total_btw" in data
        assert "total_orders" in data
        assert "payment_methods" in data
    
    def test_inventory_report(self, auth_token):
        """Test getting inventory report"""
        response = requests.get(f"{BASE_URL}/api/kassa/reports/inventory",
                              headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_products" in data
        assert "total_inventory_value" in data
        assert "low_stock_count" in data
        assert "out_of_stock_count" in data


class TestKassaSettings:
    """Settings endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate for settings tests")
        return response.json()["access_token"]
    
    def test_get_settings(self, auth_token):
        """Test getting business settings"""
        response = requests.get(f"{BASE_URL}/api/kassa/settings",
                              headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "business_name" in data
        assert "btw_percentage" in data
        assert "currency" in data
        assert data["currency"] == "SRD"


class TestKassaPlans:
    """Subscription plans endpoint tests"""
    
    def test_get_plans(self):
        """Test getting subscription plans (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/kassa/plans")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "basic" in data
        assert "pro" in data
        assert "enterprise" in data
        
        # Verify plan structure
        basic_plan = data["basic"]
        assert basic_plan["price_monthly"] == 49.00
        assert basic_plan["currency"] == "SRD"
    
    def test_get_subscription(self):
        """Test getting current subscription (requires auth)"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/kassa/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        response = requests.get(f"{BASE_URL}/api/kassa/subscription",
                              headers={"Authorization": f"Bearer {token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "plan" in data
        assert "status" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
