"""
Test suite for Outstanding Balance Warning Feature (Feature 8)
Tests the updated outstanding warning in Payments page:
1. Warning stays visible until balance is FULLY paid
2. Partial payments are tracked and shown
3. Shows amount paid vs remaining per month
4. Month selector shows ⚡ symbol with remaining amount for partially paid months
5. Outstanding months list shows different styling for partial vs unpaid
6. Summary counts show unpaid_count and partial_count separately
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://finance-suite-16.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "uitest2@test.com"
TEST_PASSWORD = "test123"


class TestOutstandingWarningFeature:
    """Test the Outstanding Balance Warning feature with partial payment tracking"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Store created resources for cleanup
        self.created_tenant_id = None
        self.created_apartment_id = None
        self.created_payment_ids = []
        
        yield
        
        # Cleanup
        self._cleanup()
    
    def _cleanup(self):
        """Clean up test data"""
        # Delete payments
        for payment_id in self.created_payment_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/payments/{payment_id}")
            except Exception:
                pass
        
        # Remove tenant from apartment
        if self.created_apartment_id:
            try:
                self.session.post(f"{BASE_URL}/api/apartments/{self.created_apartment_id}/remove-tenant")
            except Exception:
                pass
        
        # Delete apartment
        if self.created_apartment_id:
            try:
                self.session.delete(f"{BASE_URL}/api/apartments/{self.created_apartment_id}")
            except Exception:
                pass
        
        # Delete tenant
        if self.created_tenant_id:
            try:
                self.session.delete(f"{BASE_URL}/api/tenants/{self.created_tenant_id}")
            except Exception:
                pass
    
    def _create_test_tenant(self, name="TEST_Outstanding_Tenant"):
        """Create a test tenant"""
        response = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": name,
            "phone": "123456789",
            "email": "testoutstanding@test.com"
        })
        assert response.status_code == 200, f"Failed to create tenant: {response.text}"
        tenant = response.json()
        self.created_tenant_id = tenant["id"]
        return tenant
    
    def _create_test_apartment(self, rent_amount=1500.0, name="TEST_Outstanding_Apt"):
        """Create a test apartment"""
        response = self.session.post(f"{BASE_URL}/api/apartments", json={
            "name": name,
            "address": "Test Address 123",
            "rent_amount": rent_amount,
            "bedrooms": 2,
            "bathrooms": 1
        })
        assert response.status_code == 200, f"Failed to create apartment: {response.text}"
        apt = response.json()
        self.created_apartment_id = apt["id"]
        return apt
    
    def _assign_tenant_to_apartment(self, tenant_id, apartment_id):
        """Assign tenant to apartment"""
        response = self.session.post(
            f"{BASE_URL}/api/apartments/{apartment_id}/assign-tenant",
            params={"tenant_id": tenant_id}
        )
        assert response.status_code == 200, f"Failed to assign tenant: {response.text}"
    
    def _create_payment(self, tenant_id, apartment_id, amount, month, year):
        """Create a rent payment"""
        response = self.session.post(f"{BASE_URL}/api/payments", json={
            "tenant_id": tenant_id,
            "apartment_id": apartment_id,
            "amount": amount,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "period_month": month,
            "period_year": year
        })
        assert response.status_code == 200, f"Failed to create payment: {response.text}"
        payment = response.json()
        self.created_payment_ids.append(payment["id"])
        return payment
    
    # ==================== FEATURE 1: Warning stays visible until FULLY paid ====================
    
    def test_warning_shows_for_unpaid_month(self):
        """Feature 1: Warning shows when tenant has unpaid months"""
        tenant = self._create_test_tenant("TEST_F1_Unpaid")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F1_Apt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        assert data["has_outstanding"], "Warning should show for unpaid month"
        print("✓ Feature 1: Warning shows for unpaid month")
    
    def test_warning_shows_for_partially_paid_month(self):
        """Feature 1: Warning shows when tenant has partially paid months"""
        tenant = self._create_test_tenant("TEST_F1_Partial")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F1_PartialApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Create partial payment (500 of 1500)
        self._create_payment(tenant["id"], apt["id"], 500.0, current_month, current_year)
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        assert data["has_outstanding"], "Warning should STILL show for partially paid month"
        assert data["outstanding_amount"] == 1000.0, "Outstanding should be 1000 (1500-500)"
        print("✓ Feature 1: Warning stays visible for partially paid month")
    
    def test_warning_disappears_when_fully_paid(self):
        """Feature 1: Warning disappears only when balance is FULLY paid"""
        tenant = self._create_test_tenant("TEST_F1_FullPay")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F1_FullPayApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Create full payment
        self._create_payment(tenant["id"], apt["id"], 1500.0, current_month, current_year)
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        # Current month should not be in outstanding
        current_month_entry = next(
            (m for m in data["outstanding_months"] if m["month"] == current_month and m["year"] == current_year),
            None
        )
        assert current_month_entry is None, "Fully paid month should not be in outstanding"
        print("✓ Feature 1: Warning disappears when fully paid")
    
    # ==================== FEATURE 2: Total outstanding includes partial remainders ====================
    
    def test_total_outstanding_includes_partial_remainders(self):
        """Feature 2: Total outstanding amount includes partial payment remainders"""
        tenant = self._create_test_tenant("TEST_F2_Total")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F2_TotalApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Create partial payment of 500 (remaining 1000)
        self._create_payment(tenant["id"], apt["id"], 500.0, current_month, current_year)
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        # Total outstanding should be 1000 (the remaining amount)
        assert data["outstanding_amount"] == 1000.0, f"Total outstanding should be 1000, got {data['outstanding_amount']}"
        print("✓ Feature 2: Total outstanding correctly includes partial remainder (1000)")
    
    # ==================== FEATURE 3: Partial payments section shows details ====================
    
    def test_partial_payments_list_exists(self):
        """Feature 3: partial_payments list exists in response"""
        tenant = self._create_test_tenant("TEST_F3_List")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F3_ListApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        assert "partial_payments" in data, "Response should have 'partial_payments' field"
        assert isinstance(data["partial_payments"], list), "partial_payments should be a list"
        print("✓ Feature 3: partial_payments list exists in response")
    
    def test_partial_payments_shows_amount_paid_and_remaining(self):
        """Feature 3: Each partial payment shows amount_paid and remaining"""
        tenant = self._create_test_tenant("TEST_F3_Details")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F3_DetailsApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Create partial payment
        self._create_payment(tenant["id"], apt["id"], 500.0, current_month, current_year)
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        assert len(data["partial_payments"]) > 0, "Should have partial payments"
        
        partial = data["partial_payments"][0]
        assert "amount_paid" in partial, "Partial payment should have 'amount_paid'"
        assert "remaining" in partial, "Partial payment should have 'remaining'"
        assert partial["amount_paid"] == 500.0, f"amount_paid should be 500, got {partial['amount_paid']}"
        assert partial["remaining"] == 1000.0, f"remaining should be 1000, got {partial['remaining']}"
        print(f"✓ Feature 3: Partial payment shows amount_paid={partial['amount_paid']}, remaining={partial['remaining']}")
    
    def test_partial_payments_has_label(self):
        """Feature 3: Each partial payment has a label (e.g., 'Januari 2026')"""
        tenant = self._create_test_tenant("TEST_F3_Label")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F3_LabelApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        self._create_payment(tenant["id"], apt["id"], 500.0, current_month, current_year)
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        partial = data["partial_payments"][0]
        assert "label" in partial, "Partial payment should have 'label'"
        assert str(current_year) in partial["label"], f"Label should contain year {current_year}"
        print(f"✓ Feature 3: Partial payment has label: {partial['label']}")
    
    # ==================== FEATURE 4: Month selector shows ⚡ for partial ====================
    
    def test_outstanding_month_has_status_partial(self):
        """Feature 4: Outstanding month has status='partial' for partially paid"""
        tenant = self._create_test_tenant("TEST_F4_Status")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F4_StatusApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        self._create_payment(tenant["id"], apt["id"], 500.0, current_month, current_year)
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        # Find current month in outstanding_months
        month_entry = next(
            (m for m in data["outstanding_months"] if m["month"] == current_month and m["year"] == current_year),
            None
        )
        
        assert month_entry is not None, "Current month should be in outstanding_months"
        assert month_entry["status"] == "partial", f"Status should be 'partial', got {month_entry['status']}"
        print("✓ Feature 4: Outstanding month has status='partial'")
    
    def test_outstanding_month_has_remaining_amount(self):
        """Feature 4: Outstanding month has remaining amount for ⚡ display"""
        tenant = self._create_test_tenant("TEST_F4_Remaining")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F4_RemainingApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        self._create_payment(tenant["id"], apt["id"], 500.0, current_month, current_year)
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        month_entry = next(
            (m for m in data["outstanding_months"] if m["month"] == current_month and m["year"] == current_year),
            None
        )
        
        assert "remaining" in month_entry, "Month entry should have 'remaining' field"
        assert month_entry["remaining"] == 1000.0, f"Remaining should be 1000, got {month_entry['remaining']}"
        print(f"✓ Feature 4: Outstanding month has remaining={month_entry['remaining']} for ⚡ display")
    
    # ==================== FEATURE 5: Different styling for partial vs unpaid ====================
    
    def test_unpaid_month_has_status_unpaid(self):
        """Feature 5: Unpaid month has status='unpaid'"""
        tenant = self._create_test_tenant("TEST_F5_Unpaid")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F5_UnpaidApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        # No payment - should be unpaid
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        month_entry = next(
            (m for m in data["outstanding_months"] if m["month"] == current_month and m["year"] == current_year),
            None
        )
        
        assert month_entry is not None, "Current month should be in outstanding"
        assert month_entry["status"] == "unpaid", f"Status should be 'unpaid', got {month_entry['status']}"
        print("✓ Feature 5: Unpaid month has status='unpaid'")
    
    def test_status_distinguishes_partial_from_unpaid(self):
        """Feature 5: Status correctly distinguishes partial from unpaid"""
        tenant = self._create_test_tenant("TEST_F5_Distinguish")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F5_DistinguishApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # First check - no payment, should be unpaid
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        month_entry = next(
            (m for m in data["outstanding_months"] if m["month"] == current_month and m["year"] == current_year),
            None
        )
        assert month_entry["status"] == "unpaid", "Should be 'unpaid' before any payment"
        
        # Now add partial payment
        self._create_payment(tenant["id"], apt["id"], 500.0, current_month, current_year)
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        month_entry = next(
            (m for m in data["outstanding_months"] if m["month"] == current_month and m["year"] == current_year),
            None
        )
        assert month_entry["status"] == "partial", "Should be 'partial' after partial payment"
        print("✓ Feature 5: Status correctly changes from 'unpaid' to 'partial'")
    
    # ==================== FEATURE 6: Summary counts ====================
    
    def test_unpaid_count_in_response(self):
        """Feature 6: Response includes unpaid_count"""
        tenant = self._create_test_tenant("TEST_F6_UnpaidCount")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F6_UnpaidCountApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        assert "unpaid_count" in data, "Response should have 'unpaid_count'"
        assert data["unpaid_count"] >= 1, "Should have at least 1 unpaid month"
        print(f"✓ Feature 6: unpaid_count={data['unpaid_count']}")
    
    def test_partial_count_in_response(self):
        """Feature 6: Response includes partial_count"""
        tenant = self._create_test_tenant("TEST_F6_PartialCount")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F6_PartialCountApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        self._create_payment(tenant["id"], apt["id"], 500.0, current_month, current_year)
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        assert "partial_count" in data, "Response should have 'partial_count'"
        assert data["partial_count"] >= 1, "Should have at least 1 partial month"
        print(f"✓ Feature 6: partial_count={data['partial_count']}")
    
    def test_counts_are_separate(self):
        """Feature 6: unpaid_count and partial_count are calculated separately"""
        tenant = self._create_test_tenant("TEST_F6_Separate")
        apt = self._create_test_apartment(rent_amount=1500.0, name="TEST_F6_SeparateApt")
        self._assign_tenant_to_apartment(tenant["id"], apt["id"])
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Create partial payment for current month
        self._create_payment(tenant["id"], apt["id"], 500.0, current_month, current_year)
        
        response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        data = response.json()
        
        # Verify counts are separate
        total_outstanding = len(data["outstanding_months"])
        assert data["unpaid_count"] + data["partial_count"] == total_outstanding, \
            f"unpaid_count ({data['unpaid_count']}) + partial_count ({data['partial_count']}) should equal total ({total_outstanding})"
        
        print(f"✓ Feature 6: Counts are separate - unpaid={data['unpaid_count']}, partial={data['partial_count']}, total={total_outstanding}")


