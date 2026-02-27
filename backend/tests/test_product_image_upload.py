"""
Test Product Image Upload and Artikel Dropdown Features
========================================================
Tests for:
1. Image upload endpoint POST /api/boekhouding/upload-image
2. Product creation with foto_url via POST /api/boekhouding/artikelen
3. Artikel retrieval for dropdown (GET /api/boekhouding/artikelen)
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestImageUpload:
    """Test image upload endpoint"""
    
    def test_upload_image_success(self, auth_token):
        """Test successful image upload"""
        # Create a simple test image (1x1 pixel PNG)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 pixel
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_product.png', io.BytesIO(png_data), 'image/png')
        }
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/upload-image",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "url" in data, "Response should contain 'url'"
        assert "filename" in data, "Response should contain 'filename'"
        assert data["url"].startswith("/api/boekhouding/images/"), "URL should start with /api/boekhouding/images/"
        assert "product_" in data["filename"], "Filename should contain 'product_'"
        
        print(f"Image uploaded successfully: {data['url']}")
        return data["url"]
    
    def test_upload_image_invalid_type(self, auth_token):
        """Test upload with invalid file type"""
        files = {
            'file': ('test.txt', io.BytesIO(b'This is not an image'), 'text/plain')
        }
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/upload-image",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 400, "Should reject non-image files"
        print("Invalid file type correctly rejected")
    
    def test_upload_image_unauthorized(self):
        """Test upload without authentication"""
        png_data = bytes([0x89, 0x50, 0x4E, 0x47])  # Minimal PNG header
        files = {
            'file': ('test.png', io.BytesIO(png_data), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/upload-image",
            files=files
        )
        
        assert response.status_code == 401, "Should require authentication"
        print("Unauthorized upload correctly rejected")


class TestArtikelWithImage:
    """Test artikel (product) creation with image URL"""
    
    def test_create_artikel_with_foto_url(self, auth_headers):
        """Test creating a product with foto_url"""
        artikel_data = {
            "code": "TEST-IMG-001",
            "naam": "Test Product Met Foto",
            "omschrijving": "Product voor test met afbeelding",
            "type": "product",
            "eenheid": "stuk",
            "inkoopprijs": 50.00,
            "verkoopprijs": 75.00,
            "btw_code": "V25",
            "minimum_voorraad": 5,
            "foto_url": "/api/boekhouding/images/test_product.png"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/artikelen",
            json=artikel_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create artikel failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert data.get("code") == "TEST-IMG-001", "Code should match"
        assert data.get("naam") == "Test Product Met Foto", "Name should match"
        assert data.get("foto_url") == "/api/boekhouding/images/test_product.png", "foto_url should be saved"
        assert data.get("verkoopprijs") == 75.00, "Sales price should match"
        assert "id" in data, "Should have an ID"
        
        print(f"Artikel created with foto_url: {data.get('foto_url')}")
        return data
    
    def test_create_artikel_without_foto_url(self, auth_headers):
        """Test creating a product without foto_url (should work)"""
        artikel_data = {
            "code": "TEST-NOFOTO-001",
            "naam": "Test Product Zonder Foto",
            "type": "product",
            "eenheid": "stuk",
            "inkoopprijs": 30.00,
            "verkoopprijs": 45.00,
            "btw_code": "V10"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/artikelen",
            json=artikel_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create artikel failed: {response.text}"
        data = response.json()
        
        assert data.get("code") == "TEST-NOFOTO-001", "Code should match"
        # foto_url should be None or not present
        assert data.get("foto_url") is None or "foto_url" not in data or data.get("foto_url") == "", "foto_url should be empty/None"
        
        print("Artikel created without foto_url successfully")
        return data


class TestArtikelDropdown:
    """Test artikel retrieval for dropdown functionality"""
    
    def test_get_artikelen_list(self, auth_headers):
        """Test getting list of artikelen for dropdown"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/artikelen",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get artikelen failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"Retrieved {len(data)} artikelen")
        
        # Check that artikelen have required fields for dropdown
        if len(data) > 0:
            artikel = data[0]
            assert "id" in artikel, "Artikel should have 'id'"
            assert "naam" in artikel or "name" in artikel, "Artikel should have 'naam' or 'name'"
            # verkoopprijs is needed for auto-fill
            print(f"Sample artikel: {artikel.get('naam', artikel.get('name'))} - verkoopprijs: {artikel.get('verkoopprijs', artikel.get('sales_price', 'N/A'))}")
        
        return data
    
    def test_artikelen_have_verkoopprijs(self, auth_headers):
        """Test that artikelen have verkoopprijs for price auto-fill"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/artikelen",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that at least some artikelen have verkoopprijs
        artikelen_with_price = [a for a in data if a.get('verkoopprijs') or a.get('sales_price')]
        print(f"Artikelen with verkoopprijs: {len(artikelen_with_price)} out of {len(data)}")
        
        # If we have test products, they should have prices
        test_products = [a for a in data if a.get('code', '').startswith('TEST-')]
        for p in test_products:
            assert p.get('verkoopprijs') is not None or p.get('sales_price') is not None, \
                f"Test product {p.get('code')} should have verkoopprijs"
        
        return data


class TestImageServing:
    """Test that uploaded images can be served"""
    
    def test_serve_uploaded_image(self, auth_token):
        """Test serving an uploaded image"""
        # First upload an image
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('serve_test.png', io.BytesIO(png_data), 'image/png')
        }
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/boekhouding/upload-image",
            files=files,
            headers=headers
        )
        
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        image_url = upload_data["url"]
        
        # Now try to serve the image
        serve_response = requests.get(f"{BASE_URL}{image_url}")
        
        assert serve_response.status_code == 200, f"Image serving failed: {serve_response.status_code}"
        assert serve_response.headers.get('content-type') in ['image/png', 'image/jpeg'], \
            f"Content-Type should be image: {serve_response.headers.get('content-type')}"
        
        print(f"Image served successfully from {image_url}")
    
    def test_serve_nonexistent_image(self):
        """Test serving a non-existent image returns 404"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/images/nonexistent_image_12345.png")
        
        assert response.status_code == 404, "Should return 404 for non-existent image"
        print("Non-existent image correctly returns 404")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_artikelen(self, auth_headers):
        """Clean up test artikelen created during tests"""
        # Get all artikelen
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/artikelen",
            headers=auth_headers
        )
        
        if response.status_code == 200:
            artikelen = response.json()
            test_artikelen = [a for a in artikelen if a.get('code', '').startswith('TEST-')]
            
            for artikel in test_artikelen:
                delete_response = requests.delete(
                    f"{BASE_URL}/api/boekhouding/artikelen/{artikel['id']}",
                    headers=auth_headers
                )
                if delete_response.status_code == 200:
                    print(f"Deleted test artikel: {artikel.get('code')}")
        
        print("Cleanup completed")
