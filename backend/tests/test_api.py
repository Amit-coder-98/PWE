from datetime import datetime, timezone
from io import BytesIO
from unittest.mock import Mock
from uuid import uuid4

import mongomock
import pytest
from fastapi.testclient import TestClient
from pwdlib import PasswordHash
from PIL import Image

from app.config import Settings
from app.main import create_app
from app.models import Role, StageKey
from app.repository import MongoRepository
from app.storage import R2Storage
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
    settings = Settings(
        jwt_secret="test-secret-that-is-longer-than-thirty-two-characters",
        cookie_secure=False,
        cron_secret="cron-test-secret-that-is-longer-than-thirty-two-characters",
    )
    client = TestClient(create_app(settings, repository, FakeStorage()))
    return client, repository


def login(client: TestClient, email="admin@test.example.com", password="Temporary123!"):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"x-csrf-token": client.cookies.get("pb_csrf")}


def create_order(client: TestClient, headers: dict):
    customer = client.post("/api/customers", headers=headers, json={
        "companyName": "Practical Test Industries", "contactPerson": "Ravi Patil", "phone": "9876543210",
        "alternativePhone": "9876500000", "gstNumber": "27ABCDE1234F1Z5",
        "email": "ravi@example.com", "address": "MIDC Industrial Area, Pune",
    })
    assert customer.status_code == 200, customer.text
    order = client.post("/api/orders", headers=headers, json={
        "customerId": customer.json()["id"], "product": "Printed Woven Bag", "quantity": 500,
        "amount": 245000, "ratePerBag": 490, "advancePaid": 5000,
        "expectedDelivery": "2026-09-30", "priority": "high",
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
    assert order["stages"]["cutting"]["status"] == "waiting"
    assert order["stages"]["plate"]["status"] == "waiting"
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
    assert client.post(f"/api/orders/{order['id']}/stages/material", json={"action": "complete", "expectedVersion": 1}).status_code == 403
    admin_denied = client.post(f"/api/orders/{order['id']}/stages/material", headers=headers, json={"action": "complete", "expectedVersion": 1})
    assert admin_denied.status_code == 403
    add_staff(repository, "designer", "designer", "designer@test.example.com")
    client.post("/api/auth/logout", headers=headers)
    designer_headers = login(client, "designer@test.example.com")
    denied = client.post(f"/api/orders/{order['id']}/stages/material", headers=designer_headers, json={"action": "complete", "expectedVersion": 1})
    assert denied.status_code == 403
    assert client.get("/api/customers").status_code == 403
    visible_order = client.get(f"/api/orders/{order['id']}")
    assert visible_order.status_code == 200
    assert visible_order.json()["amount"] == 0
    assert visible_order.json()["ratePerBag"] is None
    assert visible_order.json()["advancePaid"] == 0
    assert visible_order.json()["remainingAmount"] == 0
    assert visible_order.json()["phone"] == ""
    assert visible_order.json()["alternativePhone"] is None
    assert visible_order.json()["gstNumber"] is None
    assert all(event["details"] == {} for event in visible_order.json()["activity"])


def test_worker_order_api_is_limited_to_current_assigned_work(system):
    client, repository = system
    admin_headers = login(client)
    order = create_order(client, admin_headers)
    add_staff(repository, "designer", "designer", "designer@test.example.com")
    add_staff(repository, "printer", "printing_operator", "printer@test.example.com")

    client.post("/api/auth/logout", headers=admin_headers)
    printer_headers = login(client, "printer@test.example.com")
    assert client.get("/api/orders").json() == []
    assert client.get(f"/api/orders/{order['id']}").status_code == 403

    client.post("/api/auth/logout", headers=printer_headers)
    designer_headers = login(client, "designer@test.example.com")
    listed = client.get("/api/orders")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [order["id"]]

    completed = client.post(
        f"/api/orders/{order['id']}/stages/design",
        headers=designer_headers,
        json={"action": "complete", "expectedVersion": order["version"]},
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["stages"]["design"]["status"] == "completed"
    assert completed.json()["stages"]["plate"]["status"] == "ready"
    assert client.get("/api/orders").json() == []
    assert client.get(f"/api/orders/{order['id']}").status_code == 403


def test_only_admin_and_marketing_can_list_customers(system):
    client, repository = system
    admin_headers = login(client)
    create_order(client, admin_headers)
    add_staff(repository, "accountant", "accountant", "accountant@test.example.com")
    add_staff(repository, "marketing", "marketing", "marketing@test.example.com")

    client.post("/api/auth/logout", headers=admin_headers)
    accountant_headers = login(client, "accountant@test.example.com")
    assert client.get("/api/customers").status_code == 403

    client.post("/api/auth/logout", headers=accountant_headers)
    login(client, "marketing@test.example.com")
    assert client.get("/api/customers").status_code == 200


def test_complete_role_by_role_production_workflow(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    accounts = {
        "cutting_master": "cutting@test.example.com",
        "designer": "designer@test.example.com",
        "transport_manager": "transport@test.example.com",
        "printing_operator": "printing@test.example.com",
        "manager": "manager@test.example.com",
        "accountant": "accountant@test.example.com",
        "marketing": "marketing@test.example.com",
    }
    for role, email in accounts.items():
        add_staff(repository, role, role, email)

    def sign_in(role: str, previous_headers: dict) -> dict:
        client.post("/api/auth/logout", headers=previous_headers)
        next_headers = login(client, accounts[role])
        assert client.get("/api/orders").status_code == 200
        return next_headers

    def complete(stage: str, current: dict, current_headers: dict, data: dict | None = None) -> dict:
        response = client.post(
            f"/api/orders/{current['id']}/stages/{stage}",
            headers=current_headers,
            json={"action": "complete", "data": data or {}, "expectedVersion": current["version"]},
        )
        assert response.status_code == 200, response.text
        return response.json()

    headers = sign_in("cutting_master", headers)
    order = complete("material", order, headers, {"materialAvailable": "yes"})
    assert order["stages"]["cutting"]["status"] == "ready"
    order = complete("cutting", order, headers)

    headers = sign_in("designer", headers)
    order = complete("design", order, headers)
    assert order["stages"]["plate"]["status"] == "ready"

    headers = sign_in("transport_manager", headers)
    order = complete("plate", order, headers)
    assert order["stages"]["printing"]["status"] == "ready"

    headers = sign_in("printing_operator", headers)
    order = complete("printing", order, headers, {"qualityChecked": True})
    assert order["currentStage"] == "stitching"
    assert order["stages"]["stitching"]["status"] == "ready"

    headers = sign_in("manager", headers)
    order = complete("stitching", order, headers)
    assert order["currentStage"] == "packing"
    order = complete("packing", order, headers)
    assert order["currentStage"] == "dc"
    order = complete("dc", order, headers)

    headers = sign_in("accountant", headers)
    order = complete("billing", order, headers)
    assert order["stages"]["billing"]["data"] == {}
    order = complete("payment", order, headers)
    assert order["stages"]["payment"]["data"] == {}

    headers = sign_in("transport_manager", headers)
    order = complete("dispatch", order, headers, {"vehicleNumber": "MH13AB1234"})
    assert order["currentStage"] == "delivery"

    headers = sign_in("marketing", headers)
    order = complete("delivery", order, headers, {"receivedBy": "Ravi Patil"})
    assert order["status"] == "completed"
    assert order["stages"]["delivery"]["status"] == "completed"
    assert order["currentStage"] == "delivery"
    assert order["stages"]["return"]["status"] == "waiting"
    assert order["stages"]["refund"]["status"] == "waiting"


def test_legacy_delivered_order_is_presented_as_delivery_without_rewriting_it(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    repository.db.orders.update_one({"id": order["id"]}, {"$set": {
        "status": "completed", "currentStage": "return", "stages.delivery.status": "completed",
        "stages.return.status": "ready",
    }})
    response = client.get(f"/api/orders/{order['id']}")
    assert response.status_code == 200
    assert response.json()["currentStage"] == "delivery"
    assert repository.get_order(order["id"])["currentStage"] == "return"


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


def test_admin_can_edit_active_order_booking_details(system):
    client, _ = system
    headers = login(client)
    order = create_order(client, headers)
    response = client.patch(
        f"/api/orders/{order['id']}",
        headers=headers,
        json={
            "customerId": order["customerId"],
            "product": "Updated Printed Woven Bag",
            "quantity": 600,
            "amount": 300000,
            "bagType": "PP woven bag",
            "bagSize": "25 kg",
            "printingColor": "Blue",
            "ratePerBag": 500,
            "advancePaid": 50000,
            "primaryPhone": "9876543210",
            "alternativePhone": "9876500000",
            "gstNumber": "27ABCDE1234F1Z5",
            "expectedDelivery": "2026-10-05",
            "priority": "urgent",
            "notes": "Updated customer instruction",
            "expectedVersion": order["version"],
        },
    )
    assert response.status_code == 200, response.text
    saved = response.json()
    assert saved["quantity"] == 600
    assert saved["remainingAmount"] == 250000
    assert saved["version"] == 2


@pytest.mark.parametrize("role", ["admin", "marketing"])
def test_bag_specification_create_edit_list_and_detail(system, role):
    client, repository = system
    headers = login(client)
    existing = create_order(client, headers)
    if role == "marketing":
        add_staff(repository, "marketing", "marketing", "marketing@test.example.com")
        client.post("/api/auth/logout", headers=headers)
        headers = login(client, "marketing@test.example.com")
    payload = {"customerId": existing["customerId"], "product": "D cut 65gsm", "bagType": "D cut 65gsm", "gsm": 65,
               "bagColor": "White", "printingColor": "Blue", "quantity": 1200, "amount": 8940, "ratePerBag": 7.45, "expectedDelivery": "2026-10-10"}
    response = client.post("/api/orders", headers=headers, json=payload)
    assert response.status_code == 200, response.text
    created = response.json()
    assert created["gsm"] == 65
    assert created["bagColor"] == "White"
    assert repository.get_order(created["id"])["gsm"] == 65
    for path in ["/api/orders", f"/api/orders/{created['id']}"]:
        result = client.get(path).json()
        item = next(order for order in result if order["id"] == created["id"]) if isinstance(result, list) else result
        assert (item["bagColor"], item["printingColor"], item["gsm"]) == ("White", "Blue", 65)
    updated = client.patch(f"/api/orders/{created['id']}", headers=headers,
                           json={**payload, "expectedVersion": created["version"], "gsm": 80.5, "bagColor": "Natural"})
    assert updated.status_code == 200, updated.text
    assert (updated.json()["gsm"], updated.json()["bagColor"], updated.json()["printingColor"]) == (80.5, "Natural", "Blue")
    omitted = {key: value for key, value in payload.items() if key not in {"gsm", "bagColor"}}
    unchanged = client.patch(f"/api/orders/{created['id']}", headers=headers,
                             json={**omitted, "expectedVersion": updated.json()["version"]})
    assert unchanged.status_code == 200, unchanged.text
    assert (unchanged.json()["gsm"], unchanged.json()["bagColor"]) == (80.5, "Natural")
    cleared = client.patch(f"/api/orders/{created['id']}", headers=headers,
                           json={**payload, "expectedVersion": unchanged.json()["version"], "gsm": None, "bagColor": None})
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["gsm"] is None
    assert cleared.json()["bagColor"] is None


@pytest.mark.parametrize("field,value", [("gsm", 0), ("gsm", -1), ("gsm", "not a number"), ("gsm", "Infinity"), ("gsm", "NaN"), ("bagColor", "x" * 101)])
def test_invalid_bag_specification_is_rejected_without_creating_records(system, field, value):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    payload = {"customerId": order["customerId"], "product": "Paper bag", "quantity": 100, "amount": 500, "expectedDelivery": "2026-10-10", field: value}
    response = client.post("/api/orders", headers=headers, json=payload)
    assert response.status_code == 422, response.text
    assert response.json()["fields"][0]["field"] == field
    assert len(repository.list_orders()) == 1


def test_legacy_orders_remain_readable_and_keep_existing_type(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    repository.db.orders.update_one({"id": order["id"]}, {"$set": {"bagType": "PP woven bag"}, "$unset": {"gsm": "", "bagColor": ""}})
    listed = client.get("/api/orders").json()[0]
    assert listed["bagType"] == "PP woven bag"
    assert listed["gsm"] is None and listed["bagColor"] is None
    assert "gsm" not in repository.get_order(order["id"])
    edited = client.patch(f"/api/orders/{order['id']}", headers=headers,
                          json={"customerId": order["customerId"], "product": "PP woven bag", "bagType": "PP woven bag", "quantity": order["quantity"], "amount": order["amount"], "expectedDelivery": order["expectedDelivery"], "expectedVersion": order["version"]})
    assert edited.status_code == 200, edited.text
    assert edited.json()["bagType"] == "PP woven bag"


@pytest.mark.parametrize("rate,quantity,amount,advance,due", [
    (7.45, 1200, 8940, 0, 8940),
    (7.45, 3, 22.35, 10.25, 12.10),
    (0.29, 3, 0.87, 0.10, 0.77),
    (490, 500, 245000, 5000, 240000),
])
def test_decimal_pricing_create_edit_and_read(system, rate, quantity, amount, advance, due):
    client, repository = system
    headers = login(client)
    existing = create_order(client, headers)
    payload = {
        "customerId": existing["customerId"], "product": "Paper bag",
        "quantity": quantity, "ratePerBag": rate, "amount": amount,
        "advancePaid": advance, "expectedDelivery": "2026-10-10",
    }
    response = client.post("/api/orders", headers=headers, json=payload)
    assert response.status_code == 200, response.text
    created = response.json()
    assert created["ratePerBag"] == rate
    assert created["amount"] == amount
    assert created["remainingAmount"] == due
    assert repository.get_order(created["id"])["remainingAmount"] == due
    assert client.get(f"/api/orders/{created['id']}").json()["ratePerBag"] == rate
    edited = client.patch(f"/api/orders/{created['id']}", headers=headers,
                          json={**payload, "expectedVersion": created["version"], "advancePaid": 0})
    assert edited.status_code == 200, edited.text
    assert edited.json()["remainingAmount"] == amount
    assert edited.json()["ratePerBag"] == rate
    assert edited.json()["version"] == created["version"] + 1


@pytest.mark.parametrize("field,value", [("ratePerBag", -7.45), ("ratePerBag", 7.451), ("amount", -1), ("advancePaid", -0.1), ("quantity", 1.5)])
def test_invalid_order_numbers_return_specific_field_without_creating_order(system, field, value):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    payload = {"customerId": order["customerId"], "product": "Paper bag", "quantity": 1200,
               "ratePerBag": 7.45, "amount": 8940, "advancePaid": 0, "expectedDelivery": "2026-10-10"}
    payload[field] = value
    response = client.post("/api/orders", headers=headers, json=payload)
    assert response.status_code == 422, response.text
    assert response.json()["fields"][0]["field"] == field
    assert len(repository.list_orders()) == 1


def test_decimal_advance_cannot_exceed_total(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    response = client.post("/api/orders", headers=headers, json={
        "customerId": order["customerId"], "product": "Paper bag", "quantity": 3,
        "ratePerBag": 7.45, "amount": 22.35, "advancePaid": 22.36,
        "expectedDelivery": "2026-10-10",
    })
    assert response.status_code == 422, response.text
    assert "Advance payment" in response.json()["message"]
    assert len(repository.list_orders()) == 1


def test_no_image_completes_design_but_plate_remains(system):
    client, _ = system
    headers = login(client)
    order = create_order(client, headers)
    response = client.post(f"/api/orders/{order['id']}/design/no-image", headers=headers, json={"note": "Customer requested a plain bag.", "expectedVersion": 1})
    assert response.status_code == 200, response.text
    assert response.json()["stages"]["design"]["status"] == "completed"
    assert response.json()["stages"]["plate"]["status"] == "ready"
    assert response.json()["stages"]["printing"]["status"] == "waiting"


def test_legacy_customer_review_still_requires_rejection_reason(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    intent = client.post(f"/api/orders/{order['id']}/design-assets/upload-intent", headers=headers, json={"fileName": "bag.png", "contentType": "image/png", "size": 2048})
    assert intent.status_code == 200, intent.text
    asset_id = intent.json()["asset"]["id"]
    assert client.post(f"/api/design-assets/{asset_id}/complete", headers=headers).status_code == 200
    # Preserve coverage for older artwork that entered the review workflow.
    repository.update_asset(asset_id, {"status": "available"})
    link = client.post(f"/api/orders/{order['id']}/design/review-link", headers=headers, json={"assetId": asset_id})
    token = link.json()["token"]
    assert client.get(f"/api/public/reviews/{token}").status_code == 200
    rejected = client.post(f"/api/public/reviews/{token}/decision", json={"decision": "changes_requested", "customerName": "Ravi Patil"})
    assert rejected.status_code == 422
    accepted = client.post(f"/api/public/reviews/{token}/decision", json={"decision": "changes_requested", "customerName": "Ravi Patil", "reason": "Make the logo larger."})
    assert accepted.status_code == 200
    assert repository.get_asset(asset_id)["status"] == "changes_requested"


@pytest.mark.parametrize("image_format,detected_type", [("JPEG", "image/jpeg"), ("PNG", "image/png"), ("WEBP", "image/webp")])
@pytest.mark.parametrize("asset_type", ["design", "payment_proof"])
def test_real_image_upload_complete_and_view(system, monkeypatch, image_format, detected_type, asset_type):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    buffer = BytesIO()
    Image.new("RGB", (16, 12), "blue").save(buffer, format=image_format)
    body = buffer.getvalue()
    r2 = R2Storage(Settings(r2_account_id=None, r2_access_key_id=None, r2_secret_access_key=None, r2_bucket=None))
    r2.bucket = "test-private"
    r2.client = Mock()
    r2.client.head_object.return_value = {"ContentLength": len(body), "ContentType": "image/jpeg"}
    r2.client.get_object.return_value = {"Body": BytesIO(body)}
    monkeypatch.setattr(client.app.state.storage, "verify_image", r2.verify_image)
    intent = client.post(
        f"/api/orders/{order['id']}/design-assets/upload-intent", headers=headers,
        json={"fileName": "renamed.jpg", "contentType": "image/jpeg", "size": len(body), "assetType": asset_type},
    )
    assert intent.status_code == 200, intent.text
    asset_id = intent.json()["asset"]["id"]
    result = client.post(f"/api/design-assets/{asset_id}/complete", headers=headers)
    assert result.status_code == 200, result.text
    assert result.json()["status"] == ("available" if asset_type == "payment_proof" else "approved")
    assert repository.get_asset(asset_id)["contentType"] == detected_type
    assert client.get(f"/api/design-assets/{asset_id}/view-url").status_code == 200
    assert client.app.state.storage.deleted == []
    if asset_type == "design":
        saved_order = repository.get_order(order["id"])
        assert saved_order["stages"]["design"]["status"] == "ready"
        assert saved_order["stages"]["plate"]["status"] == "waiting"
        review = client.post(f"/api/orders/{order['id']}/design/review-link", headers=headers, json={"assetId": asset_id})
        assert review.status_code == 422, review.text


@pytest.mark.parametrize("uploader_role", ["admin", "marketing"])
def test_staff_upload_is_approved_and_designer_can_view_then_prepare(system, uploader_role):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    add_staff(repository, "designer", "designer", "designer@test.example.com")
    if uploader_role == "marketing":
        add_staff(repository, "marketing", "marketing", "marketing@test.example.com")
        client.post("/api/auth/logout", headers=headers)
        headers = login(client, "marketing@test.example.com")
    design = client.post(f"/api/orders/{order['id']}/design-assets/upload-intent", headers=headers,
                         json={"fileName": "approved.jpg", "contentType": "image/jpeg", "size": 2048}).json()["asset"]
    completed = client.post(f"/api/design-assets/{design['id']}/complete", headers=headers)
    assert completed.status_code == 200, completed.text
    assert completed.json()["status"] == "approved"
    assert completed.json()["approvalSource"] == "staff_upload"
    assert repository.get_order(order["id"])["version"] == order["version"]
    assert repository.get_order(order["id"])["stages"]["design"]["status"] == "ready"
    client.post("/api/auth/logout", headers=headers)
    designer_headers = login(client, "designer@test.example.com")
    visible = client.get(f"/api/orders/{order['id']}")
    assert visible.status_code == 200, visible.text
    assert [asset["id"] for asset in visible.json()["designAssets"]] == [design["id"]]
    assert client.get(f"/api/design-assets/{design['id']}/view-url").status_code == 200
    assert client.post(f"/api/orders/{order['id']}/design-assets/upload-intent", headers=designer_headers,
                       json={"fileName": "other.jpg", "contentType": "image/jpeg", "size": 2048}).status_code == 403
    assert client.post(f"/api/orders/{order['id']}/design/review-link", headers=designer_headers,
                       json={"assetId": design["id"]}).status_code == 403
    prepared = client.post(f"/api/orders/{order['id']}/stages/design", headers=designer_headers,
                           json={"action": "complete", "expectedVersion": visible.json()["version"]})
    assert prepared.status_code == 200, prepared.text
    assert prepared.json()["stages"]["design"]["status"] == "completed"
    assert prepared.json()["stages"]["plate"]["status"] == "ready"
    assert prepared.json()["stages"]["printing"]["status"] == "waiting"


def test_private_asset_view_requires_order_and_role_access(system):
    client, repository = system
    admin_headers = login(client)
    order = create_order(client, admin_headers)
    design = client.post(
        f"/api/orders/{order['id']}/design-assets/upload-intent",
        headers=admin_headers,
        json={"fileName": "bag.png", "contentType": "image/png", "size": 2048},
    ).json()["asset"]
    assert client.post(f"/api/design-assets/{design['id']}/complete", headers=admin_headers).status_code == 200
    proof = client.post(
        f"/api/orders/{order['id']}/design-assets/upload-intent",
        headers=admin_headers,
        json={"fileName": "proof.png", "contentType": "image/png", "size": 1024, "assetType": "payment_proof"},
    ).json()["asset"]
    assert client.post(f"/api/design-assets/{proof['id']}/complete", headers=admin_headers).status_code == 200
    add_staff(repository, "designer", "designer", "designer@test.example.com")

    client.post("/api/auth/logout", headers=admin_headers)
    login(client, "designer@test.example.com")
    assert client.get(f"/api/design-assets/{design['id']}/view-url").status_code == 200
    assert client.get(f"/api/design-assets/{proof['id']}/view-url").status_code == 403
    detail = client.get(f"/api/orders/{order['id']}").json()
    assert detail["paymentProofs"] == []
    assert [asset["id"] for asset in detail["designAssets"]] == [design["id"]]


def test_marketing_can_upload_private_payment_proof_without_creating_design_version(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    add_staff(repository, "marketing", "marketing", "marketing@test.example.com")
    client.post("/api/auth/logout", headers=headers)
    marketing_headers = login(client, "marketing@test.example.com")

    intent = client.post(
        f"/api/orders/{order['id']}/design-assets/upload-intent",
        headers=marketing_headers,
        json={
            "fileName": "advance-receipt.png",
            "contentType": "image/png",
            "size": 2048,
            "assetType": "payment_proof",
        },
    )
    assert intent.status_code == 200, intent.text
    proof_id = intent.json()["asset"]["id"]
    assert intent.json()["asset"]["assetType"] == "payment_proof"
    assert client.post(f"/api/design-assets/{proof_id}/complete", headers=marketing_headers).status_code == 200
    assert repository.get_asset(proof_id)["status"] == "available"
    assert repository.list_assets(order["id"]) == []
    assert repository.list_audit(order["id"])[0]["message"] == "Uploaded advance payment proof."
    detail = client.get(f"/api/orders/{order['id']}").json()
    assert [asset["id"] for asset in detail["paymentProofs"]] == [proof_id]
    assert detail["designAssets"] == []
    assert client.get(f"/api/design-assets/{proof_id}/view-url").status_code == 200


@pytest.mark.parametrize("role,allowed,stage", [
    ("admin", True, "material"), ("marketing", True, "delivery"),
    ("accountant", True, "billing"), ("designer", False, "design"),
    ("cutting_master", False, "cutting"), ("transport_manager", False, "plate"),
    ("printing_operator", False, "printing"), ("manager", False, "stitching"),
])
def test_payment_proof_detail_and_signed_view_are_role_scoped(system, role, allowed, stage):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    proof = client.post(f"/api/orders/{order['id']}/design-assets/upload-intent", headers=headers,
                        json={"fileName": "receipt.png", "contentType": "image/png", "size": 1234, "assetType": "payment_proof"}).json()["asset"]
    assert client.post(f"/api/design-assets/{proof['id']}/complete", headers=headers).status_code == 200
    # Give each worker actual access to the order. Privacy must be enforced
    # independently of whether their department owns the current task.
    repository.db.orders.update_one({"id": order["id"]}, {"$set": {f"stages.{stage}.status": "ready"}})
    if role != "admin":
        add_staff(repository, "viewer", role, "viewer@test.example.com")
        client.post("/api/auth/logout", headers=headers)
        login(client, "viewer@test.example.com")
    detail = client.get(f"/api/orders/{order['id']}")
    assert detail.status_code == 200, detail.text
    assert [asset["id"] for asset in detail.json()["paymentProofs"]] == ([proof["id"]] if allowed else [])
    assert all(asset["assetType"] != "payment_proof" for asset in detail.json()["designAssets"])
    assert client.get(f"/api/design-assets/{proof['id']}/view-url").status_code == (200 if allowed else 403)


def test_existing_payment_proof_is_visible_on_closed_orders_without_backfill(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    # An already-stored screenshot from before the View UI was added.
    repository.db.design_assets.insert_one({"id": "old-proof", "orderId": order["id"], "assetType": "payment_proof", "status": "available", "fileName": "old-receipt.png", "objectKey": "payment-proofs/old.png", "createdAt": datetime.now(timezone.utc)})
    repository.db.orders.update_one({"id": order["id"]}, {"$set": {"status": "completed"}})
    assert client.get(f"/api/orders/{order['id']}").json()["paymentProofs"][0]["id"] == "old-proof"
    assert client.get("/api/design-assets/old-proof/view-url").status_code == 200
    for status in ["pending", "rejected", "deleted"]:
        repository.db.design_assets.update_one({"id": "old-proof"}, {"$set": {"status": status}})
        assert client.get("/api/design-assets/old-proof/view-url").status_code == 404


def test_booking_identity_survives_response_models_and_legacy_enrichment_is_read_only(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    assert order["createdBy"] == "admin"
    assert order["createdByName"] == "Test Administrator"
    assert order["createdByRole"] == "admin"
    assert client.get("/api/orders").json()[0]["createdBy"] == "admin"
    repository.db.orders.update_one({"id": order["id"]}, {"$unset": {"createdByName": "", "createdByRole": ""}})
    for path in ["/api/orders", f"/api/orders/{order['id']}"]:
        response = client.get(path)
        item = response.json()[0] if path == "/api/orders" else response.json()
        assert item["createdByName"] == "Test Administrator"
        assert item["createdByRole"] == "admin"
    assert "createdByName" not in repository.get_order(order["id"])


def test_five_marketing_users_have_independent_names_and_booking_ids(system):
    client, repository = system
    headers = login(client)
    people = []
    for index in range(5):
        response = client.post("/api/users", headers=headers, json={
            "name": "  Ganesh Kalekar  " if index == 0 else f"Marketing Person {index + 1}",
            "email": f"marketing{index + 1}@test.example.com", "role": "marketing", "department": "Marketing",
            "temporaryPassword": "Temporary123!",
        })
        assert response.status_code == 200, response.text
        people.append(response.json())
    assert len({person["id"] for person in people}) == 5
    assert people[0]["name"] == "Ganesh Kalekar"
    assert people[0]["initials"] == "GK"
    repository.update_user(people[0]["id"], {"mustChangePassword": False})
    client.post("/api/auth/logout", headers=headers)
    marketing_headers = login(client, people[0]["email"])
    order = create_order(client, marketing_headers)
    assert order["createdBy"] == people[0]["id"]
    assert order["createdByName"] == "Ganesh Kalekar"
    assert order["createdByRole"] == "marketing"
    client.post("/api/auth/logout", headers=marketing_headers)
    headers = login(client)
    renamed = client.patch(f"/api/users/{people[0]['id']}", headers=headers, json={"name": "  Ganesh Newname  "})
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["initials"] == "GN"
    assert client.get("/api/orders").json()[0]["createdBy"] == people[0]["id"]
    assert repository.get_order(order["id"])["createdByName"] == "Ganesh Kalekar"
    assert client.patch(f"/api/users/{people[0]['id']}", headers=headers, json={"name": "   "}).status_code == 422


def test_workflow_confirmation_endpoint_version_conflict(system):
    client, repository = system
    headers = login(client)
    order = create_order(client, headers)
    add_staff(repository, "inventory", "inventory_manager", "inventory@test.example.com")
    client.post("/api/auth/logout", headers=headers)
    headers = login(client, "inventory@test.example.com")
    legacy_action = client.post(f"/api/orders/{order['id']}/stages/material", headers=headers, json={"action": "start", "expectedVersion": 1})
    assert legacy_action.status_code == 422
    completed = client.post(f"/api/orders/{order['id']}/stages/material", headers=headers, json={"action": "complete", "expectedVersion": 1})
    assert completed.status_code == 200
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
    response = client.get(
        "/api/cron/cleanup",
        headers={"Authorization": "Bearer cron-test-secret-that-is-longer-than-thirty-two-characters"},
    )
    assert response.status_code == 200, response.text


def test_cleanup_rejects_placeholder_secret():
    database = mongomock.MongoClient(tz_aware=True).prabodhan_bag_test
    repository = MongoRepository(Settings(), database=database)
    settings = Settings(
        jwt_secret="test-secret-that-is-longer-than-thirty-two-characters",
        cookie_secure=False,
        cron_secret="REPLACE_WITH_A_NEW_LONG_RANDOM_SECRET_AT_LEAST_32_CHARACTERS",
    )
    client = TestClient(create_app(settings, repository, FakeStorage()))
    response = client.get(
        "/api/cron/cleanup",
        headers={"Authorization": f"Bearer {settings.cron_secret}"},
    )
    assert response.status_code == 503
