"""
Test suite for Facturatie N.V. - New Features Testing
Features to test:
1. Kasgeld transaction history shows maintenance records with cost_type='kasgeld' and salary payments
2. Onderhoud (Maintenance) form has cost_type dropdown ('kasgeld' or 'tenant'), only 'kasgeld' type deducted from kasgeld
3. PDF payslip download button in Werknemers (Employees) page for salary payments
4. PDF deposit refund download button in Borg (Deposits) page when deposit is returned
5. Tenant balance view ('Bekijk Saldo') shows deposit information
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = f"test_features_{uuid.uuid4().hex[:8]}@test.com"
TEST_PASSWORD = "test123"
TEST_NAME = "Test Features User"


class TestSetup:
    """Setup tests - create test user and get auth token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Register a new test user and get auth token"""
        # Register new user
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if response.status_code == 200:
            data = response.json()
            return data["access_token"]
        elif response.status_code == 400:
            # User might already exist, try login
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                return response.json()["access_token"]
        
        pytest.skip(f"Could not authenticate: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session


class TestFeature1KasgeldTransactionHistory(TestSetup):
    """Feature 1: Kasgeld transaction history shows maintenance records with cost_type='kasgeld' and salary payments"""
    
    def test_kasgeld_endpoint_returns_transactions(self, api_client):
        """Test that kasgeld endpoint returns transaction data"""
        response = api_client.get(f"{BASE_URL}/api/kasgeld")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_balance" in data
        assert "total_deposits" in data
        assert "total_payments" in data
        assert "total_withdrawals" in data
        assert "total_maintenance_costs" in data
        assert "total_salary_payments" in data
        assert "transactions" in data
        print(f"Kasgeld balance: {data['total_balance']}")
        print(f"Total maintenance costs: {data['total_maintenance_costs']}")
        print(f"Total salary payments: {data['total_salary_payments']}")
    
    def test_kasgeld_includes_salary_transactions(self, api_client):
        """Test that salary payments appear in kasgeld transactions"""
        # First create an employee
        employee_response = api_client.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_Employee_Kasgeld",
            "position": "Tester",
            "salary": 1500.00,
            "start_date": "2024-01-01"
        })
        assert employee_response.status_code == 200, f"Failed to create employee: {employee_response.text}"
        employee = employee_response.json()
        employee_id = employee["id"]
        
        # Create a salary payment
        salary_response = api_client.post(f"{BASE_URL}/api/salaries", json={
            "employee_id": employee_id,
            "amount": 1500.00,
            "payment_date": "2024-01-15",
            "period_month": 1,
            "period_year": 2024
        })
        assert salary_response.status_code == 200, f"Failed to create salary: {salary_response.text}"
        salary = salary_response.json()
        
        # Check kasgeld transactions
        kasgeld_response = api_client.get(f"{BASE_URL}/api/kasgeld")
        assert kasgeld_response.status_code == 200
        
        data = kasgeld_response.json()
        transactions = data["transactions"]
        
        # Find salary transaction
        salary_transactions = [t for t in transactions if t.get("transaction_type") == "salary"]
        assert len(salary_transactions) > 0, "No salary transactions found in kasgeld"
        
        # Verify salary is in transactions
        salary_found = any(t["id"] == salary["id"] for t in salary_transactions)
        assert salary_found, f"Salary payment {salary['id']} not found in kasgeld transactions"
        print(f"Found {len(salary_transactions)} salary transactions in kasgeld")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/salaries/{salary['id']}")
        api_client.delete(f"{BASE_URL}/api/employees/{employee_id}")


class TestFeature2MaintenanceCostType(TestSetup):
    """Feature 2: Maintenance cost_type dropdown - only 'kasgeld' type deducted from kasgeld balance"""
    
    def test_create_maintenance_with_kasgeld_cost_type(self, api_client):
        """Test creating maintenance with cost_type='kasgeld'"""
        # First create an apartment
        apt_response = api_client.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Apt_Maintenance_Kasgeld",
            "address": "Test Street 1",
            "rent_amount": 1000.00
        })
        assert apt_response.status_code == 200, f"Failed to create apartment: {apt_response.text}"
        apt = apt_response.json()
        
        # Create maintenance with cost_type='kasgeld'
        maint_response = api_client.post(f"{BASE_URL}/api/maintenance", json={
            "apartment_id": apt["id"],
            "category": "overig",
            "description": "TEST Kasgeld maintenance",
            "cost": 500.00,
            "maintenance_date": "2024-01-10",
            "status": "completed",
            "cost_type": "kasgeld"
        })
        assert maint_response.status_code == 200, f"Failed to create maintenance: {maint_response.text}"
        
        maint = maint_response.json()
        assert maint["cost_type"] == "kasgeld", f"Expected cost_type='kasgeld', got {maint['cost_type']}"
        print(f"Created maintenance with cost_type='kasgeld': {maint['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/maintenance/{maint['id']}")
        api_client.delete(f"{BASE_URL}/api/apartments/{apt['id']}")
    
    def test_create_maintenance_with_tenant_cost_type(self, api_client):
        """Test creating maintenance with cost_type='tenant'"""
        # First create an apartment
        apt_response = api_client.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Apt_Maintenance_Tenant",
            "address": "Test Street 2",
            "rent_amount": 1000.00
        })
        assert apt_response.status_code == 200
        apt = apt_response.json()
        
        # Create maintenance with cost_type='tenant'
        maint_response = api_client.post(f"{BASE_URL}/api/maintenance", json={
            "apartment_id": apt["id"],
            "category": "kraan",
            "description": "TEST Tenant maintenance",
            "cost": 300.00,
            "maintenance_date": "2024-01-11",
            "status": "completed",
            "cost_type": "tenant"
        })
        assert maint_response.status_code == 200, f"Failed to create maintenance: {maint_response.text}"
        
        maint = maint_response.json()
        assert maint["cost_type"] == "tenant", f"Expected cost_type='tenant', got {maint['cost_type']}"
        print(f"Created maintenance with cost_type='tenant': {maint['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/maintenance/{maint['id']}")
        api_client.delete(f"{BASE_URL}/api/apartments/{apt['id']}")
    
    def test_kasgeld_only_deducts_kasgeld_type_maintenance(self, api_client):
        """Test that only maintenance with cost_type='kasgeld' is deducted from kasgeld balance"""
        # Create apartment
        apt_response = api_client.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Apt_CostType_Check",
            "address": "Test Street 3",
            "rent_amount": 1000.00
        })
        assert apt_response.status_code == 200
        apt = apt_response.json()
        
        # Get initial kasgeld balance
        initial_kasgeld = api_client.get(f"{BASE_URL}/api/kasgeld").json()
        initial_maintenance_costs = initial_kasgeld["total_maintenance_costs"]
        
        # Create maintenance with cost_type='kasgeld' (should be deducted)
        maint_kasgeld = api_client.post(f"{BASE_URL}/api/maintenance", json={
            "apartment_id": apt["id"],
            "category": "wc",
            "description": "TEST Kasgeld type",
            "cost": 200.00,
            "maintenance_date": "2024-01-12",
            "status": "completed",
            "cost_type": "kasgeld"
        }).json()
        
        # Check kasgeld after kasgeld-type maintenance
        after_kasgeld_maint = api_client.get(f"{BASE_URL}/api/kasgeld").json()
        assert after_kasgeld_maint["total_maintenance_costs"] == initial_maintenance_costs + 200.00, \
            f"Kasgeld maintenance should be added to total_maintenance_costs"
        
        # Create maintenance with cost_type='tenant' (should NOT be deducted)
        maint_tenant = api_client.post(f"{BASE_URL}/api/maintenance", json={
            "apartment_id": apt["id"],
            "category": "douche",
            "description": "TEST Tenant type",
            "cost": 150.00,
            "maintenance_date": "2024-01-13",
            "status": "completed",
            "cost_type": "tenant"
        }).json()
        
        # Check kasgeld after tenant-type maintenance
        after_tenant_maint = api_client.get(f"{BASE_URL}/api/kasgeld").json()
        assert after_tenant_maint["total_maintenance_costs"] == initial_maintenance_costs + 200.00, \
            f"Tenant maintenance should NOT be added to total_maintenance_costs. Expected {initial_maintenance_costs + 200.00}, got {after_tenant_maint['total_maintenance_costs']}"
        
        print(f"Initial maintenance costs: {initial_maintenance_costs}")
        print(f"After kasgeld maintenance: {after_kasgeld_maint['total_maintenance_costs']}")
        print(f"After tenant maintenance: {after_tenant_maint['total_maintenance_costs']}")
        print("PASS: Only kasgeld-type maintenance is deducted from kasgeld balance")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/maintenance/{maint_kasgeld['id']}")
        api_client.delete(f"{BASE_URL}/api/maintenance/{maint_tenant['id']}")
        api_client.delete(f"{BASE_URL}/api/apartments/{apt['id']}")
    
    def test_kasgeld_transactions_only_show_kasgeld_type_maintenance(self, api_client):
        """Test that kasgeld transactions only include maintenance with cost_type='kasgeld'"""
        # Create apartment
        apt_response = api_client.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Apt_Transaction_Check",
            "address": "Test Street 4",
            "rent_amount": 1000.00
        })
        assert apt_response.status_code == 200
        apt = apt_response.json()
        
        # Create maintenance with cost_type='kasgeld'
        maint_kasgeld = api_client.post(f"{BASE_URL}/api/maintenance", json={
            "apartment_id": apt["id"],
            "category": "keuken",
            "description": "TEST Kasgeld transaction check",
            "cost": 250.00,
            "maintenance_date": "2024-01-14",
            "status": "completed",
            "cost_type": "kasgeld"
        }).json()
        
        # Create maintenance with cost_type='tenant'
        maint_tenant = api_client.post(f"{BASE_URL}/api/maintenance", json={
            "apartment_id": apt["id"],
            "category": "verven",
            "description": "TEST Tenant transaction check",
            "cost": 180.00,
            "maintenance_date": "2024-01-15",
            "status": "completed",
            "cost_type": "tenant"
        }).json()
        
        # Get kasgeld transactions
        kasgeld = api_client.get(f"{BASE_URL}/api/kasgeld").json()
        transactions = kasgeld["transactions"]
        
        # Find maintenance transactions
        maint_transactions = [t for t in transactions if t.get("transaction_type") == "maintenance"]
        maint_ids = [t["id"] for t in maint_transactions]
        
        # Kasgeld-type maintenance should be in transactions
        assert maint_kasgeld["id"] in maint_ids, "Kasgeld-type maintenance should appear in kasgeld transactions"
        
        # Tenant-type maintenance should NOT be in transactions
        assert maint_tenant["id"] not in maint_ids, "Tenant-type maintenance should NOT appear in kasgeld transactions"
        
        print("PASS: Only kasgeld-type maintenance appears in kasgeld transactions")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/maintenance/{maint_kasgeld['id']}")
        api_client.delete(f"{BASE_URL}/api/maintenance/{maint_tenant['id']}")
        api_client.delete(f"{BASE_URL}/api/apartments/{apt['id']}")


class TestFeature3PayslipPDF(TestSetup):
    """Feature 3: PDF payslip download for salary payments"""
    
    def test_payslip_pdf_endpoint_exists(self, api_client):
        """Test that payslip PDF endpoint exists"""
        # Create employee
        employee = api_client.post(f"{BASE_URL}/api/employees", json={
            "name": "TEST_Employee_Payslip",
            "position": "Developer",
            "salary": 2000.00,
            "start_date": "2024-01-01"
        }).json()
        
        # Create salary payment
        salary = api_client.post(f"{BASE_URL}/api/salaries", json={
            "employee_id": employee["id"],
            "amount": 2000.00,
            "payment_date": "2024-01-31",
            "period_month": 1,
            "period_year": 2024
        }).json()
        
        # Test PDF endpoint
        pdf_response = api_client.get(f"{BASE_URL}/api/salaries/{salary['id']}/pdf")
        assert pdf_response.status_code == 200, f"Expected 200, got {pdf_response.status_code}: {pdf_response.text}"
        assert pdf_response.headers.get("content-type") == "application/pdf", \
            f"Expected application/pdf, got {pdf_response.headers.get('content-type')}"
        
        # Check PDF content starts with PDF header
        content = pdf_response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF file"
        print(f"Payslip PDF generated successfully, size: {len(content)} bytes")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/salaries/{salary['id']}")
        api_client.delete(f"{BASE_URL}/api/employees/{employee['id']}")
    
    def test_payslip_pdf_not_found_for_invalid_id(self, api_client):
        """Test that payslip PDF returns 404 for invalid salary ID"""
        response = api_client.get(f"{BASE_URL}/api/salaries/invalid-id-12345/pdf")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: 404 returned for invalid salary ID")


class TestFeature4DepositRefundPDF(TestSetup):
    """Feature 4: PDF deposit refund download when deposit is returned"""
    
    def test_deposit_refund_pdf_endpoint_exists(self, api_client):
        """Test that deposit refund PDF endpoint exists"""
        # Create tenant
        tenant = api_client.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Tenant_Deposit",
            "phone": "+597 123 4567"
        }).json()
        
        # Create apartment
        apt = api_client.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Apt_Deposit",
            "address": "Deposit Street 1",
            "rent_amount": 1500.00
        }).json()
        
        # Create deposit
        deposit = api_client.post(f"{BASE_URL}/api/deposits", json={
            "tenant_id": tenant["id"],
            "apartment_id": apt["id"],
            "amount": 3000.00,
            "deposit_date": "2024-01-01",
            "status": "held"
        }).json()
        
        # Update deposit to returned status
        updated_deposit = api_client.put(f"{BASE_URL}/api/deposits/{deposit['id']}", json={
            "status": "returned",
            "return_date": "2024-06-01",
            "return_amount": 3000.00
        }).json()
        
        assert updated_deposit["status"] == "returned", f"Expected status='returned', got {updated_deposit['status']}"
        
        # Test PDF endpoint
        pdf_response = api_client.get(f"{BASE_URL}/api/deposits/{deposit['id']}/refund-pdf")
        assert pdf_response.status_code == 200, f"Expected 200, got {pdf_response.status_code}: {pdf_response.text}"
        assert pdf_response.headers.get("content-type") == "application/pdf", \
            f"Expected application/pdf, got {pdf_response.headers.get('content-type')}"
        
        # Check PDF content
        content = pdf_response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF file"
        print(f"Deposit refund PDF generated successfully, size: {len(content)} bytes")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/deposits/{deposit['id']}")
        api_client.delete(f"{BASE_URL}/api/apartments/{apt['id']}")
        api_client.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")
    
    def test_deposit_refund_pdf_not_found_for_invalid_id(self, api_client):
        """Test that deposit refund PDF returns 404 for invalid deposit ID"""
        response = api_client.get(f"{BASE_URL}/api/deposits/invalid-id-12345/refund-pdf")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: 404 returned for invalid deposit ID")


class TestFeature5TenantBalanceDeposit(TestSetup):
    """Feature 5: Tenant balance view shows deposit information"""
    
    def test_tenant_balance_includes_deposit_info(self, api_client):
        """Test that tenant balance endpoint includes deposit information"""
        # Create tenant
        tenant = api_client.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Tenant_Balance",
            "phone": "+597 987 6543"
        }).json()
        
        # Create apartment and assign tenant
        apt = api_client.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Apt_Balance",
            "address": "Balance Street 1",
            "rent_amount": 2000.00
        }).json()
        
        # Assign tenant to apartment
        api_client.post(f"{BASE_URL}/api/apartments/{apt['id']}/assign-tenant?tenant_id={tenant['id']}")
        
        # Create deposit for tenant
        deposit = api_client.post(f"{BASE_URL}/api/deposits", json={
            "tenant_id": tenant["id"],
            "apartment_id": apt["id"],
            "amount": 4000.00,
            "deposit_date": "2024-01-01",
            "status": "held"
        }).json()
        
        # Get tenant balance
        balance_response = api_client.get(f"{BASE_URL}/api/tenants/{tenant['id']}/balance")
        assert balance_response.status_code == 200, f"Expected 200, got {balance_response.status_code}: {balance_response.text}"
        
        balance_data = balance_response.json()
        
        # Check deposit info is included
        assert "deposit" in balance_data, "Balance response should include 'deposit' field"
        
        deposit_info = balance_data["deposit"]
        if deposit_info:
            assert deposit_info["amount"] == 4000.00, f"Expected deposit amount 4000.00, got {deposit_info['amount']}"
            assert deposit_info["deposit_date"] == "2024-01-01", f"Expected deposit_date '2024-01-01', got {deposit_info['deposit_date']}"
            assert deposit_info["status"] == "held", f"Expected status 'held', got {deposit_info['status']}"
            print(f"Tenant balance includes deposit info: {deposit_info}")
        else:
            pytest.fail("Deposit info should not be None when deposit exists")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/deposits/{deposit['id']}")
        api_client.post(f"{BASE_URL}/api/apartments/{apt['id']}/remove-tenant")
        api_client.delete(f"{BASE_URL}/api/apartments/{apt['id']}")
        api_client.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")
    
    def test_tenant_balance_without_deposit(self, api_client):
        """Test that tenant balance works when no deposit exists"""
        # Create tenant
        tenant = api_client.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Tenant_NoDeposit",
            "phone": "+597 111 2222"
        }).json()
        
        # Get tenant balance (no apartment, no deposit)
        balance_response = api_client.get(f"{BASE_URL}/api/tenants/{tenant['id']}/balance")
        assert balance_response.status_code == 200
        
        balance_data = balance_response.json()
        assert "deposit" in balance_data, "Balance response should include 'deposit' field"
        assert balance_data["deposit"] is None, "Deposit should be None when no deposit exists"
        print("PASS: Tenant balance works correctly when no deposit exists")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/tenants/{tenant['id']}")


class TestMaintenanceEndpoints(TestSetup):
    """Additional tests for maintenance endpoints"""
    
    def test_get_maintenance_list(self, api_client):
        """Test getting list of maintenance records"""
        response = api_client.get(f"{BASE_URL}/api/maintenance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} maintenance records")
    
    def test_maintenance_response_includes_cost_type(self, api_client):
        """Test that maintenance response includes cost_type field"""
        # Create apartment
        apt = api_client.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Apt_CostType_Response",
            "address": "Test Street 5",
            "rent_amount": 1000.00
        }).json()
        
        # Create maintenance
        maint = api_client.post(f"{BASE_URL}/api/maintenance", json={
            "apartment_id": apt["id"],
            "category": "overig",
            "description": "TEST Cost type response",
            "cost": 100.00,
            "maintenance_date": "2024-01-20",
            "status": "completed",
            "cost_type": "tenant"
        }).json()
        
        # Verify cost_type in response
        assert "cost_type" in maint, "Maintenance response should include cost_type"
        assert maint["cost_type"] == "tenant", f"Expected cost_type='tenant', got {maint['cost_type']}"
        
        # Get maintenance list and verify cost_type
        maint_list = api_client.get(f"{BASE_URL}/api/maintenance").json()
        found_maint = next((m for m in maint_list if m["id"] == maint["id"]), None)
        assert found_maint is not None, "Created maintenance should be in list"
        assert found_maint["cost_type"] == "tenant", "cost_type should be preserved in list"
        
        print("PASS: Maintenance response includes cost_type field")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/maintenance/{maint['id']}")
        api_client.delete(f"{BASE_URL}/api/apartments/{apt['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
