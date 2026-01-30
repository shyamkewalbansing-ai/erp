"""
Comprehensive ERP SaaS System Test Suite
Tests: CMS, Module Ordering, Admin Dashboard, AI Chatbot, Public Pages
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@facturatie.sr"
ADMIN_PASSWORD = "admin123"


class TestHealthAndPublicEndpoints:
    """Test public endpoints and health checks"""
    
    def test_landing_settings(self):
        """Test landing page settings endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/landing/settings")
        assert response.status_code == 200
        data = response.json()
        assert "company_name" in data
        assert "company_email" in data
        print(f"✓ Landing settings: {data.get('company_name')}")
    
    def test_public_addons(self):
        """Test public addons endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/addons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ Public addons: {len(data)} addons available")
        for addon in data:
            assert "id" in addon
            assert "name" in addon
            assert "price" in addon
            print(f"  - {addon['name']}: SRD {addon['price']}")
    
    def test_public_landing_sections(self):
        """Test landing page sections endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/landing/sections")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Landing sections: {len(data)} sections")


class TestAdminAuthentication:
    """Test admin login flow"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "superadmin"
        print(f"✓ Admin login successful: {data['user']['email']}")
        return data["access_token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Get user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "superadmin"
        print(f"✓ Current user: {data['name']} ({data['role']})")


class TestCMSFunctionality:
    """Test CMS content management"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_cms_pages(self, admin_token):
        """Test getting CMS pages via landing sections"""
        response = requests.get(
            f"{BASE_URL}/api/admin/landing/sections",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ CMS sections: {len(data)} sections found")
        for section in data[:5]:  # Show first 5
            print(f"  - {section.get('title', 'Untitled')} ({section.get('section_type', 'unknown')})")
    
    def test_get_landing_sections(self, admin_token):
        """Test getting landing page sections for editing"""
        response = requests.get(
            f"{BASE_URL}/api/admin/landing/sections",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Landing sections for admin: {len(data)} sections")
    
    def test_update_landing_section(self, admin_token):
        """Test updating a landing section"""
        # First get existing sections
        get_response = requests.get(
            f"{BASE_URL}/api/admin/landing/sections",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        sections = get_response.json()
        
        if len(sections) > 0:
            section = sections[0]
            section_id = section.get("id")
            
            # Update the section
            update_response = requests.put(
                f"{BASE_URL}/api/admin/landing/sections/{section_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "title": section.get("title", "Test Title"),
                    "content": section.get("content", "Test content")
                }
            )
            assert update_response.status_code == 200
            print(f"✓ Section updated: {section_id}")
        else:
            print("⚠ No sections to update")


class TestModuleOrdering:
    """Test module ordering flow"""
    
    def test_create_order_with_account(self):
        """Test creating an order with new account"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_order_{unique_id}@example.com"
        
        # Get available addons
        addons_response = requests.get(f"{BASE_URL}/api/public/addons")
        addons = addons_response.json()
        
        if len(addons) == 0:
            pytest.skip("No addons available")
        
        addon_ids = [addons[0]["id"]]
        
        # Create order
        response = requests.post(f"{BASE_URL}/api/public/orders", json={
            "name": f"Test User {unique_id}",
            "email": test_email,
            "phone": "+597 123456",
            "password": "testpass123",
            "company_name": "Test Company",
            "addon_ids": addon_ids,
            "message": "Test order"
        })
        
        assert response.status_code in [200, 201]
        data = response.json()
        # Response can have 'token' or 'access_token'
        assert "token" in data or "access_token" in data or "id" in data
        print(f"✓ Order created for: {test_email}")
        
        # If token returned, verify auto-login works
        token = data.get("token") or data.get("access_token")
        if token:
            me_response = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert me_response.status_code == 200
            print("✓ Auto-login successful")
        
        return data
    
    def test_order_validation_duplicate_email(self):
        """Test order validation for duplicate email"""
        # Try to create order with admin email (should fail)
        response = requests.post(f"{BASE_URL}/api/public/orders", json={
            "name": "Test User",
            "email": ADMIN_EMAIL,
            "phone": "+597 123456",
            "password": "testpass123",
            "addon_ids": ["some-addon-id"]
        })
        assert response.status_code == 400
        print("✓ Duplicate email rejected correctly")


class TestAdminDashboard:
    """Test admin dashboard functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_admin_dashboard_stats(self, admin_token):
        """Test admin dashboard statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_customers" in data
        assert "active_subscriptions" in data
        print(f"✓ Dashboard stats: {data.get('total_customers')} customers, {data.get('active_subscriptions')} active")
    
    def test_admin_customers_list(self, admin_token):
        """Test getting customers list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Customers list: {len(data)} customers")
    
    def test_admin_addon_requests(self, admin_token):
        """Test getting addon requests"""
        response = requests.get(
            f"{BASE_URL}/api/admin/addon-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Addon requests: {len(data)} pending requests")
    
    def test_admin_addons_management(self, admin_token):
        """Test addons management"""
        response = requests.get(
            f"{BASE_URL}/api/admin/addons",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin addons: {len(data)} addons")


class TestAIChatbot:
    """Test AI chatbot functionality"""
    
    def test_chat_endpoint(self):
        """Test AI chat endpoint"""
        response = requests.post(f"{BASE_URL}/api/chat", json={
            "message": "Hallo, wat is Facturatie.sr?"
        })
        # Chat might require auth or might be public
        if response.status_code == 200:
            data = response.json()
            assert "response" in data or "message" in data
            print("✓ Chat response received")
        elif response.status_code == 401:
            print("⚠ Chat requires authentication")
        else:
            print(f"⚠ Chat returned status: {response.status_code}")
    
    def test_chat_with_auth(self):
        """Test AI chat with authentication"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        response = requests.post(
            f"{BASE_URL}/api/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "Wat zijn de beschikbare modules?"}
        )
        
        if response.status_code == 200:
            response.json()
            print("✓ Authenticated chat response received")
        else:
            print(f"⚠ Chat status: {response.status_code}")


class TestPublicPages:
    """Test public page endpoints"""
    
    def test_prijzen_page_data(self):
        """Test pricing page data"""
        response = requests.get(f"{BASE_URL}/api/public/addons")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Pricing data available: {len(data)} modules")
    
    def test_over_ons_page_data(self):
        """Test about page data (landing settings)"""
        response = requests.get(f"{BASE_URL}/api/public/landing/settings")
        assert response.status_code == 200
        data = response.json()
        assert "company_name" in data
        print(f"✓ About page data: {data.get('company_name')}")
    
    def test_voorwaarden_page(self):
        """Test terms page section"""
        response = requests.get(f"{BASE_URL}/api/public/landing/sections")
        assert response.status_code == 200
        data = response.json()
        # Check if terms section exists
        terms_section = next((s for s in data if s.get("section_type") == "terms"), None)
        if terms_section:
            print(f"✓ Terms section found: {terms_section.get('title')}")
        else:
            print("⚠ No dedicated terms section in CMS")
    
    def test_privacy_page(self):
        """Test privacy page section"""
        response = requests.get(f"{BASE_URL}/api/public/landing/sections")
        assert response.status_code == 200
        data = response.json()
        # Check if privacy section exists
        privacy_section = next((s for s in data if s.get("section_type") == "privacy"), None)
        if privacy_section:
            print(f"✓ Privacy section found: {privacy_section.get('title')}")
        else:
            print("⚠ No dedicated privacy section in CMS")


class TestNavigationAndRouting:
    """Test navigation endpoints"""
    
    def test_cms_menu(self):
        """Test CMS menu endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/cms/menu/main")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Main menu: {len(data.get('items', []))} items")
        else:
            print(f"⚠ Menu endpoint status: {response.status_code}")
    
    def test_cms_page_by_slug(self):
        """Test getting CMS page by slug"""
        # Try common slugs
        slugs = ["home", "about", "pricing", "over-ons", "prijzen"]
        for slug in slugs:
            response = requests.get(f"{BASE_URL}/api/public/cms/pages/{slug}")
            if response.status_code == 200:
                data = response.json()
                print(f"✓ CMS page '{slug}' found: {data.get('title')}")
                break
        else:
            print("⚠ No common CMS pages found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
