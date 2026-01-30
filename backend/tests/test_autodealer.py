"""
Auto Dealer Module Backend Tests
Tests for vehicles, customers, sales CRUD operations and dashboard stats
Multi-currency support: SRD, EUR, USD
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "shyam@kewalbansing.net"
TEST_PASSWORD = "test1234"

# Test data prefix for cleanup
TEST_PREFIX = "TEST_AUTODEALER_"


class TestAutoDealerAuth:
    """Test authentication for Auto Dealer module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful for {TEST_EMAIL}")


class TestAutoDealerStats:
    """Test Auto Dealer dashboard stats endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_stats(self, auth_headers):
        """Test GET /api/autodealer/stats"""
        response = requests.get(f"{BASE_URL}/api/autodealer/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        # Verify stats structure
        assert "total_vehicles" in data
        assert "vehicles_in_stock" in data
        assert "vehicles_reserved" in data
        assert "vehicles_sold" in data
        assert "total_customers" in data
        assert "total_sales" in data
        assert "revenue" in data
        assert "pending_payments" in data
        
        # Verify multi-currency revenue structure
        assert "srd" in data["revenue"]
        assert "eur" in data["revenue"]
        assert "usd" in data["revenue"]
        
        print(f"Stats: {data['total_vehicles']} vehicles, {data['total_customers']} customers, {data['total_sales']} sales")
    
    def test_stats_unauthorized(self):
        """Test stats endpoint without auth"""
        response = requests.get(f"{BASE_URL}/api/autodealer/stats")
        assert response.status_code == 401


class TestAutoDealerVehicles:
    """Test Auto Dealer vehicles CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_vehicle_id(self, auth_headers):
        """Create a test vehicle and return its ID"""
        vehicle_data = {
            "brand": f"{TEST_PREFIX}Toyota",
            "model": "Corolla",
            "year": 2023,
            "license_plate": "TEST-123",
            "vin": "TEST123456789",
            "mileage": 15000,
            "fuel_type": "benzine",
            "transmission": "automaat",
            "color": "Wit",
            "body_type": "sedan",
            "doors": 4,
            "seats": 5,
            "description": "Test vehicle for automated testing",
            "purchase_price": {"srd": 50000, "eur": 1500, "usd": 1600},
            "selling_price": {"srd": 65000, "eur": 1950, "usd": 2100},
            "status": "in_stock",
            "condition": "used"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/vehicles", json=vehicle_data, headers=auth_headers)
        assert response.status_code == 200, f"Create vehicle failed: {response.text}"
        data = response.json()
        yield data["id"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/autodealer/vehicles/{data['id']}", headers=auth_headers)
    
    def test_create_vehicle(self, auth_headers):
        """Test POST /api/autodealer/vehicles"""
        vehicle_data = {
            "brand": f"{TEST_PREFIX}Honda",
            "model": "Civic",
            "year": 2022,
            "license_plate": "TEST-456",
            "mileage": 25000,
            "fuel_type": "benzine",
            "transmission": "manueel",
            "color": "Zwart",
            "purchase_price": {"srd": 45000, "eur": 1350, "usd": 1450},
            "selling_price": {"srd": 58000, "eur": 1740, "usd": 1870},
            "status": "in_stock",
            "condition": "used"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/vehicles", json=vehicle_data, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["brand"] == f"{TEST_PREFIX}Honda"
        assert data["model"] == "Civic"
        assert data["year"] == 2022
        assert data["selling_price"]["srd"] == 58000
        assert data["selling_price"]["eur"] == 1740
        assert data["selling_price"]["usd"] == 1870
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/autodealer/vehicles/{data['id']}", headers=auth_headers)
        print(f"Created and cleaned up vehicle: {data['id']}")
    
    def test_get_vehicles(self, auth_headers):
        """Test GET /api/autodealer/vehicles"""
        response = requests.get(f"{BASE_URL}/api/autodealer/vehicles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} vehicles")
    
    def test_get_vehicle_by_id(self, auth_headers, test_vehicle_id):
        """Test GET /api/autodealer/vehicles/{id}"""
        response = requests.get(f"{BASE_URL}/api/autodealer/vehicles/{test_vehicle_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_vehicle_id
        assert f"{TEST_PREFIX}" in data["brand"]
    
    def test_update_vehicle(self, auth_headers, test_vehicle_id):
        """Test PUT /api/autodealer/vehicles/{id}"""
        update_data = {
            "mileage": 20000,
            "selling_price": {"srd": 70000, "eur": 2100, "usd": 2250}
        }
        response = requests.put(f"{BASE_URL}/api/autodealer/vehicles/{test_vehicle_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["mileage"] == 20000
        assert data["selling_price"]["srd"] == 70000
        print(f"Updated vehicle {test_vehicle_id}")
    
    def test_get_vehicles_by_status(self, auth_headers):
        """Test GET /api/autodealer/vehicles?status=in_stock"""
        response = requests.get(f"{BASE_URL}/api/autodealer/vehicles?status=in_stock", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for vehicle in data:
            assert vehicle["status"] == "in_stock"
    
    def test_vehicle_not_found(self, auth_headers):
        """Test GET /api/autodealer/vehicles/{invalid_id}"""
        response = requests.get(f"{BASE_URL}/api/autodealer/vehicles/invalid-id-12345", headers=auth_headers)
        assert response.status_code == 404


class TestAutoDealerCustomers:
    """Test Auto Dealer customers CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_customer_id(self, auth_headers):
        """Create a test customer and return its ID"""
        customer_data = {
            "name": f"{TEST_PREFIX}Jan de Vries",
            "email": "test_jan@example.com",
            "phone": "+597 123456",
            "address": "Teststraat 123",
            "city": "Paramaribo",
            "id_number": "TEST123456",
            "customer_type": "individual"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/customers", json=customer_data, headers=auth_headers)
        assert response.status_code == 200, f"Create customer failed: {response.text}"
        data = response.json()
        yield data["id"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/autodealer/customers/{data['id']}", headers=auth_headers)
    
    def test_create_customer(self, auth_headers):
        """Test POST /api/autodealer/customers"""
        customer_data = {
            "name": f"{TEST_PREFIX}Maria Jansen",
            "email": "test_maria@example.com",
            "phone": "+597 654321",
            "address": "Testlaan 456",
            "city": "Paramaribo",
            "customer_type": "individual"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/customers", json=customer_data, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["name"] == f"{TEST_PREFIX}Maria Jansen"
        assert data["email"] == "test_maria@example.com"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/autodealer/customers/{data['id']}", headers=auth_headers)
        print(f"Created and cleaned up customer: {data['id']}")
    
    def test_create_business_customer(self, auth_headers):
        """Test creating a business customer"""
        customer_data = {
            "name": f"{TEST_PREFIX}Bedrijf BV",
            "email": "test_bedrijf@example.com",
            "phone": "+597 111222",
            "address": "Bedrijfsweg 1",
            "city": "Paramaribo",
            "customer_type": "business",
            "company_name": "Test Bedrijf BV"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/customers", json=customer_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["customer_type"] == "business"
        assert data["company_name"] == "Test Bedrijf BV"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/autodealer/customers/{data['id']}", headers=auth_headers)
    
    def test_get_customers(self, auth_headers):
        """Test GET /api/autodealer/customers"""
        response = requests.get(f"{BASE_URL}/api/autodealer/customers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} customers")
    
    def test_get_customer_by_id(self, auth_headers, test_customer_id):
        """Test GET /api/autodealer/customers/{id}"""
        response = requests.get(f"{BASE_URL}/api/autodealer/customers/{test_customer_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_customer_id
    
    def test_update_customer(self, auth_headers, test_customer_id):
        """Test PUT /api/autodealer/customers/{id}"""
        update_data = {
            "phone": "+597 999888",
            "notes": "Updated via test"
        }
        response = requests.put(f"{BASE_URL}/api/autodealer/customers/{test_customer_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "+597 999888"
        assert data["notes"] == "Updated via test"
    
    def test_search_customers(self, auth_headers, test_customer_id):
        """Test GET /api/autodealer/customers?search=..."""
        response = requests.get(f"{BASE_URL}/api/autodealer/customers?search={TEST_PREFIX}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Should find at least the test customer
        assert len(data) >= 1
    
    def test_customer_not_found(self, auth_headers):
        """Test GET /api/autodealer/customers/{invalid_id}"""
        response = requests.get(f"{BASE_URL}/api/autodealer/customers/invalid-id-12345", headers=auth_headers)
        assert response.status_code == 404


class TestAutoDealerSales:
    """Test Auto Dealer sales CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_vehicle_for_sale(self, auth_headers):
        """Create a test vehicle for sale"""
        vehicle_data = {
            "brand": f"{TEST_PREFIX}Nissan",
            "model": "Sentra",
            "year": 2021,
            "mileage": 30000,
            "fuel_type": "benzine",
            "transmission": "automaat",
            "purchase_price": {"srd": 40000, "eur": 1200, "usd": 1300},
            "selling_price": {"srd": 55000, "eur": 1650, "usd": 1780},
            "status": "in_stock",
            "condition": "used"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/vehicles", json=vehicle_data, headers=auth_headers)
        data = response.json()
        yield data["id"]
        
        # Cleanup - try to delete (may fail if sold)
        requests.delete(f"{BASE_URL}/api/autodealer/vehicles/{data['id']}", headers=auth_headers)
    
    @pytest.fixture(scope="class")
    def test_customer_for_sale(self, auth_headers):
        """Create a test customer for sale"""
        customer_data = {
            "name": f"{TEST_PREFIX}Koper Test",
            "email": "test_koper@example.com",
            "phone": "+597 555666",
            "city": "Paramaribo",
            "customer_type": "individual"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/customers", json=customer_data, headers=auth_headers)
        data = response.json()
        yield data["id"]
        
        # Note: Cannot delete customer with sales history
    
    def test_create_sale(self, auth_headers, test_vehicle_for_sale, test_customer_for_sale):
        """Test POST /api/autodealer/sales"""
        sale_data = {
            "vehicle_id": test_vehicle_for_sale,
            "customer_id": test_customer_for_sale,
            "sale_price": {"srd": 55000, "eur": 1650, "usd": 1780},
            "currency_used": "srd",
            "payment_method": "cash",
            "payment_status": "paid",
            "amount_paid": {"srd": 55000, "eur": 1650, "usd": 1780},
            "sale_date": "2026-01-30",
            "notes": "Test sale"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/sales", json=sale_data, headers=auth_headers)
        assert response.status_code == 200, f"Create sale failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["vehicle_id"] == test_vehicle_for_sale
        assert data["customer_id"] == test_customer_for_sale
        assert data["sale_price"]["srd"] == 55000
        
        # Verify vehicle status changed to sold
        vehicle_response = requests.get(f"{BASE_URL}/api/autodealer/vehicles/{test_vehicle_for_sale}", headers=auth_headers)
        vehicle_data = vehicle_response.json()
        assert vehicle_data["status"] == "sold", "Vehicle status should be 'sold' after sale"
        
        # Cleanup - delete sale (should restore vehicle status)
        delete_response = requests.delete(f"{BASE_URL}/api/autodealer/sales/{data['id']}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        print(f"Created and cleaned up sale: {data['id']}")
    
    def test_get_sales(self, auth_headers):
        """Test GET /api/autodealer/sales"""
        response = requests.get(f"{BASE_URL}/api/autodealer/sales", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} sales")
    
    def test_sale_vehicle_not_found(self, auth_headers, test_customer_for_sale):
        """Test creating sale with invalid vehicle"""
        sale_data = {
            "vehicle_id": "invalid-vehicle-id",
            "customer_id": test_customer_for_sale,
            "sale_price": {"srd": 50000, "eur": 1500, "usd": 1600},
            "currency_used": "srd",
            "payment_method": "cash",
            "payment_status": "pending",
            "amount_paid": {"srd": 0, "eur": 0, "usd": 0},
            "sale_date": "2026-01-30"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/sales", json=sale_data, headers=auth_headers)
        assert response.status_code == 404
    
    def test_sale_customer_not_found(self, auth_headers, test_vehicle_for_sale):
        """Test creating sale with invalid customer"""
        # First create a new vehicle since the fixture one might be sold
        vehicle_data = {
            "brand": f"{TEST_PREFIX}Test",
            "model": "Model",
            "year": 2020,
            "mileage": 10000,
            "purchase_price": {"srd": 30000, "eur": 900, "usd": 1000},
            "selling_price": {"srd": 40000, "eur": 1200, "usd": 1300},
            "status": "in_stock"
        }
        v_response = requests.post(f"{BASE_URL}/api/autodealer/vehicles", json=vehicle_data, headers=auth_headers)
        vehicle_id = v_response.json()["id"]
        
        sale_data = {
            "vehicle_id": vehicle_id,
            "customer_id": "invalid-customer-id",
            "sale_price": {"srd": 40000, "eur": 1200, "usd": 1300},
            "currency_used": "srd",
            "payment_method": "cash",
            "payment_status": "pending",
            "amount_paid": {"srd": 0, "eur": 0, "usd": 0},
            "sale_date": "2026-01-30"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/sales", json=sale_data, headers=auth_headers)
        assert response.status_code == 404
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/autodealer/vehicles/{vehicle_id}", headers=auth_headers)


class TestAutoDealerMultiCurrency:
    """Test multi-currency functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_vehicle_multi_currency_prices(self, auth_headers):
        """Test that vehicles have all three currency prices"""
        vehicle_data = {
            "brand": f"{TEST_PREFIX}MultiCurrency",
            "model": "Test",
            "year": 2024,
            "mileage": 0,
            "purchase_price": {"srd": 100000, "eur": 3000, "usd": 3200},
            "selling_price": {"srd": 130000, "eur": 3900, "usd": 4200},
            "status": "in_stock",
            "condition": "new"
        }
        response = requests.post(f"{BASE_URL}/api/autodealer/vehicles", json=vehicle_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all currencies are present
        assert data["purchase_price"]["srd"] == 100000
        assert data["purchase_price"]["eur"] == 3000
        assert data["purchase_price"]["usd"] == 3200
        assert data["selling_price"]["srd"] == 130000
        assert data["selling_price"]["eur"] == 3900
        assert data["selling_price"]["usd"] == 4200
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/autodealer/vehicles/{data['id']}", headers=auth_headers)
        print("Multi-currency vehicle test passed")
    
    def test_stats_multi_currency_revenue(self, auth_headers):
        """Test that stats return revenue in all currencies"""
        response = requests.get(f"{BASE_URL}/api/autodealer/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify revenue has all currencies
        assert "srd" in data["revenue"]
        assert "eur" in data["revenue"]
        assert "usd" in data["revenue"]
        
        # Verify pending_payments has all currencies
        assert "srd" in data["pending_payments"]
        assert "eur" in data["pending_payments"]
        assert "usd" in data["pending_payments"]
        
        print(f"Revenue - SRD: {data['revenue']['srd']}, EUR: {data['revenue']['eur']}, USD: {data['revenue']['usd']}")


class TestAutoDealerDeleteConstraints:
    """Test delete constraints and business rules"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_cannot_delete_sold_vehicle(self, auth_headers):
        """Test that sold vehicles cannot be deleted"""
        # Create vehicle
        vehicle_data = {
            "brand": f"{TEST_PREFIX}DeleteTest",
            "model": "Sold",
            "year": 2020,
            "mileage": 50000,
            "purchase_price": {"srd": 30000, "eur": 900, "usd": 1000},
            "selling_price": {"srd": 40000, "eur": 1200, "usd": 1300},
            "status": "in_stock"
        }
        v_response = requests.post(f"{BASE_URL}/api/autodealer/vehicles", json=vehicle_data, headers=auth_headers)
        vehicle_id = v_response.json()["id"]
        
        # Create customer
        customer_data = {
            "name": f"{TEST_PREFIX}DeleteTestKoper",
            "email": "delete_test@example.com",
            "phone": "+597 777888",
            "customer_type": "individual"
        }
        c_response = requests.post(f"{BASE_URL}/api/autodealer/customers", json=customer_data, headers=auth_headers)
        customer_id = c_response.json()["id"]
        
        # Create sale
        sale_data = {
            "vehicle_id": vehicle_id,
            "customer_id": customer_id,
            "sale_price": {"srd": 40000, "eur": 1200, "usd": 1300},
            "currency_used": "srd",
            "payment_method": "cash",
            "payment_status": "paid",
            "amount_paid": {"srd": 40000, "eur": 1200, "usd": 1300},
            "sale_date": "2026-01-30"
        }
        s_response = requests.post(f"{BASE_URL}/api/autodealer/sales", json=sale_data, headers=auth_headers)
        sale_id = s_response.json()["id"]
        
        # Try to delete sold vehicle - should fail
        delete_response = requests.delete(f"{BASE_URL}/api/autodealer/vehicles/{vehicle_id}", headers=auth_headers)
        assert delete_response.status_code == 400, "Should not be able to delete sold vehicle"
        
        # Cleanup - delete sale first (restores vehicle), then vehicle, then customer
        requests.delete(f"{BASE_URL}/api/autodealer/sales/{sale_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/autodealer/vehicles/{vehicle_id}", headers=auth_headers)
        # Note: Customer with sales history cannot be deleted
        
        print("Delete constraint test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
