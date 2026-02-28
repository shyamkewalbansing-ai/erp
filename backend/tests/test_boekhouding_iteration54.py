"""
Test suite for Boekhouding Module - Iteration 54
Tests: Logo upload, Dashboard KPIs, Verkoop, Inkoop, Rapportages, Grootboek, BTW
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"


class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestDashboard:
    """Dashboard KPI tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_kpis(self, auth_headers):
        """Test dashboard KPIs endpoint"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify KPI structure
        assert "omzet" in data, "Missing omzet in dashboard"
        assert "kosten" in data, "Missing kosten in dashboard"
        assert "openstaand" in data, "Missing openstaand in dashboard"
        assert "btw" in data, "Missing btw in dashboard"
        assert "liquiditeit" in data, "Missing liquiditeit in dashboard"
        
        print(f"✓ Dashboard KPIs loaded - Omzet: {data['omzet']}")
    
    def test_dashboard_charts(self, auth_headers):
        """Test dashboard charts endpoint"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/dashboard/charts", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard charts failed: {response.text}"
        data = response.json()
        
        assert "omzet_kosten" in data, "Missing omzet_kosten chart data"
        assert "ouderdom" in data, "Missing ouderdom chart data"
        print(f"✓ Dashboard charts loaded")


class TestLogoUpload:
    """Logo upload functionality tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_upload_image_endpoint_exists(self, auth_headers):
        """Test that upload-image endpoint exists"""
        # Create a simple test image (1x1 pixel PNG)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 pixel
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('test_logo.png', io.BytesIO(png_data), 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/upload-image",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "url" in data, "No URL in upload response"
        assert "filename" in data, "No filename in upload response"
        print(f"✓ Logo upload successful - URL: {data['url']}")
    
    def test_upload_invalid_file_type(self, auth_headers):
        """Test that invalid file types are rejected"""
        files = {'file': ('test.txt', io.BytesIO(b'test content'), 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/upload-image",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 400, "Should reject non-image files"
        print(f"✓ Invalid file type correctly rejected")


class TestInstellingen:
    """Instellingen (Settings) tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_instellingen(self, auth_headers):
        """Test getting company settings"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/instellingen", headers=auth_headers)
        assert response.status_code == 200, f"Get settings failed: {response.text}"
        data = response.json()
        print(f"✓ Settings loaded - Company: {data.get('bedrijfsnaam', 'N/A')}")
    
    def test_update_instellingen(self, auth_headers):
        """Test updating company settings"""
        update_data = {
            "bedrijfsnaam": "Test Bedrijf",
            "standaard_betalingstermijn": 30
        }
        response = requests.put(
            f"{BASE_URL}/api/boekhouding/instellingen",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update settings failed: {response.text}"
        print(f"✓ Settings updated successfully")


class TestBedrijven:
    """Multi-tenant bedrijven tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_bedrijven(self, auth_headers):
        """Test getting all companies"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/bedrijven", headers=auth_headers)
        assert response.status_code == 200, f"Get bedrijven failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Bedrijven should be a list"
        print(f"✓ Bedrijven loaded - Count: {len(data)}")
    
    def test_get_actief_bedrijf(self, auth_headers):
        """Test getting active company"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/bedrijven/actief", headers=auth_headers)
        assert response.status_code == 200, f"Get actief bedrijf failed: {response.text}"
        data = response.json()
        assert "id" in data, "Active company should have id"
        print(f"✓ Active company: {data.get('naam', 'N/A')}")


class TestVerkoopfacturen:
    """Verkoop (Sales) tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_verkoopfacturen(self, auth_headers):
        """Test getting sales invoices"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/verkoopfacturen", headers=auth_headers)
        assert response.status_code == 200, f"Get verkoopfacturen failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Verkoopfacturen should be a list"
        print(f"✓ Verkoopfacturen loaded - Count: {len(data)}")
    
    def test_get_debiteuren(self, auth_headers):
        """Test getting customers (debiteuren)"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/debiteuren", headers=auth_headers)
        assert response.status_code == 200, f"Get debiteuren failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Debiteuren should be a list"
        print(f"✓ Debiteuren loaded - Count: {len(data)}")


class TestInkoopfacturen:
    """Inkoop (Purchase) tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_inkoopfacturen(self, auth_headers):
        """Test getting purchase invoices"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/inkoopfacturen", headers=auth_headers)
        assert response.status_code == 200, f"Get inkoopfacturen failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Inkoopfacturen should be a list"
        print(f"✓ Inkoopfacturen loaded - Count: {len(data)}")
    
    def test_get_crediteuren(self, auth_headers):
        """Test getting suppliers (crediteuren)"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/crediteuren", headers=auth_headers)
        assert response.status_code == 200, f"Get crediteuren failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Crediteuren should be a list"
        print(f"✓ Crediteuren loaded - Count: {len(data)}")


class TestRapportages:
    """Rapportages (Reports) tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_balans_report(self, auth_headers):
        """Test balance sheet report"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/rapportages/balans", headers=auth_headers)
        assert response.status_code == 200, f"Balans report failed: {response.text}"
        data = response.json()
        print(f"✓ Balans report loaded")
    
    def test_winst_verlies_report(self, auth_headers):
        """Test profit/loss report"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/rapportages/winst-verlies", headers=auth_headers)
        assert response.status_code == 200, f"Winst/Verlies report failed: {response.text}"
        data = response.json()
        print(f"✓ Winst/Verlies report loaded")
    
    def test_btw_report(self, auth_headers):
        """Test BTW report"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/rapportages/btw", headers=auth_headers)
        assert response.status_code == 200, f"BTW report failed: {response.text}"
        data = response.json()
        print(f"✓ BTW report loaded")
    
    def test_ouderdom_debiteuren(self, auth_headers):
        """Test aging receivables report"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/rapportages/ouderdom/debiteuren", headers=auth_headers)
        assert response.status_code == 200, f"Ouderdom debiteuren failed: {response.text}"
        data = response.json()
        print(f"✓ Ouderdom debiteuren report loaded")


class TestGrootboek:
    """Grootboek (General Ledger) tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_rekeningen(self, auth_headers):
        """Test getting chart of accounts"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/rekeningen", headers=auth_headers)
        assert response.status_code == 200, f"Get rekeningen failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Rekeningen should be a list"
        print(f"✓ Rekeningen loaded - Count: {len(data)}")
    
    def test_get_journaalposten(self, auth_headers):
        """Test getting journal entries"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/journaalposten", headers=auth_headers)
        assert response.status_code == 200, f"Get journaalposten failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Journaalposten should be a list"
        print(f"✓ Journaalposten loaded - Count: {len(data)}")


class TestBTW:
    """BTW (VAT) tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_btw_codes(self, auth_headers):
        """Test getting BTW codes"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/btw-codes", headers=auth_headers)
        assert response.status_code == 200, f"Get BTW codes failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "BTW codes should be a list"
        print(f"✓ BTW codes loaded - Count: {len(data)}")


class TestArtikelen:
    """Artikelen (Products) tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_artikelen(self, auth_headers):
        """Test getting products"""
        response = requests.get(f"{BASE_URL}/api/boekhouding/artikelen", headers=auth_headers)
        assert response.status_code == 200, f"Get artikelen failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Artikelen should be a list"
        print(f"✓ Artikelen loaded - Count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
