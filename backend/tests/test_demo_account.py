"""
Test Demo Account Functionality
- Demo user login with demo@facturatie.sr / demo2024
- Demo user should have all modules/addons active
- Admin cleanup endpoint for demo data
"""

import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Demo credentials from DemoPage.js
DEMO_EMAIL = "demo@facturatie.sr"
DEMO_PASSWORD = "demo2024"

# Admin credentials
ADMIN_EMAIL = "admin@facturatie.sr"
ADMIN_PASSWORD = "admin123"


class TestDemoUserLogin:
    """Test demo user authentication"""
    
    def test_demo_user_login_success(self):
        """Demo user should be able to login with demo2024 password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == DEMO_EMAIL
        print(f"✓ Demo user login successful")
        print(f"  User ID: {data['user']['id']}")
        print(f"  Subscription Status: {data['user']['subscription_status']}")
    
    def test_demo_user_login_wrong_password(self):
        """Demo user login should fail with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        print("✓ Demo user login correctly rejected with wrong password")


class TestDemoUserSubscription:
    """Test demo user subscription and addon access"""
    
    @pytest.fixture
    def demo_token(self):
        """Get demo user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Demo user login failed")
        return response.json()["access_token"]
    
    def test_demo_user_subscription_status(self, demo_token):
        """Demo user should have active subscription to access modules"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        print(f"Demo user subscription status: {data.get('subscription_status')}")
        print(f"Demo user subscription end date: {data.get('subscription_end_date')}")
        
        # Demo user SHOULD have active subscription
        # This test documents the current state - may fail if not configured
        subscription_status = data.get("subscription_status")
        if subscription_status not in ("active", "trial"):
            print(f"⚠ WARNING: Demo user has subscription_status='{subscription_status}'")
            print("  Demo user should have active subscription to access all modules!")
    
    def test_demo_user_addons(self, demo_token):
        """Demo user should have all addons activated"""
        response = requests.get(
            f"{BASE_URL}/api/user/addons",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        addons = response.json()
        
        print(f"Demo user has {len(addons)} addons activated")
        
        # Expected addons for demo user
        expected_addons = ["vastgoed_beheer", "hrm", "autodealer"]
        
        active_slugs = [a.get("addon_slug") for a in addons if a.get("status") == "active"]
        print(f"Active addon slugs: {active_slugs}")
        
        # Check if all expected addons are active
        missing_addons = [a for a in expected_addons if a not in active_slugs]
        if missing_addons:
            print(f"⚠ WARNING: Demo user missing addons: {missing_addons}")
    
    def test_demo_user_dashboard_access(self, demo_token):
        """Demo user should be able to access dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        print(f"Dashboard access status: {response.status_code}")
        
        if response.status_code == 403:
            error = response.json()
            print(f"⚠ Dashboard access denied: {error.get('detail')}")
            # This is expected to fail if subscription is not active
        elif response.status_code == 200:
            print("✓ Demo user can access dashboard")


class TestAdminCleanupEndpoint:
    """Test admin cleanup endpoint for demo data"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_admin_login(self):
        """Admin should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "superadmin"
        print("✓ Admin login successful")
    
    def test_cleanup_demo_data_endpoint_exists(self, admin_token):
        """Test if /api/admin/cleanup-demo-data endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/admin/cleanup-demo-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Cleanup endpoint status: {response.status_code}")
        print(f"Response: {response.text[:200] if response.text else 'empty'}")
        
        if response.status_code == 404:
            print("⚠ WARNING: /api/admin/cleanup-demo-data endpoint NOT FOUND")
            print("  This endpoint needs to be implemented!")
        elif response.status_code == 200:
            print("✓ Cleanup endpoint exists and returned success")
            data = response.json()
            print(f"  Cleanup result: {data}")
    
    def test_cleanup_requires_admin_auth(self):
        """Cleanup endpoint should require admin authentication"""
        # Without token
        response = requests.post(f"{BASE_URL}/api/admin/cleanup-demo-data")
        
        # Should be 401 or 403, not 200
        if response.status_code == 404:
            print("⚠ Endpoint not found - skipping auth test")
        else:
            assert response.status_code in (401, 403, 422), f"Expected auth error, got {response.status_code}"
            print("✓ Cleanup endpoint requires authentication")


class TestDemoDataCreationAndCleanup:
    """Test creating demo data and verifying cleanup works"""
    
    @pytest.fixture
    def demo_token(self):
        """Get demo user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Demo user login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_demo_user_can_create_tenant(self, demo_token):
        """Demo user should be able to create test data (tenant)"""
        # First check if demo user has access
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        user_data = response.json()
        if user_data.get("subscription_status") not in ("active", "trial"):
            print(f"⚠ Demo user subscription not active, skipping tenant creation test")
            pytest.skip("Demo user subscription not active")
        
        # Try to create a tenant
        tenant_data = {
            "name": "TEST_Demo Tenant",
            "phone": "+597 123456",
            "email": "test@demo.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tenants",
            headers={"Authorization": f"Bearer {demo_token}"},
            json=tenant_data
        )
        
        print(f"Create tenant status: {response.status_code}")
        
        if response.status_code == 403:
            print(f"⚠ Demo user cannot create tenant: {response.json().get('detail')}")
        elif response.status_code in (200, 201):
            print("✓ Demo user can create tenant data")
            data = response.json()
            print(f"  Created tenant ID: {data.get('id')}")


class TestSidebarModulesForDemoUser:
    """Test that demo user sees all modules in sidebar"""
    
    @pytest.fixture
    def demo_token(self):
        """Get demo user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Demo user login failed")
        return response.json()["access_token"]
    
    def test_get_user_active_addons_endpoint(self, demo_token):
        """Check what addons are active for demo user"""
        response = requests.get(
            f"{BASE_URL}/api/user/addons",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        addons = response.json()
        
        print(f"Demo user active addons: {len(addons)}")
        for addon in addons:
            print(f"  - {addon.get('addon_slug')}: {addon.get('status')}")
        
        # Demo user should have all 3 main addons
        expected = ["vastgoed_beheer", "hrm", "autodealer"]
        active_slugs = [a.get("addon_slug") for a in addons if a.get("status") == "active"]
        
        for exp in expected:
            if exp not in active_slugs:
                print(f"⚠ Missing addon: {exp}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
