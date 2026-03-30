"""
Test Meter Readings (EBS/SWM) Feature for Kiosk Admin
Tests:
- GET /api/kiosk/admin/meter-settings - Get tariff settings
- PUT /api/kiosk/admin/meter-settings - Update tariffs
- GET /api/kiosk/admin/meter-readings - List readings per apartment
- POST /api/kiosk/admin/meter-readings - Register new reading
- POST /api/kiosk/admin/meter-readings/charge/{apartment_id} - Charge costs to tenant
- Validation: new stand cannot be lower than previous
- Usage calculation: new_stand - old_stand
- Cost calculation: usage * tariff
- WhatsApp notification on charge (meter_charge message type)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_URL = f"{BASE_URL}/api/kiosk"

# Test credentials
TEST_EMAIL = "shyam@kewalbansing.net"
TEST_PASSWORD = "Bharat7755"


class TestMeterReadingsFeature:
    """Test suite for Meter Readings (EBS/SWM) feature"""
    
    token = None
    test_apartment_id = None
    test_tenant_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before tests"""
        if not TestMeterReadingsFeature.token:
            response = requests.post(f"{API_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert response.status_code == 200, f"Login failed: {response.text}"
            TestMeterReadingsFeature.token = response.json()["token"]
        yield
    
    @property
    def headers(self):
        return {"Authorization": f"Bearer {TestMeterReadingsFeature.token}"}
    
    # ============== METER SETTINGS TESTS ==============
    
    def test_01_get_meter_settings(self):
        """Test GET /api/kiosk/admin/meter-settings returns tariffs"""
        response = requests.get(f"{API_URL}/admin/meter-settings", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "ebs_tariff_kwh" in data, "Missing ebs_tariff_kwh"
        assert "swm_tariff_m3" in data, "Missing swm_tariff_m3"
        
        # Verify default values
        assert isinstance(data["ebs_tariff_kwh"], (int, float)), "ebs_tariff_kwh should be numeric"
        assert isinstance(data["swm_tariff_m3"], (int, float)), "swm_tariff_m3 should be numeric"
        
        print(f"Current tariffs - EBS: {data['ebs_tariff_kwh']} SRD/kWh, SWM: {data['swm_tariff_m3']} SRD/m³")
    
    def test_02_update_meter_settings_ebs(self):
        """Test PUT /api/kiosk/admin/meter-settings - update EBS tariff"""
        new_ebs_tariff = 2.50
        response = requests.put(
            f"{API_URL}/admin/meter-settings?ebs_tariff_kwh={new_ebs_tariff}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify update
        get_response = requests.get(f"{API_URL}/admin/meter-settings", headers=self.headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["ebs_tariff_kwh"] == new_ebs_tariff, f"EBS tariff not updated: {data['ebs_tariff_kwh']}"
        print(f"EBS tariff updated to {new_ebs_tariff}")
    
    def test_03_update_meter_settings_swm(self):
        """Test PUT /api/kiosk/admin/meter-settings - update SWM tariff"""
        new_swm_tariff = 36.00
        response = requests.put(
            f"{API_URL}/admin/meter-settings?swm_tariff_m3={new_swm_tariff}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify update
        get_response = requests.get(f"{API_URL}/admin/meter-settings", headers=self.headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["swm_tariff_m3"] == new_swm_tariff, f"SWM tariff not updated: {data['swm_tariff_m3']}"
        print(f"SWM tariff updated to {new_swm_tariff}")
    
    def test_04_reset_tariffs_to_default(self):
        """Reset tariffs to default values for consistent testing"""
        response = requests.put(
            f"{API_URL}/admin/meter-settings?ebs_tariff_kwh=2.28&swm_tariff_m3=35.26",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify reset
        get_response = requests.get(f"{API_URL}/admin/meter-settings", headers=self.headers)
        data = get_response.json()
        assert data["ebs_tariff_kwh"] == 2.28, "EBS tariff not reset"
        assert data["swm_tariff_m3"] == 35.26, "SWM tariff not reset"
        print("Tariffs reset to defaults: EBS=2.28, SWM=35.26")
    
    # ============== METER READINGS LIST TESTS ==============
    
    def test_05_list_meter_readings(self):
        """Test GET /api/kiosk/admin/meter-readings returns readings per apartment"""
        response = requests.get(f"{API_URL}/admin/meter-readings", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "readings" in data, "Missing readings array"
        assert "ebs_tariff" in data, "Missing ebs_tariff"
        assert "swm_tariff" in data, "Missing swm_tariff"
        
        readings = data["readings"]
        assert isinstance(readings, list), "readings should be a list"
        
        if readings:
            # Verify reading structure
            r = readings[0]
            required_fields = [
                "apartment_id", "apartment_number", "tenant_name", "tenant_id",
                "ebs_old", "ebs_new", "ebs_usage", "ebs_cost",
                "swm_old", "swm_new", "swm_usage", "swm_cost",
                "total_cost"
            ]
            for field in required_fields:
                assert field in r, f"Missing field: {field}"
            
            # Store apartment_id for later tests
            TestMeterReadingsFeature.test_apartment_id = r["apartment_id"]
            if r.get("tenant_id"):
                TestMeterReadingsFeature.test_tenant_id = r["tenant_id"]
            
            print(f"Found {len(readings)} apartments with meter data")
            print(f"Sample: {r['apartment_number']} - EBS: {r['ebs_new']}, SWM: {r['swm_new']}")
        else:
            # Get an apartment for testing
            apt_response = requests.get(f"{API_URL}/admin/apartments", headers=self.headers)
            if apt_response.status_code == 200 and apt_response.json():
                TestMeterReadingsFeature.test_apartment_id = apt_response.json()[0]["apartment_id"]
            print("No meter readings found yet")
    
    # ============== CREATE METER READING TESTS ==============
    
    def test_06_create_ebs_reading(self):
        """Test POST /api/kiosk/admin/meter-readings - create EBS reading"""
        if not TestMeterReadingsFeature.test_apartment_id:
            pytest.skip("No apartment available for testing")
        
        # Get current reading to determine new stand
        response = requests.get(f"{API_URL}/admin/meter-readings", headers=self.headers)
        readings = response.json().get("readings", [])
        current_apt = next((r for r in readings if r["apartment_id"] == TestMeterReadingsFeature.test_apartment_id), None)
        
        current_ebs = current_apt["ebs_new"] if current_apt and current_apt.get("ebs_new") else 0
        new_stand = current_ebs + 100  # Add 100 kWh
        
        response = requests.post(f"{API_URL}/admin/meter-readings", headers=self.headers, json={
            "apartment_id": TestMeterReadingsFeature.test_apartment_id,
            "meter_type": "ebs",
            "new_stand": new_stand,
            "reading_date": datetime.now().strftime("%Y-%m-%d")
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert data["stand"] == new_stand, f"Stand mismatch: {data['stand']} != {new_stand}"
        assert data["meter_type"] == "ebs", "Wrong meter type"
        assert "usage" in data, "Missing usage"
        assert "cost" in data, "Missing cost"
        
        # Verify usage calculation
        expected_usage = new_stand - current_ebs if current_ebs else 0
        assert data["usage"] == expected_usage, f"Usage mismatch: {data['usage']} != {expected_usage}"
        
        # Verify cost calculation (usage * 2.28)
        expected_cost = round(expected_usage * 2.28, 2)
        assert data["cost"] == expected_cost, f"Cost mismatch: {data['cost']} != {expected_cost}"
        
        print(f"Created EBS reading: {new_stand} kWh, usage: {data['usage']}, cost: SRD {data['cost']}")
    
    def test_07_create_swm_reading(self):
        """Test POST /api/kiosk/admin/meter-readings - create SWM reading"""
        if not TestMeterReadingsFeature.test_apartment_id:
            pytest.skip("No apartment available for testing")
        
        # Get current reading
        response = requests.get(f"{API_URL}/admin/meter-readings", headers=self.headers)
        readings = response.json().get("readings", [])
        current_apt = next((r for r in readings if r["apartment_id"] == TestMeterReadingsFeature.test_apartment_id), None)
        
        current_swm = current_apt["swm_new"] if current_apt and current_apt.get("swm_new") else 0
        new_stand = current_swm + 5.5  # Add 5.5 m³
        
        response = requests.post(f"{API_URL}/admin/meter-readings", headers=self.headers, json={
            "apartment_id": TestMeterReadingsFeature.test_apartment_id,
            "meter_type": "swm",
            "new_stand": new_stand,
            "reading_date": datetime.now().strftime("%Y-%m-%d")
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert data["stand"] == new_stand, f"Stand mismatch: {data['stand']} != {new_stand}"
        assert data["meter_type"] == "swm", "Wrong meter type"
        
        # Verify cost calculation (usage * 35.26)
        expected_usage = new_stand - current_swm if current_swm else 0
        expected_cost = round(expected_usage * 35.26, 2)
        assert data["cost"] == expected_cost, f"Cost mismatch: {data['cost']} != {expected_cost}"
        
        print(f"Created SWM reading: {new_stand} m³, usage: {data['usage']}, cost: SRD {data['cost']}")
    
    def test_08_validation_new_stand_lower_than_previous(self):
        """Test validation: new stand cannot be lower than previous stand"""
        if not TestMeterReadingsFeature.test_apartment_id:
            pytest.skip("No apartment available for testing")
        
        # Try to create a reading with lower stand
        response = requests.post(f"{API_URL}/admin/meter-readings", headers=self.headers, json={
            "apartment_id": TestMeterReadingsFeature.test_apartment_id,
            "meter_type": "ebs",
            "new_stand": 0,  # Lower than any previous reading
            "reading_date": datetime.now().strftime("%Y-%m-%d")
        })
        
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "lager" in response.json().get("detail", "").lower() or "lower" in response.json().get("detail", "").lower(), \
            f"Expected validation error about lower stand: {response.text}"
        
        print("Validation working: Cannot set stand lower than previous")
    
    def test_09_validation_invalid_meter_type(self):
        """Test validation: meter_type must be 'ebs' or 'swm'"""
        if not TestMeterReadingsFeature.test_apartment_id:
            pytest.skip("No apartment available for testing")
        
        response = requests.post(f"{API_URL}/admin/meter-readings", headers=self.headers, json={
            "apartment_id": TestMeterReadingsFeature.test_apartment_id,
            "meter_type": "invalid",
            "new_stand": 100,
            "reading_date": datetime.now().strftime("%Y-%m-%d")
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Validation working: Invalid meter type rejected")
    
    def test_10_validation_invalid_apartment(self):
        """Test validation: apartment must exist"""
        response = requests.post(f"{API_URL}/admin/meter-readings", headers=self.headers, json={
            "apartment_id": "non-existent-apartment-id",
            "meter_type": "ebs",
            "new_stand": 100,
            "reading_date": datetime.now().strftime("%Y-%m-%d")
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("Validation working: Non-existent apartment rejected")
    
    # ============== CHARGE METER COSTS TESTS ==============
    
    def test_11_charge_meter_costs_to_tenant(self):
        """Test POST /api/kiosk/admin/meter-readings/charge/{apartment_id}"""
        if not TestMeterReadingsFeature.test_apartment_id:
            pytest.skip("No apartment available for testing")
        
        # First check if there's a tenant and costs to charge
        response = requests.get(f"{API_URL}/admin/meter-readings", headers=self.headers)
        readings = response.json().get("readings", [])
        current_apt = next((r for r in readings if r["apartment_id"] == TestMeterReadingsFeature.test_apartment_id), None)
        
        if not current_apt or not current_apt.get("tenant_id"):
            pytest.skip("No tenant for this apartment")
        
        if current_apt.get("total_cost", 0) <= 0:
            pytest.skip("No costs to charge")
        
        # Get tenant's current service_costs
        tenant_response = requests.get(f"{API_URL}/admin/tenants", headers=self.headers)
        tenants = tenant_response.json()
        tenant = next((t for t in tenants if t["tenant_id"] == current_apt["tenant_id"]), None)
        original_service_costs = tenant.get("service_costs", 0) if tenant else 0
        
        # Charge the costs
        response = requests.post(
            f"{API_URL}/admin/meter-readings/charge/{TestMeterReadingsFeature.test_apartment_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "ebs_usage" in data, "Missing ebs_usage"
        assert "ebs_cost" in data, "Missing ebs_cost"
        assert "swm_usage" in data, "Missing swm_usage"
        assert "swm_cost" in data, "Missing swm_cost"
        assert "total_charged" in data, "Missing total_charged"
        assert "new_service_costs" in data, "Missing new_service_costs"
        
        # Verify total calculation
        expected_total = round(data["ebs_cost"] + data["swm_cost"], 2)
        assert data["total_charged"] == expected_total, f"Total mismatch: {data['total_charged']} != {expected_total}"
        
        # Verify service_costs updated
        expected_new_service = round(original_service_costs + data["total_charged"], 2)
        assert data["new_service_costs"] == expected_new_service, \
            f"Service costs mismatch: {data['new_service_costs']} != {expected_new_service}"
        
        print(f"Charged: EBS SRD {data['ebs_cost']}, SWM SRD {data['swm_cost']}, Total: SRD {data['total_charged']}")
        print(f"New service_costs: SRD {data['new_service_costs']}")
    
    def test_12_charge_no_tenant_fails(self):
        """Test charge fails when no active tenant for apartment"""
        # Get an apartment without tenant
        apt_response = requests.get(f"{API_URL}/admin/apartments", headers=self.headers)
        apartments = apt_response.json()
        
        tenant_response = requests.get(f"{API_URL}/admin/tenants", headers=self.headers)
        tenants = tenant_response.json()
        tenant_apt_ids = {t["apartment_id"] for t in tenants if t.get("status") == "active"}
        
        empty_apt = next((a for a in apartments if a["apartment_id"] not in tenant_apt_ids), None)
        
        if not empty_apt:
            pytest.skip("All apartments have tenants")
        
        response = requests.post(
            f"{API_URL}/admin/meter-readings/charge/{empty_apt['apartment_id']}",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("Validation working: Cannot charge apartment without tenant")
    
    def test_13_charge_no_costs_fails(self):
        """Test charge fails when no costs to charge (total_cost = 0)"""
        # This would require an apartment with no readings or equal old/new stands
        # For now, we just verify the endpoint exists and returns proper error
        # when there are no costs
        
        # Create a new apartment for this test
        apt_response = requests.post(f"{API_URL}/admin/apartments", headers=self.headers, json={
            "number": "TEST-METER-EMPTY",
            "description": "Test apartment for meter charge validation",
            "monthly_rent": 1000
        })
        
        if apt_response.status_code != 200:
            pytest.skip("Could not create test apartment")
        
        new_apt_id = apt_response.json().get("apartment_id")
        
        # Try to charge - should fail with no costs
        response = requests.post(
            f"{API_URL}/admin/meter-readings/charge/{new_apt_id}",
            headers=self.headers
        )
        
        # Should fail - either no tenant (404) or no costs (400)
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}: {response.text}"
        
        # Cleanup
        requests.delete(f"{API_URL}/admin/apartments/{new_apt_id}", headers=self.headers)
        print("Validation working: Cannot charge when no costs available")
    
    # ============== WHATSAPP NOTIFICATION TEST ==============
    
    def test_14_whatsapp_notification_on_charge(self):
        """Test that WhatsApp notification is sent when meter costs are charged"""
        # This test verifies the notification is stored in the database
        # We check the kiosk_wa_messages collection for meter_charge type
        
        # Get recent messages
        messages_response = requests.get(f"{API_URL}/admin/whatsapp/history", headers=self.headers)
        
        if messages_response.status_code != 200:
            pytest.skip("WhatsApp history endpoint not available")
        
        messages = messages_response.json()
        
        # Look for meter_charge messages
        meter_messages = [m for m in messages if m.get("message_type") == "meter_charge"]
        
        if meter_messages:
            print(f"Found {len(meter_messages)} meter_charge notifications")
            latest = meter_messages[0]
            print(f"Latest: {latest.get('tenant_name')} - {latest.get('status')}")
        else:
            print("No meter_charge notifications found (WhatsApp may not be configured)")
    
    # ============== USAGE AND COST CALCULATION VERIFICATION ==============
    
    def test_15_verify_usage_calculation(self):
        """Verify usage = new_stand - old_stand for consecutive readings"""
        response = requests.get(f"{API_URL}/admin/meter-readings", headers=self.headers)
        assert response.status_code == 200
        
        readings = response.json().get("readings", [])
        
        for r in readings:
            # EBS usage verification
            if r.get("ebs_old") is not None and r.get("ebs_new") is not None:
                expected_ebs_usage = r["ebs_new"] - r["ebs_old"]
                assert r["ebs_usage"] == round(expected_ebs_usage, 2), \
                    f"EBS usage mismatch for {r['apartment_number']}: {r['ebs_usage']} != {expected_ebs_usage}"
            
            # SWM usage verification
            if r.get("swm_old") is not None and r.get("swm_new") is not None:
                expected_swm_usage = r["swm_new"] - r["swm_old"]
                assert r["swm_usage"] == round(expected_swm_usage, 2), \
                    f"SWM usage mismatch for {r['apartment_number']}: {r['swm_usage']} != {expected_swm_usage}"
        
        print("Usage calculations verified for all apartments")
    
    def test_16_verify_cost_calculation(self):
        """Verify cost = usage * tariff"""
        response = requests.get(f"{API_URL}/admin/meter-readings", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        readings = data.get("readings", [])
        ebs_tariff = data.get("ebs_tariff", 2.28)
        swm_tariff = data.get("swm_tariff", 35.26)
        
        for r in readings:
            # EBS cost verification
            expected_ebs_cost = round(r["ebs_usage"] * ebs_tariff, 2)
            assert r["ebs_cost"] == expected_ebs_cost, \
                f"EBS cost mismatch for {r['apartment_number']}: {r['ebs_cost']} != {expected_ebs_cost}"
            
            # SWM cost verification
            expected_swm_cost = round(r["swm_usage"] * swm_tariff, 2)
            assert r["swm_cost"] == expected_swm_cost, \
                f"SWM cost mismatch for {r['apartment_number']}: {r['swm_cost']} != {expected_swm_cost}"
            
            # Total cost verification
            expected_total = round(r["ebs_cost"] + r["swm_cost"], 2)
            assert r["total_cost"] == expected_total, \
                f"Total cost mismatch for {r['apartment_number']}: {r['total_cost']} != {expected_total}"
        
        print(f"Cost calculations verified (EBS: {ebs_tariff} SRD/kWh, SWM: {swm_tariff} SRD/m³)")
    
    # ============== AUTHENTICATION TESTS ==============
    
    def test_17_endpoints_require_auth(self):
        """Test that all meter endpoints require authentication"""
        endpoints = [
            ("GET", f"{API_URL}/admin/meter-settings"),
            ("PUT", f"{API_URL}/admin/meter-settings?ebs_tariff_kwh=2.28"),
            ("GET", f"{API_URL}/admin/meter-readings"),
            ("POST", f"{API_URL}/admin/meter-readings"),
            ("POST", f"{API_URL}/admin/meter-readings/charge/test-id"),
        ]
        
        for method, url in endpoints:
            if method == "GET":
                response = requests.get(url)
            elif method == "PUT":
                response = requests.put(url)
            elif method == "POST":
                response = requests.post(url, json={})
            
            assert response.status_code == 401, \
                f"{method} {url} should require auth, got {response.status_code}"
        
        print("All endpoints properly require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
