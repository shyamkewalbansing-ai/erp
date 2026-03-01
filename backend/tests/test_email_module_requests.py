"""
Test Suite for Email Invoice and Module Payment Requests Features
Tests:
1. Login functionality with demo account
2. Verkoopfacturen API - status update and email sending
3. Admin Module Payment Requests API
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://money-control-67.preview.emergentagent.com')

# Test credentials
DEMO_EMAIL = "demo@facturatie.sr"
DEMO_PASSWORD = "demo2024"


class TestLoginFunctionality:
    """Test login with demo account"""
    
    def test_login_demo_account(self):
        """Test login with demo credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == DEMO_EMAIL
        print(f"✓ Login successful for {DEMO_EMAIL}")
        return data["access_token"]
    
    def test_login_wrong_password(self):
        """Test login with wrong password fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Wrong password correctly rejected")


class TestVerkoopfacturenAPI:
    """Test Verkoopfacturen (Sales Invoices) API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_verkoopfacturen(self):
        """Test getting list of sales invoices"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get facturen: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} verkoopfacturen")
        return data
    
    def test_get_debiteuren(self):
        """Test getting list of debtors"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/debiteuren",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get debiteuren: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} debiteuren")
        return data
    
    def test_create_debiteur_and_factuur(self):
        """Test creating a debiteur and factuur for email testing"""
        # First create a debiteur
        debiteur_data = {
            "naam": "Test Klant Email",
            "email": "test@example.com",
            "telefoon": "8123456",
            "standaard_valuta": "SRD",
            "betalingstermijn": 30
        }
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/debiteuren",
            headers=self.headers,
            json=debiteur_data
        )
        assert response.status_code == 200, f"Failed to create debiteur: {response.text}"
        debiteur = response.json()
        debiteur_id = debiteur["id"]
        print(f"✓ Created debiteur: {debiteur['naam']} (ID: {debiteur_id})")
        
        # Create a factuur
        factuur_data = {
            "debiteur_id": debiteur_id,
            "factuurdatum": "2025-01-30",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Test Product",
                    "aantal": 1,
                    "prijs_per_stuk": 100.00,
                    "btw_tarief": "25"
                }
            ]
        }
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen",
            headers=self.headers,
            json=factuur_data
        )
        assert response.status_code == 200, f"Failed to create factuur: {response.text}"
        factuur = response.json()
        print(f"✓ Created factuur: {factuur['factuurnummer']} (Status: {factuur['status']})")
        
        return factuur
    
    def test_update_factuur_status_to_verstuurd(self):
        """Test updating factuur status from concept to verstuurd"""
        # First create a factuur
        factuur = self.test_create_debiteur_and_factuur()
        factuur_id = factuur["id"]
        
        # Update status to verstuurd
        response = requests.put(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{factuur_id}/status?status=verstuurd",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        print(f"✓ Updated factuur {factuur['factuurnummer']} status to 'verstuurd'")
        
        # Verify status changed
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{factuur_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        updated_factuur = response.json()
        assert updated_factuur["status"] == "verstuurd", f"Status not updated: {updated_factuur['status']}"
        print(f"✓ Verified factuur status is now 'verstuurd'")
        
        return updated_factuur
    
    def test_send_factuur_email_endpoint_exists(self):
        """Test that the send email endpoint exists and validates input"""
        # First create and update a factuur to verstuurd
        factuur = self.test_update_factuur_status_to_verstuurd()
        factuur_id = factuur["id"]
        
        # Try to send email (will fail due to SMTP not configured, but endpoint should exist)
        email_data = {
            "to_email": "test@example.com",
            "subject": "Test Factuur",
            "message": "Dit is een test"
        }
        response = requests.post(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen/{factuur_id}/send-email",
            headers=self.headers,
            json=email_data
        )
        # Endpoint should exist - may return 400 (email not configured) or 500 (SMTP error)
        # but NOT 404 (endpoint not found)
        assert response.status_code != 404, f"Send email endpoint not found: {response.text}"
        print(f"✓ Send email endpoint exists (status: {response.status_code})")
        
        # Check the error message
        if response.status_code != 200:
            error = response.json()
            print(f"  Note: Email sending returned error (expected if SMTP not configured): {error.get('detail', error)}")


class TestAdminModuleRequests:
    """Test Admin Module Payment Requests API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user = response.json()["user"]
    
    def test_get_module_payment_requests_requires_superadmin(self):
        """Test that module payment requests endpoint requires superadmin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/module-payment-requests",
            headers=self.headers
        )
        # Demo user is admin but not superadmin, should get 403
        # If demo user IS superadmin, should get 200
        if self.user.get("role") == "superadmin":
            assert response.status_code == 200, f"Superadmin should access: {response.text}"
            print(f"✓ Superadmin can access module payment requests")
        else:
            assert response.status_code == 403, f"Non-superadmin should get 403: {response.text}"
            print(f"✓ Non-superadmin correctly denied access (role: {self.user.get('role')})")
    
    def test_admin_dashboard_endpoint(self):
        """Test admin dashboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers=self.headers
        )
        # Check if user has admin access
        if self.user.get("role") in ["admin", "superadmin"]:
            # May return 200 or 403 depending on exact role requirements
            print(f"Admin dashboard response: {response.status_code}")
        else:
            print(f"User role: {self.user.get('role')} - may not have admin access")


class TestBoekhoudingDashboard:
    """Test Boekhouding Dashboard API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_boekhouding_dashboard(self):
        """Test boekhouding dashboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify expected fields
        expected_fields = ["debiteuren_count", "crediteuren_count", "openstaande_debiteuren", "bank_saldi"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Boekhouding dashboard working")
        print(f"  - Debiteuren: {data['debiteuren_count']}")
        print(f"  - Crediteuren: {data['crediteuren_count']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
