#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class SuriRentalsAPITester:
    def __init__(self, base_url="https://free-ledger-su.preview.emergentagent.com/api"):
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
            print(f"   Omzet maand: {response.get('omzet_maand', {})}")
            return True
        return False

    def test_init_standaard_rekeningen(self):
        """Test initializing standard Surinamese chart of accounts (only once)"""
        success, response = self.run_test(
            "Initialize Standard Chart of Accounts",
            "POST",
            "boekhouding/rekeningen/init-standaard",
            200
        )
        
        if success:
            print(f"   {response.get('message', 'Standard accounts initialized')}")
            return True
        elif response.get('detail') == 'Rekeningschema bestaat al':
            print("   ⚠️  Chart of accounts already exists - skipping initialization")
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