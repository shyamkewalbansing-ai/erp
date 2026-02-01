"""
Beauty Spa Module Backend Tests
Tests for CRM, Treatments, Appointments, Products, Staff, POS, Queue, Vouchers, Reports
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "shyam@kewalbansing.net"
TEST_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


# ==================== DASHBOARD TESTS ====================

def test_dashboard_loads(headers):
    """Test dashboard endpoint returns data"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/dashboard", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    # Verify dashboard structure
    assert "total_clients" in data
    assert "total_treatments" in data
    assert "total_staff" in data
    assert "total_products" in data
    assert "todays_appointments" in data
    assert "today_revenue" in data
    assert "month_revenue" in data
    assert "low_stock_count" in data
    assert "upcoming_appointments" in data
    print(f"Dashboard loaded: {data['total_clients']} clients, {data['total_treatments']} treatments")


# ==================== CLIENT/CRM TESTS ====================

def test_list_clients(headers):
    """Test listing clients"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/clients", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Listed {len(response.json())} clients")


def test_create_client(headers):
    """Test creating a new client"""
    client_data = {
        "name": f"TEST_Client_{uuid.uuid4().hex[:6]}",
        "phone": "+597 123456",
        "email": f"test_{uuid.uuid4().hex[:6]}@spa.test",
        "skin_type": "normaal",
        "allergies": ["latex"],
        "preferences": "Voorkeur voor ochtend afspraken",
        "membership_type": "silver"
    }
    
    response = requests.post(f"{BASE_URL}/api/beautyspa/clients", json=client_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    assert "id" in data
    assert data["name"] == client_data["name"]
    assert data["phone"] == client_data["phone"]
    assert data["skin_type"] == client_data["skin_type"]
    assert data["loyalty_points"] == 0
    print(f"Created client: {data['id']}")
    
    # Verify by GET
    get_response = requests.get(f"{BASE_URL}/api/beautyspa/clients/{data['id']}", headers=headers)
    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched["name"] == client_data["name"]


def test_update_client(headers):
    """Test updating a client"""
    # First create a client
    client_data = {
        "name": f"TEST_UpdateClient_{uuid.uuid4().hex[:6]}",
        "phone": "+597 999999"
    }
    create_response = requests.post(f"{BASE_URL}/api/beautyspa/clients", json=client_data, headers=headers)
    assert create_response.status_code == 200
    client_id = create_response.json()["id"]
    
    # Update the client
    update_data = {
        "name": "TEST_UpdatedName",
        "skin_type": "droog",
        "loyalty_points": 100
    }
    update_response = requests.put(f"{BASE_URL}/api/beautyspa/clients/{client_id}", json=update_data, headers=headers)
    assert update_response.status_code == 200
    
    # Verify update
    get_response = requests.get(f"{BASE_URL}/api/beautyspa/clients/{client_id}", headers=headers)
    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched["name"] == "TEST_UpdatedName"
    assert fetched["skin_type"] == "droog"
    print(f"Updated client: {client_id}")


def test_delete_client(headers):
    """Test deleting a client"""
    # Create a client to delete
    client_data = {
        "name": f"TEST_DeleteClient_{uuid.uuid4().hex[:6]}",
        "phone": "+597 111111"
    }
    create_response = requests.post(f"{BASE_URL}/api/beautyspa/clients", json=client_data, headers=headers)
    assert create_response.status_code == 200
    client_id = create_response.json()["id"]
    
    # Delete the client
    delete_response = requests.delete(f"{BASE_URL}/api/beautyspa/clients/{client_id}", headers=headers)
    assert delete_response.status_code == 200
    
    # Verify deletion
    get_response = requests.get(f"{BASE_URL}/api/beautyspa/clients/{client_id}", headers=headers)
    assert get_response.status_code == 404
    print(f"Deleted client: {client_id}")


# ==================== TREATMENT TESTS ====================

def test_list_treatments(headers):
    """Test listing treatments"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/treatments", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Listed {len(response.json())} treatments")


