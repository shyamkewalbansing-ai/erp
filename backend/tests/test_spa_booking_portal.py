"""
Test Suite for Beauty Spa Online Booking Portal
Tests all public booking endpoints for the spa booking module
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
WORKSPACE_ID = "demo-spa"

class TestSpaBookingPortal:
    """Tests for the public spa booking portal APIs"""
    
    # ==================== SPA INFO ====================
    
    def test_get_spa_info_success(self):
        """Test GET /api/spa-booking/spa/{workspace_id}/info - Returns spa information"""
        response = requests.get(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/info")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "spa_name" in data
        assert "workspace_id" in data
        assert "phone" in data
        assert "email" in data
        assert "address" in data
        
        # Verify data values
        assert data["workspace_id"] == WORKSPACE_ID
        assert len(data["spa_name"]) > 0
    
    def test_get_spa_info_not_found(self):
        """Test GET /api/spa-booking/spa/{workspace_id}/info - Returns 404 for invalid workspace"""
        response = requests.get(f"{BASE_URL}/api/spa-booking/spa/invalid-workspace-xyz/info")
        
        assert response.status_code == 404
    
    # ==================== TREATMENTS ====================
    
    def test_get_treatments_success(self):
        """Test GET /api/spa-booking/spa/{workspace_id}/treatments - Returns available treatments"""
        response = requests.get(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/treatments")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "categories" in data
        assert "total" in data
        assert isinstance(data["categories"], dict)
        assert data["total"] > 0
        
        # Verify treatment structure in at least one category
        for category, treatments in data["categories"].items():
            assert isinstance(treatments, list)
            if len(treatments) > 0:
                treatment = treatments[0]
                assert "id" in treatment
                assert "name" in treatment
                assert "duration_minutes" in treatment
                assert "price_srd" in treatment
                break
    
    def test_get_treatments_by_category(self):
        """Test GET /api/spa-booking/spa/{workspace_id}/treatments?category=massage"""
        response = requests.get(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/treatments?category=massage")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should only have massage category
        assert "categories" in data
        if "massage" in data["categories"]:
            assert len(data["categories"]["massage"]) > 0
    
    # ==================== STAFF ====================
    
    def test_get_staff_success(self):
        """Test GET /api/spa-booking/spa/{workspace_id}/staff - Returns available staff"""
        response = requests.get(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/staff")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify staff structure
        staff = data[0]
        assert "id" in staff
        assert "name" in staff
        assert "specializations" in staff
    
    def test_get_staff_by_treatment(self):
        """Test GET /api/spa-booking/spa/{workspace_id}/staff?treatment_id=xxx"""
        # First get a treatment ID
        treatments_response = requests.get(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/treatments")
        treatments_data = treatments_response.json()
        
        treatment_id = None
        for category, treatments in treatments_data["categories"].items():
            if len(treatments) > 0:
                treatment_id = treatments[0]["id"]
                break
        
        if treatment_id:
            response = requests.get(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/staff?treatment_id={treatment_id}")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
    
    # ==================== AVAILABILITY ====================
    
    def test_get_availability_success(self):
        """Test GET /api/spa-booking/spa/{workspace_id}/availability - Returns time slots"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/availability?date={tomorrow}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "date" in data
        assert "slots" in data
        assert "treatment_duration" in data
        
        assert data["date"] == tomorrow
        assert isinstance(data["slots"], list)
        assert len(data["slots"]) > 0
        
        # Verify slot structure
        slot = data["slots"][0]
        assert "time" in slot
        assert "available" in slot
        assert "available_staff" in slot
    
    def test_get_availability_with_treatment(self):
        """Test availability with treatment_id parameter"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Get a treatment ID first
        treatments_response = requests.get(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/treatments")
        treatments_data = treatments_response.json()
        
        treatment_id = None
        for category, treatments in treatments_data["categories"].items():
            if len(treatments) > 0:
                treatment_id = treatments[0]["id"]
                break
        
        if treatment_id:
            response = requests.get(
                f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/availability?date={tomorrow}&treatment_id={treatment_id}"
            )
            assert response.status_code == 200
            data = response.json()
            assert "treatment_duration" in data
    
    # ==================== BOOKING ====================
    
    def test_create_booking_success(self):
        """Test POST /api/spa-booking/spa/{workspace_id}/book - Creates a new booking"""
        # Get a treatment ID first
        treatments_response = requests.get(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/treatments")
        treatments_data = treatments_response.json()
        
        treatment_id = None
        for category, treatments in treatments_data["categories"].items():
            if len(treatments) > 0:
                treatment_id = treatments[0]["id"]
                break
        
        assert treatment_id is not None, "No treatments available for booking test"
        
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        booking_data = {
            "client_name": "TEST_Booking Client",
            "client_phone": "+597 1234567",
            "client_email": "test_booking@example.com",
            "treatment_id": treatment_id,
            "appointment_date": tomorrow,
            "appointment_time": "14:00",
            "notes": "Test booking from pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/book",
            json=booking_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["success"] == True
        assert "booking_id" in data
        assert "message" in data
        assert "confirmation" in data
        
        # Verify confirmation details
        confirmation = data["confirmation"]
        assert "treatment" in confirmation
        assert "date" in confirmation
        assert "time" in confirmation
        assert "duration" in confirmation
        assert "staff" in confirmation
        assert "price" in confirmation
        
        # Store booking_id for subsequent tests
        self.__class__.test_booking_id = data["booking_id"]
        self.__class__.test_client_phone = booking_data["client_phone"]
    
    def test_create_booking_invalid_treatment(self):
        """Test booking with invalid treatment ID"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        booking_data = {
            "client_name": "Test Client",
            "client_phone": "+597 9999999",
            "treatment_id": "invalid-treatment-id",
            "appointment_date": tomorrow,
            "appointment_time": "15:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/book",
            json=booking_data
        )
        
        assert response.status_code == 404
    
    def test_create_booking_missing_required_fields(self):
        """Test booking with missing required fields"""
        booking_data = {
            "client_name": "Test Client"
            # Missing phone, treatment_id, date, time
        }
        
        response = requests.post(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/book",
            json=booking_data
        )
        
        assert response.status_code == 422  # Validation error
    
    # ==================== GET BOOKING ====================
    
    def test_get_booking_success(self):
        """Test GET /api/spa-booking/spa/{workspace_id}/booking/{booking_id}"""
        # Ensure we have a booking from previous test
        if not hasattr(self.__class__, 'test_booking_id'):
            pytest.skip("No booking created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/booking/{self.__class__.test_booking_id}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "booking_id" in data
        assert "status" in data
        assert "date" in data
        assert "time" in data
        assert "treatment" in data
        assert "price" in data
        assert "staff" in data
        assert "client_name" in data
        assert "client_phone" in data
        
        assert data["booking_id"] == self.__class__.test_booking_id
    
    def test_get_booking_not_found(self):
        """Test GET booking with invalid booking ID"""
        response = requests.get(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/booking/invalid-booking-id"
        )
        
        assert response.status_code == 404
    
    # ==================== CANCEL BOOKING ====================
    
    def test_cancel_booking_wrong_phone(self):
        """Test cancel booking with wrong phone number"""
        if not hasattr(self.__class__, 'test_booking_id'):
            pytest.skip("No booking created in previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/cancel/{self.__class__.test_booking_id}?phone=+597%200000000"
        )
        
        assert response.status_code == 403
    
    def test_cancel_booking_success(self):
        """Test POST /api/spa-booking/spa/{workspace_id}/cancel/{booking_id}"""
        if not hasattr(self.__class__, 'test_booking_id'):
            pytest.skip("No booking created in previous test")
        
        # URL encode the phone number
        phone = self.__class__.test_client_phone.replace("+", "%2B").replace(" ", "%20")
        
        response = requests.post(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/cancel/{self.__class__.test_booking_id}?phone={phone}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "message" in data
    
    def test_cancel_booking_already_cancelled(self):
        """Test cancelling an already cancelled booking"""
        if not hasattr(self.__class__, 'test_booking_id'):
            pytest.skip("No booking created in previous test")
        
        phone = self.__class__.test_client_phone.replace("+", "%2B").replace(" ", "%20")
        
        response = requests.post(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/cancel/{self.__class__.test_booking_id}?phone={phone}"
        )
        
        assert response.status_code == 400
    
    def test_cancel_booking_not_found(self):
        """Test cancel with invalid booking ID"""
        response = requests.post(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/cancel/invalid-booking-id?phone=%2B597%201234567"
        )
        
        assert response.status_code == 404


class TestSpaBookingEdgeCases:
    """Edge case tests for spa booking portal"""
    
    def test_availability_past_date(self):
        """Test availability for a past date"""
        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/availability?date={past_date}"
        )
        
        # Should still return 200 but slots may be empty or all unavailable
        assert response.status_code == 200
    
    def test_treatments_empty_category(self):
        """Test treatments with non-existent category"""
        response = requests.get(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/treatments?category=nonexistent"
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should return empty categories
        assert data["total"] == 0 or len(data["categories"]) == 0
    
    def test_booking_with_optional_fields(self):
        """Test booking with only required fields (no email, no notes)"""
        treatments_response = requests.get(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/treatments")
        treatments_data = treatments_response.json()
        
        treatment_id = None
        for category, treatments in treatments_data["categories"].items():
            if len(treatments) > 0:
                treatment_id = treatments[0]["id"]
                break
        
        if not treatment_id:
            pytest.skip("No treatments available")
        
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        booking_data = {
            "client_name": "TEST_Minimal Client",
            "client_phone": "+597 5555555",
            "treatment_id": treatment_id,
            "appointment_date": tomorrow,
            "appointment_time": "11:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/book",
            json=booking_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Clean up - cancel the booking
        booking_id = data["booking_id"]
        phone = booking_data["client_phone"].replace("+", "%2B").replace(" ", "%20")
        requests.post(f"{BASE_URL}/api/spa-booking/spa/{WORKSPACE_ID}/cancel/{booking_id}?phone={phone}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
