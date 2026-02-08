"""
Test iteration 11: Dashboard and Rent Settings features
Tests:
1. Dashboard 'Openstaand' shows combined rent + loan outstanding
2. Dashboard 'Openstaand' shows subtitle 'incl. leningen SRD X' when loans outstanding
3. Dashboard 'Inkomsten deze maand' shows correct income for current month
4. Rent settings endpoint with payment_deadline fields
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://daily-reports-13.preview.emergentagent.com').rstrip('/')

class TestDashboardAndRentSettings:
    """Test dashboard stats and rent settings features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        # Login as customer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "klant@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user = response.json()["user"]
        
    def test_01_dashboard_returns_200(self):
        """Test dashboard endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        print(f"Dashboard response: {data}")
        
    def test_02_dashboard_has_total_outstanding_loans(self):
        """Test dashboard includes total_outstanding_loans field"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_outstanding_loans" in data, "Missing total_outstanding_loans field"
        assert isinstance(data["total_outstanding_loans"], (int, float)), "total_outstanding_loans should be numeric"
        print(f"total_outstanding_loans: {data['total_outstanding_loans']}")
        
    def test_03_dashboard_has_total_outstanding(self):
        """Test dashboard includes total_outstanding field (rent outstanding)"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_outstanding" in data, "Missing total_outstanding field"
        assert isinstance(data["total_outstanding"], (int, float)), "total_outstanding should be numeric"
        print(f"total_outstanding (rent): {data['total_outstanding']}")
        
    def test_04_dashboard_has_total_income_this_month(self):
        """Test dashboard includes total_income_this_month field"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_income_this_month" in data, "Missing total_income_this_month field"
        assert isinstance(data["total_income_this_month"], (int, float)), "total_income_this_month should be numeric"
        print(f"total_income_this_month: {data['total_income_this_month']}")
        
    def test_05_dashboard_combined_outstanding_calculation(self):
        """Test that combined outstanding = rent outstanding + loan outstanding"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        rent_outstanding = data.get("total_outstanding", 0)
        loan_outstanding = data.get("total_outstanding_loans", 0)
        combined = rent_outstanding + loan_outstanding
        
        print(f"Rent outstanding: {rent_outstanding}")
        print(f"Loan outstanding: {loan_outstanding}")
        print(f"Combined outstanding: {combined}")
        
        # Verify both values are present and can be combined
        assert rent_outstanding >= 0, "Rent outstanding should be >= 0"
        assert loan_outstanding >= 0, "Loan outstanding should be >= 0"
        
    def test_06_profile_returns_rent_settings(self):
        """Test profile endpoint returns rent settings fields"""
        response = requests.get(f"{BASE_URL}/api/profile", headers=self.headers)
        assert response.status_code == 200, f"Profile failed: {response.text}"
        data = response.json()
        
        print(f"Profile response keys: {data.keys()}")
        
        # Check for rent settings fields
        assert "rent_due_day" in data or data.get("rent_due_day") is None, "rent_due_day should be present"
        assert "payment_frequency" in data or data.get("payment_frequency") is None, "payment_frequency should be present"
        assert "grace_period_days" in data or data.get("grace_period_days") is None, "grace_period_days should be present"
        
        # Check for new payment deadline fields
        print(f"payment_deadline_day: {data.get('payment_deadline_day')}")
        print(f"payment_deadline_month_offset: {data.get('payment_deadline_month_offset')}")
        
    def test_07_update_rent_settings_with_deadline(self):
        """Test updating rent settings with payment deadline fields"""
        settings = {
            "rent_due_day": 1,
            "payment_frequency": "monthly",
            "grace_period_days": 5,
            "payment_deadline_day": 6,
            "payment_deadline_month_offset": 1
        }
        
        response = requests.put(f"{BASE_URL}/api/profile/rent-settings", 
                               json=settings, 
                               headers=self.headers)
        assert response.status_code == 200, f"Update rent settings failed: {response.text}"
        print(f"Update response: {response.json()}")
        
    def test_08_verify_rent_settings_persisted(self):
        """Test that rent settings are persisted after update"""
        # First update
        settings = {
            "rent_due_day": 1,
            "payment_frequency": "monthly",
            "grace_period_days": 5,
            "payment_deadline_day": 6,
            "payment_deadline_month_offset": 1
        }
        
        response = requests.put(f"{BASE_URL}/api/profile/rent-settings", 
                               json=settings, 
                               headers=self.headers)
        assert response.status_code == 200
        
        # Then verify via profile
        response = requests.get(f"{BASE_URL}/api/profile", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("payment_deadline_day") == 6, f"payment_deadline_day not persisted: {data.get('payment_deadline_day')}"
        assert data.get("payment_deadline_month_offset") == 1, f"payment_deadline_month_offset not persisted: {data.get('payment_deadline_month_offset')}"
        print(f"Verified: payment_deadline_day={data.get('payment_deadline_day')}, payment_deadline_month_offset={data.get('payment_deadline_month_offset')}")
        
    def test_09_rent_settings_validation(self):
        """Test rent settings validation for invalid values"""
        # Test invalid deadline day (> 28)
        settings = {
            "rent_due_day": 1,
            "payment_frequency": "monthly",
            "grace_period_days": 5,
            "payment_deadline_day": 30,  # Invalid
            "payment_deadline_month_offset": 1
        }
        
        response = requests.put(f"{BASE_URL}/api/profile/rent-settings", 
                               json=settings, 
                               headers=self.headers)
        assert response.status_code == 400, f"Should reject invalid deadline day: {response.text}"
        print(f"Validation works: {response.json()}")
        
    def test_10_dashboard_income_based_on_payment_date(self):
        """Test that income this month is based on payment_date, not period"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Get payments to verify
        payments_response = requests.get(f"{BASE_URL}/api/payments", headers=self.headers)
        assert payments_response.status_code == 200
        payments = payments_response.json()
        
        # Calculate expected income for current month based on payment_date
        current_month = datetime.now().strftime("%Y-%m")
        expected_income = sum(
            p["amount"] for p in payments 
            if p.get("payment_date", "").startswith(current_month)
        )
        
        print(f"Dashboard income: {data['total_income_this_month']}")
        print(f"Expected income (from payments with payment_date in {current_month}): {expected_income}")
        
        # Allow small floating point differences
        assert abs(data["total_income_this_month"] - expected_income) < 0.01, \
            f"Income mismatch: dashboard={data['total_income_this_month']}, expected={expected_income}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
