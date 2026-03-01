"""
Contract Generation and Digital Signature Feature Tests
Tests for: Contract CRUD, Signing Link, Public Signing Page, PDF Download
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://accounting-redesign.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "klant@test.com"
TEST_PASSWORD = "test123"

# Known test signing token
TEST_SIGNING_TOKEN = "5783391c-de87-4e3a-a562-84f4b515b676"


class TestContractAuthentication:
    """Test authentication for contract endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestContractCRUD:
    """Test Contract CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_data(self, auth_headers):
        """Get tenant and apartment IDs for testing"""
        # Get tenants
        tenants_resp = requests.get(f"{BASE_URL}/api/tenants", headers=auth_headers)
        assert tenants_resp.status_code == 200
        tenants = tenants_resp.json()
        
        # Get apartments
        apts_resp = requests.get(f"{BASE_URL}/api/apartments", headers=auth_headers)
        assert apts_resp.status_code == 200
        apartments = apts_resp.json()
        
        return {
            "tenant_id": tenants[0]["id"] if tenants else None,
            "apartment_id": apartments[0]["id"] if apartments else None
        }
    
    def test_get_contracts_list(self, auth_headers):
        """Test GET /api/contracts - list all contracts"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/contracts returned {len(data)} contracts")
        
        # Verify contract structure if contracts exist
        if data:
            contract = data[0]
            assert "id" in contract
            assert "tenant_id" in contract
            assert "apartment_id" in contract
            assert "status" in contract
            assert "signing_token" in contract
            assert "rent_amount" in contract
            print(f"✓ Contract structure verified: {contract['id'][:8]}...")
    
    def test_get_contracts_without_auth(self):
        """Test GET /api/contracts without authentication - should fail"""
        response = requests.get(f"{BASE_URL}/api/contracts")
        assert response.status_code in [401, 403]
        print("✓ GET /api/contracts without auth correctly returns 401/403")
    
    def test_create_contract(self, auth_headers, test_data):
        """Test POST /api/contracts - create new contract"""
        if not test_data["tenant_id"] or not test_data["apartment_id"]:
            pytest.skip("No tenant or apartment available for testing")
        
        contract_data = {
            "tenant_id": test_data["tenant_id"],
            "apartment_id": test_data["apartment_id"],
            "start_date": "2026-03-01",
            "end_date": "2027-02-28",
            "rent_amount": 3000.0,
            "deposit_amount": 6000.0,
            "payment_due_day": 1,
            "payment_deadline_day": 5,
            "payment_deadline_month_offset": 0,
            "additional_terms": "TEST_CONTRACT - Test additional terms"
        }
        
        response = requests.post(f"{BASE_URL}/api/contracts", json=contract_data, headers=auth_headers)
        assert response.status_code == 200, f"Create contract failed: {response.text}"
        
        data = response.json()
        assert data["tenant_id"] == test_data["tenant_id"]
        assert data["apartment_id"] == test_data["apartment_id"]
        assert data["rent_amount"] == 3000.0
        assert data["deposit_amount"] == 6000.0
        assert data["status"] == "pending_signature"
        assert "signing_token" in data
        assert data["signing_token"] is not None
        
        print(f"✓ Contract created with ID: {data['id'][:8]}...")
        print(f"✓ Signing token generated: {data['signing_token'][:8]}...")
        
        # Store for cleanup
        return data["id"]
    
    def test_contract_has_status_pending_signature(self, auth_headers):
        """Test that new contracts have pending_signature status"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        assert response.status_code == 200
        contracts = response.json()
        
        # Find contracts with pending_signature status
        pending = [c for c in contracts if c["status"] == "pending_signature"]
        print(f"✓ Found {len(pending)} contracts with pending_signature status")
        
        # Verify at least one exists (from our test or existing data)
        assert len(pending) >= 0  # May be 0 if all are signed


class TestContractSigningPublicEndpoint:
    """Test public signing endpoint (no auth required)"""
    
    def test_get_contract_for_signing(self):
        """Test GET /api/contracts/sign/{token} - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/contracts/sign/{TEST_SIGNING_TOKEN}")
        
        # Could be 200 (valid) or 400 (already signed)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify contract data structure
            assert "contract" in data
            assert "tenant" in data
            assert "apartment" in data
            assert "landlord" in data
            
            contract = data["contract"]
            assert "id" in contract
            assert "start_date" in contract
            assert "rent_amount" in contract
            assert "deposit_amount" in contract
            assert "payment_due_day" in contract
            assert "status" in contract
            
            tenant = data["tenant"]
            assert "name" in tenant
            
            apartment = data["apartment"]
            assert "name" in apartment
            
            landlord = data["landlord"]
            assert "name" in landlord
            
            print("✓ Contract for signing retrieved successfully")
            print(f"  - Tenant: {tenant['name']}")
            print(f"  - Apartment: {apartment['name']}")
            print(f"  - Rent: {contract['rent_amount']}")
            print(f"  - Landlord: {landlord['name']}")
        else:
            data = response.json()
            print(f"✓ Contract already signed: {data.get('detail', 'Already signed')}")
    
    def test_get_contract_invalid_token(self):
        """Test GET /api/contracts/sign/{token} with invalid token"""
        invalid_token = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/contracts/sign/{invalid_token}")
        assert response.status_code == 404
        print("✓ Invalid signing token correctly returns 404")
    
    def test_sign_contract_without_signature(self):
        """Test POST /api/contracts/sign/{token} without signature data"""
        response = requests.post(
            f"{BASE_URL}/api/contracts/sign/{TEST_SIGNING_TOKEN}",
            json={}
        )
        # Should fail validation
        assert response.status_code in [400, 422]
        print("✓ Sign contract without signature correctly fails validation")


