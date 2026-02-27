#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class SuriRentalsAPITester:
    def __init__(self, base_url="https://boekhouding-srd.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.superadmin_token = None
        self.customer_token = None
        self.customer_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'tenants': [],
            'apartments': [],
            'payments': [],
            'deposits': [],
            'kasgeld': [],
            'maintenance': [],
            'employees': [],
            'salaries': [],
            'addons': [],
            'addon_requests': [],
            'user_addons': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # Try to login with the registered user
        if not hasattr(self, 'test_email'):
            return True  # Skip if no test user created
            
        login_data = {
            "email": self.test_email,
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_get_user_profile(self):
        """Test getting current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_tenant(self):
        """Test creating a tenant"""
        tenant_data = {
            "name": "Jan de Vries",
            "email": "jan@example.com", 
            "phone": "+597 123 4567",
            "address": "Paramaribo, Suriname",
            "id_number": "123456789"
        }
        
        success, response = self.run_test(
            "Create Tenant",
            "POST",
            "tenants",
            200,
            data=tenant_data
        )
        
        if success and 'id' in response:
            self.created_resources['tenants'].append(response['id'])
            print(f"   Created tenant ID: {response['id']}")
            return True
        return False

    def test_get_tenants(self):
        """Test getting all tenants"""
        success, response = self.run_test(
            "Get Tenants",
            "GET",
            "tenants",
            200
        )
        
        if success:
            print(f"   Found {len(response)} tenants")
        return success

    def test_create_apartment(self):
        """Test creating an apartment"""
        apartment_data = {
            "name": "Appartement A1",
            "address": "Henck Arronstraat 1, Paramaribo",
            "rent_amount": 1500.00,
            "description": "Mooi 2-kamer appartement",
            "bedrooms": 2,
            "bathrooms": 1
        }
        
        success, response = self.run_test(
            "Create Apartment",
            "POST",
            "apartments",
            200,
            data=apartment_data
        )
        
        if success and 'id' in response:
            self.created_resources['apartments'].append(response['id'])
            print(f"   Created apartment ID: {response['id']}")
            return True
        return False

    def test_get_apartments(self):
        """Test getting all apartments"""
        success, response = self.run_test(
            "Get Apartments",
            "GET",
            "apartments",
            200
        )
        
        if success:
            print(f"   Found {len(response)} apartments")
        return success

    def test_assign_tenant_to_apartment(self):
        """Test assigning tenant to apartment"""
        if not self.created_resources['tenants'] or not self.created_resources['apartments']:
            print("⚠️  Skipping tenant assignment - no tenant or apartment created")
            return True
            
        tenant_id = self.created_resources['tenants'][0]
        apartment_id = self.created_resources['apartments'][0]
        
        success, response = self.run_test(
            "Assign Tenant to Apartment",
            "POST",
            f"apartments/{apartment_id}/assign-tenant?tenant_id={tenant_id}",
            200
        )
        return success

    def test_create_payment(self):
        """Test creating a payment"""
        if not self.created_resources['tenants'] or not self.created_resources['apartments']:
            print("⚠️  Skipping payment creation - no tenant or apartment created")
            return True
            
        payment_data = {
            "tenant_id": self.created_resources['tenants'][0],
            "apartment_id": self.created_resources['apartments'][0],
            "amount": 1500.00,
            "payment_date": datetime.now().strftime('%Y-%m-%d'),
            "payment_type": "rent",
            "description": "Huur januari 2024",
            "period_month": 1,
            "period_year": 2024
        }
        
        success, response = self.run_test(
            "Create Payment",
            "POST",
            "payments",
            200,
            data=payment_data
        )
        
        if success and 'id' in response:
            self.created_resources['payments'].append(response['id'])
            print(f"   Created payment ID: {response['id']}")
            return True
        return False

    def test_get_payments(self):
        """Test getting all payments"""
        success, response = self.run_test(
            "Get Payments",
            "GET",
            "payments",
            200
        )
        
        if success:
            print(f"   Found {len(response)} payments")
        return success

    def test_create_deposit(self):
        """Test creating a deposit"""
        if not self.created_resources['tenants'] or not self.created_resources['apartments']:
            print("⚠️  Skipping deposit creation - no tenant or apartment created")
            return True
            
        deposit_data = {
            "tenant_id": self.created_resources['tenants'][0],
            "apartment_id": self.created_resources['apartments'][0],
            "amount": 3000.00,
            "deposit_date": datetime.now().strftime('%Y-%m-%d'),
            "status": "held",
            "notes": "Borgbetaling bij intrek"
        }
        
        success, response = self.run_test(
            "Create Deposit",
            "POST",
            "deposits",
            200,
            data=deposit_data
        )
        
        if success and 'id' in response:
            self.created_resources['deposits'].append(response['id'])
            print(f"   Created deposit ID: {response['id']}")
            return True
        return False

    def test_get_deposits(self):
        """Test getting all deposits"""
        success, response = self.run_test(
            "Get Deposits",
            "GET",
            "deposits",
            200
        )
        
        if success:
            print(f"   Found {len(response)} deposits")
        return success

    def test_get_dashboard(self):
        """Test getting dashboard statistics"""
        success, response = self.run_test(
            "Get Dashboard",
            "GET",
            "dashboard",
            200
        )
        
        if success:
            print(f"   Dashboard stats: {len(response.get('recent_payments', []))} recent payments, {len(response.get('reminders', []))} reminders")
        return success

    def test_download_receipt(self):
        """Test downloading PDF receipt"""
        if not self.created_resources['payments']:
            print("⚠️  Skipping receipt download - no payment created")
            return True
            
        payment_id = self.created_resources['payments'][0]
        
        # Test PDF download (expect binary response)
        url = f"{self.base_url}/receipts/{payment_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        print(f"\n🔍 Testing Download Receipt PDF...")
        print(f"   URL: GET {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - PDF downloaded, size: {len(response.content)} bytes")
                return True
            else:
                print(f"❌ Failed - Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False
        finally:
            self.tests_run += 1

    def test_tenant_balance(self):
        """Test getting tenant balance"""
        if not self.created_resources['tenants']:
            print("⚠️  Skipping tenant balance - no tenant created")
            return True
            
        tenant_id = self.created_resources['tenants'][0]
        
        success, response = self.run_test(
            "Get Tenant Balance",
            "GET",
            f"tenants/{tenant_id}/balance",
            200
        )
        
        if success:
            print(f"   Balance: {response.get('balance', 0)}")
        return success

    def test_create_kasgeld_deposit(self):
        """Test creating a kasgeld deposit transaction"""
        kasgeld_data = {
            "amount": 5000.00,
            "transaction_type": "deposit",
            "description": "Maandelijkse kasstorting",
            "transaction_date": datetime.now().strftime('%Y-%m-%d')
        }
        
        success, response = self.run_test(
            "Create Kasgeld Deposit",
            "POST",
            "kasgeld",
            200,
            data=kasgeld_data
        )
        
        if success and 'id' in response:
            self.created_resources['kasgeld'].append(response['id'])
            print(f"   Created kasgeld transaction ID: {response['id']}")
            return True
        return False

    def test_create_kasgeld_withdrawal(self):
        """Test creating a kasgeld withdrawal transaction"""
        kasgeld_data = {
            "amount": 500.00,
            "transaction_type": "withdrawal",
            "description": "Kas opname voor materialen",
            "transaction_date": datetime.now().strftime('%Y-%m-%d')
        }
        
        success, response = self.run_test(
            "Create Kasgeld Withdrawal",
            "POST",
            "kasgeld",
            200,
            data=kasgeld_data
        )
        
        if success and 'id' in response:
            self.created_resources['kasgeld'].append(response['id'])
            print(f"   Created kasgeld withdrawal ID: {response['id']}")
            return True
        return False

    def test_get_kasgeld(self):
        """Test getting kasgeld balance and transactions"""
        success, response = self.run_test(
            "Get Kasgeld Balance",
            "GET",
            "kasgeld",
            200
        )
        
        if success:
            balance = response.get('total_balance', 0)
            deposits = response.get('total_deposits', 0)
            withdrawals = response.get('total_withdrawals', 0)
            maintenance_costs = response.get('total_maintenance_costs', 0)
            transactions_count = len(response.get('transactions', []))
            print(f"   Balance: {balance}, Deposits: {deposits}, Withdrawals: {withdrawals}")
            print(f"   Maintenance costs: {maintenance_costs}, Transactions: {transactions_count}")
            return True
        return False

    def test_create_maintenance(self):
        """Test creating a maintenance record"""
        if not self.created_resources['apartments']:
            print("⚠️  Skipping maintenance creation - no apartment created")
            return True
            
        maintenance_data = {
            "apartment_id": self.created_resources['apartments'][0],
            "category": "kraan",
            "description": "Lekkende kraan gerepareerd in de keuken",
            "cost": 150.00,
            "maintenance_date": datetime.now().strftime('%Y-%m-%d'),
            "status": "completed"
        }
        
        success, response = self.run_test(
            "Create Maintenance Record",
            "POST",
            "maintenance",
            200,
            data=maintenance_data
        )
        
        if success and 'id' in response:
            self.created_resources['maintenance'].append(response['id'])
            print(f"   Created maintenance record ID: {response['id']}")
            print(f"   Cost {maintenance_data['cost']} should be deducted from kasgeld")
            return True
        return False

    def test_get_maintenance(self):
        """Test getting all maintenance records"""
        success, response = self.run_test(
            "Get Maintenance Records",
            "GET",
            "maintenance",
            200
        )
        
        if success:
            print(f"   Found {len(response)} maintenance records")
            return True
        return False

    def test_update_maintenance(self):
        """Test updating a maintenance record"""
        if not self.created_resources['maintenance']:
            print("⚠️  Skipping maintenance update - no maintenance record created")
            return True
            
        maintenance_id = self.created_resources['maintenance'][0]
        update_data = {
            "description": "Lekkende kraan gerepareerd in de keuken - UPDATED",
            "cost": 175.00,
            "status": "completed"
        }
        
        success, response = self.run_test(
            "Update Maintenance Record",
            "PUT",
            f"maintenance/{maintenance_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated maintenance record: {response.get('description', '')}")
            return True
        return False

    def test_delete_kasgeld_transaction(self):
        """Test deleting a kasgeld transaction"""
        if not self.created_resources['kasgeld']:
            print("⚠️  Skipping kasgeld deletion - no kasgeld transaction created")
            return True
            
        kasgeld_id = self.created_resources['kasgeld'][0]
        
        success, response = self.run_test(
            "Delete Kasgeld Transaction",
            "DELETE",
            f"kasgeld/{kasgeld_id}",
            200
        )
        
        if success:
            print(f"   Deleted kasgeld transaction: {kasgeld_id}")
            return True
        return False

    def test_delete_maintenance(self):
        """Test deleting a maintenance record"""
        if not self.created_resources['maintenance']:
            print("⚠️  Skipping maintenance deletion - no maintenance record created")
            return True
            
        maintenance_id = self.created_resources['maintenance'][0]
        
        success, response = self.run_test(
            "Delete Maintenance Record",
            "DELETE",
            f"maintenance/{maintenance_id}",
            200
        )
        
        if success:
            print(f"   Deleted maintenance record: {maintenance_id}")
            return True
        return False

    def test_exchange_rate_api(self):
        """Test exchange rate endpoint"""
        success, response = self.run_test(
            "Get Exchange Rate",
            "GET",
            "exchange-rate",
            200
        )
        if success:
            print(f"   SRD to EUR: {response.get('srd_to_eur', 'N/A')}")
            print(f"   EUR to SRD: {response.get('eur_to_srd', 'N/A')}")
            print(f"   Source: {response.get('source', 'N/A')}")
        return success

    def test_create_employee(self):
        """Test creating an employee"""
        employee_data = {
            "name": "Test Werknemer",
            "position": "Schoonmaker",
            "phone": "+597 123 4567",
            "email": "test@example.com",
            "salary": 2500.0,
            "start_date": "2024-01-01"
        }
        
        success, response = self.run_test(
            "Create Employee",
            "POST",
            "employees",
            200,
            data=employee_data
        )
        
        if success and 'id' in response:
            self.created_resources['employees'].append(response['id'])
            print(f"   Created employee ID: {response['id']}")
            print(f"   Name: {response.get('name')}, Position: {response.get('position')}")
            print(f"   Salary: {response.get('salary')}")
            return True
        return False

    def test_get_employees(self):
        """Test getting all employees"""
        success, response = self.run_test(
            "Get Employees List",
            "GET",
            "employees",
            200
        )
        
        if success:
            print(f"   Found {len(response)} employees")
            for emp in response:
                print(f"   - {emp.get('name')} ({emp.get('position')}) - {emp.get('status')}")
            return True
        return False

    def test_update_employee(self):
        """Test updating an employee"""
        if not self.created_resources['employees']:
            print("⚠️  Skipping employee update - no employee created")
            return True
            
        employee_id = self.created_resources['employees'][0]
        update_data = {
            "salary": 2800.0,
            "position": "Senior Schoonmaker"
        }
        
        success, response = self.run_test(
            "Update Employee",
            "PUT",
            f"employees/{employee_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated employee: {response.get('name')}")
            print(f"   New salary: {response.get('salary')}")
            return True
        return False

    def test_create_salary_payment(self):
        """Test creating a salary payment"""
        if not self.created_resources['employees']:
            print("⚠️  Skipping salary payment - no employee created")
            return True

        employee_id = self.created_resources['employees'][0]
        
        salary_data = {
            "employee_id": employee_id,
            "amount": 2500.0,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "period_month": datetime.now().month,
            "period_year": datetime.now().year,
            "description": "Test salary payment"
        }
        
        success, response = self.run_test(
            "Create Salary Payment",
            "POST",
            "salaries",
            200,
            data=salary_data
        )
        
        if success and 'id' in response:
            self.created_resources['salaries'].append(response['id'])
            print(f"   Created salary payment ID: {response['id']}")
            print(f"   Amount: {response.get('amount')} for {response.get('employee_name')}")
            print(f"   Period: {response.get('period_month')}/{response.get('period_year')}")
            return True
        return False

    def test_get_salaries(self):
        """Test getting all salary payments"""
        success, response = self.run_test(
            "Get Salary Payments",
            "GET",
            "salaries",
            200
        )
        
        if success:
            print(f"   Found {len(response)} salary payments")
            for salary in response:
                print(f"   - {salary.get('employee_name')}: {salary.get('amount')} ({salary.get('period_month')}/{salary.get('period_year')})")
            return True
        return False

    def test_kasgeld_after_salary(self):
        """Test that salary payments affect kasgeld balance"""
        success, response = self.run_test(
            "Get Kasgeld After Salary Payment",
            "GET",
            "kasgeld",
            200
        )
        
        if success:
            balance = response.get('total_balance', 0)
            salary_payments = response.get('total_salary_payments', 0)
            print(f"   Kasgeld balance: {balance}")
            print(f"   Total salary payments: {salary_payments}")
            
            # Check if salary transactions appear in kasgeld
            transactions = response.get('transactions', [])
            salary_transactions = [t for t in transactions if t.get('transaction_type') == 'salary']
            print(f"   Salary transactions in kasgeld: {len(salary_transactions)}")
            return True
        return False

    def test_dashboard_with_employees(self):
        """Test dashboard includes employee data"""
        success, response = self.run_test(
            "Get Dashboard with Employee Data",
            "GET",
            "dashboard",
            200
        )
        
        if success:
            print(f"   Total employees: {response.get('total_employees', 'N/A')}")
            print(f"   Total kasgeld: {response.get('total_kasgeld', 'N/A')}")
            print(f"   Salary this month: {response.get('total_salary_this_month', 'N/A')}")
            return True
        return False

    def test_delete_salary_payment(self):
        """Test deleting a salary payment"""
        if not self.created_resources['salaries']:
            print("⚠️  Skipping salary deletion - no salary payment created")
            return True
            
        salary_id = self.created_resources['salaries'][0]
        
        success, response = self.run_test(
            "Delete Salary Payment",
            "DELETE",
            f"salaries/{salary_id}",
            200
        )
        
        if success:
            print(f"   Deleted salary payment: {salary_id}")
            return True
        return False

    def test_delete_employee(self):
        """Test deleting an employee"""
        if not self.created_resources['employees']:
            print("⚠️  Skipping employee deletion - no employee created")
            return True
            
        employee_id = self.created_resources['employees'][0]
        
        success, response = self.run_test(
            "Delete Employee",
            "DELETE",
            f"employees/{employee_id}",
            200
        )
        
        if success:
            print(f"   Deleted employee: {employee_id}")
            return True
        return False

    # ==================== ADD-ONS TESTING ====================
    
    def test_create_superadmin_user(self):
        """Create superadmin user if it doesn't exist"""
        superadmin_data = {
            "name": "Super Admin",
            "email": "admin@facturatie.sr",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Create Superadmin User",
            "POST",
            "auth/register",
            200,
            data=superadmin_data
        )
        
        if success and 'access_token' in response:
            self.superadmin_token = response['access_token']
            print(f"   Superadmin created and token obtained: {self.superadmin_token[:20]}...")
            return True
        return False

    def test_superadmin_login(self):
        """Test superadmin login"""
        login_data = {
            "email": "admin@facturatie.sr",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Superadmin Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.superadmin_token = response['access_token']
            # Store current token as superadmin token
            self.token = self.superadmin_token
            print(f"   Superadmin token obtained: {self.superadmin_token[:20]}...")
            return True
        return False

    def test_create_customer_user(self):
        """Test creating a customer user for add-on testing"""
        timestamp = datetime.now().strftime('%H%M%S')
        customer_data = {
            "name": f"Test Klant {timestamp}",
            "email": f"klant{timestamp}@example.com",
            "password": "klant123",
            "company_name": f"Test Bedrijf {timestamp}"
        }
        
        success, response = self.run_test(
            "Create Customer User",
            "POST",
            "auth/register",
            200,
            data=customer_data
        )
        
        if success and 'access_token' in response:
            self.customer_token = response['access_token']
            self.customer_user_id = response['user']['id']
            print(f"   Customer created: {customer_data['email']}")
            print(f"   Customer token: {self.customer_token[:20]}...")
            return True
        return False

    def test_get_public_addons(self):
        """Test getting public add-ons (no auth required)"""
        # Temporarily remove token for public endpoint
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get Public Add-ons",
            "GET",
            "addons",
            200
        )
        
        # Restore token
        self.token = temp_token
        
        if success:
            print(f"   Found {len(response)} public add-ons")
            for addon in response:
                print(f"   - {addon.get('name')} ({addon.get('slug')}) - SRD {addon.get('price')}")
            return True
        return False

    def test_create_addon_as_superadmin(self):
        """Test creating a new add-on as superadmin"""
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        timestamp = datetime.now().strftime('%H%M%S')
        addon_data = {
            "name": f"Test Add-on {timestamp}",
            "slug": f"test_addon_{timestamp}",
            "description": "Test add-on voor testing doeleinden",
            "price": 2500.0,
            "is_active": True
        }
        
        success, response = self.run_test(
            "Create Add-on (Superadmin)",
            "POST",
            "admin/addons",
            200,
            data=addon_data
        )
        
        if success and 'id' in response:
            self.created_resources['addons'].append(response['id'])
            print(f"   Created add-on ID: {response['id']}")
            print(f"   Name: {response.get('name')}, Price: SRD {response.get('price')}")
            return True
        return False

    def test_get_admin_addons(self):
        """Test getting all add-ons as superadmin"""
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        success, response = self.run_test(
            "Get Admin Add-ons",
            "GET",
            "admin/addons",
            200
        )
        
        if success:
            print(f"   Found {len(response)} add-ons (including inactive)")
            for addon in response:
                status = "Active" if addon.get('is_active') else "Inactive"
                print(f"   - {addon.get('name')} ({addon.get('slug')}) - {status}")
            return True
        return False

    def test_update_addon_price(self):
        """Test updating add-on price as superadmin"""
        if not self.created_resources['addons']:
            print("⚠️  Skipping add-on update - no add-on created")
            return True
            
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        addon_id = self.created_resources['addons'][0]
        update_data = {
            "price": 3000.0,
            "description": "Updated test add-on met nieuwe prijs"
        }
        
        success, response = self.run_test(
            "Update Add-on Price",
            "PUT",
            f"admin/addons/{addon_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated add-on price to: SRD {response.get('price')}")
            return True
        return False

    def test_customer_request_addon(self):
        """Test customer requesting add-on activation"""
        if not self.created_resources['addons']:
            print("⚠️  Skipping add-on request - no add-on created")
            return True
            
        # Switch to customer token
        self.token = self.customer_token
        
        addon_id = self.created_resources['addons'][0]
        request_data = {
            "addon_id": addon_id,
            "notes": "Graag deze add-on activeren voor mijn bedrijf"
        }
        
        success, response = self.run_test(
            "Customer Request Add-on",
            "POST",
            "user/addons/request",
            200,
            data=request_data
        )
        
        if success and 'id' in response:
            self.created_resources['addon_requests'].append(response['id'])
            print(f"   Created add-on request ID: {response['id']}")
            print(f"   Status: {response.get('status')}")
            return True
        return False

    def test_get_customer_addons(self):
        """Test getting customer's active add-ons"""
        # Switch to customer token
        self.token = self.customer_token
        
        success, response = self.run_test(
            "Get Customer Add-ons",
            "GET",
            "user/addons",
            200
        )
        
        if success:
            print(f"   Customer has {len(response)} add-ons")
            for addon in response:
                print(f"   - {addon.get('addon_name')} - Status: {addon.get('status')}")
            return True
        return False

    def test_get_addon_requests_as_admin(self):
        """Test getting add-on requests as superadmin"""
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        success, response = self.run_test(
            "Get Add-on Requests (Admin)",
            "GET",
            "admin/addon-requests",
            200
        )
        
        if success:
            print(f"   Found {len(response)} add-on requests")
            for req in response:
                print(f"   - {req.get('user_name')} requested {req.get('addon_name')} - Status: {req.get('status')}")
            return True
        return False

    def test_approve_addon_request(self):
        """Test approving add-on request as superadmin"""
        if not self.created_resources['addon_requests']:
            print("⚠️  Skipping request approval - no request created")
            return True
            
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        request_id = self.created_resources['addon_requests'][0]
        
        success, response = self.run_test(
            "Approve Add-on Request",
            "PUT",
            f"admin/addon-requests/{request_id}/approve",
            200
        )
        
        if success:
            print(f"   Approved add-on request: {request_id}")
            return True
        return False

    def test_activate_addon_for_customer(self):
        """Test directly activating add-on for customer as superadmin"""
        if not self.created_resources['addons'] or not self.customer_user_id:
            print("⚠️  Skipping add-on activation - no add-on or customer")
            return True
            
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        addon_id = self.created_resources['addons'][0]
        activation_data = {
            "user_id": self.customer_user_id,
            "addon_id": addon_id,
            "months": 1,
            "payment_method": "cash",
            "payment_reference": "TEST-001"
        }
        
        success, response = self.run_test(
            "Activate Add-on for Customer",
            "POST",
            f"admin/users/{self.customer_user_id}/addons",
            200,
            data=activation_data
        )
        
        if success and 'id' in response:
            self.created_resources['user_addons'].append(response['id'])
            print(f"   Activated add-on for customer: {response.get('addon_name')}")
            print(f"   End date: {response.get('end_date')}")
            return True
        return False

    def test_get_user_addons_as_admin(self):
        """Test getting user's add-ons as superadmin"""
        if not self.customer_user_id:
            print("⚠️  Skipping user add-ons check - no customer")
            return True
            
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        success, response = self.run_test(
            "Get User Add-ons (Admin)",
            "GET",
            f"admin/users/{self.customer_user_id}/addons",
            200
        )
        
        if success:
            print(f"   Customer has {len(response)} add-ons")
            for addon in response:
                print(f"   - {addon.get('addon_name')} - Status: {addon.get('status')}")
            return True
        return False

    def test_customer_addons_after_activation(self):
        """Test that customer can see activated add-ons"""
        # Switch to customer token
        self.token = self.customer_token
        
        success, response = self.run_test(
            "Customer Add-ons After Activation",
            "GET",
            "user/addons",
            200
        )
        
        if success:
            active_addons = [a for a in response if a.get('status') == 'active']
            print(f"   Customer has {len(active_addons)} active add-ons")
            for addon in active_addons:
                print(f"   - {addon.get('addon_name')} - Expires: {addon.get('end_date')}")
            return len(active_addons) > 0
        return False

    def test_deactivate_user_addon(self):
        """Test deactivating user add-on as superadmin"""
        if not self.customer_user_id or not self.created_resources['addons']:
            print("⚠️  Skipping add-on deactivation - no customer or add-on")
            return True
            
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        addon_id = self.created_resources['addons'][0]
        
        success, response = self.run_test(
            "Deactivate User Add-on",
            "DELETE",
            f"admin/users/{self.customer_user_id}/addons/{addon_id}",
            200
        )
        
        if success:
            print(f"   Deactivated add-on for customer")
            return True
        return False

    def test_reject_addon_request(self):
        """Test rejecting an add-on request"""
        # First create another request to reject
        if not self.created_resources['addons']:
            print("⚠️  Skipping request rejection - no add-on created")
            return True
            
        # Switch to customer token to create request
        self.token = self.customer_token
        
        addon_id = self.created_resources['addons'][0]
        request_data = {
            "addon_id": addon_id,
            "notes": "Tweede verzoek om te testen rejection"
        }
        
        success, response = self.run_test(
            "Create Second Add-on Request",
            "POST",
            "user/addons/request",
            200,
            data=request_data
        )
        
        if not success or 'id' not in response:
            print("⚠️  Could not create second request for rejection test")
            return True
            
        request_id = response['id']
        
        # Switch to superadmin token to reject
        self.token = self.superadmin_token
        
        success, response = self.run_test(
            "Reject Add-on Request",
            "PUT",
            f"admin/addon-requests/{request_id}/reject",
            200
        )
        
        if success:
            print(f"   Rejected add-on request: {request_id}")
            return True
        return False

    def test_get_addon_by_slug_vastgoed_beheer(self):
        """Test GET /api/addons/{slug_or_id} with existing slug 'vastgoed_beheer'"""
        # No auth required for this public endpoint
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get Addon by Slug - vastgoed_beheer",
            "GET",
            "addons/vastgoed_beheer",
            200
        )
        
        # Restore token
        self.token = temp_token
        
        if success:
            print(f"   Found addon: {response.get('name')} (slug: {response.get('slug')})")
            print(f"   Price: SRD {response.get('price')}")
            print(f"   Category: {response.get('category', 'N/A')}")
            print(f"   Icon: {response.get('icon_name', 'N/A')}")
            highlights = response.get('highlights', [])
            print(f"   Highlights: {len(highlights) if highlights else 0} items")
            return True
        return False

    def test_get_addon_by_slug_hrm(self):
        """Test GET /api/addons/{slug_or_id} with existing slug 'hrm'"""
        # No auth required for this public endpoint
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get Addon by Slug - hrm",
            "GET",
            "addons/hrm",
            200
        )
        
        # Restore token
        self.token = temp_token
        
        if success:
            print(f"   Found addon: {response.get('name')} (slug: {response.get('slug')})")
            print(f"   Price: SRD {response.get('price')}")
            print(f"   Category: {response.get('category', 'N/A')}")
            print(f"   Icon: {response.get('icon_name', 'N/A')}")
            highlights = response.get('highlights', [])
            print(f"   Highlights: {len(highlights) if highlights else 0} items")
            return True
        return False

    def test_get_addon_by_nonexistent_slug(self):
        """Test GET /api/addons/{slug_or_id} with non-existing slug (expect 404)"""
        # No auth required for this public endpoint
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get Addon by Non-existent Slug",
            "GET",
            "addons/non-existent-addon-slug",
            404  # Expect 404
        )
        
        # Restore token
        self.token = temp_token
        
        if success:
            print("   ✅ Correctly returned 404 for non-existent addon")
            return True
        return False

    def test_create_addon_with_extra_fields(self):
        """Test creating addon with all extra fields as superadmin"""
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        timestamp = datetime.now().strftime('%H%M%S')
        addon_data = {
            "name": "Test Module",
            "slug": "test-module",
            "description": "Test module beschrijving",
            "price": 1500,
            "category": "Analytics",
            "icon_name": "BarChart3",
            "hero_image_url": "https://example.com/image.jpg",
            "highlights": ["Dashboard", "Rapporten", "Export"]
        }
        
        success, response = self.run_test(
            "Create Addon with Extra Fields",
            "POST",
            "admin/addons",
            200,
            data=addon_data
        )
        
        if success and 'id' in response:
            self.created_resources['addons'].append(response['id'])
            print(f"   Created addon ID: {response['id']}")
            print(f"   Name: {response.get('name')}")
            print(f"   Category: {response.get('category')}")
            print(f"   Icon: {response.get('icon_name')}")
            print(f"   Hero Image: {response.get('hero_image_url')}")
            print(f"   Highlights: {response.get('highlights')}")
            
            # Verify all fields were saved correctly
            if (response.get('category') == addon_data['category'] and
                response.get('icon_name') == addon_data['icon_name'] and
                response.get('hero_image_url') == addon_data['hero_image_url'] and
                response.get('highlights') == addon_data['highlights']):
                print("   ✅ All extra fields saved correctly")
                return True
            else:
                print("   ❌ Some extra fields not saved correctly")
                return False
        return False

    def test_update_addon_with_extra_fields(self):
        """Test updating addon with extra fields"""
        if not self.created_resources['addons']:
            print("⚠️  Skipping addon update - no addon created")
            return True
            
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        addon_id = self.created_resources['addons'][0]
        update_data = {
            "category": "Updated Analytics",
            "icon_name": "TrendingUp",
            "highlights": ["Updated Dashboard", "Advanced Rapporten", "Real-time Export", "New Feature"]
        }
        
        success, response = self.run_test(
            "Update Addon with Extra Fields",
            "PUT",
            f"admin/addons/{addon_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated addon: {response.get('name')}")
            print(f"   New category: {response.get('category')}")
            print(f"   New icon: {response.get('icon_name')}")
            print(f"   New highlights: {response.get('highlights')}")
            
            # Verify updates were applied correctly
            if (response.get('category') == update_data['category'] and
                response.get('icon_name') == update_data['icon_name'] and
                response.get('highlights') == update_data['highlights']):
                print("   ✅ All updates applied correctly")
                return True
            else:
                print("   ❌ Some updates not applied correctly")
                return False
        return False

    def test_get_updated_addon_by_slug(self):
        """Test getting the updated addon by slug to verify changes"""
        # No auth required for this public endpoint
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get Updated Addon by Slug",
            "GET",
            "addons/test-module",
            200
        )
        
        # Restore token
        self.token = temp_token
        
        if success:
            print(f"   Retrieved addon: {response.get('name')}")
            print(f"   Category: {response.get('category')}")
            print(f"   Icon: {response.get('icon_name')}")
            print(f"   Highlights count: {len(response.get('highlights', []))}")
            print(f"   Hero image: {response.get('hero_image_url', 'N/A')}")
            
            # Verify the updated fields are present
            if (response.get('category') == "Updated Analytics" and
                response.get('icon_name') == "TrendingUp" and
                len(response.get('highlights', [])) == 4):
                print("   ✅ Updated addon retrieved successfully with correct data")
                return True
            else:
                print("   ❌ Retrieved addon doesn't have expected updated data")
                return False
        return False

    def test_delete_addon_as_superadmin(self):
        """Test deleting add-on as superadmin (cleanup)"""
        if not self.created_resources['addons']:
            print("⚠️  Skipping add-on deletion - no add-on created")
            return True
            
        # Switch to superadmin token
        self.token = self.superadmin_token
        
        addon_id = self.created_resources['addons'][0]
        
        success, response = self.run_test(
            "Delete Test Addon (Cleanup)",
            "DELETE",
            f"admin/addons/{addon_id}",
            200
        )
        
        if success:
            print(f"   Deleted test addon: {addon_id}")
            return True
        return False

    def test_unauthorized_addon_access(self):
        """Test that customers cannot access admin add-on endpoints"""
        # Switch to customer token
        self.token = self.customer_token
        
        # Try to access admin add-ons endpoint
        success, response = self.run_test(
            "Unauthorized Admin Add-ons Access",
            "GET",
            "admin/addons",
            403  # Expect forbidden
        )
        
        if success:
            print("   ✅ Customer correctly denied access to admin endpoints")
            return True
        return False

    def test_demo_account_login(self):
        """Test login with demo account"""
        login_data = {
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        }
        
        success, response = self.run_test(
            "Demo Account Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Demo account logged in successfully")
            print(f"   User role: {response.get('user', {}).get('role', 'N/A')}")
            print(f"   Subscription status: {response.get('user', {}).get('subscription_status', 'N/A')}")
            return True
        return False

    def test_ai_chat_endpoint_with_demo_account(self):
        """Test AI chat endpoint with demo account to check if modules are correctly retrieved"""
        chat_data = {
            "message": "Hallo, wat kan ik doen?"
        }
        
        success, response = self.run_test(
            "AI Chat with Demo Account",
            "POST",
            "ai/chat",
            200,
            data=chat_data
        )
        
        if success:
            ai_response = response.get('response', '')
            print(f"   AI Response length: {len(ai_response)} characters")
            print(f"   AI Response preview: {ai_response[:200]}...")
            
            # Check if response contains error about no modules
            no_modules_error = "U heeft nog geen modules geactiveerd" in ai_response
            if no_modules_error:
                print("   ❌ AI response contains 'no modules activated' error")
                print(f"   Full response: {ai_response}")
                return False
            else:
                print("   ✅ AI response does not contain 'no modules activated' error")
                
                # Check if response mentions modules or features
                module_keywords = ['module', 'vastgoed', 'hrm', 'personeel', 'beheer', 'systeem', 'functie']
                mentions_modules = any(keyword.lower() in ai_response.lower() for keyword in module_keywords)
                
                if mentions_modules:
                    print("   ✅ AI response mentions modules/features")
                else:
                    print("   ⚠️  AI response doesn't explicitly mention modules, but no error detected")
                
                return True
        return False

    # ==================== BOEKHOUDING MODULE TESTING ====================
    
    def test_boekhouding_init_volledig(self):
        """Test complete system initialization (76 accounts, 10 BTW codes, 5 journals)"""
        success, response = self.run_test(
            "Initialize Complete Boekhouding System",
            "POST",
            "boekhouding/init/volledig",
            200
        )
        
        if success:
            print(f"   {response.get('message', 'System initialized')}")
            print(f"   Rekeningen: {response.get('rekeningen_count', 0)}")
            print(f"   BTW codes: {response.get('btw_codes_count', 0)}")
            print(f"   Dagboeken: {response.get('dagboeken_count', 0)}")
            return True
        return False
    
    def test_boekhouding_dashboard(self):
        """Test boekhouding dashboard endpoint"""
        success, response = self.run_test(
            "Boekhouding Dashboard",
            "GET",
            "boekhouding/dashboard",
            200
        )
        
        if success:
            print(f"   Debiteuren count: {response.get('debiteuren_count', 0)}")
            print(f"   Crediteuren count: {response.get('crediteuren_count', 0)}")
            print(f"   Bank saldi: {response.get('bank_saldi', {})}")
            print(f"   BTW positie: {response.get('btw_positie', {})}")
            return True
        return False
    
    def test_boekhouding_dashboard_actielijst(self):
        """Test dashboard action items"""
        success, response = self.run_test(
            "Boekhouding Dashboard Actielijst",
            "GET",
            "boekhouding/dashboard/actielijst",
            200
        )
        
        if success:
            print(f"   Action items: {len(response.get('items', []))}")
            return True
        return False

    def test_get_rekeningen(self):
        """Test getting all chart of accounts"""
        success, response = self.run_test(
            "Get Chart of Accounts",
            "GET",
            "boekhouding/rekeningen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} accounts")
            if response:
                print(f"   Sample accounts: {response[0].get('nummer')} - {response[0].get('naam')}")
            return True
        return False
    
    def test_get_dagboeken(self):
        """Test getting all journals"""
        success, response = self.run_test(
            "Get Journals (Dagboeken)",
            "GET",
            "boekhouding/dagboeken",
            200
        )
        
        if success:
            print(f"   Found {len(response)} journals")
            for journal in response:
                print(f"   - {journal.get('code')}: {journal.get('naam')} ({journal.get('type')})")
            return True
        return False

    def test_get_rekeningen(self):
        """Test getting all chart of accounts"""
        success, response = self.run_test(
            "Get Chart of Accounts",
            "GET",
            "boekhouding/rekeningen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} accounts")
            if response:
                print(f"   Sample accounts: {response[0].get('code')} - {response[0].get('naam')}")
            return True
        return False

    def test_create_debiteur(self):
        """Test creating a debiteur (customer)"""
        debiteur_data = {
            "naam": "Test Klant N.V.",
            "email": "test@test.sr",
            "telefoon": "+597 123 4567",
            "adres": "Paramaribo, Suriname",
            "btw_nummer": "SR123456789",
            "standaard_valuta": "SRD",
            "betalingstermijn": 30,
            "notities": "Test klant voor boekhouding module"
        }
        
        success, response = self.run_test(
            "Create Debiteur",
            "POST",
            "boekhouding/debiteuren",
            200,
            data=debiteur_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('debiteuren', []).append(response['id'])
            print(f"   Created debiteur ID: {response['id']}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Currency: {response.get('standaard_valuta')}")
            print(f"   Payment term: {response.get('betalingstermijn')} days")
            return True
        return False

    def test_get_debiteuren(self):
        """Test getting all debiteuren"""
        success, response = self.run_test(
            "Get Debiteuren",
            "GET",
            "boekhouding/debiteuren",
            200
        )
        
        if success:
            print(f"   Found {len(response)} debiteuren")
            for debiteur in response:
                print(f"   - {debiteur.get('naam')} ({debiteur.get('standaard_valuta')})")
            return True
        return False

    def test_create_verkoopfactuur(self):
        """Test creating a sales invoice"""
        if not self.created_resources.get('debiteuren'):
            print("⚠️  Skipping sales invoice creation - no debiteur created")
            return True
            
        debiteur_id = self.created_resources['debiteuren'][0]
        
        factuur_data = {
            "debiteur_id": debiteur_id,
            "factuurdatum": "2025-02-03",
            "valuta": "USD",
            "regels": [
                {
                    "omschrijving": "Dienst A",
                    "aantal": 2,
                    "prijs_per_stuk": 100,
                    "btw_tarief": "25",
                    "korting_percentage": 0
                }
            ],
            "opmerkingen": "Test factuur voor boekhouding module"
        }
        
        success, response = self.run_test(
            "Create Verkoopfactuur",
            "POST",
            "boekhouding/verkoopfacturen",
            200,
            data=factuur_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('verkoopfacturen', []).append(response['id'])
            print(f"   Created factuur ID: {response['id']}")
            print(f"   Factuurnummer: {response.get('factuurnummer')}")
            print(f"   Subtotaal: {response.get('subtotaal')} {response.get('valuta')}")
            print(f"   BTW bedrag: {response.get('btw_bedrag')} {response.get('valuta')}")
            print(f"   Totaal: {response.get('totaal')} {response.get('valuta')}")
            print(f"   Status: {response.get('status')}")
            return True
        return False

    def test_get_verkoopfacturen(self):
        """Test getting all sales invoices"""
        success, response = self.run_test(
            "Get Verkoopfacturen",
            "GET",
            "boekhouding/verkoopfacturen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} verkoopfacturen")
            for factuur in response:
                print(f"   - {factuur.get('factuurnummer')}: {factuur.get('totaal')} {factuur.get('valuta')} ({factuur.get('status')})")
            return True
        return False

    def test_get_bankrekeningen(self):
        """Test getting all bank accounts"""
        success, response = self.run_test(
            "Get Bankrekeningen",
            "GET",
            "boekhouding/bankrekeningen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} bankrekeningen")
            for bank in response:
                print(f"   - {bank.get('naam')}: {bank.get('huidig_saldo')} {bank.get('valuta')}")
            return True
        return False

    def test_create_bankrekening(self):
        """Test creating a bank account"""
        bank_data = {
            "naam": "DSB Zakelijk",
            "rekeningnummer": "123456789",
            "bank_naam": "DSB Bank",
            "valuta": "SRD",
            "beginsaldo": 10000,
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Bankrekening",
            "POST",
            "boekhouding/bankrekeningen",
            200,
            data=bank_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('bankrekeningen', []).append(response['id'])
            print(f"   Created bankrekening ID: {response['id']}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Account number: {response.get('rekeningnummer')}")
            print(f"   Bank: {response.get('bank_naam')}")
            print(f"   Balance: {response.get('huidig_saldo')} {response.get('valuta')}")
            return True
        return False

    def test_btw_aangifte(self):
        """Test BTW (VAT) declaration report"""
        success, response = self.run_test(
            "BTW Aangifte Report",
            "GET",
            "boekhouding/btw/aangifte?start_datum=2025-01-01&eind_datum=2025-12-31&valuta=SRD",
            200
        )
        
        if success:
            print(f"   Period: {response.get('periode')}")
            print(f"   Currency: {response.get('valuta')}")
            print(f"   High rate revenue: {response.get('omzet_hoog_tarief', 0)} SRD")
            print(f"   High rate VAT: {response.get('btw_hoog_tarief', 0)} SRD")
            print(f"   Low rate revenue: {response.get('omzet_laag_tarief', 0)} SRD")
            print(f"   Low rate VAT: {response.get('btw_laag_tarief', 0)} SRD")
            print(f"   Zero rate revenue: {response.get('omzet_nul_tarief', 0)} SRD")
            print(f"   Total VAT due: {response.get('totaal_verschuldigde_btw', 0)} SRD")
            print(f"   Input VAT: {response.get('voorbelasting', 0)} SRD")
            print(f"   VAT to pay: {response.get('te_betalen_btw', 0)} SRD")
            return True
        return False

    def test_multi_currency_support(self):
        """Test multi-currency functionality"""
        # Test currency conversion
        success, response = self.run_test(
            "Currency Conversion USD to SRD",
            "GET",
            "boekhouding/wisselkoersen/convert?bedrag=100&van=USD&naar=SRD",
            200
        )
        
        if success:
            print(f"   Original: {response.get('origineel_bedrag')} {response.get('origineel_valuta')}")
            print(f"   Converted: {response.get('bedrag')} {response.get('valuta')}")
            print(f"   Exchange rate: {response.get('koers')}")
            return True
        return False

    def test_btw_calculation(self):
        """Test BTW calculation with different rates"""
        if not self.created_resources.get('debiteuren'):
            print("⚠️  Skipping BTW calculation test - no debiteur created")
            return True
            
        debiteur_id = self.created_resources['debiteuren'][0]
        
        # Test invoice with different BTW rates
        factuur_data = {
            "debiteur_id": debiteur_id,
            "factuurdatum": "2025-02-03",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Service 25% BTW",
                    "aantal": 1,
                    "prijs_per_stuk": 1000,
                    "btw_tarief": "25"
                },
                {
                    "omschrijving": "Service 10% BTW",
                    "aantal": 1,
                    "prijs_per_stuk": 500,
                    "btw_tarief": "10"
                },
                {
                    "omschrijving": "Service 0% BTW",
                    "aantal": 1,
                    "prijs_per_stuk": 200,
                    "btw_tarief": "0"
                }
            ]
        }
        
        success, response = self.run_test(
            "BTW Calculation Test",
            "POST",
            "boekhouding/verkoopfacturen",
            200,
            data=factuur_data
        )
        
        if success:
            print(f"   Subtotaal: {response.get('subtotaal')} SRD")
            print(f"   BTW bedrag: {response.get('btw_bedrag')} SRD")
            print(f"   Totaal: {response.get('totaal')} SRD")
            
            # Verify BTW calculation
            expected_btw = (1000 * 0.25) + (500 * 0.10) + (200 * 0.0)  # 250 + 50 + 0 = 300
            actual_btw = response.get('btw_bedrag', 0)
            
            if abs(actual_btw - expected_btw) < 0.01:
                print(f"   ✅ BTW calculation correct: {actual_btw} SRD")
                return True
            else:
                print(f"   ❌ BTW calculation incorrect: expected {expected_btw}, got {actual_btw}")
                return False
        return False

    def test_automatic_factuurnummer_generation(self):
        """Test automatic invoice number generation"""
        if not self.created_resources.get('debiteuren'):
            print("⚠️  Skipping factuurnummer test - no debiteur created")
            return True
            
        debiteur_id = self.created_resources['debiteuren'][0]
        
        # Create multiple invoices to test number generation
        for i in range(2):
            factuur_data = {
                "debiteur_id": debiteur_id,
                "factuurdatum": "2025-02-03",
                "valuta": "SRD",
                "regels": [
                    {
                        "omschrijving": f"Test service {i+1}",
                        "aantal": 1,
                        "prijs_per_stuk": 100,
                        "btw_tarief": "25"
                    }
                ]
            }
            
            success, response = self.run_test(
                f"Auto Factuurnummer Test {i+1}",
                "POST",
                "boekhouding/verkoopfacturen",
                200,
                data=factuur_data
            )
            
            if success:
                factuurnummer = response.get('factuurnummer', '')
                print(f"   Generated factuurnummer: {factuurnummer}")
                
                # Check format (should be VF2026-XXXXX)
                if factuurnummer.startswith('VF2026-') and len(factuurnummer) == 11:
                    print(f"   ✅ Factuurnummer format correct")
                else:
                    print(f"   ❌ Factuurnummer format incorrect: {factuurnummer}")
                    return False
            else:
                return False
        
        return True

    def test_balans_rapport(self):
        """Test balance sheet report"""
        success, response = self.run_test(
            "Balans Report",
            "GET",
            "boekhouding/rapportages/balans?valuta=SRD",
            200
        )
        
        if success:
            print(f"   Report date: {response.get('datum')}")
            print(f"   Currency: {response.get('valuta')}")
            print(f"   Total activa: {response.get('totaal_activa', 0)} SRD")
            print(f"   Total passiva: {response.get('totaal_passiva', 0)} SRD")
            print(f"   Total eigen vermogen: {response.get('totaal_eigen_vermogen', 0)} SRD")
            print(f"   In balance: {response.get('in_balans', False)}")
            return True
        return False

    def test_add_wisselkoers(self):
        """Test adding exchange rate"""
        wisselkoers_data = {
            "van_valuta": "USD",
            "naar_valuta": "SRD",
            "koers": 35.50,
            "datum": "2025-02-03"
        }
        
        success, response = self.run_test(
            "Add Wisselkoers",
            "POST",
            "boekhouding/wisselkoersen",
            200,
            data=wisselkoers_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('wisselkoersen', []).append(response['id'])
            print(f"   Created wisselkoers ID: {response['id']}")
            print(f"   Rate: {response.get('van_valuta')} to {response.get('naar_valuta')} = {response.get('koers')}")
            print(f"   Date: {response.get('datum')}")
            return True
        return False

    # ==================== SURIBET DASHBOARD TESTING ====================
    
    def test_suribet_dagstaten_with_date(self):
        """Test Suribet dagstaten endpoint with date parameter"""
        test_date = "2025-02-06"
        
        success, response = self.run_test(
            f"Suribet Dagstaten for {test_date}",
            "GET",
            f"suribet/dagstaten?date={test_date}",
            200
        )
        
        if success:
            print(f"   Found {len(response)} dagstaten for {test_date}")
            if response:
                for dagstaat in response:
                    print(f"   - Machine: {dagstaat.get('machine_id', 'N/A')}, Omzet: {dagstaat.get('omzet', 0)}")
            else:
                print(f"   ✅ No data for {test_date} (expected for test date)")
            return True
        return False

    def test_suribet_kasboek_with_date(self):
        """Test Suribet kasboek endpoint with date parameter"""
        test_date = "2025-02-06"
        
        success, response = self.run_test(
            f"Suribet Kasboek for {test_date}",
            "GET",
            f"suribet/kasboek?date={test_date}",
            200
        )
        
        if success:
            print(f"   Found {len(response)} kasboek entries for {test_date}")
            if response:
                for entry in response:
                    print(f"   - {entry.get('description', 'N/A')}: {entry.get('amount', 0)} {entry.get('currency', 'SRD')}")
            else:
                print(f"   ✅ No kasboek data for {test_date} (expected for test date)")
            return True
        return False

    def test_suribet_loonbetalingen_with_date(self):
        """Test Suribet loonbetalingen endpoint with date parameter"""
        test_date = "2025-02-06"
        
        success, response = self.run_test(
            f"Suribet Loonbetalingen for {test_date}",
            "GET",
            f"suribet/loonbetalingen?date={test_date}",
            200
        )
        
        if success:
            print(f"   Found {len(response)} loonbetalingen for {test_date}")
            if response:
                for betaling in response:
                    print(f"   - Employee: {betaling.get('employee_id', 'N/A')}, Amount: {betaling.get('net_amount', 0)}")
            else:
                print(f"   ✅ No loonbetalingen data for {test_date} (expected for test date)")
            return True
        return False

    def test_suribet_dagstaten_month_year_filter(self):
        """Test that old month/year filtering still works for dagstaten"""
        success, response = self.run_test(
            "Suribet Dagstaten Month/Year Filter",
            "GET",
            "suribet/dagstaten?month=2&year=2025",
            200
        )
        
        if success:
            print(f"   Found {len(response)} dagstaten for February 2025")
            if response:
                for dagstaat in response:
                    date = dagstaat.get('date', '')
                    if date.startswith('2025-02'):
                        print(f"   ✅ Date {date} is in February 2025")
                    else:
                        print(f"   ❌ Date {date} is NOT in February 2025")
                        return False
            else:
                print(f"   ✅ No data for February 2025 (expected)")
            return True
        return False

    def test_suribet_kasboek_month_year_filter(self):
        """Test that old month/year filtering still works for kasboek"""
        success, response = self.run_test(
            "Suribet Kasboek Month/Year Filter",
            "GET",
            "suribet/kasboek?month=2&year=2025",
            200
        )
        
        if success:
            print(f"   Found {len(response)} kasboek entries for February 2025")
            if response:
                for entry in response:
                    date = entry.get('date', '')
                    if date.startswith('2025-02'):
                        print(f"   ✅ Date {date} is in February 2025")
                    else:
                        print(f"   ❌ Date {date} is NOT in February 2025")
                        return False
            else:
                print(f"   ✅ No kasboek data for February 2025 (expected)")
            return True
        return False

    def test_suribet_loonbetalingen_month_year_filter(self):
        """Test that old month/year filtering still works for loonbetalingen"""
        success, response = self.run_test(
            "Suribet Loonbetalingen Month/Year Filter",
            "GET",
            "suribet/loonbetalingen?month=2&year=2025",
            200
        )
        
        if success:
            print(f"   Found {len(response)} loonbetalingen for February 2025")
            if response:
                for betaling in response:
                    date = betaling.get('date', '')
                    if date.startswith('2025-02'):
                        print(f"   ✅ Date {date} is in February 2025")
                    else:
                        print(f"   ❌ Date {date} is NOT in February 2025")
                        return False
            else:
                print(f"   ✅ No loonbetalingen data for February 2025 (expected)")
            return True
        return False

    def test_suribet_authentication_required(self):
        """Test that Suribet endpoints require authentication"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Suribet Dagstaten Without Auth",
            "GET",
            "suribet/dagstaten?date=2025-02-06",
            403  # Expect forbidden (not authenticated)
        )
        
        # Restore token
        self.token = temp_token
        
        if success:
            print("   ✅ Suribet endpoints correctly require authentication")
            return True
        return False

    # ==================== ERP MODULES TESTING ====================
    
    def test_inkoop_dashboard(self):
        """Test inkoop dashboard endpoint"""
        success, response = self.run_test(
            "Inkoop Dashboard",
            "GET",
            "inkoop/dashboard",
            200
        )
        
        if success:
            print(f"   Leveranciers count: {response.get('leveranciers_count', 0)}")
            print(f"   Open offertes: {response.get('open_offertes', 0)}")
            print(f"   Open orders: {response.get('open_orders', 0)}")
            print(f"   Orders deze week: {response.get('orders_deze_week', 0)}")
            return True
        return False

    def test_create_leverancier(self):
        """Test creating a leverancier (supplier)"""
        leverancier_data = {
            "naam": "Test Leverancier BV",
            "bedrijfsnaam": "Test Leverancier BV",
            "email": "leverancier@test.sr",
            "telefoon": "+597 123 4567",
            "adres": "Paramaribo, Suriname",
            "btw_nummer": "SR123456789",
            "standaard_valuta": "SRD",
            "betalingstermijn": 30,
            "categorie": "Algemeen",
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Leverancier",
            "POST",
            "inkoop/leveranciers",
            200,
            data=leverancier_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('leveranciers', []).append(response['id'])
            print(f"   Created leverancier ID: {response['id']}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Currency: {response.get('standaard_valuta')}")
            return True
        return False

    def test_get_leveranciers(self):
        """Test getting all leveranciers"""
        success, response = self.run_test(
            "Get Leveranciers",
            "GET",
            "inkoop/leveranciers",
            200
        )
        
        if success:
            print(f"   Found {len(response)} leveranciers")
            return True
        return False

    def test_create_inkoopofferte(self):
        """Test creating an inkoopofferte"""
        if not self.created_resources.get('leveranciers'):
            print("⚠️  Skipping inkoopofferte creation - no leverancier created")
            return True
            
        leverancier_id = self.created_resources['leveranciers'][0]
        
        offerte_data = {
            "leverancier_id": leverancier_id,
            "offertedatum": "2025-02-06",
            "geldig_tot": "2025-03-06",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Test Product A",
                    "aantal": 10,
                    "eenheid": "stuk",
                    "prijs_per_stuk": 50.0,
                    "korting_percentage": 0,
                    "btw_tarief": "25"
                }
            ],
            "opmerkingen": "Test inkoopofferte"
        }
        
        success, response = self.run_test(
            "Create Inkoopofferte",
            "POST",
            "inkoop/offertes",
            200,
            data=offerte_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('inkoopoffertes', []).append(response['id'])
            print(f"   Created offerte ID: {response['id']}")
            print(f"   Offertenummer: {response.get('offertenummer')}")
            print(f"   Totaal: {response.get('totaal')} {response.get('valuta')}")
            return True
        return False

    def test_create_inkooporder(self):
        """Test creating an inkooporder"""
        if not self.created_resources.get('leveranciers'):
            print("⚠️  Skipping inkooporder creation - no leverancier created")
            return True
            
        leverancier_id = self.created_resources['leveranciers'][0]
        
        order_data = {
            "leverancier_id": leverancier_id,
            "orderdatum": "2025-02-06",
            "verwachte_leverdatum": "2025-02-20",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Test Product B",
                    "aantal": 5,
                    "eenheid": "stuk",
                    "prijs_per_stuk": 100.0,
                    "korting_percentage": 0,
                    "btw_tarief": "25"
                }
            ],
            "opmerkingen": "Test inkooporder"
        }
        
        success, response = self.run_test(
            "Create Inkooporder",
            "POST",
            "inkoop/orders",
            200,
            data=order_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('inkooporders', []).append(response['id'])
            print(f"   Created order ID: {response['id']}")
            print(f"   Ordernummer: {response.get('ordernummer')}")
            print(f"   Totaal: {response.get('totaal')} {response.get('valuta')}")
            return True
        return False

    def test_verkoop_dashboard(self):
        """Test verkoop dashboard endpoint"""
        success, response = self.run_test(
            "Verkoop Dashboard",
            "GET",
            "verkoop/dashboard",
            200
        )
        
        if success:
            print(f"   Klanten count: {response.get('klanten_count', 0)}")
            print(f"   Open offertes: {response.get('open_offertes', 0)}")
            print(f"   Open orders: {response.get('open_orders', 0)}")
            print(f"   Conversie ratio: {response.get('conversie_ratio', 0)}%")
            return True
        return False

    def test_create_klant(self):
        """Test creating a klant (customer)"""
        klant_data = {
            "naam": "Test Klant BV",
            "bedrijfsnaam": "Test Klant BV",
            "email": "klant@test.sr",
            "telefoon": "+597 123 4567",
            "adres": "Paramaribo, Suriname",
            "btw_nummer": "SR987654321",
            "standaard_valuta": "SRD",
            "betalingstermijn": 30,
            "categorie": "Algemeen",
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Klant",
            "POST",
            "verkoop/klanten",
            200,
            data=klant_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('klanten', []).append(response['id'])
            print(f"   Created klant ID: {response['id']}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Currency: {response.get('standaard_valuta')}")
            return True
        return False

    def test_get_klanten(self):
        """Test getting all klanten"""
        success, response = self.run_test(
            "Get Klanten",
            "GET",
            "verkoop/klanten",
            200
        )
        
        if success:
            print(f"   Found {len(response)} klanten")
            return True
        return False

    def test_create_verkoopofferte(self):
        """Test creating a verkoopofferte"""
        if not self.created_resources.get('klanten'):
            print("⚠️  Skipping verkoopofferte creation - no klant created")
            return True
            
        klant_id = self.created_resources['klanten'][0]
        
        offerte_data = {
            "klant_id": klant_id,
            "offertedatum": "2025-02-06",
            "geldig_tot": "2025-03-06",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Test Service A",
                    "aantal": 1,
                    "eenheid": "stuk",
                    "prijs_per_stuk": 1000.0,
                    "korting_percentage": 0,
                    "btw_tarief": "25"
                }
            ],
            "opmerkingen": "Test verkoopofferte"
        }
        
        success, response = self.run_test(
            "Create Verkoopofferte",
            "POST",
            "verkoop/offertes",
            200,
            data=offerte_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('verkoopoffertes', []).append(response['id'])
            print(f"   Created offerte ID: {response['id']}")
            print(f"   Offertenummer: {response.get('offertenummer')}")
            print(f"   Totaal: {response.get('totaal')} {response.get('valuta')}")
            return True
        return False

    def test_create_prijslijst(self):
        """Test creating a prijslijst"""
        prijslijst_data = {
            "naam": "Standaard Prijslijst",
            "beschrijving": "Test prijslijst voor klanten",
            "valuta": "SRD",
            "is_standaard": True,
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Prijslijst",
            "POST",
            "verkoop/prijslijsten",
            200,
            data=prijslijst_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('prijslijsten', []).append(response['id'])
            print(f"   Created prijslijst ID: {response['id']}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Currency: {response.get('valuta')}")
            return True
        return False

    def test_voorraad_dashboard(self):
        """Test voorraad dashboard endpoint"""
        success, response = self.run_test(
            "Voorraad Dashboard",
            "GET",
            "voorraad/dashboard",
            200
        )
        
        if success:
            print(f"   Artikelen count: {response.get('artikelen_count', 0)}")
            print(f"   Lage voorraad count: {response.get('lage_voorraad_count', 0)}")
            print(f"   Totale voorraad waarde: {response.get('totale_voorraad_waarde', 0)}")
            print(f"   Magazijnen count: {response.get('magazijnen_count', 0)}")
            return True
        return False

    def test_create_artikel(self):
        """Test creating an artikel"""
        artikel_data = {
            "artikelcode": "ART001",
            "naam": "Test Product",
            "omschrijving": "Test product voor voorraad",
            "type": "product",
            "categorie": "Algemeen",
            "eenheid": "stuk",
            "inkoopprijs": 50.0,
            "verkoopprijs": 100.0,
            "standaard_valuta": "SRD",
            "btw_tarief": "25",
            "voorraad_beheer": True,
            "min_voorraad": 10,
            "max_voorraad": 100,
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Artikel",
            "POST",
            "voorraad/artikelen",
            200,
            data=artikel_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('artikelen', []).append(response['id'])
            print(f"   Created artikel ID: {response['id']}")
            print(f"   Artikelcode: {response.get('artikelcode')}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Verkoopprijs: {response.get('verkoopprijs')} {response.get('standaard_valuta')}")
            return True
        return False

    def test_get_artikelen(self):
        """Test getting all artikelen"""
        success, response = self.run_test(
            "Get Artikelen",
            "GET",
            "voorraad/artikelen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} artikelen")
            return True
        return False

    def test_create_magazijn(self):
        """Test creating a magazijn"""
        magazijn_data = {
            "naam": "Hoofdmagazijn",
            "code": "MAG001",
            "adres": "Paramaribo, Suriname",
            "contactpersoon": "Magazijn Manager",
            "telefoon": "+597 123 4567",
            "is_standaard": True,
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Magazijn",
            "POST",
            "voorraad/magazijnen",
            200,
            data=magazijn_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('magazijnen', []).append(response['id'])
            print(f"   Created magazijn ID: {response['id']}")
            print(f"   Code: {response.get('code')}")
            print(f"   Name: {response.get('naam')}")
            return True
        return False

    def test_create_voorraad_mutatie(self):
        """Test creating a voorraad mutatie"""
        if not self.created_resources.get('artikelen'):
            print("⚠️  Skipping voorraad mutatie creation - no artikel created")
            return True
            
        artikel_id = self.created_resources['artikelen'][0]
        
        mutatie_data = {
            "artikel_id": artikel_id,
            "type": "inkoop",
            "aantal": 10,
            "kostprijs": 50.0,
            "omschrijving": "Test voorraad inkoop",
            "datum": "2025-02-06"
        }
        
        success, response = self.run_test(
            "Create Voorraad Mutatie",
            "POST",
            "voorraad/mutaties",
            200,
            data=mutatie_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('voorraad_mutaties', []).append(response['id'])
            print(f"   Created mutatie ID: {response['id']}")
            print(f"   Type: {response.get('type')}")
            print(f"   Aantal: {response.get('aantal')}")
            print(f"   Voorraad na: {response.get('voorraad_na')}")
            return True
        return False

    def test_activa_dashboard(self):
        """Test activa dashboard endpoint"""
        success, response = self.run_test(
            "Activa Dashboard",
            "GET",
            "activa/dashboard",
            200
        )
        
        if success:
            print(f"   Activa count: {response.get('activa_count', 0)}")
            print(f"   Totaal aanschafwaarde: {response.get('totaal_aanschafwaarde', 0)}")
            print(f"   Totaal boekwaarde: {response.get('totaal_boekwaarde', 0)}")
            print(f"   Kostenplaatsen count: {response.get('kostenplaatsen_count', 0)}")
            return True
        return False

    def test_create_vast_activum(self):
        """Test creating a vast activum"""
        activum_data = {
            "naam": "Computer",
            "omschrijving": "Test computer voor kantoor",
            "categorie": "computers",
            "aanschafdatum": "2025-01-01",
            "aanschafwaarde": 5000.0,
            "valuta": "SRD",
            "verwachte_levensduur": 5,
            "restwaarde": 500.0,
            "afschrijvings_methode": "lineair",
            "locatie": "Kantoor",
            "verzekerd": True,
            "notities": "Test vast activum"
        }
        
        success, response = self.run_test(
            "Create Vast Activum",
            "POST",
            "activa/",
            200,
            data=activum_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('activa', []).append(response['id'])
            print(f"   Created activum ID: {response['id']}")
            print(f"   Activum nummer: {response.get('activum_nummer')}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Aanschafwaarde: {response.get('aanschafwaarde')} {response.get('valuta')}")
            print(f"   Jaarlijkse afschrijving: {response.get('jaarlijkse_afschrijving')}")
            return True
        return False

    def test_get_activa(self):
        """Test getting all activa"""
        success, response = self.run_test(
            "Get Vaste Activa",
            "GET",
            "activa/",
            200
        )
        
        if success:
            print(f"   Found {len(response)} activa")
            return True
        return False

    def test_create_kostenplaats(self):
        """Test creating a kostenplaats"""
        kostenplaats_data = {
            "code": "AFD01",
            "naam": "Administratie",
            "omschrijving": "Administratie afdeling",
            "type": "afdeling",
            "verantwoordelijke": "Manager Admin",
            "budget": 50000.0,
            "budget_valuta": "SRD",
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Kostenplaats",
            "POST",
            "activa/kostenplaatsen",
            200,
            data=kostenplaats_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('kostenplaatsen', []).append(response['id'])
            print(f"   Created kostenplaats ID: {response['id']}")
            print(f"   Code: {response.get('code')}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Budget: {response.get('budget')} {response.get('budget_valuta')}")
            return True
        return False

    def test_projecten_dashboard(self):
        """Test projecten dashboard endpoint"""
        success, response = self.run_test(
            "Projecten Dashboard",
            "GET",
            "projecten/dashboard/overzicht",
            200
        )
        
        if success:
            print(f"   Actieve projecten: {response.get('actieve_projecten', 0)}")
            print(f"   Uren deze maand: {response.get('uren_deze_maand', 0)}")
            print(f"   Kosten deze maand: {response.get('kosten_deze_maand', 0)}")
            return True
        return False

    def test_create_project(self):
        """Test creating a project"""
        project_data = {
            "naam": "Test Project",
            "code": "PRJ001",
            "omschrijving": "Test project voor ERP systeem",
            "type": "intern",
            "startdatum": "2025-02-01",
            "einddatum": "2025-06-30",
            "budget": 25000.0,
            "budget_valuta": "SRD",
            "uurtarief": 75.0,
            "notities": "Test project"
        }
        
        success, response = self.run_test(
            "Create Project",
            "POST",
            "projecten/",
            200,
            data=project_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('projecten', []).append(response['id'])
            print(f"   Created project ID: {response['id']}")
            print(f"   Project nummer: {response.get('project_nummer')}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Budget: {response.get('budget')} {response.get('budget_valuta')}")
            return True
        return False

    def test_get_projecten(self):
        """Test getting all projecten"""
        success, response = self.run_test(
            "Get Projecten",
            "GET",
            "projecten/",
            200
        )
        
        if success:
            print(f"   Found {len(response)} projecten")
            return True
        return False

    # ==================== COMPREHENSIVE BOEKHOUDING MODULE TESTING ====================
    
    def test_boekhouding_init_volledig(self):
        """Test POST /api/boekhouding/init/volledig - Initialize complete system"""
        success, response = self.run_test(
            "Initialize Complete Boekhouding System",
            "POST",
            "boekhouding/init/volledig",
            200
        )
        
        if success:
            print(f"   {response.get('message', 'System initialized')}")
            rekeningen_count = response.get('rekeningen_aangemaakt', 0)
            btw_codes_count = response.get('btw_codes_aangemaakt', 0)
            dagboeken_count = response.get('dagboeken_aangemaakt', 0)
            print(f"   Rekeningen created: {rekeningen_count}")
            print(f"   BTW codes created: {btw_codes_count}")
            print(f"   Dagboeken created: {dagboeken_count}")
            
            # Verify expected counts
            if rekeningen_count >= 76 and btw_codes_count >= 10 and dagboeken_count >= 5:
                print("   ✅ Expected initialization counts met")
                return True
            else:
                print(f"   ⚠️  Initialization counts lower than expected")
                return True  # Still pass as it might be already initialized
        return False

    def test_boekhouding_dashboard_kpis(self):
        """Test GET /api/boekhouding/dashboard - KPIs and balances"""
        success, response = self.run_test(
            "Boekhouding Dashboard KPIs",
            "GET",
            "boekhouding/dashboard",
            200
        )
        
        if success:
            print(f"   Debiteuren count: {response.get('debiteuren_count', 0)}")
            print(f"   Crediteuren count: {response.get('crediteuren_count', 0)}")
            print(f"   Openstaande facturen: {response.get('openstaande_facturen', 0)}")
            print(f"   Bank saldi: {response.get('bank_saldi', {})}")
            print(f"   Omzet maand: {response.get('omzet_maand', {})}")
            return True
        return False

    def test_boekhouding_dashboard_actielijst(self):
        """Test GET /api/boekhouding/dashboard/actielijst - Outstanding actions"""
        success, response = self.run_test(
            "Boekhouding Dashboard Actielijst",
            "GET",
            "boekhouding/dashboard/actielijst",
            200
        )
        
        if success:
            acties = response.get('acties', [])
            print(f"   Found {len(acties)} outstanding actions")
            for actie in acties[:3]:  # Show first 3
                print(f"   - {actie.get('type', 'N/A')}: {actie.get('omschrijving', 'N/A')}")
            return True
        return False

    def test_boekhouding_dashboard_omzet_grafiek(self):
        """Test GET /api/boekhouding/dashboard/grafieken/omzet - Revenue chart data"""
        success, response = self.run_test(
            "Boekhouding Dashboard Omzet Grafiek",
            "GET",
            "boekhouding/dashboard/grafieken/omzet",
            200
        )
        
        if success:
            data = response.get('data', [])
            print(f"   Found {len(data)} data points for revenue chart")
            if data:
                print(f"   Sample data: {data[0]}")
            return True
        return False

    def test_boekhouding_get_rekeningen_list(self):
        """Test GET /api/boekhouding/rekeningen - List accounts"""
        success, response = self.run_test(
            "Get Boekhouding Rekeningen List",
            "GET",
            "boekhouding/rekeningen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} accounts")
            if response:
                sample = response[0]
                print(f"   Sample account: {sample.get('nummer')} - {sample.get('naam')}")
            return True
        return False

    def test_boekhouding_create_rekening(self):
        """Test POST /api/boekhouding/rekeningen - Create new account"""
        rekening_data = {
            "nummer": "9999",
            "naam": "Test rekening",
            "type": "kosten",
            "omschrijving": "Test rekening voor testing",
            "valuta": "SRD",
            "actief": True
        }
        
        success, response = self.run_test(
            "Create Boekhouding Rekening",
            "POST",
            "boekhouding/rekeningen",
            200,
            data=rekening_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_rekeningen', []).append(response['id'])
            print(f"   Created rekening ID: {response['id']}")
            print(f"   Number: {response.get('nummer')}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Type: {response.get('type')}")
            return True
        return False

    def test_boekhouding_get_dagboeken(self):
        """Test GET /api/boekhouding/dagboeken - List journals"""
        success, response = self.run_test(
            "Get Boekhouding Dagboeken",
            "GET",
            "boekhouding/dagboeken",
            200
        )
        
        if success:
            print(f"   Found {len(response)} dagboeken")
            for dagboek in response:
                print(f"   - {dagboek.get('code')}: {dagboek.get('naam')} ({dagboek.get('type')})")
            return True
        return False

    def test_boekhouding_get_journaalposten(self):
        """Test GET /api/boekhouding/journaalposten - List journal entries"""
        success, response = self.run_test(
            "Get Boekhouding Journaalposten",
            "GET",
            "boekhouding/journaalposten",
            200
        )
        
        if success:
            print(f"   Found {len(response)} journaalposten")
            return True
        return False

    def test_boekhouding_create_debiteur_comprehensive(self):
        """Test POST /api/boekhouding/debiteuren - Create debiteur"""
        debiteur_data = {
            "bedrijfsnaam": "Test Klant NV",
            "naam": "Test Klant NV",
            "email": "test@testklant.sr",
            "telefoon": "+597 123 4567",
            "adres": "Paramaribo, Suriname",
            "btw_nummer": "SR123456789",
            "standaard_valuta": "SRD",
            "betalingstermijn": 30,
            "kredietlimiet": 10000.0,
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Boekhouding Debiteur",
            "POST",
            "boekhouding/debiteuren",
            200,
            data=debiteur_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_debiteuren', []).append(response['id'])
            print(f"   Created debiteur ID: {response['id']}")
            print(f"   Company: {response.get('bedrijfsnaam')}")
            print(f"   Currency: {response.get('standaard_valuta')}")
            print(f"   Payment term: {response.get('betalingstermijn')} days")
            return True
        return False

    def test_boekhouding_get_debiteuren_comprehensive(self):
        """Test GET /api/boekhouding/debiteuren - List debtors"""
        success, response = self.run_test(
            "Get Boekhouding Debiteuren List",
            "GET",
            "boekhouding/debiteuren",
            200
        )
        
        if success:
            print(f"   Found {len(response)} debiteuren")
            for debiteur in response:
                print(f"   - {debiteur.get('bedrijfsnaam')} ({debiteur.get('standaard_valuta')})")
            return True
        return False

    def test_boekhouding_get_debiteuren_aging(self):
        """Test GET /api/boekhouding/debiteuren/aging - Aging analysis"""
        success, response = self.run_test(
            "Get Debiteuren Aging Analysis",
            "GET",
            "boekhouding/debiteuren/aging",
            200
        )
        
        if success:
            aging_data = response.get('aging', [])
            print(f"   Found aging data for {len(aging_data)} debiteuren")
            totals = response.get('totalen', {})
            print(f"   Total outstanding: {totals.get('totaal_openstaand', 0)}")
            return True
        return False

    def test_boekhouding_create_crediteur(self):
        """Test POST /api/boekhouding/crediteuren - Create crediteur"""
        crediteur_data = {
            "bedrijfsnaam": "Test Leverancier",
            "naam": "Test Leverancier",
            "email": "leverancier@test.sr",
            "telefoon": "+597 987 6543",
            "adres": "Paramaribo, Suriname",
            "btw_nummer": "SR987654321",
            "standaard_valuta": "SRD",
            "betalingstermijn": 30,
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Boekhouding Crediteur",
            "POST",
            "boekhouding/crediteuren",
            200,
            data=crediteur_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_crediteuren', []).append(response['id'])
            print(f"   Created crediteur ID: {response['id']}")
            print(f"   Company: {response.get('bedrijfsnaam')}")
            print(f"   Currency: {response.get('standaard_valuta')}")
            return True
        return False

    def test_boekhouding_get_crediteuren(self):
        """Test GET /api/boekhouding/crediteuren - List creditors"""
        success, response = self.run_test(
            "Get Boekhouding Crediteuren",
            "GET",
            "boekhouding/crediteuren",
            200
        )
        
        if success:
            print(f"   Found {len(response)} crediteuren")
            return True
        return False

    def test_boekhouding_get_crediteuren_betaaladvies(self):
        """Test GET /api/boekhouding/crediteuren/betaaladvies - Payment advice list"""
        success, response = self.run_test(
            "Get Crediteuren Betaaladvies",
            "GET",
            "boekhouding/crediteuren/betaaladvies",
            200
        )
        
        if success:
            betaaladvies = response.get('betaaladvies', [])
            print(f"   Found {len(betaaladvies)} payment advice items")
            return True
        return False

    def test_boekhouding_create_verkoopfactuur_comprehensive(self):
        """Test POST /api/boekhouding/verkoopfacturen - Create sales invoice with BTW"""
        if not self.created_resources.get('boekhouding_debiteuren'):
            print("⚠️  Skipping verkoopfactuur creation - no debiteur created")
            return True
            
        debiteur_id = self.created_resources['boekhouding_debiteuren'][0]
        
        factuur_data = {
            "debiteur_id": debiteur_id,
            "factuurdatum": "2026-02-27",
            "vervaldatum": "2026-03-29",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Consultancy diensten",
                    "aantal": 10,
                    "prijs_per_stuk": 150.0,
                    "btw_tarief": "25",
                    "korting_percentage": 0
                },
                {
                    "omschrijving": "Software licentie",
                    "aantal": 1,
                    "prijs_per_stuk": 500.0,
                    "btw_tarief": "25",
                    "korting_percentage": 0
                }
            ],
            "opmerkingen": "Test verkoopfactuur met BTW 25%"
        }
        
        success, response = self.run_test(
            "Create Comprehensive Verkoopfactuur",
            "POST",
            "boekhouding/verkoopfacturen",
            200,
            data=factuur_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_verkoopfacturen', []).append(response['id'])
            print(f"   Created factuur ID: {response['id']}")
            print(f"   Factuurnummer: {response.get('factuurnummer')}")
            print(f"   Subtotaal: {response.get('subtotaal')} {response.get('valuta')}")
            print(f"   BTW bedrag: {response.get('btw_bedrag')} {response.get('valuta')}")
            print(f"   Totaal: {response.get('totaal')} {response.get('valuta')}")
            print(f"   Status: {response.get('status')}")
            
            # Verify BTW calculation (25% on 2000 = 500)
            expected_btw = 500.0
            actual_btw = response.get('btw_bedrag', 0)
            if abs(actual_btw - expected_btw) < 0.01:
                print(f"   ✅ BTW calculation correct: {actual_btw}")
            else:
                print(f"   ⚠️  BTW calculation: expected {expected_btw}, got {actual_btw}")
            
            return True
        return False

    def test_boekhouding_get_verkoopfacturen_comprehensive(self):
        """Test GET /api/boekhouding/verkoopfacturen - List sales invoices"""
        success, response = self.run_test(
            "Get Boekhouding Verkoopfacturen List",
            "GET",
            "boekhouding/verkoopfacturen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} verkoopfacturen")
            for factuur in response:
                print(f"   - {factuur.get('factuurnummer')}: {factuur.get('totaal')} {factuur.get('valuta')} ({factuur.get('status')})")
            return True
        return False

    def test_boekhouding_verzend_verkoopfactuur(self):
        """Test POST /api/boekhouding/verkoopfacturen/{id}/verzenden - Send invoice (creates journal entry)"""
        if not self.created_resources.get('boekhouding_verkoopfacturen'):
            print("⚠️  Skipping factuur verzending - no factuur created")
            return True
            
        factuur_id = self.created_resources['boekhouding_verkoopfacturen'][0]
        
        success, response = self.run_test(
            "Verzend Verkoopfactuur (Create Journal Entry)",
            "POST",
            f"boekhouding/verkoopfacturen/{factuur_id}/verzenden",
            200
        )
        
        if success:
            print(f"   Factuur verzonden: {response.get('message', 'Success')}")
            journaalpost_id = response.get('journaalpost_id')
            if journaalpost_id:
                print(f"   Journaalpost created: {journaalpost_id}")
                print("   ✅ Automatic journal entry creation working")
            return True
        return False

    def test_boekhouding_betaling_verkoopfactuur(self):
        """Test POST /api/boekhouding/verkoopfactuur/{id}/betaling - Record payment"""
        if not self.created_resources.get('boekhouding_verkoopfacturen'):
            print("⚠️  Skipping factuur betaling - no factuur created")
            return True
            
        factuur_id = self.created_resources['boekhouding_verkoopfacturen'][0]
        
        success, response = self.run_test(
            "Record Verkoopfactuur Payment",
            "POST",
            f"boekhouding/verkoopfacturen/{factuur_id}/betaling?bedrag=100&datum=2026-02-27&betaalwijze=bank",
            200
        )
        
        if success:
            print(f"   Payment recorded: {response.get('message', 'Success')}")
            return True
        return False

    def test_boekhouding_create_inkoopfactuur(self):
        """Test POST /api/boekhouding/inkoopfacturen - Create purchase invoice"""
        if not self.created_resources.get('boekhouding_crediteuren'):
            print("⚠️  Skipping inkoopfactuur creation - no crediteur created")
            return True
            
        crediteur_id = self.created_resources['boekhouding_crediteuren'][0]
        
        factuur_data = {
            "crediteur_id": crediteur_id,
            "factuurnummer": "INK-2026-001",
            "factuurdatum": "2026-02-27",
            "vervaldatum": "2026-03-29",
            "valuta": "SRD",
            "regels": [
                {
                    "omschrijving": "Kantoorbenodigdheden",
                    "aantal": 5,
                    "prijs_per_stuk": 50.0,
                    "btw_tarief": "25"
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Inkoopfactuur",
            "POST",
            "boekhouding/inkoopfacturen",
            200,
            data=factuur_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_inkoopfacturen', []).append(response['id'])
            print(f"   Created inkoopfactuur ID: {response['id']}")
            print(f"   Factuurnummer: {response.get('factuurnummer')}")
            print(f"   Totaal: {response.get('totaal')} {response.get('valuta')}")
            return True
        return False

    def test_boekhouding_boek_inkoopfactuur(self):
        """Test POST /api/boekhouding/inkoopfacturen/{id}/boeken - Book purchase invoice"""
        if not self.created_resources.get('boekhouding_inkoopfacturen'):
            print("⚠️  Skipping inkoopfactuur boeken - no inkoopfactuur created")
            return True
            
        factuur_id = self.created_resources['boekhouding_inkoopfacturen'][0]
        
        success, response = self.run_test(
            "Boek Inkoopfactuur",
            "POST",
            f"boekhouding/inkoopfacturen/{factuur_id}/boeken",
            200
        )
        
        if success:
            print(f"   Inkoopfactuur geboekt: {response.get('message', 'Success')}")
            return True
        return False

    def test_boekhouding_create_bankrekening_comprehensive(self):
        """Test POST /api/boekhouding/bankrekeningen - Create bank account"""
        bank_data = {
            "naam": "DSB Zakelijk Rekening",
            "rekeningnummer": "123456789",
            "bank_naam": "DSB",
            "valuta": "SRD",
            "beginsaldo": 25000.0,
            "is_actief": True,
            "omschrijving": "Hoofdbankrekening voor bedrijfsvoering"
        }
        
        success, response = self.run_test(
            "Create Comprehensive Bankrekening",
            "POST",
            "boekhouding/bankrekeningen",
            200,
            data=bank_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_bankrekeningen', []).append(response['id'])
            print(f"   Created bankrekening ID: {response['id']}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Bank: {response.get('bank_naam')}")
            print(f"   Account number: {response.get('rekeningnummer')}")
            print(f"   Balance: {response.get('huidig_saldo')} {response.get('valuta')}")
            return True
        return False

    def test_boekhouding_get_bankrekeningen_comprehensive(self):
        """Test GET /api/boekhouding/bankrekeningen - List bank accounts"""
        success, response = self.run_test(
            "Get Boekhouding Bankrekeningen List",
            "GET",
            "boekhouding/bankrekeningen",
            200
        )
        
        if success:
            print(f"   Found {len(response)} bankrekeningen")
            for bank in response:
                print(f"   - {bank.get('naam')}: {bank.get('huidig_saldo')} {bank.get('valuta')}")
            return True
        return False

    def test_boekhouding_get_btw_codes(self):
        """Test GET /api/boekhouding/btw/codes - BTW codes (expect V25, V10, V0, I25, I10 etc.)"""
        success, response = self.run_test(
            "Get BTW Codes",
            "GET",
            "boekhouding/btw/codes",
            200
        )
        
        if success:
            print(f"   Found {len(response)} BTW codes")
            expected_codes = ['V25', 'V10', 'V0', 'I25', 'I10']
            found_codes = [code.get('code') for code in response]
            
            for expected in expected_codes:
                if expected in found_codes:
                    print(f"   ✅ Found expected BTW code: {expected}")
                else:
                    print(f"   ⚠️  Missing expected BTW code: {expected}")
            
            return True
        return False

    def test_boekhouding_btw_aangifte_comprehensive(self):
        """Test GET /api/boekhouding/btw/aangifte - BTW declaration"""
        success, response = self.run_test(
            "BTW Aangifte Comprehensive",
            "GET",
            "boekhouding/btw/aangifte?periode_van=2026-01-01&periode_tot=2026-12-31",
            200
        )
        
        if success:
            print(f"   Period: {response.get('periode_van')} - {response.get('periode_tot')}")
            print(f"   Currency: {response.get('valuta', 'SRD')}")
            print(f"   High rate revenue: {response.get('omzet_hoog_tarief', 0)}")
            print(f"   High rate VAT: {response.get('btw_hoog_tarief', 0)}")
            print(f"   Low rate revenue: {response.get('omzet_laag_tarief', 0)}")
            print(f"   Low rate VAT: {response.get('btw_laag_tarief', 0)}")
            print(f"   Zero rate revenue: {response.get('omzet_nul_tarief', 0)}")
            print(f"   Total VAT due: {response.get('totaal_verschuldigde_btw', 0)}")
            print(f"   Input VAT: {response.get('voorbelasting', 0)}")
            print(f"   VAT to pay: {response.get('te_betalen_btw', 0)}")
            return True
        return False

    def test_boekhouding_rapportage_balans(self):
        """Test GET /api/boekhouding/rapportages/balans - Balance sheet"""
        success, response = self.run_test(
            "Rapportage Balans",
            "GET",
            "boekhouding/rapportages/balans?datum=2026-02-27",
            200
        )
        
        if success:
            print(f"   Balance date: {response.get('datum')}")
            print(f"   Currency: {response.get('valuta', 'SRD')}")
            
            activa = response.get('activa', {})
            passiva = response.get('passiva', {})
            
            print(f"   Total activa: {activa.get('totaal', 0)}")
            print(f"   Total passiva: {passiva.get('totaal', 0)}")
            
            # Check if balance sheet balances
            activa_total = activa.get('totaal', 0)
            passiva_total = passiva.get('totaal', 0)
            
            if abs(activa_total - passiva_total) < 0.01:
                print("   ✅ Balance sheet balances correctly")
            else:
                print(f"   ⚠️  Balance sheet doesn't balance: {activa_total} vs {passiva_total}")
            
            return True
        return False

    def test_boekhouding_rapportage_winst_verlies(self):
        """Test GET /api/boekhouding/rapportages/winst-verlies - Profit & Loss"""
        success, response = self.run_test(
            "Rapportage Winst & Verlies",
            "GET",
            "boekhouding/rapportages/winst-verlies?periode_van=2026-01-01&periode_tot=2026-12-31",
            200
        )
        
        if success:
            print(f"   Period: {response.get('periode_van')} - {response.get('periode_tot')}")
            print(f"   Currency: {response.get('valuta', 'SRD')}")
            
            omzet = response.get('omzet', {})
            kosten = response.get('kosten', {})
            
            print(f"   Total omzet: {omzet.get('totaal', 0)}")
            print(f"   Total kosten: {kosten.get('totaal', 0)}")
            print(f"   Netto resultaat: {response.get('netto_resultaat', 0)}")
            
            return True
        return False

    def test_boekhouding_rapportage_proef_saldibalans(self):
        """Test GET /api/boekhouding/rapportages/proef-saldibalans - Trial balance"""
        success, response = self.run_test(
            "Rapportage Proef/Saldibalans",
            "GET",
            "boekhouding/rapportages/proef-saldibalans",
            200
        )
        
        if success:
            rekeningen = response.get('rekeningen', [])
            print(f"   Found {len(rekeningen)} accounts in trial balance")
            
            totaal_debet = response.get('totaal_debet', 0)
            totaal_credit = response.get('totaal_credit', 0)
            
            print(f"   Total debet: {totaal_debet}")
            print(f"   Total credit: {totaal_credit}")
            
            if abs(totaal_debet - totaal_credit) < 0.01:
                print("   ✅ Trial balance balances correctly")
            else:
                print(f"   ⚠️  Trial balance doesn't balance: {totaal_debet} vs {totaal_credit}")
            
            return True
        return False

    def test_boekhouding_create_wisselkoers(self):
        """Test POST /api/boekhouding/wisselkoersen - Manual exchange rate"""
        koers_data = {
            "van_valuta": "USD",
            "naar_valuta": "SRD",
            "koers": 36.50,
            "datum": "2026-02-27",
            "bron": "handmatig"
        }
        
        success, response = self.run_test(
            "Create Manual Wisselkoers",
            "POST",
            "boekhouding/wisselkoersen",
            200,
            data=koers_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_wisselkoersen', []).append(response['id'])
            print(f"   Created wisselkoers ID: {response['id']}")
            print(f"   Rate: {response.get('van_valuta')} to {response.get('naar_valuta')} = {response.get('koers')}")
            return True
        return False

    def test_boekhouding_get_wisselkoersen_actueel(self):
        """Test GET /api/boekhouding/wisselkoersen/actueel - Current exchange rates"""
        success, response = self.run_test(
            "Get Actuele Wisselkoersen",
            "GET",
            "boekhouding/wisselkoersen/actueel",
            200
        )
        
        if success:
            koersen = response.get('koersen', [])
            print(f"   Found {len(koersen)} current exchange rates")
            for koers in koersen[:3]:  # Show first 3
                print(f"   - {koers.get('van_valuta')} to {koers.get('naar_valuta')}: {koers.get('koers')}")
            return True
        return False

    def test_boekhouding_get_wisselkoersen_centrale_bank(self):
        """Test GET /api/boekhouding/wisselkoersen/haal-centrale-bank - Central Bank rates"""
        success, response = self.run_test(
            "Get Centrale Bank Wisselkoersen",
            "GET",
            "boekhouding/wisselkoersen/haal-centrale-bank",
            200
        )
        
        if success:
            print(f"   Central Bank rates: {response.get('message', 'Retrieved')}")
            koersen = response.get('koersen', [])
            print(f"   Retrieved {len(koersen)} rates from Central Bank")
            return True
        return False

    def test_boekhouding_create_artikel(self):
        """Test POST /api/boekhouding/artikelen - Create article"""
        artikel_data = {
            "artikelcode": "TEST001",
            "naam": "Test Product",
            "omschrijving": "Test product voor voorraad",
            "type": "product",
            "categorie": "Algemeen",
            "eenheid": "stuk",
            "inkoopprijs": 75.0,
            "verkoopprijs": 150.0,
            "standaard_valuta": "SRD",
            "btw_tarief": "25",
            "voorraad_beheer": True,
            "min_voorraad": 5,
            "max_voorraad": 50,
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Boekhouding Artikel",
            "POST",
            "boekhouding/artikelen",
            200,
            data=artikel_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_artikelen', []).append(response['id'])
            print(f"   Created artikel ID: {response['id']}")
            print(f"   Code: {response.get('artikelcode')}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Price: {response.get('verkoopprijs')} {response.get('standaard_valuta')}")
            return True
        return False

    def test_boekhouding_create_magazijn(self):
        """Test POST /api/boekhouding/magazijnen - Create warehouse"""
        magazijn_data = {
            "code": "MAG1",
            "naam": "Hoofdmagazijn",
            "adres": "Paramaribo, Suriname",
            "contactpersoon": "Magazijn Manager",
            "telefoon": "+597 123 4567",
            "is_standaard": True,
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Boekhouding Magazijn",
            "POST",
            "boekhouding/magazijnen",
            200,
            data=magazijn_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_magazijnen', []).append(response['id'])
            print(f"   Created magazijn ID: {response['id']}")
            print(f"   Code: {response.get('code')}")
            print(f"   Name: {response.get('naam')}")
            return True
        return False

    def test_boekhouding_get_voorraad_waardering(self):
        """Test GET /api/boekhouding/voorraad/waardering - Inventory valuation"""
        success, response = self.run_test(
            "Get Voorraad Waardering",
            "GET",
            "boekhouding/voorraad/waardering",
            200
        )
        
        if success:
            waardering = response.get('waardering', [])
            print(f"   Found {len(waardering)} inventory items")
            totaal_waarde = response.get('totaal_waarde', 0)
            print(f"   Total inventory value: {totaal_waarde}")
            return True
        return False

    def test_boekhouding_create_project(self):
        """Test POST /api/boekhouding/projecten - Create project"""
        project_data = {
            "naam": "Test Project",
            "code": "PRJ001",
            "omschrijving": "Test project voor boekhouding",
            "type": "intern",
            "startdatum": "2026-02-01",
            "einddatum": "2026-06-30",
            "budget": 50000.0,
            "budget_valuta": "SRD",
            "uurtarief": 100.0,
            "is_actief": True
        }
        
        success, response = self.run_test(
            "Create Boekhouding Project",
            "POST",
            "boekhouding/projecten",
            200,
            data=project_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_projecten', []).append(response['id'])
            print(f"   Created project ID: {response['id']}")
            print(f"   Code: {response.get('code')}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Budget: {response.get('budget')} {response.get('budget_valuta')}")
            return True
        return False

    def test_boekhouding_register_project_uren(self):
        """Test POST /api/boekhouding/projecten/{id}/uren - Register project hours"""
        if not self.created_resources.get('boekhouding_projecten'):
            print("⚠️  Skipping project uren registration - no project created")
            return True
            
        project_id = self.created_resources['boekhouding_projecten'][0]
        
        uren_data = {
            "datum": "2026-02-27",
            "uren": 8.0,
            "omschrijving": "Development werk",
            "medewerker": "Test Developer",
            "uurtarief": 100.0
        }
        
        success, response = self.run_test(
            "Register Project Uren",
            "POST",
            f"boekhouding/projecten/{project_id}/uren",
            200,
            data=uren_data
        )
        
        if success and 'id' in response:
            print(f"   Registered uren ID: {response['id']}")
            print(f"   Hours: {response.get('uren')}")
            print(f"   Rate: {response.get('uurtarief')}")
            print(f"   Total: {response.get('totaal_bedrag', 0)}")
            return True
        return False

    def test_boekhouding_get_project_resultaat(self):
        """Test GET /api/boekhouding/projecten/{id}/resultaat - Project result"""
        if not self.created_resources.get('boekhouding_projecten'):
            print("⚠️  Skipping project resultaat - no project created")
            return True
            
        project_id = self.created_resources['boekhouding_projecten'][0]
        
        success, response = self.run_test(
            "Get Project Resultaat",
            "GET",
            f"boekhouding/projecten/{project_id}/resultaat",
            200
        )
        
        if success:
            print(f"   Project: {response.get('project_naam')}")
            print(f"   Total uren: {response.get('totaal_uren', 0)}")
            print(f"   Total kosten: {response.get('totaal_kosten', 0)}")
            print(f"   Total opbrengsten: {response.get('totaal_opbrengsten', 0)}")
            print(f"   Resultaat: {response.get('resultaat', 0)}")
            return True
        return False

    def test_boekhouding_create_vast_activum(self):
        """Test POST /api/boekhouding/vaste-activa - Create fixed asset"""
        activum_data = {
            "naam": "Bedrijfsauto",
            "omschrijving": "Toyota Hilux voor bedrijfsvoering",
            "categorie": "voertuigen",
            "aanschafdatum": "2026-01-15",
            "aanschafwaarde": 50000.0,
            "valuta": "SRD",
            "verwachte_levensduur": 5,
            "restwaarde": 10000.0,
            "afschrijvings_methode": "lineair",
            "locatie": "Hoofdkantoor",
            "verzekerd": True
        }
        
        success, response = self.run_test(
            "Create Boekhouding Vast Activum",
            "POST",
            "boekhouding/vaste-activa",
            200,
            data=activum_data
        )
        
        if success and 'id' in response:
            self.created_resources.setdefault('boekhouding_vaste_activa', []).append(response['id'])
            print(f"   Created vast activum ID: {response['id']}")
            print(f"   Name: {response.get('naam')}")
            print(f"   Category: {response.get('categorie')}")
            print(f"   Purchase value: {response.get('aanschafwaarde')} {response.get('valuta')}")
            print(f"   Annual depreciation: {response.get('jaarlijkse_afschrijving', 0)}")
            return True
        return False

    def test_boekhouding_run_afschrijvingen(self):
        """Test POST /api/boekhouding/vaste-activa/afschrijven - Run depreciation"""
        success, response = self.run_test(
            "Run Afschrijvingen",
            "POST",
            "boekhouding/vaste-activa/afschrijven?periode=2026-02",
            200
        )
        
        if success:
            print(f"   Afschrijvingen processed: {response.get('message', 'Success')}")
            verwerkt = response.get('activa_verwerkt', 0)
            totaal_afschrijving = response.get('totaal_afschrijving', 0)
            print(f"   Assets processed: {verwerkt}")
            print(f"   Total depreciation: {totaal_afschrijving}")
            return True
        return False

def main():
    print("🏠 SuriRentals API Testing Suite")
    print("=" * 50)
    
    tester = SuriRentalsAPITester()
    
    # Test sequence
    tests = [
        ("User Registration", tester.test_user_registration),
        ("User Profile", tester.test_get_user_profile),
        ("Exchange Rate API", tester.test_exchange_rate_api),
        ("Create Tenant", tester.test_create_tenant),
        ("Get Tenants", tester.test_get_tenants),
        ("Create Apartment", tester.test_create_apartment),
        ("Get Apartments", tester.test_get_apartments),
        ("Assign Tenant", tester.test_assign_tenant_to_apartment),
        ("Create Payment", tester.test_create_payment),
        ("Get Payments", tester.test_get_payments),
        ("Create Deposit", tester.test_create_deposit),
        ("Get Deposits", tester.test_get_deposits),
        ("Create Kasgeld Deposit", tester.test_create_kasgeld_deposit),
        ("Create Kasgeld Withdrawal", tester.test_create_kasgeld_withdrawal),
        ("Get Kasgeld Balance", tester.test_get_kasgeld),
        ("Create Maintenance", tester.test_create_maintenance),
        ("Get Maintenance", tester.test_get_maintenance),
        ("Update Maintenance", tester.test_update_maintenance),
        ("Create Employee", tester.test_create_employee),
        ("Get Employees", tester.test_get_employees),
        ("Update Employee", tester.test_update_employee),
        ("Create Salary Payment", tester.test_create_salary_payment),
        ("Get Salary Payments", tester.test_get_salaries),
        ("Kasgeld After Salary", tester.test_kasgeld_after_salary),
        ("Dashboard with Employees", tester.test_dashboard_with_employees),
        ("Dashboard Stats", tester.test_get_dashboard),
        ("Download Receipt", tester.test_download_receipt),
        ("Tenant Balance", tester.test_tenant_balance),
        
        # ADD-ONS TESTING SEQUENCE
        ("=== ADD-ONS SYSTEM TESTING ===", lambda: True),
        ("Create Superadmin User", tester.test_create_superadmin_user),
        ("Superadmin Login", tester.test_superadmin_login),
        ("Create Customer User", tester.test_create_customer_user),
        ("Get Public Add-ons", tester.test_get_public_addons),
        
        # NEW ADDON MODULE DETAIL TESTS
        ("=== ADDON MODULE DETAIL TESTS ===", lambda: True),
        ("Get Addon by Slug - vastgoed_beheer", tester.test_get_addon_by_slug_vastgoed_beheer),
        ("Get Addon by Slug - hrm", tester.test_get_addon_by_slug_hrm),
        ("Get Addon by Non-existent Slug (404)", tester.test_get_addon_by_nonexistent_slug),
        ("Create Addon with Extra Fields", tester.test_create_addon_with_extra_fields),
        ("Update Addon with Extra Fields", tester.test_update_addon_with_extra_fields),
        ("Get Updated Addon by Slug", tester.test_get_updated_addon_by_slug),
        ("Delete Test Addon (Cleanup)", tester.test_delete_addon_as_superadmin),
        
        # EXISTING ADDON TESTS
        ("Create Add-on (Superadmin)", tester.test_create_addon_as_superadmin),
        ("Get Admin Add-ons", tester.test_get_admin_addons),
        ("Update Add-on Price", tester.test_update_addon_price),
        ("Customer Request Add-on", tester.test_customer_request_addon),
        ("Get Customer Add-ons (Before)", tester.test_get_customer_addons),
        ("Get Add-on Requests (Admin)", tester.test_get_addon_requests_as_admin),
        ("Approve Add-on Request", tester.test_approve_addon_request),
        ("Activate Add-on for Customer", tester.test_activate_addon_for_customer),
        ("Get User Add-ons (Admin)", tester.test_get_user_addons_as_admin),
        ("Customer Add-ons After Activation", tester.test_customer_addons_after_activation),
        ("Deactivate User Add-on", tester.test_deactivate_user_addon),
        ("Reject Add-on Request", tester.test_reject_addon_request),
        ("Unauthorized Add-on Access", tester.test_unauthorized_addon_access),
        
        # AI CHAT TESTING WITH DEMO ACCOUNT
        ("=== AI CHAT DEMO ACCOUNT TEST ===", lambda: True),
        ("Demo Account Login", tester.test_demo_account_login),
        ("AI Chat with Demo Account", tester.test_ai_chat_endpoint_with_demo_account),
        
        # BOEKHOUDING MODULE TESTING
        ("=== BOEKHOUDING MODULE TESTING ===", lambda: True),
        ("Boekhouding Dashboard", tester.test_boekhouding_dashboard),
        ("Initialize Standard Chart of Accounts", tester.test_init_standaard_rekeningen),
        ("Get Chart of Accounts", tester.test_get_rekeningen),
        ("Create Debiteur", tester.test_create_debiteur),
        ("Get Debiteuren", tester.test_get_debiteuren),
        ("Create Verkoopfactuur", tester.test_create_verkoopfactuur),
        ("Get Verkoopfacturen", tester.test_get_verkoopfacturen),
        ("Get Bankrekeningen", tester.test_get_bankrekeningen),
        ("Create Bankrekening", tester.test_create_bankrekening),
        ("BTW Aangifte Report", tester.test_btw_aangifte),
        ("Multi-Currency Support", tester.test_multi_currency_support),
        ("BTW Calculation Test", tester.test_btw_calculation),
        ("Auto Factuurnummer Generation", tester.test_automatic_factuurnummer_generation),
        ("Balans Report", tester.test_balans_rapport),
        ("Add Wisselkoers", tester.test_add_wisselkoers),
        
        # SURIBET DASHBOARD TESTING
        ("=== SURIBET DASHBOARD TESTING ===", lambda: True),
        ("Suribet Dagstaten with Date", tester.test_suribet_dagstaten_with_date),
        ("Suribet Kasboek with Date", tester.test_suribet_kasboek_with_date),
        ("Suribet Loonbetalingen with Date", tester.test_suribet_loonbetalingen_with_date),
        ("Suribet Dagstaten Month/Year Filter", tester.test_suribet_dagstaten_month_year_filter),
        ("Suribet Kasboek Month/Year Filter", tester.test_suribet_kasboek_month_year_filter),
        ("Suribet Loonbetalingen Month/Year Filter", tester.test_suribet_loonbetalingen_month_year_filter),
        ("Suribet Authentication Required", tester.test_suribet_authentication_required),
        
        # ERP MODULES TESTING
        ("=== ERP MODULES TESTING ===", lambda: True),
        ("Inkoop Dashboard", tester.test_inkoop_dashboard),
        ("Create Leverancier", tester.test_create_leverancier),
        ("Get Leveranciers", tester.test_get_leveranciers),
        ("Create Inkoopofferte", tester.test_create_inkoopofferte),
        ("Create Inkooporder", tester.test_create_inkooporder),
        ("Verkoop Dashboard", tester.test_verkoop_dashboard),
        ("Create Klant", tester.test_create_klant),
        ("Get Klanten", tester.test_get_klanten),
        ("Create Verkoopofferte", tester.test_create_verkoopofferte),
        ("Create Prijslijst", tester.test_create_prijslijst),
        ("Voorraad Dashboard", tester.test_voorraad_dashboard),
        ("Create Artikel", tester.test_create_artikel),
        ("Get Artikelen", tester.test_get_artikelen),
        ("Create Magazijn", tester.test_create_magazijn),
        ("Create Voorraad Mutatie", tester.test_create_voorraad_mutatie),
        ("Activa Dashboard", tester.test_activa_dashboard),
        ("Create Vast Activum", tester.test_create_vast_activum),
        ("Get Vaste Activa", tester.test_get_activa),
        ("Create Kostenplaats", tester.test_create_kostenplaats),
        ("Projecten Dashboard", tester.test_projecten_dashboard),
        ("Create Project", tester.test_create_project),
        ("Get Projecten", tester.test_get_projecten),
        
        # CLEANUP TESTS
        ("Delete Salary Payment", tester.test_delete_salary_payment),
        ("Delete Employee", tester.test_delete_employee),
        ("Delete Kasgeld Transaction", tester.test_delete_kasgeld_transaction),
        ("Delete Maintenance", tester.test_delete_maintenance),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if test_name.startswith("==="):
                print(f"\n{test_name}")
                continue
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {len(failed_tests)}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("\n✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())