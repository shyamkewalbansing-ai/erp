"""
Test suite for Admin Dashboard Tabs and Sidebar Order Settings features
Tests:
1. Login functionality with demo and admin credentials
2. Sidebar order GET/PUT endpoints
3. Admin dashboard access
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://module-trial.preview.emergentagent.com')

class TestLoginFunctionality:
    """Test login with demo and admin credentials"""
    
    def test_demo_user_login(self):
        """Test login with demo@facturatie.sr / demo2024"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "demo@facturatie.sr"
        assert data["user"]["role"] == "admin"
        print(f"Demo user login successful: {data['user']['name']}")
    
    def test_admin_user_login(self):
        """Test login with admin@facturatie.sr / admin123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@facturatie.sr",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@facturatie.sr"
        assert data["user"]["role"] == "superadmin"
        print(f"Admin user login successful: {data['user']['name']}")
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestSidebarOrderAPI:
    """Test sidebar order GET/PUT endpoints"""
    
    @pytest.fixture
    def demo_token(self):
        """Get demo user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Demo login failed")
    
    def test_get_sidebar_order(self, demo_token):
        """Test GET /api/user/sidebar-order returns module order"""
        headers = {"Authorization": f"Bearer {demo_token}"}
        response = requests.get(f"{BASE_URL}/api/user/sidebar-order", headers=headers)
        
        assert response.status_code == 200, f"GET sidebar order failed: {response.text}"
        data = response.json()
        
        # Should return module_order array (may be empty initially)
        assert "module_order" in data or data == {}
        print(f"Current sidebar order: {data}")
    
    def test_update_sidebar_order(self, demo_token):
        """Test PUT /api/user/sidebar-order updates module order"""
        headers = {"Authorization": f"Bearer {demo_token}"}
        
        # Set a new order
        new_order = ["hrm", "vastgoed_beheer", "autodealer", "boekhouding"]
        response = requests.put(
            f"{BASE_URL}/api/user/sidebar-order",
            headers=headers,
            json={"module_order": new_order}
        )
        
        assert response.status_code == 200, f"PUT sidebar order failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Sidebar order updated successfully")
        
        # Verify the order was saved
        get_response = requests.get(f"{BASE_URL}/api/user/sidebar-order", headers=headers)
        assert get_response.status_code == 200
        saved_data = get_response.json()
        assert saved_data.get("module_order") == new_order
        print(f"Verified saved order: {saved_data['module_order']}")
    
    def test_sidebar_order_requires_auth(self):
        """Test sidebar order endpoints require authentication"""
        # GET without auth
        response = requests.get(f"{BASE_URL}/api/user/sidebar-order")
        assert response.status_code in [401, 403]
        
        # PUT without auth
        response = requests.put(
            f"{BASE_URL}/api/user/sidebar-order",
            json={"module_order": ["test"]}
        )
        assert response.status_code in [401, 403]


class TestAdminDashboard:
    """Test admin dashboard access"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@facturatie.sr",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def demo_token(self):
        """Get demo user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Demo login failed")
    
    def test_admin_dashboard_access(self, admin_token):
        """Test admin can access admin dashboard endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        
        assert response.status_code == 200, f"Admin dashboard failed: {response.text}"
        data = response.json()
        
        # Should return dashboard stats
        assert "total_customers" in data
        assert "active_subscriptions" in data
        print(f"Admin dashboard: {data['total_customers']} customers, {data['active_subscriptions']} active")
    
    def test_admin_customers_list(self, admin_token):
        """Test admin can list customers"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/customers", headers=headers)
        
        assert response.status_code == 200, f"Admin customers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin customers: {len(data)} customers found")
    
    def test_demo_user_cannot_access_admin(self, demo_token):
        """Test demo user (non-superadmin) cannot access admin endpoints"""
        headers = {"Authorization": f"Bearer {demo_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        
        # Should return 403 Forbidden for non-superadmin
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Demo user correctly denied admin access")


class TestUserAddons:
    """Test user addons/modules API"""
    
    @pytest.fixture
    def demo_token(self):
        """Get demo user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Demo login failed")
    
    def test_get_my_addons(self, demo_token):
        """Test GET /api/user/addons returns user's active modules"""
        headers = {"Authorization": f"Bearer {demo_token}"}
        response = requests.get(f"{BASE_URL}/api/user/addons", headers=headers)
        
        assert response.status_code == 200, f"Get addons failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Demo user should have some active modules
        active_modules = [a for a in data if a.get("status") == "active"]
        print(f"User has {len(active_modules)} active modules")
        
        # List module names
        for addon in active_modules:
            print(f"  - {addon.get('addon_name', addon.get('addon_slug', 'Unknown'))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
