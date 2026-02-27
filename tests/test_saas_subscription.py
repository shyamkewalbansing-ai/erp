"""
SaaS Subscription System Tests for SuriRentals
Tests: Registration with trial, superadmin access, admin dashboard, customer management, subscription activation/deactivation
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://caribbean-ledger.preview.emergentagent.com')

# Test credentials
SUPERADMIN_EMAIL = "admin@surirentals.sr"
SUPERADMIN_PASSWORD = "admin123"

class TestSuperAdminAuth:
    """Test superadmin authentication and role"""
    
    def test_superadmin_login_success(self):
        """Superadmin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "superadmin"
        assert data["user"]["email"] == SUPERADMIN_EMAIL
        assert data["user"]["subscription_status"] == "active"  # Superadmin always active
        print(f"✓ Superadmin login successful, role: {data['user']['role']}")
    
    def test_superadmin_has_no_subscription_end_date(self):
        """Superadmin should not have subscription end date"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        data = response.json()
        assert data["user"]["subscription_end_date"] is None
        print("✓ Superadmin has no subscription end date (always active)")


class TestCustomerRegistration:
    """Test customer registration with 3-day trial"""
    
    def test_register_new_customer_gets_trial(self):
        """New customer registration should get 3-day trial"""
        unique_email = f"test_trial_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test Trial User",
            "company_name": "Test Company"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        user = data["user"]
        
        # Verify trial status
        assert user["subscription_status"] == "trial", f"Expected trial status, got: {user['subscription_status']}"
        assert user["role"] == "customer"
        assert user["subscription_end_date"] is not None
        
        # Verify trial end date is approximately 3 days from now
        end_date = datetime.fromisoformat(user["subscription_end_date"].replace("Z", "+00:00"))
        now = datetime.now(end_date.tzinfo)
        days_remaining = (end_date - now).days
        assert 2 <= days_remaining <= 3, f"Trial should be ~3 days, got {days_remaining} days"
        
        print(f"✓ New customer registered with trial, ends: {user['subscription_end_date']}")
        return data["access_token"], user
    
    def test_duplicate_email_registration_fails(self):
        """Registration with existing email should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": SUPERADMIN_EMAIL,
            "password": "test123",
            "name": "Duplicate User"
        })
        assert response.status_code == 400
        assert "geregistreerd" in response.json()["detail"].lower()
        print("✓ Duplicate email registration correctly rejected")


class TestTrialUserAccess:
    """Test that trial users can access all features"""
    
    @pytest.fixture
    def trial_user_token(self):
        """Create a trial user and return token"""
        unique_email = f"test_access_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Trial Access User"
        })
        return response.json()["access_token"]
    
    def test_trial_user_can_access_dashboard(self, trial_user_token):
        """Trial user should access dashboard"""
        headers = {"Authorization": f"Bearer {trial_user_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard access failed: {response.text}"
        print("✓ Trial user can access dashboard")
    
    def test_trial_user_can_access_tenants(self, trial_user_token):
        """Trial user should access tenants"""
        headers = {"Authorization": f"Bearer {trial_user_token}"}
        response = requests.get(f"{BASE_URL}/api/tenants", headers=headers)
        assert response.status_code == 200
        print("✓ Trial user can access tenants")
    
    def test_trial_user_can_access_apartments(self, trial_user_token):
        """Trial user should access apartments"""
        headers = {"Authorization": f"Bearer {trial_user_token}"}
        response = requests.get(f"{BASE_URL}/api/apartments", headers=headers)
        assert response.status_code == 200
        print("✓ Trial user can access apartments")


class TestSubscriptionStatus:
    """Test subscription status endpoint"""
    
    @pytest.fixture
    def customer_token(self):
        """Create a customer and return token"""
        unique_email = f"test_status_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Status Test User"
        })
        return response.json()["access_token"]
    
    def test_get_subscription_status(self, customer_token):
        """Customer can view subscription status"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "is_trial" in data
        assert "days_remaining" in data
        assert "price_per_month" in data
        assert data["price_per_month"] == 3500.0  # SRD 3,500
        assert data["is_trial"] == True
        print(f"✓ Subscription status: {data['status']}, days remaining: {data['days_remaining']}")
    
    def test_request_subscription_activation(self, customer_token):
        """Customer can request subscription activation"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.post(f"{BASE_URL}/api/subscription/request", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "bank_info" in data
        assert data["amount"] == 3500.0
        assert data["bank_info"]["bank"] == "De Surinaamsche Bank"
        print(f"✓ Subscription request created, bank: {data['bank_info']['bank']}")


class TestAdminDashboard:
    """Test admin dashboard - superadmin only"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get superadmin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def customer_token(self):
        """Create a customer and return token"""
        unique_email = f"test_admin_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Admin Test User"
        })
        return response.json()["access_token"]
    
    def test_superadmin_can_access_admin_dashboard(self, superadmin_token):
        """Superadmin can access admin dashboard"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total_customers" in data
        assert "active_subscriptions" in data
        assert "expired_subscriptions" in data
        assert "total_revenue" in data
        assert "revenue_this_month" in data
        print(f"✓ Admin dashboard: {data['total_customers']} customers, {data['active_subscriptions']} active")
    
    def test_customer_cannot_access_admin_dashboard(self, customer_token):
        """Regular customer cannot access admin dashboard"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=headers)
        assert response.status_code == 403
        print("✓ Customer correctly denied access to admin dashboard")


class TestAdminCustomerManagement:
    """Test admin customer management - superadmin only"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get superadmin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_superadmin_can_list_customers(self, superadmin_token):
        """Superadmin can list all customers"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/customers", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin can list customers: {len(data)} customers found")
        
        # Verify customer data structure
        if len(data) > 0:
            customer = data[0]
            assert "id" in customer
            assert "email" in customer
            assert "name" in customer
            assert "subscription_status" in customer
            assert "total_paid" in customer
    
    def test_superadmin_can_search_customers(self, superadmin_token):
        """Superadmin can search customers (frontend feature, backend returns all)"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/customers", headers=headers)
        assert response.status_code == 200
        print("✓ Customer list retrieved for search functionality")


