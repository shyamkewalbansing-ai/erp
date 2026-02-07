#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class AddonModuleDetailTester:
    def __init__(self, base_url="https://shift-portal-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.superadmin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_addon_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.superadmin_token:
            test_headers['Authorization'] = f'Bearer {self.superadmin_token}'
        
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
        elif not success:
            # Try to login instead (user might already exist)
            return self.test_superadmin_login()
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
            print(f"   Superadmin token obtained: {self.superadmin_token[:20]}...")
            return True
        return False

    def test_get_addon_by_slug_vastgoed_beheer(self):
        """Test GET /api/addons/{slug_or_id} with existing slug 'vastgoed_beheer'"""
        # No auth required for this public endpoint
        temp_token = self.superadmin_token
        self.superadmin_token = None
        
        success, response = self.run_test(
            "Get Addon by Slug - vastgoed_beheer",
            "GET",
            "addons/vastgoed_beheer",
            200
        )
        
        # Restore token
        self.superadmin_token = temp_token
        
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
        temp_token = self.superadmin_token
        self.superadmin_token = None
        
        success, response = self.run_test(
            "Get Addon by Slug - hrm",
            "GET",
            "addons/hrm",
            200
        )
        
        # Restore token
        self.superadmin_token = temp_token
        
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
        temp_token = self.superadmin_token
        self.superadmin_token = None
        
        success, response = self.run_test(
            "Get Addon by Non-existent Slug",
            "GET",
            "addons/non-existent-addon-slug",
            404  # Expect 404
        )
        
        # Restore token
        self.superadmin_token = temp_token
        
        if success:
            print("   ✅ Correctly returned 404 for non-existent addon")
            return True
        return False

    def test_create_addon_with_extra_fields(self):
        """Test creating addon with all extra fields as superadmin"""
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
            self.created_addon_id = response['id']
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
        if not self.created_addon_id:
            print("⚠️  Skipping addon update - no addon created")
            return True
            
        update_data = {
            "category": "Updated Analytics",
            "icon_name": "TrendingUp",
            "highlights": ["Updated Dashboard", "Advanced Rapporten", "Real-time Export", "New Feature"]
        }
        
        success, response = self.run_test(
            "Update Addon with Extra Fields",
            "PUT",
            f"admin/addons/{self.created_addon_id}",
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
        temp_token = self.superadmin_token
        self.superadmin_token = None
        
        success, response = self.run_test(
            "Get Updated Addon by Slug",
            "GET",
            "addons/test-module",
            200
        )
        
        # Restore token
        self.superadmin_token = temp_token
        
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

    def test_delete_addon_cleanup(self):
        """Test deleting add-on as superadmin (cleanup)"""
        if not self.created_addon_id:
            print("⚠️  Skipping add-on deletion - no add-on created")
            return True
            
        success, response = self.run_test(
            "Delete Test Addon (Cleanup)",
            "DELETE",
            f"admin/addons/{self.created_addon_id}",
            200
        )
        
        if success:
            print(f"   Deleted test addon: {self.created_addon_id}")
            return True
        return False

def main():
    print("🔧 Addon Module Detail Functionality Testing")
    print("=" * 50)
    
    tester = AddonModuleDetailTester()
    
    # Test sequence for addon module detail functionality
    tests = [
        ("Create/Login Superadmin", tester.test_create_superadmin_user),
        ("Get Addon by Slug - vastgoed_beheer", tester.test_get_addon_by_slug_vastgoed_beheer),
        ("Get Addon by Slug - hrm", tester.test_get_addon_by_slug_hrm),
        ("Get Addon by Non-existent Slug (404)", tester.test_get_addon_by_nonexistent_slug),
        ("Create Addon with Extra Fields", tester.test_create_addon_with_extra_fields),
        ("Update Addon with Extra Fields", tester.test_update_addon_with_extra_fields),
        ("Get Updated Addon by Slug", tester.test_get_updated_addon_by_slug),
        ("Delete Test Addon (Cleanup)", tester.test_delete_addon_cleanup),
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
    print("📊 ADDON MODULE DETAIL TEST RESULTS")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {len(failed_tests)}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("\n✅ All addon module detail tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())