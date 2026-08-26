from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings
from .models import HealthResponse, LoginRequest, LoginResponse, OrderDocument, Role, StageKey, StageStatus, StageUpdateRequest, UserPublic
from .repository import OrderRepository
from .workflow import DEPENDENCIES, assert_permission, assert_transition

settings = get_settings()
repository = OrderRepository(settings)
security = HTTPBearer(auto_error=False)
app = FastAPI(title="Prabodhan Bag Operations API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

USERS = [
    UserPublic(id="u1", name="System Administrator", email="admin@demo.com", role=Role.ADMIN, department="Administration", initials="SA"),
    UserPublic(id="u2", name="Neha Patil", email="order@demo.com", role=Role.ORDER_MANAGER, department="Order & CRM", initials="NP"),
    UserPublic(id="u3", name="Vijay More", email="inventory@demo.com", role=Role.INVENTORY_MANAGER, department="Material & Inventory", initials="VM"),
    UserPublic(id="u4", name="Pooja Shinde", email="designer@demo.com", role=Role.DESIGNER, department="Design", initials="PS"),
    UserPublic(id="u5", name="Ganesh Kale", email="cutting@demo.com", role=Role.CUTTING_MANAGER, department="Cutting", initials="GK"),
    UserPublic(id="u6", name="Rohit Jadhav", email="plate@demo.com", role=Role.PLATE_OPERATOR, department="Plate / Prepress", initials="RJ"),
    UserPublic(id="u8", name="Meena Deshmukh", email="stitching@demo.com", role=Role.STITCHING_MANAGER, department="Stitching", initials="MD"),
    UserPublic(id="u7", name="Sanjay Pawar", email="printing@demo.com", role=Role.PRINTING_OPERATOR, department="Printing", initials="SP"),
    UserPublic(id="u9", name="Asha Gaikwad", email="packing@demo.com", role=Role.PACKING_MANAGER, department="Packing & D.C.", initials="AG"),
    UserPublic(id="u10", name="Rakesh Joshi", email="accountant@demo.com", role=Role.ACCOUNTANT, department="Accounts", initials="RJ"),
    UserPublic(id="u11", name="Imran Shaikh", email="dispatch@demo.com", role=Role.DISPATCH_MANAGER, department="Dispatch & Delivery", initials="IS"),
]


def create_token(user: UserPublic) -> str:
    payload = {"sub": user.id, "role": user.role.value, "exp": datetime.now(timezone.utc) + timedelta(hours=8)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> UserPublic:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please sign in to continue.")
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
        return next(user for user in USERS if user.id == payload["sub"])
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session has expired. Please sign in again.") from exc


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", database=repository.mode)


@app.post("/api/auth/login", response_model=LoginResponse)
def login(request: LoginRequest) -> LoginResponse:
    user = next((item for item in USERS if item.email.lower() == request.email.lower()), None)
    if not user or request.password != "admin123":
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return LoginResponse(access_token=create_token(user), user=user)


@app.get("/api/orders", response_model=list[OrderDocument])
def list_orders(_: UserPublic = Depends(current_user)) -> list[dict]:
    return repository.list()


@app.get("/api/orders/{order_id}", response_model=OrderDocument)
def get_order(order_id: str, _: UserPublic = Depends(current_user)) -> dict:
    order = repository.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


@app.post("/api/orders/{order_id}/stages/{stage_key}", response_model=OrderDocument)
def update_stage(order_id: str, stage_key: StageKey, request: StageUpdateRequest, user: UserPublic = Depends(current_user)) -> dict:
    order = repository.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order["version"] != request.expected_version:
        raise HTTPException(status_code=409, detail="This order changed on another device. Refresh before trying again.")
    assert_permission(user.role, stage_key)
    assert_transition(order, stage_key, request.action, request.completed_quantity)
    stage = order["stages"][stage_key.value]
    now = datetime.now(timezone.utc).isoformat()
    if request.action.value == "start":
        stage.update(status=StageStatus.IN_PROGRESS.value, startedAt=now, progress=0)
    elif request.action.value == "progress":
        stage.update(completedQuantity=request.completed_quantity, progress=round((request.completed_quantity or 0) / order["quantity"] * 100))
    elif request.action.value == "resolve":
        stage.update(status=StageStatus.READY.value, note=request.note or "Issue resolved.")
    elif request.action.value == "complete":
        stage.update(status=StageStatus.COMPLETED.value, completedAt=now, progress=100, completedQuantity=order["quantity"])
        for candidate, required in DEPENDENCIES.items():
            if stage_key in required and all(order["stages"][dependency.value]["status"] == StageStatus.COMPLETED.value for dependency in required):
                if order["stages"][candidate.value]["status"] in {StageStatus.WAITING.value, StageStatus.NOT_STARTED.value}:
                    order["stages"][candidate.value]["status"] = StageStatus.READY.value
    order["activity"].insert(0, {"id": str(uuid4()), "at": now, "actor": user.name, "stage": stage_key.value, "message": f"{request.action.value.title()} {stage_key.value}."})
    active = next((key for key, value in order["stages"].items() if value["status"] in {"blocked", "issue", "in_progress", "ready"}), order["currentStage"])
    order["currentStage"] = active
    saved = repository.replace_versioned(order, request.expected_version)
    if not saved:
        raise HTTPException(status_code=409, detail="This order changed on another device. Refresh before trying again.")
    return saved
