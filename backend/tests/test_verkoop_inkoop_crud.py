"""
Test CRUD operations for Verkoop and Inkoop Orders and Offertes
Tests PUT (update) and DELETE endpoints for concept status items
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication helper"""
    
    @staticmethod
    def get_token():
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None


class TestVerkoopOrdersCRUD:
    """Test CRUD operations for Verkooporders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = TestAuth.get_token()
        assert self.token, "Failed to get auth token"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        # Get a debiteur for creating orders
        res = requests.get(f"{BASE_URL}/api/boekhouding/debiteuren", headers=self.headers)
        if res.status_code == 200 and len(res.json()) > 0:
            self.debiteur_id = res.json()[0]["id"]
        else:
            self.debiteur_id = None
    
    def test_create_verkooporder(self):
        """Test creating a verkooporder"""
        if not self.debiteur_id:
            pytest.skip("No debiteur available for testing")
        
        order_data = {
            "klant_id": self.debiteur_id,
            "orderdatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Verkooporder Item",
                "aantal": 2,
                "prijs_per_stuk": 100.00,
                "btw_tarief": "10"
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/verkoop/orders", 
                                headers=self.headers, json=order_data)
        
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["status"] == "concept"
        assert data["klant_id"] == self.debiteur_id
        
        # Store for cleanup
        self.created_order_id = data["id"]
        print(f"Created verkooporder: {data['ordernummer']}")
        return data["id"]
    
    def test_update_verkooporder_concept(self):
        """Test updating a concept verkooporder (PUT)"""
        if not self.debiteur_id:
            pytest.skip("No debiteur available for testing")
        
        # First create a concept order
        order_data = {
            "klant_id": self.debiteur_id,
            "orderdatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Original Item",
                "aantal": 1,
                "prijs_per_stuk": 50.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/verkoop/orders", 
                                   headers=self.headers, json=order_data)
        assert create_res.status_code == 200
        order_id = create_res.json()["id"]
        
        # Update the order
        update_data = {
            "opmerkingen": "TEST_Updated remarks",
            "regels": [{
                "omschrijving": "TEST_Updated Item",
                "aantal": 3,
                "prijs_per_stuk": 75.00,
                "btw_tarief": "25"
            }]
        }
        
        update_res = requests.put(f"{BASE_URL}/api/verkoop/orders/{order_id}", 
                                  headers=self.headers, json=update_data)
        
        assert update_res.status_code == 200, f"Failed to update order: {update_res.text}"
        updated = update_res.json()
        assert updated["opmerkingen"] == "TEST_Updated remarks"
        assert len(updated["regels"]) == 1
        assert updated["regels"][0]["omschrijving"] == "TEST_Updated Item"
        assert updated["regels"][0]["aantal"] == 3
        print(f"Successfully updated verkooporder: {updated['ordernummer']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/verkoop/orders/{order_id}", headers=self.headers)
    
    def test_update_non_concept_verkooporder_fails(self):
        """Test that updating a non-concept order fails"""
        if not self.debiteur_id:
            pytest.skip("No debiteur available for testing")
        
        # Create and confirm an order
        order_data = {
            "klant_id": self.debiteur_id,
            "orderdatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Non-concept Item",
                "aantal": 1,
                "prijs_per_stuk": 50.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/verkoop/orders", 
                                   headers=self.headers, json=order_data)
        assert create_res.status_code == 200
        order_id = create_res.json()["id"]
        
        # Change status to bevestigd
        status_res = requests.put(f"{BASE_URL}/api/verkoop/orders/{order_id}/status?status=bevestigd", 
                                  headers=self.headers)
        assert status_res.status_code == 200
        
        # Try to update - should fail
        update_data = {"opmerkingen": "Should fail"}
        update_res = requests.put(f"{BASE_URL}/api/verkoop/orders/{order_id}", 
                                  headers=self.headers, json=update_data)
        
        assert update_res.status_code == 400, "Should not be able to update non-concept order"
        assert "concept" in update_res.json().get("detail", "").lower()
        print("Correctly rejected update of non-concept order")
        
        # Cleanup - cancel first then delete
        requests.put(f"{BASE_URL}/api/verkoop/orders/{order_id}/status?status=geannuleerd", 
                     headers=self.headers)
        requests.delete(f"{BASE_URL}/api/verkoop/orders/{order_id}", headers=self.headers)
    
    def test_delete_verkooporder_concept(self):
        """Test deleting a concept verkooporder"""
        if not self.debiteur_id:
            pytest.skip("No debiteur available for testing")
        
        # Create a concept order
        order_data = {
            "klant_id": self.debiteur_id,
            "orderdatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_To Delete",
                "aantal": 1,
                "prijs_per_stuk": 25.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/verkoop/orders", 
                                   headers=self.headers, json=order_data)
        assert create_res.status_code == 200
        order_id = create_res.json()["id"]
        
        # Delete the order
        delete_res = requests.delete(f"{BASE_URL}/api/verkoop/orders/{order_id}", 
                                     headers=self.headers)
        
        assert delete_res.status_code == 200, f"Failed to delete order: {delete_res.text}"
        assert "verwijderd" in delete_res.json().get("message", "").lower()
        print("Successfully deleted concept verkooporder")
        
        # Verify deletion
        get_res = requests.get(f"{BASE_URL}/api/verkoop/orders/{order_id}", headers=self.headers)
        assert get_res.status_code == 404
    
    def test_delete_non_concept_verkooporder_fails(self):
        """Test that deleting a non-concept order fails"""
        if not self.debiteur_id:
            pytest.skip("No debiteur available for testing")
        
        # Create and confirm an order
        order_data = {
            "klant_id": self.debiteur_id,
            "orderdatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Cannot Delete",
                "aantal": 1,
                "prijs_per_stuk": 50.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/verkoop/orders", 
                                   headers=self.headers, json=order_data)
        assert create_res.status_code == 200
        order_id = create_res.json()["id"]
        
        # Change status to bevestigd
        requests.put(f"{BASE_URL}/api/verkoop/orders/{order_id}/status?status=bevestigd", 
                     headers=self.headers)
        
        # Try to delete - should fail
        delete_res = requests.delete(f"{BASE_URL}/api/verkoop/orders/{order_id}", 
                                     headers=self.headers)
        
        assert delete_res.status_code == 400, "Should not be able to delete non-concept order"
        print("Correctly rejected deletion of non-concept order")
        
        # Cleanup
        requests.put(f"{BASE_URL}/api/verkoop/orders/{order_id}/status?status=geannuleerd", 
                     headers=self.headers)
        requests.delete(f"{BASE_URL}/api/verkoop/orders/{order_id}", headers=self.headers)


class TestVerkoopOffertesCRUD:
    """Test CRUD operations for Verkoopoffertes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = TestAuth.get_token()
        assert self.token, "Failed to get auth token"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        # Get a debiteur for creating offertes
        res = requests.get(f"{BASE_URL}/api/boekhouding/debiteuren", headers=self.headers)
        if res.status_code == 200 and len(res.json()) > 0:
            self.debiteur_id = res.json()[0]["id"]
        else:
            self.debiteur_id = None
    
    def test_create_verkoopofferte(self):
        """Test creating a verkoopofferte"""
        if not self.debiteur_id:
            pytest.skip("No debiteur available for testing")
        
        offerte_data = {
            "klant_id": self.debiteur_id,
            "offertedatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Verkoopofferte Item",
                "aantal": 2,
                "prijs_per_stuk": 150.00,
                "btw_tarief": "10"
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/verkoop/offertes", 
                                headers=self.headers, json=offerte_data)
        
        assert response.status_code == 200, f"Failed to create offerte: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["status"] == "concept"
        print(f"Created verkoopofferte: {data['offertenummer']}")
        return data["id"]
    
    def test_update_verkoopofferte_concept(self):
        """Test updating a concept verkoopofferte (PUT)"""
        if not self.debiteur_id:
            pytest.skip("No debiteur available for testing")
        
        # Create a concept offerte
        offerte_data = {
            "klant_id": self.debiteur_id,
            "offertedatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Original Offerte Item",
                "aantal": 1,
                "prijs_per_stuk": 100.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/verkoop/offertes", 
                                   headers=self.headers, json=offerte_data)
        assert create_res.status_code == 200
        offerte_id = create_res.json()["id"]
        
        # Update the offerte
        update_data = {
            "opmerkingen": "TEST_Updated offerte remarks",
            "regels": [{
                "omschrijving": "TEST_Updated Offerte Item",
                "aantal": 5,
                "prijs_per_stuk": 200.00,
                "btw_tarief": "25"
            }]
        }
        
        update_res = requests.put(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}", 
                                  headers=self.headers, json=update_data)
        
        assert update_res.status_code == 200, f"Failed to update offerte: {update_res.text}"
        updated = update_res.json()
        assert updated["opmerkingen"] == "TEST_Updated offerte remarks"
        assert updated["regels"][0]["omschrijving"] == "TEST_Updated Offerte Item"
        print(f"Successfully updated verkoopofferte: {updated['offertenummer']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}", headers=self.headers)
    
    def test_update_non_concept_verkoopofferte_fails(self):
        """Test that updating a non-concept offerte fails"""
        if not self.debiteur_id:
            pytest.skip("No debiteur available for testing")
        
        # Create and send an offerte
        offerte_data = {
            "klant_id": self.debiteur_id,
            "offertedatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Non-concept Offerte",
                "aantal": 1,
                "prijs_per_stuk": 50.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/verkoop/offertes", 
                                   headers=self.headers, json=offerte_data)
        assert create_res.status_code == 200
        offerte_id = create_res.json()["id"]
        
        # Change status to geaccepteerd (not concept)
        requests.put(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}/status?status=geaccepteerd", 
                     headers=self.headers)
        
        # Try to update - should fail
        update_data = {"opmerkingen": "Should fail"}
        update_res = requests.put(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}", 
                                  headers=self.headers, json=update_data)
        
        assert update_res.status_code == 400, "Should not be able to update non-concept offerte"
        print("Correctly rejected update of non-concept offerte")
        
        # Cleanup - mark as afgewezen then delete
        requests.put(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}/status?status=afgewezen", 
                     headers=self.headers)
        requests.delete(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}", headers=self.headers)
    
    def test_delete_verkoopofferte_concept(self):
        """Test deleting a concept verkoopofferte"""
        if not self.debiteur_id:
            pytest.skip("No debiteur available for testing")
        
        # Create a concept offerte
        offerte_data = {
            "klant_id": self.debiteur_id,
            "offertedatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Offerte To Delete",
                "aantal": 1,
                "prijs_per_stuk": 25.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/verkoop/offertes", 
                                   headers=self.headers, json=offerte_data)
        assert create_res.status_code == 200
        offerte_id = create_res.json()["id"]
        
        # Delete the offerte
        delete_res = requests.delete(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}", 
                                     headers=self.headers)
        
        assert delete_res.status_code == 200, f"Failed to delete offerte: {delete_res.text}"
        print("Successfully deleted concept verkoopofferte")
        
        # Verify deletion
        get_res = requests.get(f"{BASE_URL}/api/verkoop/offertes/{offerte_id}", headers=self.headers)
        assert get_res.status_code == 404


