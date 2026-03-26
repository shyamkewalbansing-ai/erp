"""
Regression tests for auto-billing engine in kiosk.py
Tests the list_tenants endpoint's billing side-effects.
"""
import pytest
import jwt
from datetime import datetime, timezone
from pymongo import MongoClient
import requests
import os
import uuid

API_URL = os.environ.get("API_URL", "https://tenant-face-enroll.preview.emergentagent.com")
JWT_SECRET = "suri-rentals-secure-jwt-secret-2024"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "erp_db"


def get_db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


def make_token(company_id):
    return jwt.encode(
        {"company_id": company_id, "exp": datetime(2026, 12, 31, tzinfo=timezone.utc), "iat": datetime.now(timezone.utc)},
        JWT_SECRET, algorithm="HS256"
    )


def create_test_company(db, billing_day=24, billing_next_month=False, fine_amount=250.0):
    company_id = f"test-{uuid.uuid4().hex[:8]}"
    import bcrypt
    db.kiosk_companies.insert_one({
        "company_id": company_id,
        "name": f"Test Co {company_id}",
        "email": f"{company_id}@test.sr",
        "password": bcrypt.hashpw("test".encode(), bcrypt.gensalt()).decode(),
        "billing_day": billing_day,
        "billing_next_month": billing_next_month,
        "fine_amount": fine_amount,
        "created_at": datetime.now(timezone.utc)
    })
    return company_id


def create_test_tenant(db, company_id, name, monthly_rent, outstanding_rent, fines, billed_through, last_fine_month=""):
    tenant_id = f"test-{uuid.uuid4().hex[:8]}"
    db.kiosk_tenants.insert_one({
        "tenant_id": tenant_id,
        "company_id": company_id,
        "name": name,
        "apartment_id": "apt-test",
        "apartment_number": "TEST",
        "tenant_code": "TTEST",
        "monthly_rent": monthly_rent,
        "outstanding_rent": outstanding_rent,
        "fines": fines,
        "rent_billed_through": billed_through,
        "last_fine_month": last_fine_month,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    })
    return tenant_id


def call_list_tenants(token):
    resp = requests.get(f"{API_URL}/api/kiosk/admin/tenants", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    return resp.json()


def cleanup(db, company_id):
    db.kiosk_tenants.delete_many({"company_id": company_id})
    db.kiosk_companies.delete_many({"company_id": company_id})


class TestBillingDezelfdeMaand:
    """Tests for billing_next_month=False (Dezelfde maand)
    Due date for a period = same month's billing_day.
    After the due date: next month's rent is added.
    """

    def setup_method(self):
        self.db = get_db()
        self.company_id = create_test_company(self.db, billing_day=24, billing_next_month=False, fine_amount=250.0)
        self.token = make_token(self.company_id)

    def teardown_method(self):
        cleanup(self.db, self.company_id)

    def test_billing_with_outstanding_and_fine(self):
        """Tenant with outstanding rent, due date passed -> fine + new rent"""
        create_test_tenant(self.db, self.company_id, "T1", 1000.0, 500.0, 0.0, "2026-02")
        result = call_list_tenants(self.token)
        t = result[0]
        # Feb due Feb 24 (passed) -> bill March. Mar due Mar 24 (today) -> bill April.
        assert t["outstanding_rent"] == 2500.0  # 500 + 2 * 1000
        assert t["fines"] == 250.0
        assert t["rent_billed_through"] == "2026-04"

    def test_billing_no_outstanding(self):
        """Tenant with 0 outstanding -> no fine, rent still added"""
        create_test_tenant(self.db, self.company_id, "T2", 1000.0, 0.0, 0.0, "2026-02")
        result = call_list_tenants(self.token)
        t = result[0]
        assert t["outstanding_rent"] == 2000.0  # 0 + 2 * 1000
        assert t["fines"] == 0.0
        assert t["rent_billed_through"] == "2026-04"

    def test_billing_current_month_with_outstanding(self):
        """billed_through=current month, outstanding > 0, due today -> fine + bill next"""
        create_test_tenant(self.db, self.company_id, "T3", 1000.0, 1000.0, 0.0, "2026-03")
        result = call_list_tenants(self.token)
        t = result[0]
        # March due March 24 (today) -> bill April
        assert t["outstanding_rent"] == 2000.0  # 1000 + 1000
        assert t["fines"] == 250.0  # Fine for overdue March
        assert t["rent_billed_through"] == "2026-04"

    def test_idempotency(self):
        """Calling twice should not double-bill"""
        create_test_tenant(self.db, self.company_id, "T4", 1000.0, 500.0, 0.0, "2026-02")
        r1 = call_list_tenants(self.token)
        r2 = call_list_tenants(self.token)
        assert r1[0]["outstanding_rent"] == r2[0]["outstanding_rent"]
        assert r1[0]["fines"] == r2[0]["fines"]
        assert r1[0]["rent_billed_through"] == r2[0]["rent_billed_through"]


class TestBillingVolgendeMaand:
    """Tests for billing_next_month=True (Volgende maand)
    Due date for a period = next month's billing_day.
    E.g., Feb rent due March 24.
    """

    def setup_method(self):
        self.db = get_db()
        self.company_id = create_test_company(self.db, billing_day=24, billing_next_month=True, fine_amount=250.0)
        self.token = make_token(self.company_id)

    def teardown_method(self):
        cleanup(self.db, self.company_id)

    def test_billing_with_outstanding(self):
        """billed_through=Feb, outstanding=500. Feb rent due Mar 24 (today) -> bill March + fine"""
        create_test_tenant(self.db, self.company_id, "T5", 1000.0, 500.0, 0.0, "2026-02")
        result = call_list_tenants(self.token)
        t = result[0]
        # Mar 24 = due date for Feb -> bill March
        assert t["outstanding_rent"] == 1500.0  # 500 + 1000
        assert t["fines"] == 250.0
        assert t["rent_billed_through"] == "2026-03"

    def test_billing_catch_up(self):
        """billed_through=Jan, outstanding=1000. Jan due Feb 24 (passed), Feb due Mar 24 (today)"""
        create_test_tenant(self.db, self.company_id, "T6", 1000.0, 1000.0, 0.0, "2026-01")
        result = call_list_tenants(self.token)
        t = result[0]
        # Bill Feb + March
        assert t["outstanding_rent"] == 3000.0  # 1000 + 2 * 1000
        assert t["fines"] == 250.0  # Fine for Jan unpaid
        assert t["rent_billed_through"] == "2026-03"

    def test_no_billing_when_not_due(self):
        """billed_through=March. April due April 24 (future) -> nothing happens"""
        create_test_tenant(self.db, self.company_id, "T7", 1000.0, 1000.0, 0.0, "2026-03")
        result = call_list_tenants(self.token)
        t = result[0]
        assert t["outstanding_rent"] == 1000.0  # No change
        assert t["fines"] == 0.0  # Due April 24, not yet
        assert t["rent_billed_through"] == "2026-03"

    def test_idempotency(self):
        """Calling twice should not double-bill"""
        create_test_tenant(self.db, self.company_id, "T8", 1000.0, 500.0, 0.0, "2026-02")
        r1 = call_list_tenants(self.token)
        r2 = call_list_tenants(self.token)
        assert r1[0]["outstanding_rent"] == r2[0]["outstanding_rent"]
        assert r1[0]["fines"] == r2[0]["fines"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