class TestOutstandingWarningScenario:
    """Test the specific scenario from the requirements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code}")
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        self.created_tenant_id = None
        self.created_apartment_id = None
        self.created_payment_ids = []
        
        yield
        
        # Cleanup
        for payment_id in self.created_payment_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/payments/{payment_id}")
            except Exception:
                pass
        
        if self.created_apartment_id:
            try:
                self.session.post(f"{BASE_URL}/api/apartments/{self.created_apartment_id}/remove-tenant")
                self.session.delete(f"{BASE_URL}/api/apartments/{self.created_apartment_id}")
            except Exception:
                pass
        
        if self.created_tenant_id:
            try:
                self.session.delete(f"{BASE_URL}/api/tenants/{self.created_tenant_id}")
            except Exception:
                pass
    
    def test_scenario_1500_rent_500_partial(self):
        """
        Test scenario from requirements:
        1) Create tenant+apartment with 1500 SRD rent
        2) Create partial payment of 500 for current month
        3) Verify warning shows: total outstanding 1000, partial_count=1
        4) Verify partial payment details show correctly
        """
        # Step 1: Create tenant and apartment with 1500 SRD rent
        tenant_response = self.session.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Scenario_Tenant",
            "phone": "123456789"
        })
        assert tenant_response.status_code == 200
        tenant = tenant_response.json()
        self.created_tenant_id = tenant["id"]
        
        apt_response = self.session.post(f"{BASE_URL}/api/apartments", json={
            "name": "TEST_Scenario_Apt",
            "address": "Test Address",
            "rent_amount": 1500.0
        })
        assert apt_response.status_code == 200
        apt = apt_response.json()
        self.created_apartment_id = apt["id"]
        
        # Assign tenant
        assign_response = self.session.post(
            f"{BASE_URL}/api/apartments/{apt['id']}/assign-tenant",
            params={"tenant_id": tenant["id"]}
        )
        assert assign_response.status_code == 200
        
        # Step 2: Create partial payment of 500 for current month
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        payment_response = self.session.post(f"{BASE_URL}/api/payments", json={
            "tenant_id": tenant["id"],
            "apartment_id": apt["id"],
            "amount": 500.0,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_type": "rent",
            "period_month": current_month,
            "period_year": current_year
        })
        assert payment_response.status_code == 200
        payment = payment_response.json()
        self.created_payment_ids.append(payment["id"])
        
        # Step 3: Verify outstanding warning
        outstanding_response = self.session.get(f"{BASE_URL}/api/tenants/{tenant['id']}/outstanding")
        assert outstanding_response.status_code == 200
        data = outstanding_response.json()
        
        # Verify has_outstanding is True
        assert data["has_outstanding"], "Should have outstanding balance"
        
        # Verify total outstanding is 1000 (1500 - 500)
        assert data["outstanding_amount"] == 1000.0, f"Outstanding should be 1000, got {data['outstanding_amount']}"
        
        # Verify partial_count is at least 1
        assert data["partial_count"] >= 1, f"partial_count should be >= 1, got {data['partial_count']}"
        
        # Step 4: Verify partial payment details
        assert len(data["partial_payments"]) >= 1, "Should have partial payments"
        
        # Find current month in partial payments
        current_partial = next(
            (p for p in data["partial_payments"] if p["month"] == current_month and p["year"] == current_year),
            None
        )
        
        assert current_partial is not None, "Current month should be in partial_payments"
        assert current_partial["amount_paid"] == 500.0, f"amount_paid should be 500, got {current_partial['amount_paid']}"
        assert current_partial["remaining"] == 1000.0, f"remaining should be 1000, got {current_partial['remaining']}"
        
        # Verify label format (e.g., "Januari 2026")
        months_nl = ['', 'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                     'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']
        expected_label = f"{months_nl[current_month]} {current_year}"
        assert current_partial["label"] == expected_label, f"Label should be '{expected_label}', got '{current_partial['label']}'"
        
        print("✓ Scenario test passed:")
        print("  - Rent: 1500 SRD")
        print("  - Partial payment: 500 SRD")
        print(f"  - Outstanding: {data['outstanding_amount']} SRD")
        print(f"  - partial_count: {data['partial_count']}")
        print(f"  - Partial details: {current_partial['label']}: {current_partial['amount_paid']} betaald, {current_partial['remaining']} nog open")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
