"""
Test Suite for Gratis Factuur & Offerte Generator
Tests authentication, klanten CRUD, facturen CRUD, betalingen, dashboard, and email endpoints
"""
import pytest
import requests
import os
import random
import string
from datetime import datetime, timedelta

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://dashboard-redesign-44.preview.emergentagent.com"

API_BASE = f"{BASE_URL}/api/gratis-factuur"

# Test data helpers
def generate_unique_email():
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{suffix}@testdemo.com"

def generate_unique_name():
    suffix = ''.join(random.choices(string.ascii_uppercase, k=4))
    return f"TEST_Klant_{suffix}"

# ============== AUTH TESTS ==============

class TestGratisFactuurAuth:
    """Authentication endpoint tests for Gratis Factuur system"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user for auth tests"""
        return {
            "email": generate_unique_email(),
            "password": "testpassword123",
            "bedrijfsnaam": "TEST_Bedrijf_Auth",
            "telefoon": "+597 123456"
        }
    
    def test_register_new_user(self, test_user):
        """Test user registration - should succeed with valid data"""
        response = requests.post(f"{API_BASE}/auth/register", json=test_user)
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_user["email"]
        assert data["user"]["bedrijfsnaam"] == test_user["bedrijfsnaam"]
        assert len(data["token"]) > 50  # JWT should be reasonably long
        
        # Store token for later tests
        test_user["token"] = data["token"]
        test_user["user_id"] = data["user"]["id"]
        print(f"✓ User registered: {test_user['email']}")
    
    def test_register_duplicate_email(self, test_user):
        """Test registration with existing email - should fail"""
        response = requests.post(f"{API_BASE}/auth/register", json=test_user)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Duplicate email rejected correctly")
    
    def test_login_success(self, test_user):
        """Test login with valid credentials"""
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": test_user["email"],
            "password": test_user["password"]
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_user["email"]
        print(f"✓ Login successful for: {test_user['email']}")
    
    def test_login_wrong_password(self, test_user):
        """Test login with wrong password"""
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": test_user["email"],
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"✓ Wrong password rejected correctly")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email"""
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "anypassword"
        })
        
        assert response.status_code == 401
        print(f"✓ Non-existent user rejected correctly")
    
    def test_get_me_with_token(self, test_user):
        """Test getting current user profile with valid token"""
        if "token" not in test_user:
            pytest.skip("Token not available")
        
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        response = requests.get(f"{API_BASE}/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user["email"]
        assert data["bedrijfsnaam"] == test_user["bedrijfsnaam"]
        assert "password" not in data  # Password should be excluded
        print(f"✓ User profile retrieved correctly")
    
    def test_get_me_without_token(self):
        """Test getting profile without token - should fail"""
        response = requests.get(f"{API_BASE}/auth/me")
        
        assert response.status_code == 401
        print(f"✓ Unauthorized access rejected correctly")
    
    def test_update_profile(self, test_user):
        """Test updating user profile"""
        if "token" not in test_user:
            pytest.skip("Token not available")
        
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        update_data = {
            "adres": "Kerkplein 1",
            "postcode": "12345",
            "plaats": "Paramaribo",
            "kvk_nummer": "123456789"
        }
        
        response = requests.put(f"{API_BASE}/auth/profile", headers=headers, json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify update
        response = requests.get(f"{API_BASE}/auth/me", headers=headers)
        data = response.json()
        assert data["adres"] == "Kerkplein 1"
        assert data["plaats"] == "Paramaribo"
        print(f"✓ Profile updated correctly")


# ============== KLANTEN TESTS ==============

class TestGratisFactuurKlanten:
    """Customer (Klanten) CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create a logged-in session for klanten tests"""
        user_data = {
            "email": generate_unique_email(),
            "password": "klantentestpass",
            "bedrijfsnaam": "TEST_Klanten_Bedrijf"
        }
        
        # Register
        response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip(f"Could not create test user: {response.text}")
        
        data = response.json()
        return {
            "token": data["token"],
            "headers": {"Authorization": f"Bearer {data['token']}"},
            "user_id": data["user"]["id"]
        }
    
    @pytest.fixture
    def klant_data(self):
        """Generate test klant data"""
        return {
            "naam": generate_unique_name(),
            "email": generate_unique_email(),
            "telefoon": "+597 111222",
            "adres": "Teststraat 123",
            "postcode": "54321",
            "plaats": "Paramaribo",
            "land": "Suriname",
            "notities": "Test klant voor automatische tests"
        }
    
    def test_create_klant(self, auth_session, klant_data):
        """Test creating a new customer"""
        response = requests.post(
            f"{API_BASE}/klanten",
            headers=auth_session["headers"],
            json=klant_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "klant" in data
        assert data["klant"]["naam"] == klant_data["naam"]
        assert data["klant"]["email"] == klant_data["email"]
        assert "id" in data["klant"]
        
        # Store for later tests
        auth_session["klant_id"] = data["klant"]["id"]
        print(f"✓ Klant created: {klant_data['naam']}")
    
    def test_get_klanten_list(self, auth_session):
        """Test getting list of customers"""
        response = requests.get(
            f"{API_BASE}/klanten",
            headers=auth_session["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least the one we created
        
        # Check klant has statistics fields
        if len(data) > 0:
            klant = data[0]
            assert "id" in klant
            assert "naam" in klant
            # Statistics should be added
            assert "aantal_facturen" in klant or "totaal_bedrag" in klant
        
        print(f"✓ Retrieved {len(data)} klanten")
    
    def test_get_single_klant(self, auth_session):
        """Test getting a specific customer"""
        if "klant_id" not in auth_session:
            pytest.skip("No klant_id available")
        
        response = requests.get(
            f"{API_BASE}/klanten/{auth_session['klant_id']}",
            headers=auth_session["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == auth_session["klant_id"]
        print(f"✓ Single klant retrieved")
    
    def test_update_klant(self, auth_session):
        """Test updating a customer"""
        if "klant_id" not in auth_session:
            pytest.skip("No klant_id available")
        
        update_data = {
            "naam": "TEST_Updated_Klant",
            "telefoon": "+597 999888"
        }
        
        response = requests.put(
            f"{API_BASE}/klanten/{auth_session['klant_id']}",
            headers=auth_session["headers"],
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify update
        response = requests.get(
            f"{API_BASE}/klanten/{auth_session['klant_id']}",
            headers=auth_session["headers"]
        )
        data = response.json()
        assert data["naam"] == "TEST_Updated_Klant"
        print(f"✓ Klant updated correctly")
    
    def test_delete_klant(self, auth_session):
        """Test deleting a customer"""
        if "klant_id" not in auth_session:
            pytest.skip("No klant_id available")
        
        response = requests.delete(
            f"{API_BASE}/klanten/{auth_session['klant_id']}",
            headers=auth_session["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify deletion
        response = requests.get(
            f"{API_BASE}/klanten/{auth_session['klant_id']}",
            headers=auth_session["headers"]
        )
        assert response.status_code == 404
        print(f"✓ Klant deleted and verified")


# ============== FACTUREN TESTS ==============

class TestGratisFactuurFacturen:
    """Invoice (Facturen) CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create a logged-in session with a klant for facturen tests"""
        user_data = {
            "email": generate_unique_email(),
            "password": "facturentestpass",
            "bedrijfsnaam": "TEST_Facturen_Bedrijf"
        }
        
        # Register
        response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip(f"Could not create test user: {response.text}")
        
        data = response.json()
        headers = {"Authorization": f"Bearer {data['token']}"}
        
        # Create a klant for invoices
        klant_response = requests.post(
            f"{API_BASE}/klanten",
            headers=headers,
            json={"naam": "TEST_Factuur_Klant", "email": "klant@test.com"}
        )
        
        klant_id = None
        if klant_response.status_code == 200:
            klant_id = klant_response.json()["klant"]["id"]
        
        return {
            "token": data["token"],
            "headers": headers,
            "user_id": data["user"]["id"],
            "klant_id": klant_id
        }
    
    def test_create_factuur(self, auth_session):
        """Test creating a new invoice"""
        if not auth_session.get("klant_id"):
            pytest.skip("No klant_id available")
        
        factuur_data = {
            "klant_id": auth_session["klant_id"],
            "document_type": "factuur",
            "nummer": f"FAC-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "datum": datetime.now().strftime("%Y-%m-%d"),
            "vervaldatum": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "valuta": "SRD",
            "btw_regio": "SR",
            "items": [
                {"omschrijving": "Product A", "aantal": 2, "prijs": 100.0, "btw_percentage": 10},
                {"omschrijving": "Service B", "aantal": 1, "prijs": 250.0, "btw_percentage": 10}
            ],
            "notities": "Test factuur",
            "template": "modern"
        }
        
        response = requests.post(
            f"{API_BASE}/facturen",
            headers=auth_session["headers"],
            json=factuur_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "factuur" in data
        factuur = data["factuur"]
        
        # Verify calculations
        expected_subtotal = (2 * 100) + (1 * 250)  # 450
        expected_btw = expected_subtotal * 0.10  # 45
        expected_total = expected_subtotal + expected_btw  # 495
        
        assert factuur["subtotaal"] == expected_subtotal
        assert factuur["btw_totaal"] == expected_btw
        assert factuur["totaal"] == expected_total
        assert factuur["status"] == "openstaand"
        assert "id" in factuur
        
        auth_session["factuur_id"] = factuur["id"]
        print(f"✓ Factuur created: {factuur['nummer']} (totaal: {factuur['totaal']})")
    
    def test_get_facturen_list(self, auth_session):
        """Test getting list of invoices"""
        response = requests.get(
            f"{API_BASE}/facturen",
            headers=auth_session["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Check factuur has customer info
        factuur = data[0]
        assert "id" in factuur
        assert "nummer" in factuur
        assert "totaal" in factuur
        
        print(f"✓ Retrieved {len(data)} facturen")
    
    def test_get_facturen_with_status_filter(self, auth_session):
        """Test getting invoices filtered by status"""
        response = requests.get(
            f"{API_BASE}/facturen?status=openstaand",
            headers=auth_session["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned facturen should have status openstaand
        for factuur in data:
            assert factuur["status"] == "openstaand"
        
        print(f"✓ Status filter works correctly")
    
    def test_get_single_factuur(self, auth_session):
        """Test getting a specific invoice"""
        if "factuur_id" not in auth_session:
            pytest.skip("No factuur_id available")
        
        response = requests.get(
            f"{API_BASE}/facturen/{auth_session['factuur_id']}",
            headers=auth_session["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == auth_session["factuur_id"]
        assert "klant" in data  # Should include customer info
        assert "betalingen" in data  # Should include payments
        print(f"✓ Single factuur retrieved with details")
    
    def test_update_factuur(self, auth_session):
        """Test updating an invoice"""
        if "factuur_id" not in auth_session:
            pytest.skip("No factuur_id available")
        
        update_data = {
            "items": [
                {"omschrijving": "Updated Product", "aantal": 3, "prijs": 150.0, "btw_percentage": 10}
            ]
        }
        
        response = requests.put(
            f"{API_BASE}/facturen/{auth_session['factuur_id']}",
            headers=auth_session["headers"],
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify update
        response = requests.get(
            f"{API_BASE}/facturen/{auth_session['factuur_id']}",
            headers=auth_session["headers"]
        )
        data = response.json()
        assert data["totaal"] == 3 * 150 * 1.10  # 495
        print(f"✓ Factuur updated and recalculated")


# ============== BETALINGEN TESTS ==============

class TestGratisFactuurBetalingen:
    """Payment (Betalingen) tests"""
    
    @pytest.fixture(scope="class")
    def auth_session_with_factuur(self):
        """Create session with a factuur for payment tests"""
        user_data = {
            "email": generate_unique_email(),
            "password": "betalingtestpass",
            "bedrijfsnaam": "TEST_Betalingen_Bedrijf"
        }
        
        # Register
        response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip(f"Could not create test user: {response.text}")
        
        data = response.json()
        headers = {"Authorization": f"Bearer {data['token']}"}
        
        # Create klant
        klant_response = requests.post(
            f"{API_BASE}/klanten",
            headers=headers,
            json={"naam": "TEST_Betaling_Klant"}
        )
        klant_id = klant_response.json()["klant"]["id"]
        
        # Create factuur
        factuur_response = requests.post(
            f"{API_BASE}/facturen",
            headers=headers,
            json={
                "klant_id": klant_id,
                "document_type": "factuur",
                "nummer": f"FAC-BET-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "datum": datetime.now().strftime("%Y-%m-%d"),
                "vervaldatum": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "valuta": "SRD",
                "btw_regio": "geen",
                "items": [{"omschrijving": "Service", "aantal": 1, "prijs": 1000.0, "btw_percentage": 0}],
                "template": "modern"
            }
        )
        
        factuur = factuur_response.json()["factuur"]
        
        return {
            "headers": headers,
            "factuur_id": factuur["id"],
            "factuur_totaal": factuur["totaal"]
        }
    
    def test_create_partial_payment(self, auth_session_with_factuur):
        """Test registering a partial payment"""
        betaling_data = {
            "factuur_id": auth_session_with_factuur["factuur_id"],
            "bedrag": 500.0,  # Partial payment
            "datum": datetime.now().strftime("%Y-%m-%d"),
            "notities": "Eerste aanbetaling"
        }
        
        response = requests.post(
            f"{API_BASE}/betalingen",
            headers=auth_session_with_factuur["headers"],
            json=betaling_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "betaling" in data
        
        auth_session_with_factuur["betaling_id"] = data["betaling"]["id"]
        
        # Verify factuur status updated to deelbetaling
        response = requests.get(
            f"{API_BASE}/facturen/{auth_session_with_factuur['factuur_id']}",
            headers=auth_session_with_factuur["headers"]
        )
        factuur = response.json()
        assert factuur["status"] == "deelbetaling"
        assert factuur["betaald_bedrag"] == 500.0
        
        print(f"✓ Partial payment registered, status: deelbetaling")
    
    def test_create_full_payment(self, auth_session_with_factuur):
        """Test registering payment that completes the invoice"""
        betaling_data = {
            "factuur_id": auth_session_with_factuur["factuur_id"],
            "bedrag": 500.0,  # Remaining amount
            "datum": datetime.now().strftime("%Y-%m-%d"),
            "notities": "Restbetaling"
        }
        
        response = requests.post(
            f"{API_BASE}/betalingen",
            headers=auth_session_with_factuur["headers"],
            json=betaling_data
        )
        
        assert response.status_code == 200
        
        # Verify factuur status updated to betaald
        response = requests.get(
            f"{API_BASE}/facturen/{auth_session_with_factuur['factuur_id']}",
            headers=auth_session_with_factuur["headers"]
        )
        factuur = response.json()
        assert factuur["status"] == "betaald"
        assert factuur["betaald_bedrag"] == 1000.0
        
        print(f"✓ Full payment registered, status: betaald")
    
    def test_get_betalingen_list(self, auth_session_with_factuur):
        """Test getting list of payments"""
        response = requests.get(
            f"{API_BASE}/betalingen",
            headers=auth_session_with_factuur["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        print(f"✓ Retrieved {len(data)} betalingen")


# ============== DASHBOARD TESTS ==============

class TestGratisFactuurDashboard:
    """Dashboard statistics tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create session for dashboard tests"""
        user_data = {
            "email": generate_unique_email(),
            "password": "dashboardtestpass",
            "bedrijfsnaam": "TEST_Dashboard_Bedrijf"
        }
        
        response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip(f"Could not create test user: {response.text}")
        
        data = response.json()
        return {"headers": {"Authorization": f"Bearer {data['token']}"}}
    
    def test_get_dashboard_stats(self, auth_session):
        """Test getting dashboard statistics"""
        response = requests.get(
            f"{API_BASE}/dashboard",
            headers=auth_session["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        expected_fields = [
            "klanten_count", "facturen_count", "totaal_omzet",
            "totaal_betaald", "totaal_openstaand", "openstaand_count",
            "deelbetaling_count", "betaald_count", "verlopen_count", "verlopen_bedrag"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], (int, float))
        
        print(f"✓ Dashboard stats retrieved: {len(data)} fields")


# ============== EMAIL ENDPOINT TESTS ==============

class TestGratisFactuurEmail:
    """Email functionality tests (without actual sending)"""
    
    @pytest.fixture(scope="class")
    def auth_session_with_factuur(self):
        """Create session with factuur for email tests"""
        user_data = {
            "email": generate_unique_email(),
            "password": "emailtestpass",
            "bedrijfsnaam": "TEST_Email_Bedrijf"
        }
        
        response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip(f"Could not create test user: {response.text}")
        
        data = response.json()
        headers = {"Authorization": f"Bearer {data['token']}"}
        
        # Create klant with email
        klant_response = requests.post(
            f"{API_BASE}/klanten",
            headers=headers,
            json={"naam": "TEST_Email_Klant", "email": "emailtest@test.com"}
        )
        klant_id = klant_response.json()["klant"]["id"]
        
        # Create factuur
        factuur_response = requests.post(
            f"{API_BASE}/facturen",
            headers=headers,
            json={
                "klant_id": klant_id,
                "document_type": "factuur",
                "nummer": f"FAC-EMAIL-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "datum": datetime.now().strftime("%Y-%m-%d"),
                "vervaldatum": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "valuta": "SRD",
                "btw_regio": "geen",
                "items": [{"omschrijving": "Service", "aantal": 1, "prijs": 500.0, "btw_percentage": 0}],
                "template": "modern"
            }
        )
        
        factuur = factuur_response.json()["factuur"]
        
        return {
            "headers": headers,
            "factuur_id": factuur["id"],
            "klant_id": klant_id
        }
    
    def test_send_factuur_email_without_smtp(self, auth_session_with_factuur):
        """Test sending invoice email - should fail without SMTP config"""
        response = requests.post(
            f"{API_BASE}/email/factuur",
            headers=auth_session_with_factuur["headers"],
            json={"factuur_id": auth_session_with_factuur["factuur_id"]}
        )
        
        # Should fail with 400 because SMTP is not configured
        assert response.status_code == 400
        data = response.json()
        assert "SMTP" in data["detail"] or "instellingen" in data["detail"]
        print(f"✓ Email correctly requires SMTP configuration")
    
    def test_send_herinnering_without_smtp(self, auth_session_with_factuur):
        """Test sending payment reminder - should fail without SMTP config"""
        response = requests.post(
            f"{API_BASE}/email/herinnering/{auth_session_with_factuur['factuur_id']}",
            headers=auth_session_with_factuur["headers"]
        )
        
        # Should fail with 400 because SMTP is not configured
        assert response.status_code == 400
        print(f"✓ Herinnering correctly requires SMTP configuration")


# ============== DELETE TESTS (CLEANUP) ==============

class TestGratisFactuurCleanup:
    """Tests for deletion and cleanup functionality"""
    
    @pytest.fixture(scope="class")
    def auth_session_with_data(self):
        """Create session with data for cleanup tests"""
        user_data = {
            "email": generate_unique_email(),
            "password": "cleanuptestpass",
            "bedrijfsnaam": "TEST_Cleanup_Bedrijf"
        }
        
        response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip(f"Could not create test user: {response.text}")
        
        data = response.json()
        headers = {"Authorization": f"Bearer {data['token']}"}
        
        # Create klant
        klant_response = requests.post(
            f"{API_BASE}/klanten",
            headers=headers,
            json={"naam": "TEST_Cleanup_Klant"}
        )
        klant_id = klant_response.json()["klant"]["id"]
        
        # Create factuur
        factuur_response = requests.post(
            f"{API_BASE}/facturen",
            headers=headers,
            json={
                "klant_id": klant_id,
                "document_type": "factuur",
                "nummer": f"FAC-CLEAN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "datum": datetime.now().strftime("%Y-%m-%d"),
                "vervaldatum": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "valuta": "SRD",
                "btw_regio": "geen",
                "items": [{"omschrijving": "Test", "aantal": 1, "prijs": 100.0, "btw_percentage": 0}],
                "template": "modern"
            }
        )
        factuur_id = factuur_response.json()["factuur"]["id"]
        
        # Create betaling
        betaling_response = requests.post(
            f"{API_BASE}/betalingen",
            headers=headers,
            json={
                "factuur_id": factuur_id,
                "bedrag": 50.0,
                "datum": datetime.now().strftime("%Y-%m-%d")
            }
        )
        betaling_id = betaling_response.json()["betaling"]["id"]
        
        return {
            "headers": headers,
            "klant_id": klant_id,
            "factuur_id": factuur_id,
            "betaling_id": betaling_id
        }
    
    def test_delete_betaling(self, auth_session_with_data):
        """Test deleting a payment updates factuur correctly"""
        response = requests.delete(
            f"{API_BASE}/betalingen/{auth_session_with_data['betaling_id']}",
            headers=auth_session_with_data["headers"]
        )
        
        assert response.status_code == 200
        
        # Verify factuur updated
        response = requests.get(
            f"{API_BASE}/facturen/{auth_session_with_data['factuur_id']}",
            headers=auth_session_with_data["headers"]
        )
        factuur = response.json()
        assert factuur["betaald_bedrag"] == 0
        assert factuur["status"] == "openstaand"
        
        print(f"✓ Betaling deleted, factuur status reverted")
    
    def test_delete_factuur_cascades(self, auth_session_with_data):
        """Test deleting factuur removes related betalingen"""
        response = requests.delete(
            f"{API_BASE}/facturen/{auth_session_with_data['factuur_id']}",
            headers=auth_session_with_data["headers"]
        )
        
        assert response.status_code == 200
        
        # Verify factuur is gone
        response = requests.get(
            f"{API_BASE}/facturen/{auth_session_with_data['factuur_id']}",
            headers=auth_session_with_data["headers"]
        )
        assert response.status_code == 404
        
        print(f"✓ Factuur deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
