"""
Suribet Retailer Management Module - Backend API Tests
Tests for: Machines, Werknemers, Kasboek, Loonbetalingen, Dashboard Stats
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"


class TestSuribetAuth:
    """Authentication for Suribet tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestSuribetDashboard(TestSuribetAuth):
    """Test Suribet Dashboard Stats API"""
    
    def test_get_dashboard_stats(self, auth_headers):
        """Test GET /api/suribet/dashboard/stats"""
        response = requests.get(
            f"{BASE_URL}/api/suribet/dashboard/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "month" in data
        assert "year" in data
        assert "machines" in data
        assert "omzet" in data
        assert "prestaties" in data
        assert "personeel" in data
        assert "kasboek" in data
        assert "netto_winst" in data
        
        # Verify machines structure
        assert "total" in data["machines"]
        assert "active" in data["machines"]
        
        print(f"Dashboard stats: {data}")
    
    def test_get_dashboard_stats_with_month_year(self, auth_headers):
        """Test GET /api/suribet/dashboard/stats with month/year params"""
        response = requests.get(
            f"{BASE_URL}/api/suribet/dashboard/stats?month=1&year=2026",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["month"] == 1
        assert data["year"] == 2026


class TestSuribetWisselkoersen(TestSuribetAuth):
    """Test Suribet Exchange Rates API"""
    
    def test_get_wisselkoersen(self, auth_headers):
        """Test GET /api/suribet/wisselkoersen"""
        response = requests.get(
            f"{BASE_URL}/api/suribet/wisselkoersen",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "eur_to_srd" in data
        assert "usd_to_srd" in data
        assert data["eur_to_srd"] > 0
        assert data["usd_to_srd"] > 0
        
        print(f"Exchange rates: EUR={data['eur_to_srd']}, USD={data['usd_to_srd']}")
    
    def test_update_wisselkoersen(self, auth_headers):
        """Test PUT /api/suribet/wisselkoersen"""
        response = requests.put(
            f"{BASE_URL}/api/suribet/wisselkoersen",
            headers=auth_headers,
            json={
                "eur_to_srd": 39.00,
                "usd_to_srd": 36.00
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["eur_to_srd"] == 39.00
        assert data["usd_to_srd"] == 36.00
        
        # Reset to default
        requests.put(
            f"{BASE_URL}/api/suribet/wisselkoersen",
            headers=auth_headers,
            json={"eur_to_srd": 38.50, "usd_to_srd": 35.50}
        )


class TestSuribetMachines(TestSuribetAuth):
    """Test Suribet Machines CRUD API"""
    
    created_machine_id = None
    
    def test_get_machines_empty(self, auth_headers):
        """Test GET /api/suribet/machines"""
        response = requests.get(
            f"{BASE_URL}/api/suribet/machines",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} machines")
    
    def test_create_machine(self, auth_headers):
        """Test POST /api/suribet/machines"""
        machine_data = {
            "machine_id": f"TEST-SB-{datetime.now().strftime('%H%M%S')}",
            "location": "Test Locatie ABC",
            "machine_type": "slot",
            "status": "active",
            "notes": "Test machine created by pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/suribet/machines",
            headers=auth_headers,
            json=machine_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["machine_id"] == machine_data["machine_id"]
        assert data["location"] == machine_data["location"]
        assert data["status"] == "active"
        
        TestSuribetMachines.created_machine_id = data["id"]
        print(f"Created machine: {data['id']}")
    
    def test_get_machines_after_create(self, auth_headers):
        """Verify machine was created"""
        response = requests.get(
            f"{BASE_URL}/api/suribet/machines",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find our created machine
        created = [m for m in data if m.get("id") == TestSuribetMachines.created_machine_id]
        assert len(created) == 1, "Created machine not found in list"
    
    def test_update_machine(self, auth_headers):
        """Test PUT /api/suribet/machines/{id}"""
        if not TestSuribetMachines.created_machine_id:
            pytest.skip("No machine created")
        
        response = requests.put(
            f"{BASE_URL}/api/suribet/machines/{TestSuribetMachines.created_machine_id}",
            headers=auth_headers,
            json={
                "location": "Updated Locatie XYZ",
                "status": "maintenance"
            }
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/suribet/machines",
            headers=auth_headers
        )
        machines = get_response.json()
        updated = [m for m in machines if m.get("id") == TestSuribetMachines.created_machine_id]
        assert len(updated) == 1
        assert updated[0]["location"] == "Updated Locatie XYZ"
        assert updated[0]["status"] == "maintenance"
    
    def test_delete_machine(self, auth_headers):
        """Test DELETE /api/suribet/machines/{id}"""
        if not TestSuribetMachines.created_machine_id:
            pytest.skip("No machine created")
        
        response = requests.delete(
            f"{BASE_URL}/api/suribet/machines/{TestSuribetMachines.created_machine_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/suribet/machines",
            headers=auth_headers
        )
        machines = get_response.json()
        deleted = [m for m in machines if m.get("id") == TestSuribetMachines.created_machine_id]
        assert len(deleted) == 0, "Machine was not deleted"


class TestSuribetWerknemers(TestSuribetAuth):
    """Test Suribet Werknemers (Employees) CRUD API"""
    
    created_werknemer_id = None
    
    def test_get_werknemers(self, auth_headers):
        """Test GET /api/suribet/werknemers"""
        response = requests.get(
            f"{BASE_URL}/api/suribet/werknemers",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} werknemers")
    
    def test_create_werknemer(self, auth_headers):
        """Test POST /api/suribet/werknemers"""
        werknemer_data = {
            "name": f"Test Werknemer {datetime.now().strftime('%H%M%S')}",
            "function": "Kassier",
            "hourly_rate": 25.00,
            "daily_rate": 200.00,
            "status": "active",
            "phone": "+597 123 4567",
            "address": "Test Straat 123",
            "notes": "Test werknemer created by pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/suribet/werknemers",
            headers=auth_headers,
            json=werknemer_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["name"] == werknemer_data["name"]
        assert data["function"] == "Kassier"
        assert data["hourly_rate"] == 25.00
        
        TestSuribetWerknemers.created_werknemer_id = data["id"]
        print(f"Created werknemer: {data['id']}")
    
    def test_update_werknemer(self, auth_headers):
        """Test PUT /api/suribet/werknemers/{id}"""
        if not TestSuribetWerknemers.created_werknemer_id:
            pytest.skip("No werknemer created")
        
        response = requests.put(
            f"{BASE_URL}/api/suribet/werknemers/{TestSuribetWerknemers.created_werknemer_id}",
            headers=auth_headers,
            json={
                "function": "Manager",
                "hourly_rate": 35.00
            }
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/suribet/werknemers",
            headers=auth_headers
        )
        werknemers = get_response.json()
        updated = [w for w in werknemers if w.get("id") == TestSuribetWerknemers.created_werknemer_id]
        assert len(updated) == 1
        assert updated[0]["function"] == "Manager"
        assert updated[0]["hourly_rate"] == 35.00
    
    def test_delete_werknemer(self, auth_headers):
        """Test DELETE /api/suribet/werknemers/{id}"""
        if not TestSuribetWerknemers.created_werknemer_id:
            pytest.skip("No werknemer created")
        
        response = requests.delete(
            f"{BASE_URL}/api/suribet/werknemers/{TestSuribetWerknemers.created_werknemer_id}",
            headers=auth_headers
        )
        assert response.status_code == 200


class TestSuribetKasboek(TestSuribetAuth):
    """Test Suribet Kasboek (Cash Book) CRUD API"""
    
    created_entry_id = None
    
    def test_get_kasboek(self, auth_headers):
        """Test GET /api/suribet/kasboek"""
        response = requests.get(
            f"{BASE_URL}/api/suribet/kasboek",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} kasboek entries")
    
    def test_create_kasboek_income(self, auth_headers):
        """Test POST /api/suribet/kasboek - income entry"""
        entry_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "transaction_type": "income",
            "category": "commissie",
            "amount": 500.00,
            "currency": "SRD",
            "description": "Test commissie inkomsten"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/suribet/kasboek",
            headers=auth_headers,
            json=entry_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["transaction_type"] == "income"
        assert data["amount"] == 500.00
        
        TestSuribetKasboek.created_entry_id = data["id"]
        print(f"Created kasboek entry: {data['id']}")
    
    def test_create_kasboek_expense(self, auth_headers):
        """Test POST /api/suribet/kasboek - expense entry"""
        entry_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "transaction_type": "expense",
            "category": "onderhoud",
            "amount": 150.00,
            "currency": "SRD",
            "description": "Test onderhoud kosten"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/suribet/kasboek",
            headers=auth_headers,
            json=entry_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["transaction_type"] == "expense"
    
    def test_get_kasboek_with_filters(self, auth_headers):
        """Test GET /api/suribet/kasboek with month/year filters"""
        now = datetime.now()
        response = requests.get(
            f"{BASE_URL}/api/suribet/kasboek?month={now.month}&year={now.year}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_kasboek_entry(self, auth_headers):
        """Test DELETE /api/suribet/kasboek/{id}"""
        if not TestSuribetKasboek.created_entry_id:
            pytest.skip("No entry created")
        
        response = requests.delete(
            f"{BASE_URL}/api/suribet/kasboek/{TestSuribetKasboek.created_entry_id}",
            headers=auth_headers
        )
        assert response.status_code == 200


class TestSuribetLoonbetalingen(TestSuribetAuth):
    """Test Suribet Loonbetalingen (Payroll) API"""
    
    created_betaling_id = None
    test_werknemer_id = None
    
    def test_create_werknemer_for_loon(self, auth_headers):
        """Create a werknemer for loonbetaling test"""
        werknemer_data = {
            "name": f"Loon Test Werknemer {datetime.now().strftime('%H%M%S')}",
            "function": "Kassier",
            "hourly_rate": 25.00,
            "daily_rate": 200.00,
            "status": "active"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/suribet/werknemers",
            headers=auth_headers,
            json=werknemer_data
        )
        assert response.status_code == 200
        data = response.json()
        TestSuribetLoonbetalingen.test_werknemer_id = data["id"]
    
    def test_get_loonbetalingen(self, auth_headers):
        """Test GET /api/suribet/loonbetalingen"""
        response = requests.get(
            f"{BASE_URL}/api/suribet/loonbetalingen",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} loonbetalingen")
    
    def test_create_loonbetaling(self, auth_headers):
        """Test POST /api/suribet/loonbetalingen"""
        if not TestSuribetLoonbetalingen.test_werknemer_id:
            pytest.skip("No werknemer created")
        
        now = datetime.now()
        betaling_data = {
            "employee_id": TestSuribetLoonbetalingen.test_werknemer_id,
            "date": now.strftime("%Y-%m-%d"),
            "period_start": f"{now.year}-{now.month:02d}-01",
            "period_end": f"{now.year}-{now.month:02d}-15",
            "hours_worked": 80,
            "days_worked": 10,
            "base_amount": 2000.00,
            "bonus": 100.00,
            "deductions": 50.00,
            "advance_payment": 200.00,
            "notes": "Test loonbetaling"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/suribet/loonbetalingen",
            headers=auth_headers,
            json=betaling_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["base_amount"] == 2000.00
        # Net amount = base + bonus - deductions - advance = 2000 + 100 - 50 - 200 = 1850
        assert data["net_amount"] == 1850.00
        
        TestSuribetLoonbetalingen.created_betaling_id = data["id"]
        print(f"Created loonbetaling: {data['id']}, net_amount: {data['net_amount']}")
    
    def test_loonbetaling_creates_kasboek_entry(self, auth_headers):
        """Verify loonbetaling creates a kasboek expense entry"""
        response = requests.get(
            f"{BASE_URL}/api/suribet/kasboek",
            headers=auth_headers
        )
        assert response.status_code == 200
        entries = response.json()
        
        # Find loon entries
        loon_entries = [e for e in entries if e.get("category") == "loon"]
        assert len(loon_entries) > 0, "No loon entries found in kasboek"
        print(f"Found {len(loon_entries)} loon entries in kasboek")
    
    def test_delete_loonbetaling(self, auth_headers):
        """Test DELETE /api/suribet/loonbetalingen/{id}"""
        if not TestSuribetLoonbetalingen.created_betaling_id:
            pytest.skip("No betaling created")
        
        response = requests.delete(
            f"{BASE_URL}/api/suribet/loonbetalingen/{TestSuribetLoonbetalingen.created_betaling_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_cleanup_werknemer(self, auth_headers):
        """Cleanup test werknemer"""
        if TestSuribetLoonbetalingen.test_werknemer_id:
            requests.delete(
                f"{BASE_URL}/api/suribet/werknemers/{TestSuribetLoonbetalingen.test_werknemer_id}",
                headers=auth_headers
            )


class TestSuribetDagstaten(TestSuribetAuth):
    """Test Suribet Dagstaten (Daily Statements) API"""
    
    test_machine_id = None
    created_dagstaat_id = None
    
    def test_create_machine_for_dagstaat(self, auth_headers):
        """Create a machine for dagstaat test"""
        machine_data = {
            "machine_id": f"DS-TEST-{datetime.now().strftime('%H%M%S')}",
            "location": "Dagstaat Test Locatie",
            "machine_type": "slot",
            "status": "active"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/suribet/machines",
            headers=auth_headers,
            json=machine_data
        )
        assert response.status_code == 200
        data = response.json()
        TestSuribetDagstaten.test_machine_id = data["machine_id"]
    
    def test_get_dagstaten(self, auth_headers):
        """Test GET /api/suribet/dagstaten"""
        response = requests.get(
            f"{BASE_URL}/api/suribet/dagstaten",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_dagstaat(self, auth_headers):
        """Test POST /api/suribet/dagstaten"""
        if not TestSuribetDagstaten.test_machine_id:
            pytest.skip("No machine created")
        
        dagstaat_data = {
            "machine_id": TestSuribetDagstaten.test_machine_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "beginsaldo_srd": 1000.00,
            "eindsaldo_srd": 1500.00,
            "omzet": 2000.00,
            "suribet_percentage": 80,
            "notes": "Test dagstaat"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/suribet/dagstaten",
            headers=auth_headers,
            json=dagstaat_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["omzet"] == 2000.00
        # Suribet deel = 2000 * 0.80 = 1600
        assert data["suribet_deel"] == 1600.00
        # Commissie = 2000 * 0.20 = 400
        assert data["commissie"] == 400.00
        assert data["status"] == "winst"
        
        TestSuribetDagstaten.created_dagstaat_id = data["id"]
        print(f"Created dagstaat: {data['id']}")
    
    def test_delete_dagstaat(self, auth_headers):
        """Test DELETE /api/suribet/dagstaten/{id}"""
        if not TestSuribetDagstaten.created_dagstaat_id:
            pytest.skip("No dagstaat created")
        
        response = requests.delete(
            f"{BASE_URL}/api/suribet/dagstaten/{TestSuribetDagstaten.created_dagstaat_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_cleanup_machine(self, auth_headers):
        """Cleanup test machine"""
        # Get machine by machine_id and delete
        response = requests.get(
            f"{BASE_URL}/api/suribet/machines",
            headers=auth_headers
        )
        machines = response.json()
        test_machine = [m for m in machines if m.get("machine_id") == TestSuribetDagstaten.test_machine_id]
        if test_machine:
            requests.delete(
                f"{BASE_URL}/api/suribet/machines/{test_machine[0]['id']}",
                headers=auth_headers
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
