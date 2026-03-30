"""
Kiosk Module Regression Tests - Post-Refactoring Verification
Tests all major API endpoints after the monolithic kiosk.py was split into 12 modules
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
KIOSK_EMAIL = "shyam@kewalbansing.net"
KIOSK_PASSWORD = "Bharat7755"
KIOSK_PIN = "5678"
SUPERADMIN_EMAIL = "admin@facturatie.sr"
SUPERADMIN_PASSWORD = "Bharat7755"


class TestKioskAuth:
    """Authentication module tests (auth.py)"""
    
    def test_01_login_with_email_password(self):
        """Test company login with email/password"""
        response = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "company_id" in data
        assert data["email"] == KIOSK_EMAIL
        print(f"✓ Login successful, company_id: {data['company_id']}")
    
    def test_02_login_with_pin(self):
        """Test company login with PIN code"""
        response = requests.post(f"{BASE_URL}/api/kiosk/auth/pin", json={
            "pin": KIOSK_PIN
        })
        assert response.status_code == 200, f"PIN login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✓ PIN login successful")
    
    def test_03_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_04_get_me_authenticated(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        token = login_resp.json()["token"]
        
        # Get me
        response = requests.get(f"{BASE_URL}/api/kiosk/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "company_id" in data
        assert "name" in data
        print(f"✓ /auth/me returned company: {data['name']}")


class TestKioskAdminDashboard:
    """Admin dashboard module tests (admin.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_05_get_dashboard(self):
        """Test dashboard statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        # Verify all required fields
        required_fields = ["total_apartments", "total_tenants", "total_outstanding", 
                          "total_service_costs", "total_fines", "total_internet",
                          "total_received_month", "payments_count_month"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Dashboard: {data['total_apartments']} apartments, {data['total_tenants']} tenants")
    
    def test_06_list_tenants(self):
        """Test tenants list endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/tenants", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            tenant = data[0]
            assert "tenant_id" in tenant
            assert "name" in tenant
            assert "apartment_number" in tenant
        print(f"✓ Tenants: {len(data)} tenants found")
    
    def test_07_list_apartments(self):
        """Test apartments list endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/apartments", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            apt = data[0]
            assert "apartment_id" in apt
            assert "number" in apt
        print(f"✓ Apartments: {len(data)} apartments found")
    
    def test_08_list_payments(self):
        """Test payments list endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/payments", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Payments: {len(data)} payments found")
    
    def test_09_list_leases(self):
        """Test leases list endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/leases", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Leases: {len(data)} leases found")


class TestKioskLoans:
    """Loans module tests (loans.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_10_list_loans(self):
        """Test loans list endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/loans", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Loans: {len(data)} loans found")


class TestKioskEmployees:
    """Employees module tests (admin_operations.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_11_list_employees(self):
        """Test employees list endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/employees", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Employees: {len(data)} employees found")


class TestKioskKas:
    """Kas (cash register) module tests (admin_operations.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_12_list_kas_entries(self):
        """Test kas entries list endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/kas", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # API returns object with entries list and balance
        assert "entries" in data or isinstance(data, list)
        entries = data.get("entries", data) if isinstance(data, dict) else data
        print(f"✓ Kas: {len(entries)} entries found")


class TestKioskDevices:
    """Devices module tests (devices.py) - Shelly and Tenda"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_13_list_shelly_devices(self):
        """Test Shelly devices list endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/shelly-devices", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Shelly devices: {len(data)} devices found")
    
    def test_14_list_tenda_routers(self):
        """Test Tenda routers list endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/tenda/routers", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Tenda routers: {len(data)} routers found")


class TestKioskInternet:
    """Internet module tests (devices.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_15_list_internet_plans(self):
        """Test internet plans list endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/internet/plans", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Internet plans: {len(data)} plans found")


class TestKioskMessaging:
    """Messaging module tests (messaging.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_16_list_whatsapp_history(self):
        """Test WhatsApp message history endpoint"""
        response = requests.get(f"{BASE_URL}/api/kiosk/admin/whatsapp/history", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # API returns object with messages list and total
        assert "messages" in data or isinstance(data, list)
        messages = data.get("messages", data) if isinstance(data, dict) else data
        print(f"✓ WhatsApp history: {len(messages)} messages found")
    
    def test_17_email_test_requires_recipient(self):
        """Test email test endpoint requires recipient"""
        response = requests.post(f"{BASE_URL}/api/kiosk/admin/email/test", 
                                headers=self.headers, json={})
        # Should fail with 400 or 422 because no recipient provided
        assert response.status_code in [400, 422]
        print("✓ Email test correctly requires recipient")


class TestKioskSuperAdmin:
    """SuperAdmin module tests (superadmin.py)"""
    
    def test_18_superadmin_login(self):
        """Test superadmin login"""
        response = requests.post(f"{BASE_URL}/api/kiosk/superadmin/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200, f"SuperAdmin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["role"] == "superadmin"
        print("✓ SuperAdmin login successful")
    
    def test_19_superadmin_stats(self):
        """Test superadmin stats endpoint"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/superadmin/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        token = login_resp.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/kiosk/superadmin/stats", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_companies" in data
        assert "total_tenants" in data
        print(f"✓ SuperAdmin stats: {data['total_companies']} companies")
    
    def test_20_superadmin_companies_list(self):
        """Test superadmin companies list"""
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/superadmin/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        token = login_resp.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/kiosk/superadmin/companies", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ SuperAdmin companies: {len(data)} companies")


class TestKioskPublicEndpoints:
    """Public endpoints tests (public.py)"""
    
    def test_21_public_company_info(self):
        """Test public company info endpoint"""
        # First get company_id from login
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        company_id = login_resp.json()["company_id"]
        
        response = requests.get(f"{BASE_URL}/api/kiosk/public/{company_id}/company")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        print(f"✓ Public company info: {data['name']}")
    
    def test_22_public_tenants_list(self):
        """Test public tenants list endpoint"""
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        company_id = login_resp.json()["company_id"]
        
        response = requests.get(f"{BASE_URL}/api/kiosk/public/{company_id}/tenants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public tenants: {len(data)} tenants")
    
    def test_23_public_apartments_list(self):
        """Test public apartments list endpoint"""
        login_resp = requests.post(f"{BASE_URL}/api/kiosk/auth/login", json={
            "email": KIOSK_EMAIL,
            "password": KIOSK_PASSWORD
        })
        company_id = login_resp.json()["company_id"]
        
        response = requests.get(f"{BASE_URL}/api/kiosk/public/{company_id}/apartments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public apartments: {len(data)} apartments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
