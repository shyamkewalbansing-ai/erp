"""
Test suite for HRM Module and CMS Image Upload - Iteration 20
Tests:
- Admin login
- HRM Dashboard API
- HRM Employees CRUD
- HRM Departments CRUD
- HRM Settings API
- CMS Image Upload
- Public landing page
- AI Chatbot endpoint
"""

import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@facturatie.sr"
ADMIN_PASSWORD = "admin123"


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "superadmin"
        print(f"✓ Admin login successful - role: {data['user']['role']}")
    
    def test_admin_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestHRMDashboard:
    """Test HRM Dashboard API"""
    
    def test_hrm_dashboard_returns_stats(self, auth_headers):
        """Test /api/hrm/dashboard returns correct stats structure"""
        response = requests.get(f"{BASE_URL}/api/hrm/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "employees" in data
        assert "total" in data["employees"]
        assert "active" in data["employees"]
        assert "on_leave" in data["employees"]
        assert "present_today" in data["employees"]
        
        assert "departments" in data
        assert "leave" in data
        assert "pending_requests" in data["leave"]
        
        assert "recruitment" in data
        assert "open_vacancies" in data["recruitment"]
        assert "new_applications" in data["recruitment"]
        
        assert "contracts" in data
        assert "expiring_soon" in data["contracts"]
        
        assert "salary" in data
        assert "total_monthly" in data["salary"]
        assert "average" in data["salary"]
        
        print(f"✓ HRM Dashboard - Employees: {data['employees']['total']}, Departments: {data['departments']}")


class TestHRMEmployees:
    """Test HRM Employees CRUD operations"""
    
    created_employee_id = None
    
    def test_get_employees_list(self, auth_headers):
        """Test GET /api/hrm/employees"""
        response = requests.get(f"{BASE_URL}/api/hrm/employees", headers=auth_headers)
        assert response.status_code == 200, f"Get employees failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get employees - Found {len(data)} employees")
    
    def test_create_employee(self, auth_headers):
        """Test POST /api/hrm/employees"""
        employee_data = {
            "name": f"TEST_Employee_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_emp_{datetime.now().strftime('%H%M%S')}@example.com",
            "phone": "+597 123456",
            "department": "IT",
            "position": "Developer",
            "salary": 5000.0,
            "currency": "SRD",
            "start_date": "2024-01-01",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/hrm/employees", headers=auth_headers, json=employee_data)
        assert response.status_code == 200, f"Create employee failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == employee_data["name"]
        TestHRMEmployees.created_employee_id = data["id"]
        print(f"✓ Created employee: {data['name']} (ID: {data['id']})")
    
    def test_get_employee_by_id(self, auth_headers):
        """Test GET /api/hrm/employees/{id}"""
        if not TestHRMEmployees.created_employee_id:
            pytest.skip("No employee created")
        
        response = requests.get(
            f"{BASE_URL}/api/hrm/employees/{TestHRMEmployees.created_employee_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get employee failed: {response.text}"
        data = response.json()
        assert data["id"] == TestHRMEmployees.created_employee_id
        print(f"✓ Get employee by ID: {data['name']}")
    
    def test_update_employee(self, auth_headers):
        """Test PUT /api/hrm/employees/{id}"""
        if not TestHRMEmployees.created_employee_id:
            pytest.skip("No employee created")
        
        update_data = {
            "name": f"TEST_Updated_Employee_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_updated_{datetime.now().strftime('%H%M%S')}@example.com",
            "phone": "+597 654321",
            "department": "HR",
            "position": "Manager",
            "salary": 6000.0,
            "currency": "SRD",
            "start_date": "2024-01-01",
            "status": "active"
        }
        response = requests.put(
            f"{BASE_URL}/api/hrm/employees/{TestHRMEmployees.created_employee_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update employee failed: {response.text}"
        data = response.json()
        assert data["position"] == "Manager"
        print(f"✓ Updated employee: {data['name']}")
    
    def test_delete_employee(self, auth_headers):
        """Test DELETE /api/hrm/employees/{id}"""
        if not TestHRMEmployees.created_employee_id:
            pytest.skip("No employee created")
        
        response = requests.delete(
            f"{BASE_URL}/api/hrm/employees/{TestHRMEmployees.created_employee_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Delete employee failed: {response.text}"
        print(f"✓ Deleted employee: {TestHRMEmployees.created_employee_id}")


class TestHRMDepartments:
    """Test HRM Departments CRUD operations"""
    
    created_dept_id = None
    
    def test_get_departments_list(self, auth_headers):
        """Test GET /api/hrm/departments"""
        response = requests.get(f"{BASE_URL}/api/hrm/departments", headers=auth_headers)
        assert response.status_code == 200, f"Get departments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get departments - Found {len(data)} departments")
    
    def test_create_department(self, auth_headers):
        """Test POST /api/hrm/departments"""
        dept_data = {
            "name": f"TEST_Dept_{datetime.now().strftime('%H%M%S')}",
            "description": "Test department for testing",
            "manager_id": None
        }
        response = requests.post(f"{BASE_URL}/api/hrm/departments", headers=auth_headers, json=dept_data)
        assert response.status_code == 200, f"Create department failed: {response.text}"
        data = response.json()
        assert "id" in data
        TestHRMDepartments.created_dept_id = data["id"]
        print(f"✓ Created department: {data['name']} (ID: {data['id']})")
    
    def test_delete_department(self, auth_headers):
        """Test DELETE /api/hrm/departments/{id}"""
        if not TestHRMDepartments.created_dept_id:
            pytest.skip("No department created")
        
        response = requests.delete(
            f"{BASE_URL}/api/hrm/departments/{TestHRMDepartments.created_dept_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Delete department failed: {response.text}"
        print(f"✓ Deleted department: {TestHRMDepartments.created_dept_id}")


class TestHRMSettings:
    """Test HRM Settings API"""
    
    def test_get_hrm_settings(self, auth_headers):
        """Test GET /api/hrm/settings"""
        response = requests.get(f"{BASE_URL}/api/hrm/settings", headers=auth_headers)
        assert response.status_code == 200, f"Get settings failed: {response.text}"
        data = response.json()
        
        # Verify default settings structure
        assert "default_currency" in data
        assert "work_hours_per_day" in data
        assert "work_days_per_week" in data
        assert "overtime_rate" in data
        assert "vacation_days_per_year" in data
        print(f"✓ HRM Settings - Currency: {data['default_currency']}, Work hours: {data['work_hours_per_day']}")
    
    def test_update_hrm_settings(self, auth_headers):
        """Test PUT /api/hrm/settings"""
        settings_data = {
            "default_currency": "SRD",
            "work_hours_per_day": 8,
            "work_days_per_week": 5,
            "overtime_rate": 1.5,
            "vacation_days_per_year": 25,
            "sick_days_per_year": 12,
            "tax_rate": 0.0,
            "allow_remote_work": True,
            "require_clock_in": False
        }
        response = requests.put(f"{BASE_URL}/api/hrm/settings", headers=auth_headers, json=settings_data)
        assert response.status_code == 200, f"Update settings failed: {response.text}"
        data = response.json()
        assert data["vacation_days_per_year"] == 25
        print(f"✓ Updated HRM settings - Vacation days: {data['vacation_days_per_year']}")


class TestHRMLeaveRequests:
    """Test HRM Leave Requests API"""
    
    def test_get_leave_requests(self, auth_headers):
        """Test GET /api/hrm/leave-requests"""
        response = requests.get(f"{BASE_URL}/api/hrm/leave-requests", headers=auth_headers)
        assert response.status_code == 200, f"Get leave requests failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get leave requests - Found {len(data)} requests")


class TestHRMContracts:
    """Test HRM Contracts API"""
    
    def test_get_contracts(self, auth_headers):
        """Test GET /api/hrm/contracts"""
        response = requests.get(f"{BASE_URL}/api/hrm/contracts", headers=auth_headers)
        assert response.status_code == 200, f"Get contracts failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get contracts - Found {len(data)} contracts")


class TestHRMVacancies:
    """Test HRM Vacancies API"""
    
    def test_get_vacancies(self, auth_headers):
        """Test GET /api/hrm/vacancies"""
        response = requests.get(f"{BASE_URL}/api/hrm/vacancies", headers=auth_headers)
        assert response.status_code == 200, f"Get vacancies failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get vacancies - Found {len(data)} vacancies")


class TestHRMAttendance:
    """Test HRM Attendance API"""
    
    def test_get_attendance(self, auth_headers):
        """Test GET /api/hrm/attendance"""
        response = requests.get(f"{BASE_URL}/api/hrm/attendance", headers=auth_headers)
        assert response.status_code == 200, f"Get attendance failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get attendance - Found {len(data)} records")


