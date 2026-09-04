from datetime import datetime, timezone
from uuid import uuid4

import mongomock
import pytest
from fastapi.testclient import TestClient
from pwdlib import PasswordHash

from app.config import Settings
from app.main import create_app
from app.models import Role, StageKey
from app.repository import MongoRepository
from app.workflow import assert_permission


class FakeStorage:
    ready = True

    def __init__(self):
        self.deleted = []

    def upload_url(self, key, content_type):
        return f"https://upload.test/{key}?type={content_type}"

    def view_url(self, key):
        return f"https://view.test/{key}"

    def verify_image(self, key, expected_type, expected_size):
        return {"size": expected_size, "contentType": expected_type, "width": 1200, "height": 800}

    def delete(self, key):
        self.deleted.append(key)


@pytest.fixture()
def system():
    database = mongomock.MongoClient(tz_aware=True).prabodhan_bag_test
    repository = MongoRepository(Settings(), database=database)
    timestamp = datetime.now(timezone.utc)
    repository.create_user({
        "id": "admin", "name": "Test Administrator", "email": "admin@test.example.com", "role": "admin",
        "department": "Administration", "initials": "TA", "passwordHash": PasswordHash.recommended().hash("Temporary123!"),
        "active": True, "mustChangePassword": False, "failedLoginCount": 0, "createdAt": timestamp, "updatedAt": timestamp,
    })
    settings = Settings(jwt_secret="test-secret-that-is-longer-than-thirty-two-characters", cookie_secure=False, cron_secret="cron-test-secret")
    client = TestClient(create_app(settings, repository, FakeStorage()))
    return client, repository


def login(client: TestClient, email="admin@test.example.com", password="Temporary123!"):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"x-csrf-token": client.cookies.get("pb_csrf")}


def create_order(client: TestClient, headers: dict):
    customer = client.post("/api/customers", headers=headers, json={
        "companyName": "Practical Test Industries", "contactPerson": "Ravi Patil", "phone": "9876543210",
        "email": "ravi@example.com", "address": "MIDC Industrial Area, Pune",
    })
    assert customer.status_code == 200, customer.text
    order = client.post("/api/orders", headers=headers, json={
        "customerId": customer.json()["id"], "product": "Printed Woven Bag", "quantity": 500,
        "amount": 245000, "expectedDelivery": "2026-09-30", "priority": "high",
    })
    assert order.status_code == 200, order.text
    return order.json()


def add_staff(repository: MongoRepository, user_id: str, role: str, email: str):
    timestamp = datetime.now(timezone.utc)
    repository.create_user({
        "id": user_id, "name": f"Test {role.replace('_', ' ').title()}", "email": email, "role": role,
        "department": role.replace("_", " ").title(), "initials": "TS",
        "passwordHash": PasswordHash.recommended().hash("Temporary123!"), "active": True,
        "mustChangePassword": False, "failedLoginCount": 0, "createdAt": timestamp, "updatedAt": timestamp,
    })


def test_empty_database_and_secure_login(system):
    client, repository = system
    assert repository.list_orders() == []
    assert client.get("/api/orders").status_code == 401
    headers = login(client)
    assert client.get("/api/auth/me").json()["role"] == "admin"
    assert headers["x-csrf-token"]


def test_customer_order_and_parallel_workflow(system):
    client, _ = system
    headers = login(client)
    order = create_order(client, headers)
    assert order["stages"]["material"]["status"] == "ready"
    assert order["stages"]["design"]["status"] == "ready"
    assert order["stages"]["cutting"]["status"] == "ready"
    assert order["stages"]["plate"]["status"] == "ready"
    assert order["stages"]["printing"]["status"] == "waiting"


@pytest.mark.parametrize(
    ("role", "stage"),
    [
        (Role.CUTTING_MASTER, StageKey.MATERIAL),
        (Role.CUTTING_MASTER, StageKey.CUTTING),
        (Role.DESIGNER, StageKey.DESIGN),
        (Role.TRANSPORT_MANAGER, StageKey.PLATE),
        (Role.PRINTING_OPERATOR, StageKey.PRINTING),
        (Role.MANAGER, StageKey.STITCHING),
        (Role.MANAGER, StageKey.PACKING),
        (Role.MANAGER, StageKey.DC),
        (Role.ACCOUNTANT, StageKey.BILLING),
        (Role.ACCOUNTANT, StageKey.PAYMENT),
        (Role.TRANSPORT_MANAGER, StageKey.DISPATCH),
        (Role.MARKETING, StageKey.DELIVERY),
    ],
)
def test_each_factory_role_only_owns_its_assigned_stage(role, stage):
    assert_permission(role, stage)


