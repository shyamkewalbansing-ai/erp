"""
Bank Reconciliatie Module Tests
- Tests for CSV upload, transaction management, matching, and statistics
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBankReconciliatieAuth:
    """Test authentication for bank reconciliation endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_get_transacties_without_auth(self):
        """Test that GET /api/bank/transacties requires authentication"""
        response = requests.get(f"{BASE_URL}/api/bank/transacties")
        assert response.status_code in [401, 403], "Should require authentication"
    
    def test_get_stats_without_auth(self):
        """Test that GET /api/bank/stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/bank/stats")
        assert response.status_code in [401, 403], "Should require authentication"


class TestBankTransacties:
    """Test bank transaction CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_all_transacties(self, headers):
        """Test GET /api/bank/transacties returns list with stats"""
        response = requests.get(f"{BASE_URL}/api/bank/transacties", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "transacties" in data
        assert "stats" in data
        assert isinstance(data["transacties"], list)
        
        # Verify stats structure
        stats = data["stats"]
        assert "totaal" in stats
        assert "niet_gematcht" in stats
        assert "suggesties" in stats
        assert "gematcht" in stats
        assert "genegeerd" in stats
    
    def test_get_transacties_with_status_filter(self, headers):
        """Test GET /api/bank/transacties with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/bank/transacties?status=niet_gematcht", 
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # All returned transactions should have the filtered status
        for trans in data["transacties"]:
            assert trans["status"] == "niet_gematcht"
    
    def test_get_single_transactie(self, headers):
        """Test GET /api/bank/transacties/{id} returns single transaction"""
        # First get list to find an ID
        list_response = requests.get(f"{BASE_URL}/api/bank/transacties", headers=headers)
        assert list_response.status_code == 200
        
        transacties = list_response.json()["transacties"]
        if len(transacties) > 0:
            trans_id = transacties[0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/bank/transacties/{trans_id}", headers=headers)
            assert response.status_code == 200
            
            data = response.json()
            assert data["id"] == trans_id
            assert "datum" in data
            assert "omschrijving" in data
            assert "bedrag" in data
            assert "type" in data
            assert "status" in data
    
    def test_get_nonexistent_transactie(self, headers):
        """Test GET /api/bank/transacties/{id} with invalid ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/bank/transacties/nonexistent-id-12345", 
            headers=headers
        )
        assert response.status_code == 404