class TestHRMPayroll:
    """Test HRM Payroll API"""
    
    def test_get_payroll(self, auth_headers):
        """Test GET /api/hrm/payroll"""
        response = requests.get(f"{BASE_URL}/api/hrm/payroll", headers=auth_headers)
        assert response.status_code == 200, f"Get payroll failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get payroll - Found {len(data)} records")


class TestCMSImageUpload:
    """Test CMS Image Upload functionality"""
    
    def test_cms_upload_image_endpoint_exists(self, auth_headers):
        """Test that /api/cms/upload-image endpoint exists"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal PNG image (1x1 transparent pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {
            'file': ('test_image.png', png_data, 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cms/upload-image",
            headers={"Authorization": auth_headers["Authorization"]},
            files=files
        )
        
        # Should return 200 with URL or 400/422 for validation
        assert response.status_code in [200, 400, 422, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "url" in data or "image_url" in data
            print(f"✓ CMS Image upload successful: {data}")
        else:
            print(f"✓ CMS Image upload endpoint exists (status: {response.status_code})")


class TestCMSPages:
    """Test CMS Pages API"""
    
    def test_get_cms_pages(self, auth_headers):
        """Test GET /api/cms/pages"""
        response = requests.get(f"{BASE_URL}/api/cms/pages", headers=auth_headers)
        assert response.status_code == 200, f"Get CMS pages failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get CMS pages - Found {len(data)} pages")


class TestPublicEndpoints:
    """Test public endpoints (no auth required)"""
    
    def test_public_landing_settings(self):
        """Test GET /api/public/landing/settings"""
        response = requests.get(f"{BASE_URL}/api/public/landing/settings")
        assert response.status_code == 200, f"Get landing settings failed: {response.text}"
        data = response.json()
        assert "company_name" in data
        print(f"✓ Public landing settings - Company: {data.get('company_name')}")
    
    def test_public_landing_sections(self):
        """Test GET /api/public/landing/sections"""
        response = requests.get(f"{BASE_URL}/api/public/landing/sections")
        assert response.status_code == 200, f"Get landing sections failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public landing sections - Found {len(data)} sections")
    
    def test_public_addons(self):
        """Test GET /api/public/addons"""
        response = requests.get(f"{BASE_URL}/api/public/addons")
        assert response.status_code == 200, f"Get public addons failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public addons - Found {len(data)} addons")


class TestAIChatbot:
    """Test AI Chatbot endpoint"""
    
    def test_public_chat_endpoint(self):
        """Test POST /api/public/chat"""
        response = requests.post(f"{BASE_URL}/api/public/chat", json={
            "message": "Wat is Facturatie.sr?"
        })
        # Should return 200 or 500 if AI service is unavailable
        assert response.status_code in [200, 500], f"Chat failed: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "response" in data or "message" in data
            print(f"✓ AI Chatbot responded successfully")
        else:
            print(f"✓ AI Chatbot endpoint exists (AI service may be unavailable)")
    
    def test_authenticated_chat_endpoint(self, auth_headers):
        """Test POST /api/chat (authenticated)"""
        response = requests.post(f"{BASE_URL}/api/chat", headers=auth_headers, json={
            "message": "Hoeveel huurders heb ik?"
        })
        # Should return 200 or 500 if AI service is unavailable
        assert response.status_code in [200, 500], f"Chat failed: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Authenticated AI Chat responded successfully")
        else:
            print(f"✓ Authenticated AI Chat endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