def test_csrf_and_role_protection(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    assert client.post(f"/api/orders/{order['id']}/stages/material", json={"action": "start", "expectedVersion": 1}).status_code == 403
    admin_denied = client.post(f"/api/orders/{order['id']}/stages/material", headers=headers, json={"action": "start", "expectedVersion": 1})
    assert admin_denied.status_code == 403
    add_staff(repository, "designer", "designer", "designer@test.example.com")
    client.post("/api/auth/logout", headers=headers)
    designer_headers = login(client, "designer@test.example.com")
    denied = client.post(f"/api/orders/{order['id']}/stages/material", headers=designer_headers, json={"action": "start", "expectedVersion": 1})
    assert denied.status_code == 403
    assert client.get("/api/customers").status_code == 403
    visible_order = client.get(f"/api/orders/{order['id']}")
    assert visible_order.status_code == 200
    assert visible_order.json()["amount"] == 0
    assert visible_order.json()["phone"] == ""


def test_marketing_can_book_orders_and_admin_can_delete_unused_users(system):
    client, repository = system
    headers = login(client)
    add_staff(repository, "marketing", "marketing", "marketing@test.example.com")
    add_staff(repository, "unused", "plate_operator", "unused@test.example.com")

    deleted = client.delete("/api/users/unused", headers=headers)
    assert deleted.status_code == 200, deleted.text
    assert repository.get_user("unused") is None
    assert client.delete("/api/users/admin", headers=headers).status_code == 422

    client.post("/api/auth/logout", headers=headers)
    marketing_headers = login(client, "marketing@test.example.com")
    customer = client.post("/api/customers", headers=marketing_headers, json={
        "companyName": "Marketing Customer", "contactPerson": "Meera Shah", "phone": "9876500000",
        "address": "Nashik, Maharashtra",
    })
    assert customer.status_code == 200, customer.text
    order = client.post("/api/orders", headers=marketing_headers, json={
        "customerId": customer.json()["id"], "product": "Printed PP bag", "quantity": 100,
        "amount": 25000, "expectedDelivery": "2026-09-30", "priority": "normal",
    })
    assert order.status_code == 200, order.text


def test_no_image_completes_design_but_plate_remains(system):
    client, _ = system
    headers = login(client)
    order = create_order(client, headers)
    response = client.post(f"/api/orders/{order['id']}/design/no-image", headers=headers, json={"note": "Customer requested a plain bag.", "expectedVersion": 1})
    assert response.status_code == 200, response.text
    assert response.json()["stages"]["design"]["status"] == "completed"
    assert response.json()["stages"]["plate"]["status"] == "ready"
    assert response.json()["stages"]["printing"]["status"] == "waiting"


def test_design_upload_and_customer_rejection_requires_reason(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    intent = client.post(f"/api/orders/{order['id']}/design-assets/upload-intent", headers=headers, json={"fileName": "bag.png", "contentType": "image/png", "size": 2048})
    assert intent.status_code == 200, intent.text
    asset_id = intent.json()["asset"]["id"]
    assert client.post(f"/api/design-assets/{asset_id}/complete", headers=headers).status_code == 200
    link = client.post(f"/api/orders/{order['id']}/design/review-link", headers=headers, json={"assetId": asset_id})
    token = link.json()["token"]
    assert client.get(f"/api/public/reviews/{token}").status_code == 200
    rejected = client.post(f"/api/public/reviews/{token}/decision", json={"decision": "changes_requested", "customerName": "Ravi Patil"})
    assert rejected.status_code == 422
    accepted = client.post(f"/api/public/reviews/{token}/decision", json={"decision": "changes_requested", "customerName": "Ravi Patil", "reason": "Make the logo larger."})
    assert accepted.status_code == 200
    assert repository.get_asset(asset_id)["status"] == "changes_requested"


def test_workflow_confirmation_endpoint_version_conflict(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    add_staff(repository, "inventory", "inventory_manager", "inventory@test.example.com")
    client.post("/api/auth/logout", headers=headers)
    headers = login(client, "inventory@test.example.com")
    started = client.post(f"/api/orders/{order['id']}/stages/material", headers=headers, json={"action": "start", "expectedVersion": 1})
    assert started.status_code == 200
    stale = client.post(f"/api/orders/{order['id']}/stages/material", headers=headers, json={"action": "complete", "expectedVersion": 1})
    assert stale.status_code == 409


def test_order_cancellation_closes_order_and_schedules_artwork_cleanup(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    response = client.post(
        f"/api/orders/{order['id']}/cancel",
        headers=headers,
        json={"reason": "Customer cancelled the requirement.", "expectedVersion": 1},
    )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "cancelled"
    assert response.json()["closedAt"] is not None
    assert repository.list_audit(order["id"])[0]["message"].startswith("Cancelled order")


def test_cleanup_endpoint_uses_authenticated_get(system):
    client, _ = system
    assert client.post("/api/cron/cleanup").status_code == 405
    assert client.get("/api/cron/cleanup").status_code == 401
    response = client.get("/api/cron/cleanup", headers={"Authorization": "Bearer cron-test-secret"})
    assert response.status_code == 200, response.text
