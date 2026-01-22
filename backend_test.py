#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class SuriRentalsAPITester:
    def __init__(self, base_url="https://suri-rentals.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'tenants': [],
            'apartments': [],
            'payments': [],
            'deposits': [],
            'kasgeld': [],
            'maintenance': []
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

def main():
    print("🏠 SuriRentals API Testing Suite")
    print("=" * 50)
    
    tester = SuriRentalsAPITester()
    
    # Test sequence
    tests = [
        ("User Registration", tester.test_user_registration),
        ("User Profile", tester.test_get_user_profile),
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
        ("Dashboard Stats", tester.test_get_dashboard),
        ("Download Receipt", tester.test_download_receipt),
        ("Tenant Balance", tester.test_tenant_balance),
        ("Delete Kasgeld Transaction", tester.test_delete_kasgeld_transaction),
        ("Delete Maintenance", tester.test_delete_maintenance),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
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