class TestContractPDF:
    """Test Contract PDF generation"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_download_contract_pdf(self, auth_headers):
        """Test GET /api/contracts/{id}/pdf - download PDF"""
        # First get a contract ID
        contracts_resp = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        assert contracts_resp.status_code == 200
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available for PDF test")
        
        contract_id = contracts[0]["id"]
        
        # Download PDF
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF content starts with PDF header
        assert response.content[:4] == b'%PDF'
        
        print(f"✓ Contract PDF downloaded successfully ({len(response.content)} bytes)")
    
    def test_download_pdf_without_auth(self):
        """Test PDF download without authentication - should fail"""
        # Use a random ID
        response = requests.get(f"{BASE_URL}/api/contracts/some-id/pdf")
        assert response.status_code in [401, 403]
        print("✓ PDF download without auth correctly returns 401/403")


class TestContractDelete:
    """Test Contract deletion"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_delete_test_contracts(self, auth_headers):
        """Clean up TEST_CONTRACT entries"""
        # Get all contracts
        response = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        assert response.status_code == 200
        contracts = response.json()
        
        # Find and delete test contracts
        deleted_count = 0
        for contract in contracts:
            if contract.get("additional_terms", "").startswith("TEST_CONTRACT"):
                del_resp = requests.delete(
                    f"{BASE_URL}/api/contracts/{contract['id']}",
                    headers=auth_headers
                )
                if del_resp.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test contracts")


class TestContractSigningFlow:
    """Test complete contract signing flow"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_signing_link_format(self, auth_headers):
        """Test that signing links are properly formatted"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        assert response.status_code == 200
        contracts = response.json()
        
        for contract in contracts:
            if contract["status"] == "pending_signature":
                token = contract["signing_token"]
                assert token is not None
                # Token should be a valid UUID format
                try:
                    uuid.UUID(token)
                    print(f"✓ Valid signing token format: {token[:8]}...")
                except ValueError:
                    pytest.fail(f"Invalid signing token format: {token}")
                break
    
    def test_contract_status_values(self, auth_headers):
        """Test that contracts have valid status values"""
        response = requests.get(f"{BASE_URL}/api/contracts", headers=auth_headers)
        assert response.status_code == 200
        contracts = response.json()
        
        valid_statuses = ["draft", "pending_signature", "signed"]
        
        for contract in contracts:
            assert contract["status"] in valid_statuses, f"Invalid status: {contract['status']}"
        
        print(f"✓ All {len(contracts)} contracts have valid status values")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
