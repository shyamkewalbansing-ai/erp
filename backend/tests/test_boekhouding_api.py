"""
Boekhouding Module API Tests
Tests for all boekhouding endpoints: dashboard, rekeningen, debiteuren, crediteuren, btw-codes, etc.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://accounting-redesign.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@facturatie.sr"
TEST_PASSWORD = "demo2024"


def get_auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    # API returns access_token, not token
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data.keys()}"
    return token


class TestAuthentication:
    """Test authentication for boekhouding module"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        # API returns access_token
        assert "access_token" in data or "token" in data, f"No token in response: {data.keys()}"
        assert "user" in data
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestDashboard:
    """Test dashboard endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_dashboard(self, auth_token):
        """Test GET /api/boekhouding/dashboard returns correct data"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify dashboard structure
        assert "omzet" in data, "Missing 'omzet' in dashboard"
        assert "kosten" in data, "Missing 'kosten' in dashboard"
        assert "winst" in data, "Missing 'winst' in dashboard"
        assert "openstaand" in data, "Missing 'openstaand' in dashboard"
        assert "liquiditeit" in data, "Missing 'liquiditeit' in dashboard"
        assert "wisselkoersen" in data, "Missing 'wisselkoersen' in dashboard"
        
        print(f"✓ Dashboard data: omzet={data['omzet']}, kosten={data['kosten']}")


class TestRekeningen:
    """Test rekeningen (chart of accounts) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_rekeningen(self, auth_token):
        """Test GET /api/boekhouding/rekeningen returns list of accounts"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/rekeningen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Rekeningen failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # If there are accounts, verify structure
        if len(data) > 0:
            account = data[0]
            assert "code" in account, "Account missing 'code'"
            assert "naam" in account, "Account missing 'naam'"
            assert "categorie" in account, "Account missing 'categorie'"
            assert "valuta" in account, "Account missing 'valuta'"
            print(f"✓ Found {len(data)} rekeningen, first: {account.get('code')} - {account.get('naam')}")
        else:
            print("✓ Rekeningen endpoint works (empty list)")


class TestDebiteuren:
    """Test debiteuren (customers) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_debiteuren(self, auth_token):
        """Test GET /api/boekhouding/debiteuren returns list of customers"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/debiteuren",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Debiteuren failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # If there are customers, verify structure
        if len(data) > 0:
            customer = data[0]
            assert "naam" in customer, "Customer missing 'naam'"
            assert "nummer" in customer, "Customer missing 'nummer'"
            assert "valuta" in customer, "Customer missing 'valuta'"
            print(f"✓ Found {len(data)} debiteuren, first: {customer.get('nummer')} - {customer.get('naam')}")
        else:
            print("✓ Debiteuren endpoint works (empty list)")


class TestCrediteuren:
    """Test crediteuren (suppliers) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_crediteuren(self, auth_token):
        """Test GET /api/boekhouding/crediteuren returns list of suppliers"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/crediteuren",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Crediteuren failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            supplier = data[0]
            assert "naam" in supplier, "Supplier missing 'naam'"
            assert "nummer" in supplier, "Supplier missing 'nummer'"
            print(f"✓ Found {len(data)} crediteuren, first: {supplier.get('nummer')} - {supplier.get('naam')}")
        else:
            print("✓ Crediteuren endpoint works (empty list)")


class TestBTWCodes:
    """Test BTW codes endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_btw_codes(self, auth_token):
        """Test GET /api/boekhouding/btw-codes returns list of BTW codes"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/btw-codes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"BTW codes failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            btw = data[0]
            assert "code" in btw, "BTW code missing 'code'"
            assert "naam" in btw, "BTW code missing 'naam'"
            assert "percentage" in btw, "BTW code missing 'percentage'"
            print(f"✓ Found {len(data)} BTW codes, first: {btw.get('code')} - {btw.get('naam')} ({btw.get('percentage')}%)")
        else:
            print("✓ BTW codes endpoint works (empty list)")


