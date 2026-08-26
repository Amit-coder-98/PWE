from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def token(email: str = "admin@demo.com") -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": "admin123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_orders_require_login() -> None:
    assert client.get("/api/orders").status_code == 401


def test_admin_can_read_orders() -> None:
    response = client.get("/api/orders", headers={"Authorization": f"Bearer {token()}"})
    assert response.status_code == 200
    assert response.json()[0]["orderNumber"] == "ORD-2026-00125"


def test_wrong_department_cannot_update_stitching() -> None:
    printing_token = token("printing@demo.com")
    order = client.get("/api/orders/o125", headers={"Authorization": f"Bearer {printing_token}"}).json()
    response = client.post(
        "/api/orders/o125/stages/stitching",
        headers={"Authorization": f"Bearer {printing_token}"},
        json={"action": "complete", "expected_version": order["version"]},
    )
    assert response.status_code == 403


def test_completing_stitching_makes_packing_ready() -> None:
    stitching_token = token("stitching@demo.com")
    headers = {"Authorization": f"Bearer {stitching_token}"}
    order = client.get("/api/orders/o125", headers=headers).json()
    response = client.post(
        "/api/orders/o125/stages/stitching",
        headers=headers,
        json={"action": "complete", "expected_version": order["version"]},
    )
    assert response.status_code == 200
    assert response.json()["stages"]["packing"]["status"] == "ready"
