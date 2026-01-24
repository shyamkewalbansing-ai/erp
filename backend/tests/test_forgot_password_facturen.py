"""
Test suite for Forgot Password and Facturen features
- POST /api/auth/forgot-password endpoint
- POST /api/auth/reset-password endpoint
- Facturen page data requirements (tenants, apartments, payments)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestForgotPasswordEndpoint:
    """Tests for POST /api/auth/forgot-password"""
    
    def test_forgot_password_with_valid_email(self):
        """Test forgot password with existing email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "klant@test.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should return success message (doesn't reveal if email exists)
        assert "Als dit e-mailadres bestaat" in data["message"] or "instructies" in data["message"].lower()
    
    def test_forgot_password_with_nonexistent_email(self):
        """Test forgot password with non-existent email - should still return success for security"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "nonexistent@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should return same message to prevent email enumeration
    
    def test_forgot_password_with_invalid_email_format(self):
        """Test forgot password with invalid email format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "invalid-email"}
        )
        # Should return 422 for validation error
        assert response.status_code == 422
    
    def test_forgot_password_without_email(self):
        """Test forgot password without email field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={}
        )
        assert response.status_code == 422


class TestResetPasswordEndpoint:
    """Tests for POST /api/auth/reset-password"""
    
    def test_reset_password_with_invalid_token(self):
        """Test reset password with invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={
                "token": "invalid-token-123",
                "new_password": "newpassword123"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Ongeldige" in data["detail"] or "verlopen" in data["detail"]
    
    def test_reset_password_with_short_password(self):
        """Test reset password with password less than 6 characters"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={
                "token": "some-token",
                "new_password": "abc"
            }
        )
        # Should return 400 for invalid token (checked first) or validation error
        assert response.status_code in [400, 422]
    
    def test_reset_password_without_token(self):
        """Test reset password without token field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"new_password": "newpassword123"}
        )
        assert response.status_code == 422
    
    def test_reset_password_without_password(self):
        """Test reset password without new_password field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": "some-token"}
        )
        assert response.status_code == 422


class TestFacturenDataEndpoints:
    """Tests for endpoints required by Facturen page"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "klant@test.com", "password": "test123"}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_tenants(self):
        """Test GET /api/tenants returns tenant list"""
        response = requests.get(
            f"{BASE_URL}/api/tenants",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            tenant = data[0]
            assert "id" in tenant
            assert "name" in tenant
            assert "email" in tenant
    
    def test_get_apartments(self):
        """Test GET /api/apartments returns apartment list"""
        response = requests.get(
            f"{BASE_URL}/api/apartments",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            apt = data[0]
            assert "id" in apt
            assert "name" in apt
            assert "rent_amount" in apt
    
    def test_get_payments(self):
        """Test GET /api/payments returns payment list"""
        response = requests.get(
            f"{BASE_URL}/api/payments",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            payment = data[0]
            assert "id" in payment
            assert "tenant_id" in payment
            assert "amount" in payment
            assert "payment_date" in payment
    
    def test_get_loans(self):
        """Test GET /api/loans returns loan list"""
        response = requests.get(
            f"{BASE_URL}/api/loans",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_maintenance(self):
        """Test GET /api/maintenance returns maintenance list"""
        response = requests.get(
            f"{BASE_URL}/api/maintenance",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_payments_have_period_fields(self):
        """Test that payments have period_month and period_year for Facturen calculations"""
        response = requests.get(
            f"{BASE_URL}/api/payments",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check if payments have period fields (needed for Facturen page)
        rent_payments = [p for p in data if p.get("payment_type") == "rent"]
        if len(rent_payments) > 0:
            payment = rent_payments[0]
            # period_month and period_year should be present for rent payments
            assert "period_month" in payment or payment.get("period_month") is not None
            assert "period_year" in payment or payment.get("period_year") is not None


class TestAuthenticationRequired:
    """Test that endpoints require authentication"""
    
    def test_tenants_requires_auth(self):
        """Test GET /api/tenants requires authentication"""
        response = requests.get(f"{BASE_URL}/api/tenants")
        assert response.status_code in [401, 403]
    
    def test_apartments_requires_auth(self):
        """Test GET /api/apartments requires authentication"""
        response = requests.get(f"{BASE_URL}/api/apartments")
        assert response.status_code in [401, 403]
    
    def test_payments_requires_auth(self):
        """Test GET /api/payments requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payments")
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