class TestInkoopOrdersCRUD:
    """Test CRUD operations for Inkooporders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = TestAuth.get_token()
        assert self.token, "Failed to get auth token"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        # Get a crediteur for creating orders
        res = requests.get(f"{BASE_URL}/api/boekhouding/crediteuren", headers=self.headers)
        if res.status_code == 200 and len(res.json()) > 0:
            self.crediteur_id = res.json()[0]["id"]
        else:
            self.crediteur_id = None
    
    def test_create_inkooporder(self):
        """Test creating an inkooporder"""
        if not self.crediteur_id:
            pytest.skip("No crediteur available for testing")
        
        order_data = {
            "leverancier_id": self.crediteur_id,
            "orderdatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Inkooporder Item",
                "aantal": 3,
                "prijs_per_stuk": 80.00,
                "btw_tarief": "10"
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/inkoop/orders", 
                                headers=self.headers, json=order_data)
        
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["status"] == "concept"
        print(f"Created inkooporder: {data['ordernummer']}")
        return data["id"]
    
    def test_update_inkooporder_concept(self):
        """Test updating a concept inkooporder (PUT)"""
        if not self.crediteur_id:
            pytest.skip("No crediteur available for testing")
        
        # Create a concept order
        order_data = {
            "leverancier_id": self.crediteur_id,
            "orderdatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Original Inkoop Item",
                "aantal": 1,
                "prijs_per_stuk": 60.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/inkoop/orders", 
                                   headers=self.headers, json=order_data)
        assert create_res.status_code == 200
        order_id = create_res.json()["id"]
        
        # Update the order
        update_data = {
            "opmerkingen": "TEST_Updated inkoop remarks",
            "regels": [{
                "omschrijving": "TEST_Updated Inkoop Item",
                "aantal": 4,
                "prijs_per_stuk": 90.00,
                "btw_tarief": "25"
            }]
        }
        
        update_res = requests.put(f"{BASE_URL}/api/inkoop/orders/{order_id}", 
                                  headers=self.headers, json=update_data)
        
        assert update_res.status_code == 200, f"Failed to update order: {update_res.text}"
        updated = update_res.json()
        assert updated["opmerkingen"] == "TEST_Updated inkoop remarks"
        assert updated["regels"][0]["omschrijving"] == "TEST_Updated Inkoop Item"
        print(f"Successfully updated inkooporder: {updated['ordernummer']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/inkoop/orders/{order_id}", headers=self.headers)
    
    def test_update_non_concept_inkooporder_fails(self):
        """Test that updating a non-concept order fails"""
        if not self.crediteur_id:
            pytest.skip("No crediteur available for testing")
        
        # Create and confirm an order
        order_data = {
            "leverancier_id": self.crediteur_id,
            "orderdatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Non-concept Inkoop",
                "aantal": 1,
                "prijs_per_stuk": 50.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/inkoop/orders", 
                                   headers=self.headers, json=order_data)
        assert create_res.status_code == 200
        order_id = create_res.json()["id"]
        
        # Change status to bevestigd
        requests.put(f"{BASE_URL}/api/inkoop/orders/{order_id}/status?status=bevestigd", 
                     headers=self.headers)
        
        # Try to update - should fail
        update_data = {"opmerkingen": "Should fail"}
        update_res = requests.put(f"{BASE_URL}/api/inkoop/orders/{order_id}", 
                                  headers=self.headers, json=update_data)
        
        assert update_res.status_code == 400, "Should not be able to update non-concept order"
        print("Correctly rejected update of non-concept inkooporder")
        
        # Cleanup
        requests.put(f"{BASE_URL}/api/inkoop/orders/{order_id}/status?status=geannuleerd", 
                     headers=self.headers)
        requests.delete(f"{BASE_URL}/api/inkoop/orders/{order_id}", headers=self.headers)
    
    def test_delete_inkooporder_concept(self):
        """Test deleting a concept inkooporder"""
        if not self.crediteur_id:
            pytest.skip("No crediteur available for testing")
        
        # Create a concept order
        order_data = {
            "leverancier_id": self.crediteur_id,
            "orderdatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Inkoop To Delete",
                "aantal": 1,
                "prijs_per_stuk": 30.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/inkoop/orders", 
                                   headers=self.headers, json=order_data)
        assert create_res.status_code == 200
        order_id = create_res.json()["id"]
        
        # Delete the order
        delete_res = requests.delete(f"{BASE_URL}/api/inkoop/orders/{order_id}", 
                                     headers=self.headers)
        
        assert delete_res.status_code == 200, f"Failed to delete order: {delete_res.text}"
        print("Successfully deleted concept inkooporder")
        
        # Verify deletion
        get_res = requests.get(f"{BASE_URL}/api/inkoop/orders/{order_id}", headers=self.headers)
        assert get_res.status_code == 404


class TestInkoopOffertesCRUD:
    """Test CRUD operations for Inkoopoffertes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = TestAuth.get_token()
        assert self.token, "Failed to get auth token"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        # Get a crediteur for creating offertes
        res = requests.get(f"{BASE_URL}/api/boekhouding/crediteuren", headers=self.headers)
        if res.status_code == 200 and len(res.json()) > 0:
            self.crediteur_id = res.json()[0]["id"]
        else:
            self.crediteur_id = None
    
    def test_create_inkoopofferte(self):
        """Test creating an inkoopofferte"""
        if not self.crediteur_id:
            pytest.skip("No crediteur available for testing")
        
        offerte_data = {
            "leverancier_id": self.crediteur_id,
            "offertedatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Inkoopofferte Item",
                "aantal": 2,
                "prijs_per_stuk": 120.00,
                "btw_tarief": "10"
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/inkoop/offertes", 
                                headers=self.headers, json=offerte_data)
        
        assert response.status_code == 200, f"Failed to create offerte: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["status"] == "concept"
        print(f"Created inkoopofferte: {data['offertenummer']}")
        return data["id"]
    
    def test_update_inkoopofferte_concept(self):
        """Test updating a concept inkoopofferte (PUT)"""
        if not self.crediteur_id:
            pytest.skip("No crediteur available for testing")
        
        # Create a concept offerte
        offerte_data = {
            "leverancier_id": self.crediteur_id,
            "offertedatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Original Inkoop Offerte",
                "aantal": 1,
                "prijs_per_stuk": 80.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/inkoop/offertes", 
                                   headers=self.headers, json=offerte_data)
        assert create_res.status_code == 200
        offerte_id = create_res.json()["id"]
        
        # Update the offerte
        update_data = {
            "opmerkingen": "TEST_Updated inkoop offerte remarks",
            "regels": [{
                "omschrijving": "TEST_Updated Inkoop Offerte Item",
                "aantal": 6,
                "prijs_per_stuk": 150.00,
                "btw_tarief": "25"
            }]
        }
        
        update_res = requests.put(f"{BASE_URL}/api/inkoop/offertes/{offerte_id}", 
                                  headers=self.headers, json=update_data)
        
        assert update_res.status_code == 200, f"Failed to update offerte: {update_res.text}"
        updated = update_res.json()
        assert updated["opmerkingen"] == "TEST_Updated inkoop offerte remarks"
        assert updated["regels"][0]["omschrijving"] == "TEST_Updated Inkoop Offerte Item"
        print(f"Successfully updated inkoopofferte: {updated['offertenummer']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/inkoop/offertes/{offerte_id}", headers=self.headers)
    
    def test_update_inkoopofferte_verzonden(self):
        """Test updating a verzonden inkoopofferte (should work per backend code)"""
        if not self.crediteur_id:
            pytest.skip("No crediteur available for testing")
        
        # Create a concept offerte
        offerte_data = {
            "leverancier_id": self.crediteur_id,
            "offertedatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Verzonden Inkoop Offerte",
                "aantal": 1,
                "prijs_per_stuk": 100.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/inkoop/offertes", 
                                   headers=self.headers, json=offerte_data)
        assert create_res.status_code == 200
        offerte_id = create_res.json()["id"]
        
        # Change status to verzonden
        requests.put(f"{BASE_URL}/api/inkoop/offertes/{offerte_id}/status?status=verzonden", 
                     headers=self.headers)
        
        # Try to update - should work for inkoop offertes (concept or verzonden)
        update_data = {"opmerkingen": "TEST_Updated verzonden offerte"}
        update_res = requests.put(f"{BASE_URL}/api/inkoop/offertes/{offerte_id}", 
                                  headers=self.headers, json=update_data)
        
        assert update_res.status_code == 200, "Should be able to update verzonden inkoop offerte"
        print("Successfully updated verzonden inkoopofferte")
        
        # Cleanup
        requests.put(f"{BASE_URL}/api/inkoop/offertes/{offerte_id}/status?status=afgewezen", 
                     headers=self.headers)
        requests.delete(f"{BASE_URL}/api/inkoop/offertes/{offerte_id}", headers=self.headers)
    
    def test_delete_inkoopofferte_concept(self):
        """Test deleting a concept inkoopofferte"""
        if not self.crediteur_id:
            pytest.skip("No crediteur available for testing")
        
        # Create a concept offerte
        offerte_data = {
            "leverancier_id": self.crediteur_id,
            "offertedatum": "2026-01-15",
            "valuta": "SRD",
            "regels": [{
                "omschrijving": "TEST_Inkoop Offerte To Delete",
                "aantal": 1,
                "prijs_per_stuk": 40.00,
                "btw_tarief": "10"
            }]
        }
        
        create_res = requests.post(f"{BASE_URL}/api/inkoop/offertes", 
                                   headers=self.headers, json=offerte_data)
        assert create_res.status_code == 200
        offerte_id = create_res.json()["id"]
        
        # Delete the offerte
        delete_res = requests.delete(f"{BASE_URL}/api/inkoop/offertes/{offerte_id}", 
                                     headers=self.headers)
        
        assert delete_res.status_code == 200, f"Failed to delete offerte: {delete_res.text}"
        print("Successfully deleted concept inkoopofferte")
        
        # Verify deletion
        get_res = requests.get(f"{BASE_URL}/api/inkoop/offertes/{offerte_id}", headers=self.headers)
        assert get_res.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
