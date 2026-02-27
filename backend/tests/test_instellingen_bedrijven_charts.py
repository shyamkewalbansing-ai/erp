"""
Test suite for Boekhouding Instellingen, Bedrijven (Multi-tenant), and Dashboard Charts APIs
Tests the new features: SMTP settings, Multi-tenant support, and Dashboard charts
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Authentication tests to get token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns access_token instead of token
        token = data.get("access_token") or data.get("token")
        assert token is not None, "Token not in response"
        return token
    
    def test_login_success(self, auth_token):
        """Test login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"Login successful, token length: {len(auth_token)}")


class TestInstellingenAPI:
    """Tests for /boekhouding/instellingen endpoint - Company settings including SMTP"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_get_instellingen(self, auth_token):
        """Test GET /boekhouding/instellingen returns company settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/boekhouding/instellingen", headers=headers)
        
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert isinstance(data, dict), "Response should be a dictionary"
        print(f"Settings retrieved: {list(data.keys())}")
    
    def test_update_instellingen_with_smtp(self, auth_token):
        """Test PUT /boekhouding/instellingen with SMTP settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Update settings including SMTP fields
        update_data = {
            "bedrijfsnaam": "Test Bedrijf N.V.",
            "adres": "Teststraat 123",
            "plaats": "Paramaribo",
            "land": "Suriname",
            "telefoon": "+597 123 4567",
            "email": "test@bedrijf.sr",
            "btw_nummer": "BTW123456",
            "kvk_nummer": "KVK789",
            "bank_naam": "Hakrinbank",
            "bank_rekening": "SR00HAKR0000000000",
            "standaard_betalingstermijn": 30,
            # SMTP settings
            "smtp_host": "smtp.test.com",
            "smtp_port": 587,
            "smtp_user": "smtp_user@test.com",
            "smtp_password": "test_password",
            "smtp_from_email": "facturen@test.com",
            "smtp_from_name": "Test Bedrijf",
            # Factuur template settings
            "factuur_primaire_kleur": "#1e293b",
            "factuur_secundaire_kleur": "#f1f5f9",
            "factuur_template": "standaard"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/boekhouding/instellingen",
            headers=headers,
            json=update_data
        )
        
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # GET the settings to verify they were saved
        get_response = requests.get(f"{BASE_URL}/api/boekhouding/instellingen", headers=headers)
        assert get_response.status_code == 200, f"Failed to get settings after update: {get_response.text}"
        data = get_response.json()
        
        # Verify SMTP fields are saved
        assert data.get("smtp_host") == "smtp.test.com", f"SMTP host not saved, got: {data.get('smtp_host')}"
        assert data.get("smtp_port") == 587, f"SMTP port not saved, got: {data.get('smtp_port')}"
        assert data.get("smtp_user") == "smtp_user@test.com", f"SMTP user not saved, got: {data.get('smtp_user')}"
        assert data.get("factuur_primaire_kleur") == "#1e293b", f"Primary color not saved, got: {data.get('factuur_primaire_kleur')}"
        assert data.get("factuur_template") == "standaard", f"Template not saved, got: {data.get('factuur_template')}"
        
        print("Settings updated successfully with SMTP configuration")


class TestBedrijvenAPI:
    """Tests for /boekhouding/bedrijven endpoints - Multi-tenant support"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_get_bedrijven_list(self, auth_token):
        """Test GET /boekhouding/bedrijven returns list of companies"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/boekhouding/bedrijven", headers=headers)
        
        assert response.status_code == 200, f"Failed to get bedrijven: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least one bedrijf (default)"
        
        # Verify bedrijf structure
        bedrijf = data[0]
        assert "id" in bedrijf, "Bedrijf should have id"
        assert "naam" in bedrijf, "Bedrijf should have naam"
        
        print(f"Found {len(data)} bedrijven")
        for b in data:
            print(f"  - {b.get('naam')} (actief: {b.get('is_actief')}, default: {b.get('is_default')})")
    
    def test_get_actief_bedrijf(self, auth_token):
        """Test GET /boekhouding/bedrijven/actief returns active company"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/boekhouding/bedrijven/actief", headers=headers)
        
        assert response.status_code == 200, f"Failed to get actief bedrijf: {response.text}"
        data = response.json()
        
        assert isinstance(data, dict), "Response should be a dictionary"
        assert "id" in data, "Actief bedrijf should have id"
        assert "naam" in data, "Actief bedrijf should have naam"
        assert data.get("is_actief") == True, "Actief bedrijf should be active"
        
        print(f"Active bedrijf: {data.get('naam')}")
    
    def test_create_bedrijf(self, auth_token):
        """Test POST /boekhouding/bedrijven creates new company"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        new_bedrijf = {
            "naam": "TEST_Nieuw Bedrijf B.V.",
            "adres": "Nieuwe Straat 456",
            "plaats": "Paramaribo",
            "land": "Suriname",
            "btw_nummer": "BTW999888"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/bedrijven",
            headers=headers,
            json=new_bedrijf
        )
        
        assert response.status_code == 200, f"Failed to create bedrijf: {response.text}"
        data = response.json()
        
        assert "id" in data, "Created bedrijf should have id"
        assert data.get("naam") == "TEST_Nieuw Bedrijf B.V.", "Naam not saved correctly"
        assert data.get("is_actief") == False, "New bedrijf should not be active by default"
        
        print(f"Created bedrijf: {data.get('naam')} with id: {data.get('id')}")
        
        # Store id for cleanup
        return data.get("id")
    
    def test_activeer_bedrijf(self, auth_token):
        """Test PUT /boekhouding/bedrijven/{id}/activeer activates a company"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get list of bedrijven
        response = requests.get(f"{BASE_URL}/api/boekhouding/bedrijven", headers=headers)
        bedrijven = response.json()
        
        # Find a non-active bedrijf to activate
        non_active = [b for b in bedrijven if not b.get("is_actief")]
        
        if non_active:
            bedrijf_id = non_active[0]["id"]
            
            response = requests.put(
                f"{BASE_URL}/api/boekhouding/bedrijven/{bedrijf_id}/activeer",
                headers=headers
            )
            
            assert response.status_code == 200, f"Failed to activate bedrijf: {response.text}"
            data = response.json()
            
            assert "message" in data, "Response should have message"
            print(f"Activated bedrijf: {bedrijf_id}")
            
            # Reactivate the original default bedrijf
            default_bedrijf = [b for b in bedrijven if b.get("is_default")]
            if default_bedrijf:
                requests.put(
                    f"{BASE_URL}/api/boekhouding/bedrijven/{default_bedrijf[0]['id']}/activeer",
                    headers=headers
                )
        else:
            print("No non-active bedrijf found to test activation")