def test_create_treatment(headers):
    """Test creating a new treatment"""
    treatment_data = {
        "name": f"TEST_Massage_{uuid.uuid4().hex[:6]}",
        "category": "massage",
        "description": "Ontspannende massage",
        "duration_minutes": 60,
        "price_srd": 250.00,
        "required_staff": 1,
        "is_surinamese_special": True
    }
    
    response = requests.post(f"{BASE_URL}/api/beautyspa/treatments", json=treatment_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    assert "id" in data
    assert "message" in data
    print(f"Created treatment: {data['id']}")


def test_update_treatment(headers):
    """Test updating a treatment"""
    # Create treatment first
    treatment_data = {
        "name": f"TEST_UpdateTreatment_{uuid.uuid4().hex[:6]}",
        "category": "facial",
        "duration_minutes": 45,
        "price_srd": 150.00
    }
    create_response = requests.post(f"{BASE_URL}/api/beautyspa/treatments", json=treatment_data, headers=headers)
    assert create_response.status_code == 200
    treatment_id = create_response.json()["id"]
    
    # Update
    update_data = {
        "price_srd": 175.00,
        "duration_minutes": 50
    }
    update_response = requests.put(f"{BASE_URL}/api/beautyspa/treatments/{treatment_id}", json=update_data, headers=headers)
    assert update_response.status_code == 200
    print(f"Updated treatment: {treatment_id}")


def test_delete_treatment_soft(headers):
    """Test soft deleting a treatment"""
    # Create treatment
    treatment_data = {
        "name": f"TEST_DeleteTreatment_{uuid.uuid4().hex[:6]}",
        "category": "manicure",
        "duration_minutes": 30,
        "price_srd": 75.00
    }
    create_response = requests.post(f"{BASE_URL}/api/beautyspa/treatments", json=treatment_data, headers=headers)
    assert create_response.status_code == 200
    treatment_id = create_response.json()["id"]
    
    # Delete (soft delete)
    delete_response = requests.delete(f"{BASE_URL}/api/beautyspa/treatments/{treatment_id}", headers=headers)
    assert delete_response.status_code == 200
    print(f"Soft deleted treatment: {treatment_id}")


# ==================== STAFF TESTS ====================

def test_list_staff(headers):
    """Test listing staff"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/staff", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Listed {len(response.json())} staff members")


def test_create_staff(headers):
    """Test creating a new staff member"""
    staff_data = {
        "name": f"TEST_Staff_{uuid.uuid4().hex[:6]}",
        "phone": "+597 888888",
        "email": f"staff_{uuid.uuid4().hex[:6]}@spa.test",
        "role": "therapist",
        "specializations": ["Massage", "Facial"],
        "commission_percentage": 15.0,
        "salary_srd": 3000.00
    }
    
    response = requests.post(f"{BASE_URL}/api/beautyspa/staff", json=staff_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    assert "id" in data
    print(f"Created staff: {data['id']}")


def test_update_staff(headers):
    """Test updating a staff member"""
    # Create staff first
    staff_data = {
        "name": f"TEST_UpdateStaff_{uuid.uuid4().hex[:6]}",
        "phone": "+597 777777",
        "role": "receptionist"
    }
    create_response = requests.post(f"{BASE_URL}/api/beautyspa/staff", json=staff_data, headers=headers)
    assert create_response.status_code == 200
    staff_id = create_response.json()["id"]
    
    # Update
    update_data = {
        "role": "manager",
        "commission_percentage": 10.0
    }
    update_response = requests.put(f"{BASE_URL}/api/beautyspa/staff/{staff_id}", json=update_data, headers=headers)
    assert update_response.status_code == 200
    print(f"Updated staff: {staff_id}")


# ==================== PRODUCT TESTS ====================

def test_list_products(headers):
    """Test listing products"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/products", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Listed {len(response.json())} products")


def test_create_product(headers):
    """Test creating a new product"""
    product_data = {
        "name": f"TEST_Product_{uuid.uuid4().hex[:6]}",
        "category": "oil",
        "brand": "Test Brand",
        "purchase_price_srd": 50.00,
        "selling_price_srd": 100.00,
        "stock_quantity": 20,
        "min_stock_level": 5,
        "supplier": "Test Supplier"
    }
    
    response = requests.post(f"{BASE_URL}/api/beautyspa/products", json=product_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    assert "id" in data
    print(f"Created product: {data['id']}")


def test_adjust_stock(headers):
    """Test adjusting product stock"""
    # Create product first
    product_data = {
        "name": f"TEST_StockProduct_{uuid.uuid4().hex[:6]}",
        "category": "cream",
        "selling_price_srd": 80.00,
        "stock_quantity": 10,
        "min_stock_level": 3
    }
    create_response = requests.post(f"{BASE_URL}/api/beautyspa/products", json=product_data, headers=headers)
    assert create_response.status_code == 200
    product_id = create_response.json()["id"]
    
    # Adjust stock (add 5)
    adjust_response = requests.post(
        f"{BASE_URL}/api/beautyspa/products/{product_id}/adjust-stock?quantity=5&reason=Test%20restock",
        headers=headers
    )
    assert adjust_response.status_code == 200
    data = adjust_response.json()
    assert data["new_quantity"] == 15
    print(f"Adjusted stock for product: {product_id}, new quantity: 15")


def test_delete_product(headers):
    """Test deleting a product"""
    # Create product
    product_data = {
        "name": f"TEST_DeleteProduct_{uuid.uuid4().hex[:6]}",
        "category": "shampoo",
        "selling_price_srd": 45.00,
        "stock_quantity": 5
    }
    create_response = requests.post(f"{BASE_URL}/api/beautyspa/products", json=product_data, headers=headers)
    assert create_response.status_code == 200
    product_id = create_response.json()["id"]
    
    # Delete
    delete_response = requests.delete(f"{BASE_URL}/api/beautyspa/products/{product_id}", headers=headers)
    assert delete_response.status_code == 200
    print(f"Deleted product: {product_id}")


# ==================== APPOINTMENT TESTS ====================

def test_list_appointments(headers):
    """Test listing appointments"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/appointments", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Listed {len(response.json())} appointments")


def test_create_appointment(headers):
    """Test creating a new appointment"""
    # Create client
    client_response = requests.post(f"{BASE_URL}/api/beautyspa/clients", json={
        "name": f"TEST_AptClient_{uuid.uuid4().hex[:6]}",
        "phone": "+597 555555"
    }, headers=headers)
    assert client_response.status_code == 200
    client_id = client_response.json()["id"]
    
    # Create treatment
    treatment_response = requests.post(f"{BASE_URL}/api/beautyspa/treatments", json={
        "name": f"TEST_AptTreatment_{uuid.uuid4().hex[:6]}",
        "category": "massage",
        "duration_minutes": 60,
        "price_srd": 200.00
    }, headers=headers)
    assert treatment_response.status_code == 200
    treatment_id = treatment_response.json()["id"]
    
    # Create staff
    staff_response = requests.post(f"{BASE_URL}/api/beautyspa/staff", json={
        "name": f"TEST_AptStaff_{uuid.uuid4().hex[:6]}",
        "phone": "+597 444444",
        "role": "therapist"
    }, headers=headers)
    assert staff_response.status_code == 200
    staff_id = staff_response.json()["id"]
    
    # Create appointment
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    appointment_data = {
        "client_id": client_id,
        "treatment_id": treatment_id,
        "staff_id": staff_id,
        "appointment_date": tomorrow,
        "appointment_time": "10:00",
        "notes": "Test appointment",
        "is_walk_in": False
    }
    
    response = requests.post(f"{BASE_URL}/api/beautyspa/appointments", json=appointment_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    assert "id" in data
    print(f"Created appointment: {data['id']}")


def test_update_appointment(headers):
    """Test updating an appointment"""
    # Create client
    client_response = requests.post(f"{BASE_URL}/api/beautyspa/clients", json={
        "name": f"TEST_UpdAptClient_{uuid.uuid4().hex[:6]}",
        "phone": "+597 666666"
    }, headers=headers)
    client_id = client_response.json()["id"]
    
    # Create treatment
    treatment_response = requests.post(f"{BASE_URL}/api/beautyspa/treatments", json={
        "name": f"TEST_UpdAptTreatment_{uuid.uuid4().hex[:6]}",
        "category": "facial",
        "duration_minutes": 45,
        "price_srd": 150.00
    }, headers=headers)
    treatment_id = treatment_response.json()["id"]
    
    # Create staff
    staff_response = requests.post(f"{BASE_URL}/api/beautyspa/staff", json={
        "name": f"TEST_UpdAptStaff_{uuid.uuid4().hex[:6]}",
        "phone": "+597 333333",
        "role": "therapist"
    }, headers=headers)
    staff_id = staff_response.json()["id"]
    
    # Create appointment
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    create_response = requests.post(f"{BASE_URL}/api/beautyspa/appointments", json={
        "client_id": client_id,
        "treatment_id": treatment_id,
        "staff_id": staff_id,
        "appointment_date": tomorrow,
        "appointment_time": "14:00"
    }, headers=headers)
    assert create_response.status_code == 200
    appointment_id = create_response.json()["id"]
    
    # Update
    update_response = requests.put(f"{BASE_URL}/api/beautyspa/appointments/{appointment_id}", json={
        "status": "confirmed",
        "notes": "Updated notes"
    }, headers=headers)
    assert update_response.status_code == 200
    print(f"Updated appointment: {appointment_id}")


# ==================== POS/SALES TESTS ====================

def test_list_sales(headers):
    """Test listing sales"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/sales", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Listed {len(response.json())} sales")


def test_create_sale(headers):
    """Test creating a new sale"""
    # First create a treatment to sell
    treatment_response = requests.post(f"{BASE_URL}/api/beautyspa/treatments", json={
        "name": f"TEST_SaleTreatment_{uuid.uuid4().hex[:6]}",
        "category": "facial",
        "duration_minutes": 45,
        "price_srd": 150.00
    }, headers=headers)
    assert treatment_response.status_code == 200
    treatment_id = treatment_response.json()["id"]
    
    sale_data = {
        "items": [{
            "item_type": "treatment",
            "item_id": treatment_id,
            "item_name": "Test Treatment",
            "quantity": 1,
            "unit_price_srd": 150.00,
            "discount_percentage": 0
        }],
        "payment_method": "cash",
        "discount_percentage": 0
    }
    
    response = requests.post(f"{BASE_URL}/api/beautyspa/sales", json=sale_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    assert "id" in data
    assert "sale_number" in data
    assert "total_amount" in data
    assert data["total_amount"] == 150.00
    print(f"Created sale: {data['sale_number']}, total: SRD {data['total_amount']}")


# ==================== QUEUE TESTS ====================

def test_get_queue(headers):
    """Test getting current queue"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/queue", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Queue has {len(response.json())} items")


def test_add_to_queue(headers):
    """Test adding walk-in to queue"""
    # Create treatment first
    treatment_response = requests.post(f"{BASE_URL}/api/beautyspa/treatments", json={
        "name": f"TEST_QueueTreatment_{uuid.uuid4().hex[:6]}",
        "category": "manicure",
        "duration_minutes": 30,
        "price_srd": 75.00
    }, headers=headers)
    assert treatment_response.status_code == 200
    treatment_id = treatment_response.json()["id"]
    
    # Add to queue
    response = requests.post(
        f"{BASE_URL}/api/beautyspa/queue?client_name=TEST_WalkIn&treatment_id={treatment_id}&phone=+597123456",
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    
    assert "queue_number" in data
    print(f"Added to queue: #{data['queue_number']}")


# ==================== VOUCHER TESTS ====================

def test_list_vouchers(headers):
    """Test listing vouchers"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/vouchers", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Listed {len(response.json())} vouchers")


def test_create_voucher(headers):
    """Test creating a new voucher"""
    voucher_data = {
        "code": f"TEST{uuid.uuid4().hex[:6].upper()}",
        "discount_type": "percentage",
        "discount_value": 15.0,
        "valid_from": datetime.now().strftime("%Y-%m-%d"),
        "valid_until": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "max_uses": 10
    }
    
    response = requests.post(f"{BASE_URL}/api/beautyspa/vouchers", json=voucher_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    assert "id" in data
    print(f"Created voucher: {voucher_data['code']}")


def test_delete_voucher(headers):
    """Test deleting a voucher"""
    # Create voucher
    voucher_data = {
        "code": f"DEL{uuid.uuid4().hex[:6].upper()}",
        "discount_type": "fixed",
        "discount_value": 50.0,
        "valid_from": datetime.now().strftime("%Y-%m-%d"),
        "valid_until": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        "max_uses": 1
    }
    create_response = requests.post(f"{BASE_URL}/api/beautyspa/vouchers", json=voucher_data, headers=headers)
    assert create_response.status_code == 200
    voucher_id = create_response.json()["id"]
    
    # Delete
    delete_response = requests.delete(f"{BASE_URL}/api/beautyspa/vouchers/{voucher_id}", headers=headers)
    assert delete_response.status_code == 200
    print(f"Deleted voucher: {voucher_id}")


# ==================== REPORTS TESTS ====================

def test_revenue_report(headers):
    """Test revenue report"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/reports/revenue?period=month", headers=headers)
    assert response.status_code == 200
    data = response.json()
    
    assert "total_revenue" in data
    assert "total_transactions" in data
    assert "average_transaction" in data
    assert "by_payment_method" in data
    print(f"Revenue report: SRD {data['total_revenue']}, {data['total_transactions']} transactions")


def test_treatments_report(headers):
    """Test treatments report"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/reports/treatments", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Treatments report: {len(response.json())} treatments")


def test_products_report(headers):
    """Test products report"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/reports/products", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Products report: {len(response.json())} products")


def test_staff_report(headers):
    """Test staff report"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/reports/staff", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Staff report: {len(response.json())} staff members")


def test_clients_report(headers):
    """Test clients report"""
    response = requests.get(f"{BASE_URL}/api/beautyspa/reports/clients", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print(f"Clients report: {len(response.json())} clients")
