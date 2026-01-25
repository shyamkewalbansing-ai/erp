"""
Test CMS Website Beheer API endpoints
Tests for:
- Public CMS endpoints (menu, pages, footer)
- Admin CMS endpoints (pages CRUD, footer, settings)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicCMSEndpoints:
    """Test public CMS endpoints that don't require authentication"""
    
    def test_get_public_menu(self):
        """Test GET /api/public/cms/menu returns menu items"""
        response = requests.get(f"{BASE_URL}/api/public/cms/menu")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        
        # Check menu has expected pages
        menu_labels = [item["label"] for item in data["items"]]
        assert "Home" in menu_labels
        print(f"Menu items: {menu_labels}")
    
    def test_get_public_home_page(self):
        """Test GET /api/public/cms/page/home returns home page content"""
        response = requests.get(f"{BASE_URL}/api/public/cms/page/home")
        assert response.status_code == 200
        
        data = response.json()
        assert data["slug"] == "home"
        assert "sections" in data
        assert isinstance(data["sections"], list)
        assert len(data["sections"]) > 0
        
        # Check for hero section
        section_types = [s["type"] for s in data["sections"]]
        assert "hero" in section_types
        print(f"Home page sections: {section_types}")
    
    def test_get_public_over_ons_page(self):
        """Test GET /api/public/cms/page/over-ons returns Over Ons page"""
        response = requests.get(f"{BASE_URL}/api/public/cms/page/over-ons")
        assert response.status_code == 200
        
        data = response.json()
        assert data["slug"] == "over-ons"
        assert data["title"] == "Over Ons"
        print(f"Over Ons page title: {data['title']}")
    
    def test_get_public_contact_page(self):
        """Test GET /api/public/cms/page/contact returns Contact page"""
        response = requests.get(f"{BASE_URL}/api/public/cms/page/contact")
        assert response.status_code == 200
        
        data = response.json()
        assert data["slug"] == "contact"
        assert data["title"] == "Contact"
        print(f"Contact page title: {data['title']}")
    
    def test_get_public_footer(self):
        """Test GET /api/public/cms/footer returns footer configuration"""
        response = requests.get(f"{BASE_URL}/api/public/cms/footer")
        assert response.status_code == 200
        
        data = response.json()
        assert "columns" in data
        assert "copyright_text" in data
        print(f"Footer columns: {len(data['columns'])}")
    
    def test_get_nonexistent_page_returns_404(self):
        """Test GET /api/public/cms/page/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/cms/page/nonexistent-page-xyz")
        assert response.status_code == 404


class TestAdminCMSEndpoints:
    """Test admin CMS endpoints that require superadmin authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for superadmin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@facturatie.sr",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping admin tests")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_cms_pages_list(self, auth_headers):
        """Test GET /api/cms/pages returns list of all pages"""
        response = requests.get(f"{BASE_URL}/api/cms/pages", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4  # Home, Over Ons, Contact, HRM
        
        # Check page structure
        page_slugs = [p["slug"] for p in data]
        assert "home" in page_slugs
        assert "over-ons" in page_slugs
        assert "contact" in page_slugs
        print(f"CMS pages: {page_slugs}")
    
    def test_get_cms_footer(self, auth_headers):
        """Test GET /api/cms/footer returns footer for editing"""
        response = requests.get(f"{BASE_URL}/api/cms/footer", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "columns" in data
        assert "copyright_text" in data
        assert "background_color" in data
        assert "text_color" in data
        print(f"Footer has {len(data.get('columns', []))} columns")
    
    def test_get_landing_settings(self, auth_headers):
        """Test GET /api/admin/landing/settings returns settings"""
        response = requests.get(f"{BASE_URL}/api/admin/landing/settings", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Settings should have company info fields
        print(f"Settings keys: {list(data.keys())}")
    
    def test_update_cms_page(self, auth_headers):
        """Test PUT /api/cms/pages/{id} updates a page"""
        # First get the home page
        pages_response = requests.get(f"{BASE_URL}/api/cms/pages", headers=auth_headers)
        assert pages_response.status_code == 200
        
        pages = pages_response.json()
        home_page = next((p for p in pages if p["slug"] == "home"), None)
        assert home_page is not None
        
        # Update the page (just re-save with same data)
        update_response = requests.put(
            f"{BASE_URL}/api/cms/pages/{home_page['id']}", 
            headers=auth_headers,
            json=home_page
        )
        assert update_response.status_code == 200
        print("Home page update successful")
    
    def test_cms_pages_require_auth(self):
        """Test that CMS admin endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/cms/pages")
        assert response.status_code == 401 or response.status_code == 403
        print("CMS pages endpoint correctly requires auth")
    
    def test_update_footer(self, auth_headers):
        """Test PUT /api/cms/footer updates footer"""
        # First get current footer
        get_response = requests.get(f"{BASE_URL}/api/cms/footer", headers=auth_headers)
        assert get_response.status_code == 200
        
        footer_data = get_response.json()
        
        # Update footer (re-save with same data)
        update_response = requests.put(
            f"{BASE_URL}/api/cms/footer",
            headers=auth_headers,
            json=footer_data
        )
        assert update_response.status_code == 200
        print("Footer update successful")


class TestCMSDataIntegrity:
    """Test CMS data integrity and content"""
    
    def test_home_page_has_hero_section(self):
        """Test that home page has a hero section with required fields"""
        response = requests.get(f"{BASE_URL}/api/public/cms/page/home")
        assert response.status_code == 200
        
        data = response.json()
        hero_section = next((s for s in data["sections"] if s["type"] == "hero"), None)
        assert hero_section is not None
        assert "title" in hero_section
        assert hero_section["title"]  # Not empty
        print(f"Hero title: {hero_section['title']}")
    
    def test_home_page_has_features_section(self):
        """Test that home page has a features section"""
        response = requests.get(f"{BASE_URL}/api/public/cms/page/home")
        assert response.status_code == 200
        
        data = response.json()
        features_section = next((s for s in data["sections"] if s["type"] == "features"), None)
        assert features_section is not None
        print(f"Features section found: {features_section.get('title', 'No title')}")
    
    def test_home_page_has_cta_section(self):
        """Test that home page has a CTA section"""
        response = requests.get(f"{BASE_URL}/api/public/cms/page/home")
        assert response.status_code == 200
        
        data = response.json()
        cta_section = next((s for s in data["sections"] if s["type"] == "cta"), None)
        assert cta_section is not None
        print(f"CTA section found: {cta_section.get('title', 'No title')}")
    
    def test_menu_items_have_correct_links(self):
        """Test that menu items have correct page links"""
        response = requests.get(f"{BASE_URL}/api/public/cms/menu")
        assert response.status_code == 200
        
        data = response.json()
        for item in data["items"]:
            assert "link" in item
            assert "label" in item
            # Link should start with /
            assert item["link"].startswith("/") or item["link"].startswith("http")
        print(f"All {len(data['items'])} menu items have valid links")
    
    def test_footer_columns_have_links(self):
        """Test that footer columns have links"""
        response = requests.get(f"{BASE_URL}/api/public/cms/footer")
        assert response.status_code == 200
        
        data = response.json()
        for column in data.get("columns", []):
            assert "title" in column
            assert "links" in column
            for link in column.get("links", []):
                assert "label" in link
                assert "url" in link
        print(f"Footer has {len(data.get('columns', []))} columns with valid links")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