class TestBankrekeningen:
    """Test bankrekeningen (bank accounts) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_bankrekeningen(self, auth_token):
        """Test GET /api/boekhouding/bankrekeningen returns list of bank accounts"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/bankrekeningen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Bankrekeningen failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            bank = data[0]
            assert "naam" in bank, "Bank account missing 'naam'"
            assert "rekeningnummer" in bank, "Bank account missing 'rekeningnummer'"
            assert "valuta" in bank, "Bank account missing 'valuta'"
            print(f"✓ Found {len(data)} bankrekeningen, first: {bank.get('naam')} ({bank.get('valuta')})")
        else:
            print("✓ Bankrekeningen endpoint works (empty list)")


class TestVerkoopfacturen:
    """Test verkoopfacturen (sales invoices) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_verkoopfacturen(self, auth_token):
        """Test GET /api/boekhouding/verkoopfacturen returns list of sales invoices"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/verkoopfacturen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Verkoopfacturen failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            invoice = data[0]
            assert "factuurnummer" in invoice, "Invoice missing 'factuurnummer'"
            assert "debiteur_naam" in invoice, "Invoice missing 'debiteur_naam'"
            print(f"✓ Found {len(data)} verkoopfacturen, first: {invoice.get('factuurnummer')}")
        else:
            print("✓ Verkoopfacturen endpoint works (empty list)")


class TestInkoopfacturen:
    """Test inkoopfacturen (purchase invoices) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_inkoopfacturen(self, auth_token):
        """Test GET /api/boekhouding/inkoopfacturen returns list of purchase invoices"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/inkoopfacturen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Inkoopfacturen failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Inkoopfacturen endpoint works, found {len(data)} invoices")


class TestWisselkoersen:
    """Test wisselkoersen (exchange rates) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_wisselkoersen(self, auth_token):
        """Test GET /api/boekhouding/wisselkoersen returns list of exchange rates"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/wisselkoersen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Wisselkoersen failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            rate = data[0]
            assert "valuta_van" in rate, "Rate missing 'valuta_van'"
            assert "valuta_naar" in rate, "Rate missing 'valuta_naar'"
            assert "koers" in rate, "Rate missing 'koers'"
            print(f"✓ Found {len(data)} wisselkoersen, first: {rate.get('valuta_van')}/{rate.get('valuta_naar')} = {rate.get('koers')}")
        else:
            print("✓ Wisselkoersen endpoint works (empty list)")
    
    def test_get_latest_wisselkoersen(self, auth_token):
        """Test GET /api/boekhouding/wisselkoersen/latest returns latest rates"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/wisselkoersen/latest",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Latest wisselkoersen failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, dict), "Response should be a dict"
        print(f"✓ Latest wisselkoersen: {list(data.keys())}")


class TestJournaalposten:
    """Test journaalposten (journal entries) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_journaalposten(self, auth_token):
        """Test GET /api/boekhouding/journaalposten returns list of journal entries"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/journaalposten",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Journaalposten failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Journaalposten endpoint works, found {len(data)} entries")


class TestRapportages:
    """Test rapportages (reports) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        return get_auth_token()
    
    def test_get_balans(self, auth_token):
        """Test GET /api/boekhouding/rapportages/balans returns balance sheet"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/rapportages/balans",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Balans failed: {response.text}"
        data = response.json()
        
        assert "activa" in data, "Balans missing 'activa'"
        assert "passiva" in data, "Balans missing 'passiva'"
        print(f"✓ Balans: activa={len(data.get('activa', []))}, passiva={len(data.get('passiva', []))}")
    
    def test_get_winst_verlies(self, auth_token):
        """Test GET /api/boekhouding/rapportages/winst-verlies returns P&L"""
        response = requests.get(
            f"{BASE_URL}/api/boekhouding/rapportages/winst-verlies",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Winst-verlies failed: {response.text}"
        data = response.json()
        
        assert "omzet" in data, "P&L missing 'omzet'"
        assert "kosten" in data, "P&L missing 'kosten'"
        print(f"✓ Winst-verlies: omzet={data.get('totaal_omzet')}, kosten={data.get('totaal_kosten')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