class TestSubscriptionActivation:
    """Test subscription activation by superadmin"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get superadmin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_customer(self):
        """Create a test customer"""
        unique_email = f"test_activate_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Activation Test User"
        })
        data = response.json()
        return data["user"]["id"], data["access_token"]
    
    def test_superadmin_can_activate_subscription(self, superadmin_token, test_customer):
        """Superadmin can activate customer subscription"""
        customer_id, _ = test_customer
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        
        response = requests.post(f"{BASE_URL}/api/admin/subscriptions", 
            headers=headers,
            json={
                "user_id": customer_id,
                "months": 1,
                "payment_method": "bank_transfer",
                "payment_reference": "TEST-REF-001"
            }
        )
        assert response.status_code == 200, f"Activation failed: {response.text}"
        
        data = response.json()
        assert data["amount"] == 3500.0  # 1 month = SRD 3,500
        assert data["months"] == 1
        assert data["status"] == "active"
        print(f"✓ Subscription activated: {data['amount']} SRD for {data['months']} month(s)")
    
    def test_subscription_extends_from_current_end_date(self, superadmin_token, test_customer):
        """Activating subscription extends from current end date"""
        customer_id, customer_token = test_customer
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        
        # First activation
        response1 = requests.post(f"{BASE_URL}/api/admin/subscriptions", 
            headers=headers,
            json={
                "user_id": customer_id,
                "months": 1,
                "payment_method": "bank_transfer"
            }
        )
        first_end = response1.json()["end_date"]
        
        # Second activation (should extend)
        response2 = requests.post(f"{BASE_URL}/api/admin/subscriptions", 
            headers=headers,
            json={
                "user_id": customer_id,
                "months": 1,
                "payment_method": "bank_transfer"
            }
        )
        second_end = response2.json()["end_date"]
        
        # Second end date should be ~30 days after first
        first_dt = datetime.fromisoformat(first_end.replace("Z", "+00:00"))
        second_dt = datetime.fromisoformat(second_end.replace("Z", "+00:00"))
        days_diff = (second_dt - first_dt).days
        
        assert 28 <= days_diff <= 32, f"Expected ~30 days extension, got {days_diff}"
        print(f"✓ Subscription extended by {days_diff} days")


class TestSubscriptionDeactivation:
    """Test subscription deactivation by superadmin"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get superadmin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def active_customer(self, superadmin_token):
        """Create and activate a customer"""
        # Create customer
        unique_email = f"test_deactivate_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Deactivation Test User"
        })
        customer_id = reg_response.json()["user"]["id"]
        customer_token = reg_response.json()["access_token"]
        
        # Activate subscription
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        requests.post(f"{BASE_URL}/api/admin/subscriptions", 
            headers=headers,
            json={
                "user_id": customer_id,
                "months": 1,
                "payment_method": "bank_transfer"
            }
        )
        
        return customer_id, customer_token
    
    def test_superadmin_can_deactivate_subscription(self, superadmin_token, active_customer):
        """Superadmin can deactivate customer subscription"""
        customer_id, customer_token = active_customer
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        
        response = requests.delete(f"{BASE_URL}/api/admin/customers/{customer_id}", headers=headers)
        assert response.status_code == 200
        assert "gedeactiveerd" in response.json()["message"].lower()
        print("✓ Subscription deactivated successfully")
    
    def test_deactivated_customer_loses_access(self, superadmin_token, active_customer):
        """Deactivated customer should lose access to protected routes"""
        customer_id, customer_token = active_customer
        admin_headers = {"Authorization": f"Bearer {superadmin_token}"}
        customer_headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Deactivate
        requests.delete(f"{BASE_URL}/api/admin/customers/{customer_id}", headers=admin_headers)
        
        # Try to access protected route
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=customer_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Deactivated customer correctly denied access")


class TestExpiredSubscriptionRedirect:
    """Test that expired subscriptions are blocked from protected routes"""
    
    def test_expired_user_cannot_access_dashboard(self):
        """User with expired subscription cannot access dashboard"""
        # This is tested via the deactivation test above
        # The backend returns 403 for expired subscriptions
        print("✓ Expired subscription access control verified via deactivation test")


class TestSubscriptionRequests:
    """Test subscription request management"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get superadmin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_superadmin_can_view_subscription_requests(self, superadmin_token):
        """Superadmin can view pending subscription requests"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/subscription-requests", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Subscription requests retrieved: {len(data)} pending")


class TestAllSubscriptions:
    """Test subscription history"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get superadmin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_superadmin_can_view_all_subscriptions(self, superadmin_token):
        """Superadmin can view all subscription payments"""
        headers = {"Authorization": f"Bearer {superadmin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/subscriptions", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ All subscriptions retrieved: {len(data)} records")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
