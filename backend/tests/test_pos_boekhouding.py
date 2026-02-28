"""
POS Module Tests - Boekhouding
Tests for Point of Sale functionality in the Surinaamse Boekhouding module
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPOSModule:
    """Test POS endpoints for Boekhouding module"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_auth_login(self):
        """Test authentication works"""
        assert hasattr(self, 'token'), "Token should be set after login"
        assert self.token is not None, "Token should not be None"
        print(f"✓ Authentication successful")
    
    def test_get_pos_products(self):
        """Test GET /api/boekhouding/pos/producten - Get products for POS"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/pos/producten")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ POS products endpoint works - {len(data)} products found")
        
        # If products exist, verify structure
        if len(data) > 0:
            product = data[0]
            assert "id" in product, "Product should have id"
            assert "naam" in product, "Product should have naam"
            print(f"  First product: {product.get('naam')} - {product.get('verkoopprijs', 0)} SRD")
    
    def test_get_artikelen(self):
        """Test GET /api/boekhouding/artikelen - Get all articles"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Artikelen endpoint works - {len(data)} articles found")
        
        # Store for later use
        self.artikelen = data
    
    def test_create_pos_sale_contant(self):
        """Test POST /api/boekhouding/pos/verkopen - Create POS sale with cash payment"""
        # First get products
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available for POS sale test")
        
        # Find a product with a price
        test_product = None
        for p in products:
            if p.get('verkoopprijs', 0) > 0 and p.get('type') != 'dienst':
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No product with price found for POS sale test")
        
        # Create sale data
        subtotaal = test_product.get('verkoopprijs', 100)
        btw_percentage = 10
        btw_bedrag = subtotaal * (btw_percentage / 100)
        totaal = subtotaal + btw_bedrag
        
        sale_data = {
            "type": "pos",
            "betaalmethode": "contant",
            "regels": [{
                "artikel_id": test_product.get('id'),
                "artikel_naam": test_product.get('naam'),
                "aantal": 1,
                "prijs_per_stuk": subtotaal,
                "btw_percentage": btw_percentage,
                "totaal": subtotaal
            }],
            "subtotaal": subtotaal,
            "btw_bedrag": btw_bedrag,
            "totaal": totaal,
            "status": "betaald"
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/pos/verkopen", json=sale_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Sale should have id"
        assert "bonnummer" in data, "Sale should have bonnummer"
        assert data.get("betaalmethode") == "contant", "Payment method should be contant"
        assert data.get("status") == "betaald", "Status should be betaald"
        
        print(f"✓ POS sale created successfully")
        print(f"  Bonnummer: {data.get('bonnummer')}")
        print(f"  Totaal: {data.get('totaal')} SRD")
        print(f"  Betaalmethode: {data.get('betaalmethode')}")
    
    def test_create_pos_sale_pin(self):
        """Test POST /api/boekhouding/pos/verkopen - Create POS sale with PIN payment"""
        # First get products
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available for POS sale test")
        
        # Find a product with a price
        test_product = None
        for p in products:
            if p.get('verkoopprijs', 0) > 0 and p.get('type') != 'dienst':
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No product with price found for POS sale test")
        
        # Create sale data
        subtotaal = test_product.get('verkoopprijs', 100)
        btw_percentage = 10
        btw_bedrag = subtotaal * (btw_percentage / 100)
        totaal = subtotaal + btw_bedrag
        
        sale_data = {
            "type": "pos",
            "betaalmethode": "pin",
            "regels": [{
                "artikel_id": test_product.get('id'),
                "artikel_naam": test_product.get('naam'),
                "aantal": 2,
                "prijs_per_stuk": subtotaal,
                "btw_percentage": btw_percentage,
                "totaal": subtotaal * 2
            }],
            "subtotaal": subtotaal * 2,
            "btw_bedrag": btw_bedrag * 2,
            "totaal": totaal * 2,
            "status": "betaald"
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/pos/verkopen", json=sale_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Sale should have id"
        assert "bonnummer" in data, "Sale should have bonnummer"
        assert data.get("betaalmethode") == "pin", "Payment method should be pin"
        
        print(f"✓ POS sale with PIN created successfully")
        print(f"  Bonnummer: {data.get('bonnummer')}")
        print(f"  Totaal: {data.get('totaal')} SRD")
    
    def test_dashboard_endpoint(self):
        """Test GET /api/boekhouding/dashboard - Dashboard KPIs"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/dashboard")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be a dict"
        print(f"✓ Dashboard endpoint works")
    
    def test_boekhouding_instellingen(self):
        """Test GET /api/boekhouding/instellingen - Get settings"""
        response = self.session.get(f"{BASE_URL}/api/boekhouding/instellingen")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be a dict"
        print(f"✓ Instellingen endpoint works")


class TestPOSDataPersistence:
    """Test that POS sales are properly persisted"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@facturatie.sr",
            "password": "demo2024"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_pos_sale_creates_voorraadmutatie(self):
        """Test that POS sale creates stock mutation"""
        # Get products first
        products_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        # Find a product with stock
        test_product = None
        for p in products:
            if p.get('verkoopprijs', 0) > 0 and p.get('type') != 'dienst':
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No suitable product found")
        
        initial_stock = test_product.get('voorraad', 0)
        
        # Create a sale
        sale_data = {
            "type": "pos",
            "betaalmethode": "contant",
            "regels": [{
                "artikel_id": test_product.get('id'),
                "artikel_naam": test_product.get('naam'),
                "aantal": 1,
                "prijs_per_stuk": test_product.get('verkoopprijs', 100),
                "btw_percentage": 10,
                "totaal": test_product.get('verkoopprijs', 100)
            }],
            "subtotaal": test_product.get('verkoopprijs', 100),
            "btw_bedrag": test_product.get('verkoopprijs', 100) * 0.1,
            "totaal": test_product.get('verkoopprijs', 100) * 1.1,
            "status": "betaald"
        }
        
        response = self.session.post(f"{BASE_URL}/api/boekhouding/pos/verkopen", json=sale_data)
        assert response.status_code == 200, f"Sale creation failed: {response.text}"
        
        sale = response.json()
        print(f"✓ POS sale created: {sale.get('bonnummer')}")
        
        # Verify stock was updated
        updated_product_response = self.session.get(f"{BASE_URL}/api/boekhouding/artikelen")
        updated_products = updated_product_response.json()
        
        updated_product = next((p for p in updated_products if p.get('id') == test_product.get('id')), None)
        
        if updated_product:
            new_stock = updated_product.get('voorraad', 0)
            print(f"  Stock before: {initial_stock}, after: {new_stock}")
            # Stock should decrease by 1
            assert new_stock == initial_stock - 1, f"Stock should decrease by 1"
            print(f"✓ Stock correctly updated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
