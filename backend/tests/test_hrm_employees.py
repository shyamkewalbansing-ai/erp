# HRM Employee CRUD Tests - Testing P0 bug fix for employee creation
# Bug: Users couldn't save new employees - fixed by removing duplicate endpoints and fixing user_id reference

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"


class TestHRMEmployees:
    """Test HRM Employee CRUD operations - P0 bug fix verification"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token before each test"""
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
    
    def test_01_get_employees_list(self):
        """Test GET /api/hrm/employees - List all employees"""
        response = self.session.get(f"{BASE_URL}/api/hrm/employees")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/hrm/employees returned {len(data)} employees")
    
    def test_02_create_employee_with_first_last_name(self):
        """Test POST /api/hrm/employees - Create employee with first_name and last_name (P0 BUG FIX)"""
        # This is the main bug fix test - the backend should accept first_name and last_name
        employee_data = {
            "first_name": "Test",
            "last_name": "Medewerker",
            "email": f"test.medewerker.{int(time.time())}@test.com",
            "phone": "+597 123456",
            "department": "IT",
            "position": "Developer",
            "salary": 5000,
            "status": "active"
        }
        
        response = self.session.post(f"{BASE_URL}/api/hrm/employees", json=employee_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response contains the correct fields
        assert "id" in data, "Response should contain 'id'"
        assert data.get("first_name") == "Test", f"first_name should be 'Test', got {data.get('first_name')}"
        assert data.get("last_name") == "Medewerker", f"last_name should be 'Medewerker', got {data.get('last_name')}"
        assert "employee_id" in data, "Response should contain auto-generated 'employee_id'"
        
        # Store for cleanup
        self.created_employee_id = data["id"]
        print(f"✓ POST /api/hrm/employees created employee with id: {data['id']}, employee_id: {data.get('employee_id')}")
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/hrm/employees/{data['id']}")
        assert get_response.status_code == 200, f"GET after create failed: {get_response.status_code}"
        
        fetched = get_response.json()
        assert fetched["first_name"] == "Test", "Persisted first_name should match"
        assert fetched["last_name"] == "Medewerker", "Persisted last_name should match"
        print(f"✓ GET /api/hrm/employees/{data['id']} verified persistence")
        
        return data["id"]
    
    def test_03_create_employee_minimal_fields(self):
        """Test POST /api/hrm/employees - Create with only required fields (first_name, last_name)"""
        employee_data = {
            "first_name": "Minimal",
            "last_name": "Employee"
        }
        
        response = self.session.post(f"{BASE_URL}/api/hrm/employees", json=employee_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("first_name") == "Minimal"
        assert data.get("last_name") == "Employee"
        assert data.get("status") == "active", "Default status should be 'active'"
        
        print(f"✓ Created employee with minimal fields: {data['id']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/hrm/employees/{data['id']}")
    
    def test_04_update_employee(self):
        """Test PUT /api/hrm/employees/{id} - Update employee"""
        # First create an employee
        create_response = self.session.post(f"{BASE_URL}/api/hrm/employees", json={
            "first_name": "Update",
            "last_name": "Test"
        })
        
        assert create_response.status_code == 200
        employee_id = create_response.json()["id"]
        
        # Update the employee
        update_data = {
            "first_name": "Updated",
            "last_name": "Employee",
            "position": "Senior Developer",
            "salary": 7500
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/hrm/employees/{employee_id}", json=update_data)
        
        assert update_response.status_code == 200, f"Update failed: {update_response.status_code}: {update_response.text}"
        
        # Verify update with GET
        get_response = self.session.get(f"{BASE_URL}/api/hrm/employees/{employee_id}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched["first_name"] == "Updated"
        assert fetched["last_name"] == "Employee"
        assert fetched["position"] == "Senior Developer"
        assert fetched["salary"] == 7500
        
        print(f"✓ PUT /api/hrm/employees/{employee_id} updated successfully")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/hrm/employees/{employee_id}")
    
    def test_05_delete_employee(self):
        """Test DELETE /api/hrm/employees/{id} - Delete employee"""
        # First create an employee
        create_response = self.session.post(f"{BASE_URL}/api/hrm/employees", json={
            "first_name": "Delete",
            "last_name": "Test"
        })
        
        assert create_response.status_code == 200
        employee_id = create_response.json()["id"]
        
        # Delete the employee
        delete_response = self.session.delete(f"{BASE_URL}/api/hrm/employees/{employee_id}")
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code}"
        
        # Verify deletion with GET (should return 404)
        get_response = self.session.get(f"{BASE_URL}/api/hrm/employees/{employee_id}")
        assert get_response.status_code == 404, "Deleted employee should return 404"
        
        print(f"✓ DELETE /api/hrm/employees/{employee_id} deleted successfully")
    
    def test_06_get_single_employee(self):
        """Test GET /api/hrm/employees/{id} - Get single employee"""
        # First create an employee
        create_response = self.session.post(f"{BASE_URL}/api/hrm/employees", json={
            "first_name": "Single",
            "last_name": "Fetch"
        })
        
        assert create_response.status_code == 200
        employee_id = create_response.json()["id"]
        
        # Get single employee
        get_response = self.session.get(f"{BASE_URL}/api/hrm/employees/{employee_id}")
        
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["id"] == employee_id
        assert data["first_name"] == "Single"
        assert data["last_name"] == "Fetch"
        
        print(f"✓ GET /api/hrm/employees/{employee_id} returned correct employee")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/hrm/employees/{employee_id}")
    
    def test_07_get_nonexistent_employee(self):
        """Test GET /api/hrm/employees/{id} - Get non-existent employee returns 404"""
        fake_id = "000000000000000000000000"  # Valid ObjectId format but doesn't exist
        
        response = self.session.get(f"{BASE_URL}/api/hrm/employees/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/hrm/employees/{fake_id} correctly returned 404")


class TestHRMDepartments:
    """Test HRM Department operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_01_get_departments(self):
        """Test GET /api/hrm/departments"""
        response = self.session.get(f"{BASE_URL}/api/hrm/departments")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ GET /api/hrm/departments returned {len(response.json())} departments")
    
    def test_02_create_department(self):
        """Test POST /api/hrm/departments"""
        dept_data = {
            "name": f"Test Dept {int(time.time())}",
            "description": "Test department for testing"
        }
        
        response = self.session.post(f"{BASE_URL}/api/hrm/departments", json=dept_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == dept_data["name"]
        
        print(f"✓ POST /api/hrm/departments created: {data['id']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/hrm/departments/{data['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
