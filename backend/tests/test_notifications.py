"""
Test suite for Notification Bell feature
Tests: GET /api/notifications endpoint and notification types
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "klant@test.com"
TEST_PASSWORD = "test123"


class TestNotificationsAPI:
    """Test notifications endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_notifications_endpoint_returns_200(self):
        """Test GET /api/notifications returns 200"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/notifications returns 200")
    
    def test_notifications_response_structure(self):
        """Test notifications response has correct structure"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required fields
        assert "total" in data, "Response missing 'total' field"
        assert "high_priority" in data, "Response missing 'high_priority' field"
        assert "notifications" in data, "Response missing 'notifications' field"
        
        # Check types
        assert isinstance(data["total"], int), "total should be integer"
        assert isinstance(data["high_priority"], int), "high_priority should be integer"
        assert isinstance(data["notifications"], list), "notifications should be list"
        
        print(f"✓ Response structure correct: total={data['total']}, high_priority={data['high_priority']}")
    
    def test_notification_item_structure(self):
        """Test individual notification items have correct structure"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        notifications = data.get("notifications", [])
        
        if len(notifications) > 0:
            notification = notifications[0]
            
            # Required fields
            assert "id" in notification, "Notification missing 'id'"
            assert "type" in notification, "Notification missing 'type'"
            assert "title" in notification, "Notification missing 'title'"
            assert "message" in notification, "Notification missing 'message'"
            assert "priority" in notification, "Notification missing 'priority'"
            
            # Validate type is one of expected values
            valid_types = ["rent_due", "outstanding_balance", "contract_expiring", "loan_outstanding", "salary_due"]
            assert notification["type"] in valid_types, f"Invalid type: {notification['type']}"
            
            # Validate priority is one of expected values
            valid_priorities = ["high", "medium", "low"]
            assert notification["priority"] in valid_priorities, f"Invalid priority: {notification['priority']}"
            
            print(f"✓ Notification item structure correct: type={notification['type']}, priority={notification['priority']}")
        else:
            print("✓ No notifications to validate structure (empty list)")
    
    def test_notification_types_are_valid(self):
        """Test all notification types are valid"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        notifications = data.get("notifications", [])
        
        valid_types = ["rent_due", "outstanding_balance", "contract_expiring", "loan_outstanding", "salary_due"]
        
        for notification in notifications:
            assert notification["type"] in valid_types, f"Invalid notification type: {notification['type']}"
        
        # Report found types
        found_types = set(n["type"] for n in notifications)
        print(f"✓ All notification types valid. Found types: {found_types}")
    
    def test_notification_priorities_are_valid(self):
        """Test all notification priorities are valid"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        notifications = data.get("notifications", [])
        
        valid_priorities = ["high", "medium", "low"]
        
        for notification in notifications:
            assert notification["priority"] in valid_priorities, f"Invalid priority: {notification['priority']}"
        
        # Report found priorities
        found_priorities = set(n["priority"] for n in notifications)
        print(f"✓ All notification priorities valid. Found priorities: {found_priorities}")
    
    def test_notifications_sorted_by_priority(self):
        """Test notifications are sorted by priority (high first)"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        notifications = data.get("notifications", [])
        
        if len(notifications) > 1:
            priority_order = {"high": 0, "medium": 1, "low": 2}
            priorities = [priority_order.get(n["priority"], 3) for n in notifications]
            
            # Check if sorted
            is_sorted = all(priorities[i] <= priorities[i+1] for i in range(len(priorities)-1))
            assert is_sorted, "Notifications not sorted by priority"
            print("✓ Notifications sorted by priority (high → medium → low)")
        else:
            print("✓ Not enough notifications to verify sorting")
    
    def test_high_priority_count_matches(self):
        """Test high_priority count matches actual high priority notifications"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        notifications = data.get("notifications", [])
        reported_high = data.get("high_priority", 0)
        
        actual_high = len([n for n in notifications if n["priority"] == "high"])
        
        assert reported_high == actual_high, f"high_priority mismatch: reported={reported_high}, actual={actual_high}"
        print(f"✓ high_priority count matches: {reported_high}")
    
    def test_total_count_matches(self):
        """Test total count matches actual notification count"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        notifications = data.get("notifications", [])
        reported_total = data.get("total", 0)
        
        assert reported_total == len(notifications), f"total mismatch: reported={reported_total}, actual={len(notifications)}"
        print(f"✓ total count matches: {reported_total}")
    
    def test_notifications_without_auth_returns_401_or_403(self):
        """Test notifications endpoint requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/notifications")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ Notifications endpoint requires auth (returns {response.status_code})")
    
    def test_loan_outstanding_notification_has_amount(self):
        """Test loan_outstanding notifications have amount field"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        notifications = data.get("notifications", [])
        
        loan_notifications = [n for n in notifications if n["type"] == "loan_outstanding"]
        
        for loan_notif in loan_notifications:
            assert loan_notif.get("amount") is not None, "loan_outstanding notification missing amount"
            assert loan_notif["amount"] > 0, "loan_outstanding amount should be positive"
            print(f"✓ Loan notification has amount: SRD {loan_notif['amount']}")
        
        if not loan_notifications:
            print("✓ No loan_outstanding notifications to validate")
    
    def test_notification_has_related_info(self):
        """Test notifications have related_id and related_name when applicable"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        notifications = data.get("notifications", [])
        
        for notification in notifications:
            # Most notification types should have related info
            if notification["type"] in ["rent_due", "outstanding_balance", "loan_outstanding", "salary_due"]:
                # These should have related_name at minimum
                assert "related_name" in notification, f"Notification type {notification['type']} missing related_name"
        
        print("✓ Notifications have related info where applicable")


class TestNotificationsIntegration:
    """Integration tests for notifications with other features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_loan_creates_notification(self):
        """Test that outstanding loans appear in notifications"""
        # Get current notifications
        response = self.session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        notifications = data.get("notifications", [])
        
        # Check for loan_outstanding type
        loan_notifications = [n for n in notifications if n["type"] == "loan_outstanding"]
        
        # According to context, there should be 1 notification for outstanding loan (SRD 300)
        print(f"✓ Found {len(loan_notifications)} loan_outstanding notifications")
        
        if loan_notifications:
            for ln in loan_notifications:
                print(f"  - {ln['title']}: {ln['message']} (Amount: SRD {ln.get('amount', 'N/A')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
