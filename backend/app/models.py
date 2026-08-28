from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator


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
    WAITING = "waiting"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    ISSUE = "issue"
    NOT_APPLICABLE = "not_applicable"


class Priority(str, Enum):
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    department: str
    initials: str
    active: bool = True
    mustChangePassword: bool = False


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PasswordChangeRequest(BaseModel):
    currentPassword: str = Field(min_length=8, max_length=128)
    newPassword: str = Field(min_length=10, max_length=128)


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    role: Role
    department: str = Field(min_length=2, max_length=100)
    temporaryPassword: str = Field(min_length=10, max_length=128)


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    role: Role | None = None
    department: str | None = Field(default=None, min_length=2, max_length=100)
    active: bool | None = None


class PasswordResetRequest(BaseModel):
    temporaryPassword: str = Field(min_length=10, max_length=128)


class CustomerCreate(BaseModel):
    companyName: str = Field(min_length=2, max_length=150)
    contactPerson: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=20)
    email: EmailStr | None = None
    address: str = Field(min_length=5, max_length=500)


class CustomerDocument(CustomerCreate):
    id: str
    active: bool = True
    createdAt: datetime
    updatedAt: datetime


class OrderCreate(BaseModel):
    customerId: str
    product: str = Field(min_length=2, max_length=200)
    quantity: int = Field(gt=0, le=10_000_000)
    amount: int = Field(ge=0)
    expectedDelivery: str
    priority: Priority = Priority.NORMAL
    notes: str | None = Field(default=None, max_length=1000)


class StageAction(str, Enum):
    START = "start"
    COMPLETE = "complete"
    PROGRESS = "progress"
    BLOCK = "block"
    RESOLVE = "resolve"


class StageUpdateRequest(BaseModel):
    action: StageAction
    completedQuantity: int | None = Field(default=None, ge=0)
    note: str | None = Field(default=None, max_length=500)
    data: dict[str, Any] = Field(default_factory=dict)
    expectedVersion: int = Field(ge=1)


class NoImageRequest(BaseModel):
    note: str = Field(min_length=3, max_length=500)
    expectedVersion: int = Field(ge=1)


class OrderCancelRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)
    expectedVersion: int = Field(ge=1)


class UploadIntentRequest(BaseModel):
    fileName: str = Field(min_length=1, max_length=200)
    contentType: str
    size: int = Field(gt=0, le=10 * 1024 * 1024)

    @field_validator("contentType")
    @classmethod
    def allowed_type(cls, value: str) -> str:
        if value not in {"image/jpeg", "image/png", "image/webp"}:
            raise ValueError("Only JPG, PNG, and WebP images are allowed.")
        return value


class SubmitReviewRequest(BaseModel):
    assetId: str


class StaffDecisionRequest(BaseModel):
    assetId: str
    decision: str
    channel: str
    customerName: str = Field(min_length=2, max_length=100)
    reason: str | None = Field(default=None, max_length=500)

    @field_validator("decision")
    @classmethod
    def valid_decision(cls, value: str) -> str:
        if value not in {"approved", "changes_requested"}:
            raise ValueError("Decision must be approved or changes_requested.")
        return value

    @field_validator("channel")
    @classmethod
    def valid_channel(cls, value: str) -> str:
        if value not in {"phone", "whatsapp", "in_person"}:
            raise ValueError("Choose phone, WhatsApp, or in-person confirmation.")
        return value


class PublicDecisionRequest(BaseModel):
    decision: str
    customerName: str = Field(min_length=2, max_length=100)
    reason: str | None = Field(default=None, max_length=500)


class OrderDocument(BaseModel):
    id: str
    orderNumber: str
    customerId: str
    customer: str
    contactPerson: str
    phone: str
    product: str
    quantity: int
    amount: int
    orderDate: str
    expectedDelivery: str
    priority: Priority
    currentStage: StageKey
    stages: dict[str, dict[str, Any]]
    version: int
    status: str = "active"
    notes: str | None = None
    createdAt: datetime
    updatedAt: datetime
    closedAt: datetime | None = None


class ApiMessage(BaseModel):
    message: str
