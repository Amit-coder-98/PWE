from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Role(str, Enum):
    ADMIN = "admin"
    ORDER_MANAGER = "order_manager"
    INVENTORY_MANAGER = "inventory_manager"
    DESIGNER = "designer"
    CUTTING_MANAGER = "cutting_manager"
    PLATE_OPERATOR = "plate_operator"
    PRINTING_OPERATOR = "printing_operator"
    STITCHING_MANAGER = "stitching_manager"
    PACKING_MANAGER = "packing_manager"
    ACCOUNTANT = "accountant"
    DISPATCH_MANAGER = "dispatch_manager"


class StageKey(str, Enum):
    ORDER = "order"
    MATERIAL = "material"
    DESIGN = "design"
    CUTTING = "cutting"
    PLATE = "plate"
    PRINTING = "printing"
    STITCHING = "stitching"
    PACKING = "packing"
    DC = "dc"
    BILLING = "billing"
    PAYMENT = "payment"
    DISPATCH = "dispatch"
    DELIVERY = "delivery"
    RETURN = "return"
    REFUND = "refund"


class StageStatus(str, Enum):
    NOT_STARTED = "not_started"
    WAITING = "waiting"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    ISSUE = "issue"
    NOT_APPLICABLE = "not_applicable"


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    department: str
    initials: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class StageAction(str, Enum):
    START = "start"
    COMPLETE = "complete"
    PROGRESS = "progress"
    RESOLVE = "resolve"


class StageUpdateRequest(BaseModel):
    action: StageAction
    completed_quantity: int | None = Field(default=None, ge=0)
    note: str | None = Field(default=None, max_length=500)
    expected_version: int = Field(ge=1)


class HealthResponse(BaseModel):
    status: str
    database: str


class OrderDocument(BaseModel):
    id: str
    orderNumber: str
    customer: str
    contactPerson: str = "Purchasing Manager"
    phone: str = "+91 90000 00000"
    product: str
    quantity: int
    amount: int
    orderDate: str = "2026-08-20"
    expectedDelivery: str = "2026-08-30"
    priority: str = "normal"
    currentStage: StageKey
    stages: dict[str, dict[str, Any]]
    activity: list[dict[str, Any]] = []
    version: int = 1
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
