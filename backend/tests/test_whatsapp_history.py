"""
Test WhatsApp Message History/Log feature for Vastgoed Kiosk ERP
Tests the Berichten tab functionality in admin dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kiosk-erp-vastgoed.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"


class TestWhatsAppHistory:
    """Tests for WhatsApp message history API endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.company_id = data["company_id"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_login_success(self):
        """Test login with demo credentials"""
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "company_id" in data
        assert data["email"] == TEST_EMAIL
        print(f"Login successful for {data['name']}")
    
    def test_whatsapp_history_endpoint_returns_200(self):
        """Test GET /api/kiosk/admin/whatsapp/history returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("WhatsApp history endpoint returns 200 OK")
    
    def test_whatsapp_history_returns_array(self):
        """Test that endpoint returns an array of messages"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Endpoint returns array with {len(data)} messages")
    
    def test_whatsapp_history_message_fields(self):
        """Test that messages have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            message = data[0]
            required_fields = [
                "message_id", "company_id", "tenant_id", "tenant_name",
                "phone", "message_type", "message", "status", "created_at"
            ]
            for field in required_fields:
                assert field in message, f"Missing field: {field}"
            print(f"Message has all required fields: {required_fields}")
        else:
            pytest.skip("No messages in history to validate fields")
    
    def test_whatsapp_history_message_types(self):
        """Test that message_type values are valid"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        valid_types = ["payment_confirmation", "new_invoice", "fine_applied", "overdue", "auto", "manual"]
        
        for message in data:
            assert message["message_type"] in valid_types, f"Invalid message_type: {message['message_type']}"
        
        types_found = set(m["message_type"] for m in data)
        print(f"Message types found: {types_found}")
    
    def test_whatsapp_history_status_values(self):
        """Test that status values are valid"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        valid_statuses = ["sent", "failed", "pending"]
        
        for message in data:
            assert message["status"] in valid_statuses, f"Invalid status: {message['status']}"
        
        statuses_found = set(m["status"] for m in data)
        print(f"Statuses found: {statuses_found}")
    
    def test_whatsapp_history_sorted_by_date(self):
        """Test that messages are sorted by created_at descending"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 1:
            dates = [m["created_at"] for m in data]
            assert dates == sorted(dates, reverse=True), "Messages not sorted by date descending"
            print("Messages are correctly sorted by date (newest first)")
        else:
            pytest.skip("Not enough messages to test sorting")
    
    def test_whatsapp_history_company_filter(self):
        """Test that only messages for logged-in company are returned"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for message in data:
            assert message["company_id"] == self.company_id, \
                f"Message company_id {message['company_id']} doesn't match logged-in company {self.company_id}"
        
        print(f"All {len(data)} messages belong to company {self.company_id}")
    
    def test_whatsapp_history_unauthorized(self):
        """Test that endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Endpoint correctly requires authentication")
    
    def test_whatsapp_history_invalid_token(self):
        """Test that endpoint rejects invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Endpoint correctly rejects invalid token")


class TestAdminDashboardAccess:
    """Tests for admin dashboard access flow"""
    
    def test_login_and_access_admin(self):
        """Test complete login flow to admin dashboard"""
        # Step 1: Login
        response = requests.post(
            f"{BASE_URL}/api/kiosk/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 2: Get company info (me endpoint)
        response = requests.get(
            f"{BASE_URL}/api/kiosk/auth/me",
            headers=headers
        )
        assert response.status_code == 200
        company = response.json()
        assert "company_id" in company
        assert "name" in company
        print(f"Logged in as: {company['name']}")
        
        # Step 3: Get dashboard data
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/dashboard",
            headers=headers
        )
        assert response.status_code == 200
        dashboard = response.json()
        assert "total_apartments" in dashboard
        assert "total_tenants" in dashboard
        print(f"Dashboard: {dashboard['total_apartments']} apartments, {dashboard['total_tenants']} tenants")
        
        # Step 4: Get WhatsApp history
        response = requests.get(
            f"{BASE_URL}/api/kiosk/admin/whatsapp/history",
            headers=headers
        )
        assert response.status_code == 200
        messages = response.json()
        print(f"WhatsApp history: {len(messages)} messages")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
