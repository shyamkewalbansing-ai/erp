"""
Pompstation (Gas Station) Module - Backend API Tests
Tests all CRUD operations for the Pompstation module including:
- Tanks management
- Fuel deliveries
- Pumps management
- Shop products
- POS sales
- Shifts management
- Employees
- Safety inspections
- Incidents
- Daily reports
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "test@pompstation.sr"
TEST_USER_PASSWORD = "test123"


class TestPompstationAuth:
    """Authentication tests for pompstation user"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test login with pompstation test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_USER_EMAIL


class TestPompstationDashboard:
    """Dashboard API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_dashboard(self, auth_token):
        """Test GET /api/pompstation/dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard structure
        assert "tanks" in data
        assert "sales" in data
        assert "operations" in data
        assert "alerts" in data
        
        # Verify sales structure
        assert "today" in data["sales"]
        assert "week" in data["sales"]
        assert "month" in data["sales"]


class TestPompstationTanks:
    """Tanks CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def created_tank_id(self, auth_token):
        """Create a tank for testing and return its ID"""
        response = requests.post(
            f"{BASE_URL}/api/pompstation/tanks",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "name": f"TEST_Tank_{uuid.uuid4().hex[:8]}",
                "fuel_type": "diesel",
                "capacity_liters": 10000,
                "current_level_liters": 5000,
                "min_level_alert": 1000,
                "location": "Test Location"
            }
        )
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_get_tanks(self, auth_token):
        """Test GET /api/pompstation/tanks"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/tanks",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_tank(self, auth_token):
        """Test POST /api/pompstation/tanks"""
        tank_data = {
            "name": f"TEST_Tank_Create_{uuid.uuid4().hex[:8]}",
            "fuel_type": "benzine",
            "capacity_liters": 15000,
            "current_level_liters": 8000,
            "min_level_alert": 2000,
            "location": "Zuid-zijde"
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/tanks",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=tank_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response data
        assert data["name"] == tank_data["name"]
        assert data["fuel_type"] == tank_data["fuel_type"]
        assert data["capacity_liters"] == tank_data["capacity_liters"]
        assert "id" in data
        assert "percentage_full" in data
        assert "status" in data
    
    def test_update_tank(self, auth_token, created_tank_id):
        """Test PUT /api/pompstation/tanks/{tank_id}"""
        update_data = {
            "name": "TEST_Tank_Updated",
            "fuel_type": "diesel",
            "capacity_liters": 12000,
            "current_level_liters": 6000,
            "min_level_alert": 1500,
            "location": "Updated Location"
        }
        response = requests.put(
            f"{BASE_URL}/api/pompstation/tanks/{created_tank_id}",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["capacity_liters"] == update_data["capacity_liters"]
    
    def test_add_tank_reading(self, auth_token, created_tank_id):
        """Test POST /api/pompstation/tanks/{tank_id}/readings"""
        reading_data = {
            "tank_id": created_tank_id,
            "level_liters": 5500,
            "temperature_celsius": 25.5,
            "reading_type": "manual"
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/tanks/{created_tank_id}/readings",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=reading_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["level_liters"] == reading_data["level_liters"]
        assert data["reading_type"] == reading_data["reading_type"]


class TestPompstationEmployees:
    """Employees CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def created_employee_id(self, auth_token):
        """Create an employee for testing"""
        response = requests.post(
            f"{BASE_URL}/api/pompstation/employees",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "name": f"TEST_Employee_{uuid.uuid4().hex[:8]}",
                "email": f"test_{uuid.uuid4().hex[:8]}@pompstation.sr",
                "phone": "+597 123456",
                "role": "pompbediende",
                "hourly_rate": 25.0
            }
        )
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_get_employees(self, auth_token):
        """Test GET /api/pompstation/employees"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/employees",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_employee(self, auth_token):
        """Test POST /api/pompstation/employees"""
        employee_data = {
            "name": f"TEST_Employee_Create_{uuid.uuid4().hex[:8]}",
            "email": f"create_{uuid.uuid4().hex[:8]}@pompstation.sr",
            "phone": "+597 654321",
            "role": "kassier",
            "hourly_rate": 30.0
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/employees",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=employee_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == employee_data["name"]
        assert data["role"] == employee_data["role"]
        assert "id" in data
        assert data["is_active"] == True


class TestPompstationProducts:
    """Shop Products CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def created_product_id(self, auth_token):
        """Create a product for testing"""
        response = requests.post(
            f"{BASE_URL}/api/pompstation/products",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "name": f"TEST_Product_{uuid.uuid4().hex[:8]}",
                "category": "drinks",
                "purchase_price": 3.50,
                "selling_price": 5.00,
                "stock_quantity": 100,
                "min_stock_alert": 10
            }
        )
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_get_products(self, auth_token):
        """Test GET /api/pompstation/products"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/products",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_product(self, auth_token):
        """Test POST /api/pompstation/products"""
        product_data = {
            "name": f"TEST_Product_Create_{uuid.uuid4().hex[:8]}",
            "category": "snacks",
            "purchase_price": 2.00,
            "selling_price": 3.50,
            "stock_quantity": 50,
            "min_stock_alert": 5
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/products",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=product_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == product_data["name"]
        assert data["category"] == product_data["category"]
        assert "profit_margin" in data
        assert "stock_status" in data
    
    def test_update_product(self, auth_token, created_product_id):
        """Test PUT /api/pompstation/products/{product_id}"""
        update_data = {
            "name": "TEST_Product_Updated",
            "category": "drinks",
            "purchase_price": 4.00,
            "selling_price": 6.00,
            "stock_quantity": 80,
            "min_stock_alert": 15
        }
        response = requests.put(
            f"{BASE_URL}/api/pompstation/products/{created_product_id}",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=update_data
        )
        assert response.status_code == 200


class TestPompstationPumps:
    """Pumps CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def tank_id(self, auth_token):
        """Create a tank for pump testing"""
        response = requests.post(
            f"{BASE_URL}/api/pompstation/tanks",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "name": f"TEST_Tank_ForPump_{uuid.uuid4().hex[:8]}",
                "fuel_type": "diesel",
                "capacity_liters": 10000,
                "current_level_liters": 5000,
                "min_level_alert": 1000
            }
        )
        return response.json()["id"]
    
    def test_get_pumps(self, auth_token):
        """Test GET /api/pompstation/pumps"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/pumps",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_pump(self, auth_token, tank_id):
        """Test POST /api/pompstation/pumps"""
        pump_data = {
            "number": 99,  # Use high number to avoid conflicts
            "name": f"TEST_Pump_{uuid.uuid4().hex[:8]}",
            "tank_id": tank_id,
            "status": "active"
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/pumps",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=pump_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["number"] == pump_data["number"]
        assert data["status"] == pump_data["status"]
        assert "tank_name" in data
        assert "fuel_type" in data


class TestPompstationDeliveries:
    """Fuel Deliveries tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def tank_id(self, auth_token):
        """Create a tank for delivery testing"""
        response = requests.post(
            f"{BASE_URL}/api/pompstation/tanks",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "name": f"TEST_Tank_ForDelivery_{uuid.uuid4().hex[:8]}",
                "fuel_type": "diesel",
                "capacity_liters": 20000,
                "current_level_liters": 5000,
                "min_level_alert": 2000
            }
        )
        return response.json()["id"]
    
    def test_get_deliveries(self, auth_token):
        """Test GET /api/pompstation/deliveries"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/deliveries",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_delivery(self, auth_token, tank_id):
        """Test POST /api/pompstation/deliveries"""
        delivery_data = {
            "tank_id": tank_id,
            "supplier": "Staatsolie",
            "truck_number": "AB-123",
            "driver_name": "Test Driver",
            "ordered_liters": 5000,
            "delivered_liters": 4980,
            "price_per_liter": 8.50,
            "delivery_note_number": "DN-001"
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/deliveries",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=delivery_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["supplier"] == delivery_data["supplier"]
        assert data["delivered_liters"] == delivery_data["delivered_liters"]
        assert "total_cost" in data
        assert "variance_liters" in data
        assert "variance_percentage" in data


class TestPompstationSales:
    """POS Sales tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_sales(self, auth_token):
        """Test GET /api/pompstation/sales"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/sales",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "sales" in data
        assert "count" in data
        assert "total" in data
    
    def test_create_sale(self, auth_token):
        """Test POST /api/pompstation/sales"""
        sale_data = {
            "items": [
                {
                    "item_type": "shop_item",
                    "name": "TEST_Sale_Item",
                    "quantity": 2,
                    "unit_price": 5.00,
                    "discount": 0
                }
            ],
            "payment_method": "cash"
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/sales",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=sale_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "receipt_number" in data
        assert data["total"] == 10.00
        assert data["payment_method"] == "cash"


class TestPompstationShifts:
    """Shifts management tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def employee_id(self, auth_token):
        """Create an employee for shift testing"""
        response = requests.post(
            f"{BASE_URL}/api/pompstation/employees",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "name": f"TEST_ShiftEmployee_{uuid.uuid4().hex[:8]}",
                "role": "kassier",
                "hourly_rate": 25.0
            }
        )
        return response.json()["id"]
    
    def test_get_shifts(self, auth_token):
        """Test GET /api/pompstation/shifts"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/shifts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_start_shift(self, auth_token, employee_id):
        """Test POST /api/pompstation/shifts/start"""
        shift_data = {
            "operator_id": employee_id,
            "pump_numbers": [1, 2],
            "starting_cash": 500.00
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/shifts/start",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=shift_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["operator_id"] == employee_id
        assert data["starting_cash"] == 500.00
        assert data["status"] == "active"
        return data["id"]
    
    def test_close_shift(self, auth_token, employee_id):
        """Test POST /api/pompstation/shifts/{shift_id}/close"""
        # First start a new shift
        shift_data = {
            "operator_id": employee_id + "_close",  # Different operator to avoid conflict
            "pump_numbers": [3],
            "starting_cash": 300.00
        }
        # Create employee first
        emp_response = requests.post(
            f"{BASE_URL}/api/pompstation/employees",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "name": f"TEST_CloseShiftEmployee_{uuid.uuid4().hex[:8]}",
                "role": "kassier",
                "hourly_rate": 25.0
            }
        )
        new_emp_id = emp_response.json()["id"]
        
        # Start shift
        shift_data["operator_id"] = new_emp_id
        start_response = requests.post(
            f"{BASE_URL}/api/pompstation/shifts/start",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=shift_data
        )
        shift_id = start_response.json()["id"]
        
        # Close shift
        response = requests.post(
            f"{BASE_URL}/api/pompstation/shifts/{shift_id}/close?ending_cash=350.00",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "total_sales" in data


class TestPompstationInspections:
    """Safety Inspections tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_inspections(self, auth_token):
        """Test GET /api/pompstation/inspections"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/inspections",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_inspection(self, auth_token):
        """Test POST /api/pompstation/inspections"""
        inspection_data = {
            "inspection_type": "fire_extinguisher",
            "inspector_name": "Test Inspector",
            "status": "passed",
            "findings": "All fire extinguishers in good condition",
            "next_inspection_date": "2026-06-01"
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/inspections",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=inspection_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["inspection_type"] == inspection_data["inspection_type"]
        assert data["status"] == inspection_data["status"]


class TestPompstationIncidents:
    """Incidents tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_incidents(self, auth_token):
        """Test GET /api/pompstation/incidents"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/incidents",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_incident(self, auth_token):
        """Test POST /api/pompstation/incidents"""
        incident_data = {
            "incident_type": "equipment_failure",
            "severity": "medium",
            "description": "TEST_Pump 1 display malfunction",
            "location": "Pump Island 1",
            "actions_taken": "Technician called"
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/incidents",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=incident_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["incident_type"] == incident_data["incident_type"]
        assert data["severity"] == incident_data["severity"]
        assert data["resolved"] == False


class TestPompstationReports:
    """Daily Reports tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_daily_report(self, auth_token):
        """Test GET /api/pompstation/reports/daily"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/reports/daily",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify report structure
        assert "date" in data
        assert "total_fuel_sales" in data
        assert "total_fuel_liters" in data
        assert "total_shop_sales" in data
        assert "total_sales" in data
        assert "payment_breakdown" in data
        assert "shifts_count" in data
        assert "transactions_count" in data
    
    def test_get_daily_report_with_date(self, auth_token):
        """Test GET /api/pompstation/reports/daily with specific date"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/reports/daily?date=2026-02-01",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["date"] == "2026-02-01"


class TestPompstationPrices:
    """Fuel Prices tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_prices(self, auth_token):
        """Test GET /api/pompstation/prices"""
        response = requests.get(
            f"{BASE_URL}/api/pompstation/prices",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "prices" in data
    
    def test_set_price(self, auth_token):
        """Test POST /api/pompstation/prices"""
        price_data = {
            "fuel_type": "diesel",
            "price_per_liter": 9.50,
            "effective_date": "2026-02-01"
        }
        response = requests.post(
            f"{BASE_URL}/api/pompstation/prices",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=price_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["fuel_type"] == price_data["fuel_type"]
        assert data["price_per_liter"] == price_data["price_per_liter"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