class TestBankStats:
    """Test bank reconciliation statistics endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_reconciliation_stats(self, headers):
        """Test GET /api/bank/stats returns proper statistics"""
        response = requests.get(f"{BASE_URL}/api/bank/stats", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure
        assert "transacties" in data
        assert "openstaande_verkoopfacturen" in data
        assert "openstaande_inkoopfacturen" in data
        
        # Verify transacties stats structure
        trans_stats = data["transacties"]
        assert "niet_gematcht" in trans_stats
        assert "suggestie" in trans_stats
        assert "gematcht" in trans_stats
        assert "genegeerd" in trans_stats
        
        # Each status should have count and bedrag
        for status in ["niet_gematcht", "suggestie", "gematcht", "genegeerd"]:
            assert "count" in trans_stats[status]
            assert "bedrag" in trans_stats[status]
            assert isinstance(trans_stats[status]["count"], int)
            assert isinstance(trans_stats[status]["bedrag"], (int, float))


class TestCSVUpload:
    """Test CSV upload functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token (no Content-Type for file upload)"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_upload_valid_csv(self, headers):
        """Test POST /api/bank/transacties/upload with valid CSV"""
        # Create a valid CSV content
        csv_content = """Datum;Omschrijving;Bedrag;Credit;Debit;Referentie;Tegenrekening
2026-02-26;TEST_Betaling klant ABC;1500.00;1500.00;;TEST_REF001;NL12INGB0001234567
2026-02-26;TEST_Betaling leverancier XYZ;750.50;;750.50;TEST_REF002;NL45RABO0123456789"""
        
        files = {
            'file': ('test_transactions.csv', csv_content, 'text/csv')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bank/transacties/upload",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "totaal" in data
        assert data["totaal"] == 2
        assert "transacties" in data
        assert len(data["transacties"]) == 2
        
        # Verify transaction structure
        for trans in data["transacties"]:
            assert "id" in trans
            assert "datum" in trans
            assert "omschrijving" in trans
            assert "bedrag" in trans
            assert "type" in trans
            assert "status" in trans
            assert trans["omschrijving"].startswith("TEST_")
    
    def test_upload_invalid_file_type(self, headers):
        """Test POST /api/bank/transacties/upload rejects non-CSV files"""
        files = {
            'file': ('test.txt', 'This is not a CSV file', 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bank/transacties/upload",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400
        assert "CSV" in response.json().get("detail", "")
    
    def test_upload_empty_csv(self, headers):
        """Test POST /api/bank/transacties/upload with empty CSV"""
        csv_content = """Datum;Omschrijving;Bedrag;Credit;Debit;Referentie;Tegenrekening"""
        
        files = {
            'file': ('empty.csv', csv_content, 'text/csv')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bank/transacties/upload",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 400
        assert "geen" in response.json().get("detail", "").lower() or "transacties" in response.json().get("detail", "").lower()


class TestTransactionActions:
    """Test transaction ignore, delete, and match actions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def upload_headers(self, auth_token):
        """Get headers for file upload"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_ignore_transaction(self, headers, upload_headers):
        """Test POST /api/bank/transacties/{id}/ignore"""
        # First create a test transaction via CSV upload
        csv_content = """Datum;Omschrijving;Bedrag;Credit;Debit;Referentie;Tegenrekening
2026-02-26;TEST_IGNORE_Transaction;100.00;100.00;;TEST_IGN001;NL12INGB0001234567"""
        
        files = {'file': ('test_ignore.csv', csv_content, 'text/csv')}
        upload_response = requests.post(
            f"{BASE_URL}/api/bank/transacties/upload",
            headers=upload_headers,
            files=files
        )
        assert upload_response.status_code == 200
        
        trans_id = upload_response.json()["transacties"][0]["id"]
        
        # Now ignore the transaction
        response = requests.post(
            f"{BASE_URL}/api/bank/transacties/{trans_id}/ignore",
            headers=headers
        )
        
        assert response.status_code == 200
        assert "genegeerd" in response.json().get("message", "").lower()
        
        # Verify the status changed
        get_response = requests.get(
            f"{BASE_URL}/api/bank/transacties/{trans_id}",
            headers=headers
        )
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "genegeerd"
    
    def test_delete_unmatched_transaction(self, headers, upload_headers):
        """Test DELETE /api/bank/transacties/{id} for unmatched transaction"""
        # First create a test transaction
        csv_content = """Datum;Omschrijving;Bedrag;Credit;Debit;Referentie;Tegenrekening
2026-02-26;TEST_DELETE_Transaction;200.00;200.00;;TEST_DEL001;NL12INGB0001234567"""
        
        files = {'file': ('test_delete.csv', csv_content, 'text/csv')}
        upload_response = requests.post(
            f"{BASE_URL}/api/bank/transacties/upload",
            headers=upload_headers,
            files=files
        )
        assert upload_response.status_code == 200
        
        trans_id = upload_response.json()["transacties"][0]["id"]
        
        # Delete the transaction
        response = requests.delete(
            f"{BASE_URL}/api/bank/transacties/{trans_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        assert "verwijderd" in response.json().get("message", "").lower()
        
        # Verify it's deleted
        get_response = requests.get(
            f"{BASE_URL}/api/bank/transacties/{trans_id}",
            headers=headers
        )
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_transaction(self, headers):
        """Test DELETE /api/bank/transacties/{id} with invalid ID"""
        response = requests.delete(
            f"{BASE_URL}/api/bank/transacties/nonexistent-id-12345",
            headers=headers
        )
        assert response.status_code == 404


class TestAutoMatch:
    """Test auto-match functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_auto_match_endpoint(self, headers):
        """Test POST /api/bank/transacties/auto-match"""
        response = requests.post(
            f"{BASE_URL}/api/bank/transacties/auto-match",
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "matched" in data
        assert isinstance(data["matched"], int)
        # errors field may or may not be present
        if "errors" in data:
            assert isinstance(data["errors"], list)


class TestManualMatch:
    """Test manual matching of transactions to invoices"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_match_with_invalid_transaction(self, headers):
        """Test POST /api/bank/transacties/{id}/match with invalid transaction ID"""
        response = requests.post(
            f"{BASE_URL}/api/bank/transacties/nonexistent-id/match",
            headers=headers,
            json={
                "factuur_id": "some-factuur-id",
                "factuur_type": "verkoopfactuur"
            }
        )
        assert response.status_code == 404
    
    def test_match_with_invalid_factuur(self, headers):
        """Test POST /api/bank/transacties/{id}/match with invalid factuur ID"""
        # First get a valid transaction
        list_response = requests.get(f"{BASE_URL}/api/bank/transacties", headers=headers)
        assert list_response.status_code == 200
        
        transacties = list_response.json()["transacties"]
        # Find an unmatched transaction
        unmatched = [t for t in transacties if t["status"] == "niet_gematcht"]
        
        if len(unmatched) > 0:
            trans_id = unmatched[0]["id"]
            
            response = requests.post(
                f"{BASE_URL}/api/bank/transacties/{trans_id}/match",
                headers=headers,
                json={
                    "factuur_id": "nonexistent-factuur-id",
                    "factuur_type": "verkoopfactuur"
                }
            )
            assert response.status_code == 404


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_cleanup_test_transactions(self, headers):
        """Clean up TEST_ prefixed transactions"""
        # Get all transactions
        response = requests.get(f"{BASE_URL}/api/bank/transacties", headers=headers)
        assert response.status_code == 200
        
        transacties = response.json()["transacties"]
        
        # Delete TEST_ prefixed transactions that are not matched
        deleted_count = 0
        for trans in transacties:
            if trans.get("omschrijving", "").startswith("TEST_") and trans["status"] != "gematcht":
                del_response = requests.delete(
                    f"{BASE_URL}/api/bank/transacties/{trans['id']}",
                    headers=headers
                )
                if del_response.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test transactions")
        assert True  # Cleanup is best effort