class TestDashboardChartsAPI:
    """Tests for /boekhouding/dashboard/charts endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_get_dashboard(self, auth_token):
        """Test GET /boekhouding/dashboard returns KPIs"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/boekhouding/dashboard", headers=headers)
        
        assert response.status_code == 200, f"Failed to get dashboard: {response.text}"
        data = response.json()
        
        # Verify dashboard structure
        assert "omzet" in data, "Dashboard should have omzet"
        assert "kosten" in data, "Dashboard should have kosten"
        assert "winst" in data, "Dashboard should have winst"
        assert "openstaand" in data, "Dashboard should have openstaand"
        assert "liquiditeit" in data, "Dashboard should have liquiditeit"
        
        print(f"Dashboard KPIs: omzet={data['omzet']}, kosten={data['kosten']}, winst={data['winst']}")
    
    def test_get_dashboard_charts(self, auth_token):
        """Test GET /boekhouding/dashboard/charts returns chart data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/boekhouding/dashboard/charts", headers=headers)
        
        assert response.status_code == 200, f"Failed to get charts: {response.text}"
        data = response.json()
        
        # Verify chart data structure
        assert "omzet_kosten" in data, "Charts should have omzet_kosten"
        assert "ouderdom" in data, "Charts should have ouderdom"
        assert "cashflow" in data, "Charts should have cashflow"
        assert "top_klanten" in data, "Charts should have top_klanten"
        assert "jaar" in data, "Charts should have jaar"
        
        # Verify omzet_kosten structure (12 months)
        omzet_kosten = data["omzet_kosten"]
        assert isinstance(omzet_kosten, list), "omzet_kosten should be a list"
        assert len(omzet_kosten) == 12, "omzet_kosten should have 12 months"
        
        # Verify each month has required fields
        for month_data in omzet_kosten:
            assert "maand" in month_data, "Month data should have maand"
            assert "omzet" in month_data, "Month data should have omzet"
            assert "kosten" in month_data, "Month data should have kosten"
        
        # Verify ouderdom structure
        ouderdom = data["ouderdom"]
        assert isinstance(ouderdom, list), "ouderdom should be a list"
        assert len(ouderdom) == 4, "ouderdom should have 4 categories"
        
        for category in ouderdom:
            assert "name" in category, "Ouderdom category should have name"
            assert "value" in category, "Ouderdom category should have value"
            assert "color" in category, "Ouderdom category should have color"
        
        # Verify cashflow structure
        cashflow = data["cashflow"]
        assert isinstance(cashflow, list), "cashflow should be a list"
        assert len(cashflow) == 12, "cashflow should have 12 months"
        
        for month_data in cashflow:
            assert "maand" in month_data, "Cashflow data should have maand"
            assert "inkomsten" in month_data, "Cashflow data should have inkomsten"
            assert "uitgaven" in month_data, "Cashflow data should have uitgaven"
            assert "netto" in month_data, "Cashflow data should have netto"
        
        # Verify top_klanten structure
        top_klanten = data["top_klanten"]
        assert isinstance(top_klanten, list), "top_klanten should be a list"
        
        for klant in top_klanten:
            assert "naam" in klant, "Klant should have naam"
            assert "omzet" in klant, "Klant should have omzet"
            assert "facturen" in klant, "Klant should have facturen"
        
        print(f"Charts data retrieved successfully:")
        print(f"  - omzet_kosten: {len(omzet_kosten)} months")
        print(f"  - ouderdom: {len(ouderdom)} categories")
        print(f"  - cashflow: {len(cashflow)} months")
        print(f"  - top_klanten: {len(top_klanten)} customers")
        print(f"  - jaar: {data['jaar']}")


class TestCleanup:
    """Cleanup test data created during tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_cleanup_test_bedrijven(self, auth_token):
        """Clean up TEST_ prefixed bedrijven"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get all bedrijven
        response = requests.get(f"{BASE_URL}/api/boekhouding/bedrijven", headers=headers)
        bedrijven = response.json()
        
        # Delete TEST_ prefixed bedrijven
        deleted = 0
        for bedrijf in bedrijven:
            if bedrijf.get("naam", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/boekhouding/bedrijven/{bedrijf['id']}",
                    headers=headers
                )
                if delete_response.status_code == 200:
                    deleted += 1
                    print(f"Deleted test bedrijf: {bedrijf['naam']}")
        
        print(f"Cleanup complete: deleted {deleted} test bedrijven")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
