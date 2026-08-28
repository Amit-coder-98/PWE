import hashlib
import secrets
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import jwt
from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pwdlib import PasswordHash
from pymongo.errors import DuplicateKeyError

from .config import Settings, get_settings
from .models import (
    ApiMessage, CustomerCreate, CustomerDocument, LoginRequest, NoImageRequest, OrderCancelRequest, OrderCreate, OrderDocument,
    PasswordChangeRequest, PasswordResetRequest, PublicDecisionRequest, Role, StaffDecisionRequest, StageKey,
    StageStatus, StageUpdateRequest, SubmitReviewRequest, UploadIntentRequest, UserCreate, UserPublic, UserUpdate,
)
from .repository import MongoRepository, now
from .storage import R2Storage
from .workflow import apply_action, assert_permission, refresh_ready_states

password_hash = PasswordHash.recommended()


def hash_token(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def initials(name: str) -> str:
    return "".join(part[0] for part in name.split()[:2]).upper()


def create_app(settings_override: Settings | None = None, repository_override: MongoRepository | None = None,
               storage_override: R2Storage | None = None) -> FastAPI:
    settings = settings_override or get_settings()
    repository = repository_override or MongoRepository(settings)
    storage = storage_override or R2Storage(settings)
    application = FastAPI(title="Prabodhan Bag Operations API", version="1.0.0")
    application.state.settings = settings
    application.state.repository = repository
    application.state.storage = storage
    application.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True,
                               allow_methods=["*"], allow_headers=["*"])

    @application.middleware("http")
    async def request_id(request: Request, call_next):
        request.state.request_id = request.headers.get("x-request-id", str(uuid4()))
        response = await call_next(request)
        response.headers["x-request-id"] = request.state.request_id
        return response

    @application.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"code": f"HTTP_{exc.status_code}", "message": str(exc.detail), "requestId": request.state.request_id})

    @application.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        fields = [{"field": ".".join(str(item) for item in error["loc"][1:]), "message": error["msg"]} for error in exc.errors()]
        return JSONResponse(status_code=422, content={"code": "VALIDATION_ERROR", "message": "Please correct the highlighted information.", "fields": fields, "requestId": request.state.request_id})

    def repo() -> MongoRepository:
        if not repository.ready:
            raise HTTPException(503, "The database is temporarily unavailable. Please try again shortly.")
        if not settings.auth_ready:
            raise HTTPException(503, "Authentication is not configured on the server.")
        return repository

    def encode_access(user: dict) -> str:
        expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_minutes)
        return jwt.encode({"sub": user["id"], "role": user["role"], "type": "access", "exp": expires}, settings.jwt_secret, algorithm="HS256")

    def set_session(response: Response, user: dict) -> None:
        access = encode_access(user)
        refresh = secrets.token_urlsafe(48)
        csrf = secrets.token_urlsafe(24)
        expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_days)
        repository.create_session({"id": str(uuid4()), "userId": user["id"], "tokenHash": hash_token(refresh), "csrfHash": hash_token(csrf), "createdAt": now(), "expiresAt": expires, "revokedAt": None})
        response.set_cookie("pb_access", access, max_age=settings.access_minutes * 60, httponly=True, secure=settings.cookie_secure, samesite="lax", path="/")
        response.set_cookie("pb_refresh", refresh, max_age=settings.refresh_days * 86400, httponly=True, secure=settings.cookie_secure, samesite="lax", path="/api/auth")
        response.set_cookie("pb_csrf", csrf, max_age=settings.refresh_days * 86400, httponly=False, secure=settings.cookie_secure, samesite="lax", path="/")

    def clear_session(response: Response) -> None:
        for name, path in (("pb_access", "/"), ("pb_refresh", "/api/auth"), ("pb_csrf", "/")):
            response.delete_cookie(name, path=path, secure=settings.cookie_secure, samesite="lax")

    def current_user(pb_access: str | None = Cookie(default=None)) -> dict:
        repo()
        if not pb_access:
            raise HTTPException(401, "Please sign in to continue.")
        try:
            payload = jwt.decode(pb_access, settings.jwt_secret, algorithms=["HS256"])
            if payload.get("type") != "access":
                raise ValueError("wrong token type")
        except Exception as exc:
            raise HTTPException(401, "Your session has expired. Please sign in again.") from exc
        user = repository.get_user(payload["sub"])
        if not user or not user.get("active"):
            raise HTTPException(401, "This account is unavailable. Contact your administrator.")
        return user

    def require_csrf(pb_csrf: str | None = Cookie(default=None), x_csrf_token: str | None = Header(default=None)) -> None:
        if not pb_csrf or not x_csrf_token or not secrets.compare_digest(pb_csrf, x_csrf_token):
            raise HTTPException(403, "Your secure form token expired. Refresh the page and try again.")

    def admin(user: dict = Depends(current_user)) -> dict:
        if user["role"] != Role.ADMIN.value:
            raise HTTPException(403, "Only a Super Admin can perform this action.")
        return user

    def order_staff(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in {Role.ADMIN.value, Role.ORDER_MANAGER.value}:
            raise HTTPException(403, "Only Order staff or a Super Admin can perform this action.")
        return user

    def design_staff(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in {Role.ADMIN.value, Role.DESIGNER.value, Role.ORDER_MANAGER.value}:
            raise HTTPException(403, "Only Design, Order staff, or a Super Admin can perform this action.")
        return user

    def customer_staff(user: dict = Depends(current_user)) -> dict:
        allowed = {Role.ADMIN.value, Role.ORDER_MANAGER.value, Role.ACCOUNTANT.value, Role.DISPATCH_MANAGER.value}
        if user["role"] not in allowed:
            raise HTTPException(403, "Customer records are hidden for this role.")
        return user

    def visible_order(document: dict, actor: dict) -> dict:
        result = deepcopy(document)
        if actor["role"] not in {Role.ADMIN.value, Role.ORDER_MANAGER.value, Role.ACCOUNTANT.value}:
            result["amount"] = 0
        if actor["role"] not in {Role.ADMIN.value, Role.ORDER_MANAGER.value, Role.ACCOUNTANT.value, Role.DISPATCH_MANAGER.value}:
            result["phone"] = ""
        return result

    @application.get("/api/health")
    def health():
        return {"status": "ok" if repository.ready and settings.auth_ready else "unavailable", "database": "atlas" if repository.ready else "unavailable", "storage": "r2" if storage.ready else "not_configured"}

    @application.post("/api/auth/login", response_model=UserPublic)
    def login(payload: LoginRequest, response: Response):
        repo()
        user = repository.find_user_by_email(str(payload.email), include_secret=True)
        if not user or not user.get("active"):
            raise HTTPException(401, "Email or password is incorrect.")
        last_failed = user.get("lastFailedLoginAt")
        if user.get("failedLoginCount", 0) >= 5 and last_failed and last_failed > now() - timedelta(minutes=15):
            raise HTTPException(429, "Too many attempts. Wait 15 minutes or ask your administrator for help.")
        if last_failed and last_failed <= now() - timedelta(minutes=15):
            repository.clear_failed_logins(user["id"])
        if not password_hash.verify(payload.password, user["passwordHash"]):
            repository.register_failed_login(user["id"])
            raise HTTPException(401, "Email or password is incorrect.")
        repository.clear_failed_logins(user["id"])
        set_session(response, user)
        return user

    @application.post("/api/auth/refresh", response_model=UserPublic, dependencies=[Depends(require_csrf)])
    def refresh(response: Response, pb_refresh: str | None = Cookie(default=None)):
        repo()
        if not pb_refresh:
            raise HTTPException(401, "Please sign in again.")
        session = repository.find_session(hash_token(pb_refresh))
        if not session or session["expiresAt"] <= now():
            raise HTTPException(401, "Your session has expired. Please sign in again.")
        user = repository.get_user(session["userId"])
        if not user or not user.get("active"):
            raise HTTPException(401, "This account is unavailable.")
        repository.revoke_session(hash_token(pb_refresh))
        set_session(response, user)
        return user

    @application.post("/api/auth/logout", response_model=ApiMessage, dependencies=[Depends(require_csrf)])
    def logout(response: Response, pb_refresh: str | None = Cookie(default=None)):
        if pb_refresh and repository.ready:
            repository.revoke_session(hash_token(pb_refresh))
        clear_session(response)
        return {"message": "Signed out safely."}

    @application.get("/api/auth/me", response_model=UserPublic)
    def me(user: dict = Depends(current_user)):
        return user

    @application.post("/api/auth/change-password", response_model=ApiMessage, dependencies=[Depends(require_csrf)])
    def change_password(payload: PasswordChangeRequest, user: dict = Depends(current_user)):
        secret_user = repository.get_user(user["id"], include_secret=True)
        if not password_hash.verify(payload.currentPassword, secret_user["passwordHash"]):
            raise HTTPException(422, "Current password is incorrect.")
        repository.update_user(user["id"], {"passwordHash": password_hash.hash(payload.newPassword), "mustChangePassword": False})
        repository.revoke_user_sessions(user["id"])
        return {"message": "Password changed. Please sign in again."}

    @application.get("/api/users", response_model=list[UserPublic])
    def users(_: dict = Depends(admin)):
        return repository.list_users()

    @application.post("/api/users", response_model=UserPublic, dependencies=[Depends(require_csrf)])
    def create_user(payload: UserCreate, actor: dict = Depends(admin)):
        document = {"id": str(uuid4()), "name": payload.name.strip(), "email": str(payload.email).lower(), "role": payload.role.value,
                    "department": payload.department.strip(), "initials": initials(payload.name), "passwordHash": password_hash.hash(payload.temporaryPassword),
                    "active": True, "mustChangePassword": True, "failedLoginCount": 0, "createdBy": actor["id"], "createdAt": now(), "updatedAt": now()}
        try:
            return repository.create_user(document)
        except DuplicateKeyError as exc:
            raise HTTPException(409, "A user with this email already exists.") from exc

    @application.patch("/api/users/{user_id}", response_model=UserPublic, dependencies=[Depends(require_csrf)])
    def update_user(user_id: str, payload: UserUpdate, _: dict = Depends(admin)):
        fields = {key: (value.value if isinstance(value, Role) else value) for key, value in payload.model_dump(exclude_none=True).items()}
        user = repository.update_user(user_id, fields)
        if not user:
            raise HTTPException(404, "User not found.")
        if fields.get("active") is False:
            repository.revoke_user_sessions(user_id)
        return user

    @application.post("/api/users/{user_id}/reset-password", response_model=ApiMessage, dependencies=[Depends(require_csrf)])
    def reset_password(user_id: str, payload: PasswordResetRequest, _: dict = Depends(admin)):
        if not repository.update_user(user_id, {"passwordHash": password_hash.hash(payload.temporaryPassword), "mustChangePassword": True}):
            raise HTTPException(404, "User not found.")
        repository.revoke_user_sessions(user_id)
        return {"message": "Temporary password created. The user must change it after signing in."}

    @application.get("/api/customers", response_model=list[CustomerDocument])
    def customers(search: str = Query(default="", max_length=100), _: dict = Depends(customer_staff)):
        return repository.list_customers(search)

    @application.post("/api/customers", response_model=CustomerDocument, dependencies=[Depends(require_csrf)])
    def create_customer(payload: CustomerCreate, actor: dict = Depends(order_staff)):
        return repository.create_customer(payload.model_dump(mode="json"), actor["id"])

    @application.patch("/api/customers/{customer_id}", response_model=CustomerDocument, dependencies=[Depends(require_csrf)])
    def update_customer(customer_id: str, payload: CustomerCreate, _: dict = Depends(order_staff)):
        customer = repository.update_customer(customer_id, payload.model_dump(mode="json"))
        if not customer:
            raise HTTPException(404, "Customer not found.")
        return customer

    @application.get("/api/orders", response_model=list[OrderDocument])
    def orders(search: str = Query(default="", max_length=100), stage: str | None = None, actor: dict = Depends(current_user)):
        return [visible_order(document, actor) for document in repository.list_orders(search, stage)]

    @application.post("/api/orders", response_model=OrderDocument, dependencies=[Depends(require_csrf)])
    def create_order(payload: OrderCreate, actor: dict = Depends(order_staff)):
        customer = repository.get_customer(payload.customerId)
        if not customer:
            raise HTTPException(422, "Choose a valid customer before creating the order.")
        data = payload.model_dump(mode="json")
        data["priority"] = payload.priority.value
        return repository.create_order(data, customer, actor)

    @application.get("/api/orders/{order_id}")
    def order(order_id: str, actor: dict = Depends(current_user)):
        document = repository.get_order(order_id)
        if not document:
            raise HTTPException(404, "Order not found.")
        document["activity"] = repository.list_audit(order_id)
        document["designAssets"] = repository.list_assets(order_id)
        return visible_order(document, actor)

    @application.post("/api/orders/{order_id}/cancel", dependencies=[Depends(require_csrf)])
    def cancel_order(order_id: str, payload: OrderCancelRequest, actor: dict = Depends(order_staff)):
        order_document = repository.get_order(order_id)
        if not order_document:
            raise HTTPException(404, "Order not found.")
        if order_document["version"] != payload.expectedVersion:
            raise HTTPException(409, "This order changed on another device. Refresh before trying again.")
        if order_document["status"] != "active":
            raise HTTPException(409, "Only an active order can be cancelled.")
        order_document["status"] = "cancelled"
        order_document["closedAt"] = now()
        order_document["cancellationReason"] = payload.reason.strip()
        saved = repository.replace_order(order_document, payload.expectedVersion)
        if not saved:
            raise HTTPException(409, "This order changed on another device. Refresh before trying again.")
        repository.revoke_reviews(order_id)
        repository.schedule_order_assets(order_id, now() + timedelta(days=30))
        repository.add_audit(order_id, actor, "order", f"Cancelled order: {payload.reason.strip()}", {"reason": payload.reason.strip()})
        saved["activity"] = repository.list_audit(order_id)
        saved["designAssets"] = repository.list_assets(order_id)
        return visible_order(saved, actor)

    @application.post("/api/orders/{order_id}/stages/{stage_key}", dependencies=[Depends(require_csrf)])
    def update_stage(order_id: str, stage_key: StageKey, payload: StageUpdateRequest, actor: dict = Depends(current_user)):
        order_document = repository.get_order(order_id)
        if not order_document:
            raise HTTPException(404, "Order not found.")
        if order_document["version"] != payload.expectedVersion:
            raise HTTPException(409, "This order changed on another device. Refresh before trying again.")
        assert_permission(Role(actor["role"]), stage_key)
        message = apply_action(order_document, stage_key, payload.action, payload.completedQuantity, payload.note, payload.data)
        if stage_key == StageKey.DELIVERY and payload.action.value == "complete":
            order_document["status"] = "completed"
            order_document["closedAt"] = now()
            repository.schedule_order_assets(order_id, now() + timedelta(days=30))
        saved = repository.replace_order(order_document, payload.expectedVersion)
        if not saved:
            raise HTTPException(409, "This order changed on another device. Refresh before trying again.")
        repository.add_audit(order_id, actor, stage_key.value, message, {"data": payload.data, "note": payload.note})
        saved["activity"] = repository.list_audit(order_id)
        saved["designAssets"] = repository.list_assets(order_id)
        return visible_order(saved, actor)

    @application.post("/api/orders/{order_id}/design/no-image", dependencies=[Depends(require_csrf)])
    def no_image(order_id: str, payload: NoImageRequest, actor: dict = Depends(design_staff)):
        order_document = repository.get_order(order_id)
        if not order_document:
            raise HTTPException(404, "Order not found.")
        if order_document["version"] != payload.expectedVersion:
            raise HTTPException(409, "This order changed on another device. Refresh before trying again.")
        state = order_document["stages"]["design"]
        if state["status"] not in {"ready", "in_progress"}:
            raise HTTPException(409, "Design is not ready for this confirmation.")
        state.update(status="completed", completedAt=now().isoformat(), noCustomerImage=True, note=payload.note)
        refresh_ready_states(order_document)
        saved = repository.replace_order(order_document, payload.expectedVersion)
        if not saved:
            raise HTTPException(409, "This order changed on another device. Refresh before trying again.")
        repository.add_audit(order_id, actor, "design", "Confirmed that no customer image was supplied. Plate preparation is now ready.", {"note": payload.note})
        return visible_order(saved, actor)

    def require_storage() -> R2Storage:
        if not storage.ready:
            raise HTTPException(503, "Private image storage is not configured yet.")
        return storage

    @application.post("/api/orders/{order_id}/design-assets/upload-intent", dependencies=[Depends(require_csrf)])
    def upload_intent(order_id: str, payload: UploadIntentRequest, actor: dict = Depends(design_staff)):
        require_storage()
        if not repository.get_order(order_id):
            raise HTTPException(404, "Order not found.")
        extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[payload.contentType]
        asset_id = str(uuid4())
        key = f"orders/{order_id}/design/{asset_id}.{extension}"
        document = {"id": asset_id, "orderId": order_id, "version": repository.next_design_version(order_id), "objectKey": key,
                    "fileName": Path(payload.fileName).name, "contentType": payload.contentType, "expectedSize": payload.size,
                    "status": "pending", "uploadedBy": actor["id"], "uploadedByName": actor["name"], "createdAt": now(),
                    "updatedAt": now(), "uploadExpiresAt": now() + timedelta(hours=24), "deleteAfter": None}
        repository.create_asset(document)
        return {"asset": document, "uploadUrl": storage.upload_url(key, payload.contentType), "expiresIn": 900}

    @application.post("/api/design-assets/{asset_id}/complete", dependencies=[Depends(require_csrf)])
    def complete_upload(asset_id: str, actor: dict = Depends(design_staff)):
        require_storage()
        asset = repository.get_asset(asset_id)
        if not asset or asset["status"] != "pending":
            raise HTTPException(404, "Pending upload not found.")
        if actor["role"] != Role.ADMIN.value and asset["uploadedBy"] != actor["id"]:
            raise HTTPException(403, "Only the uploader or Super Admin can complete this upload.")
        try:
            verified = storage.verify_image(asset["objectKey"], asset["contentType"], asset["expectedSize"])
        except ValueError as exc:
            storage.delete(asset["objectKey"])
            repository.update_asset(asset_id, {"status": "rejected", "validationError": str(exc)})
            raise HTTPException(422, str(exc)) from exc
        active = repository.update_asset(asset_id, {"status": "available", **verified, "verifiedAt": now()})
        repository.add_audit(asset["orderId"], actor, "design", f"Uploaded design version {asset['version']}.", {"assetId": asset_id, "fileName": asset["fileName"]})
        return active

    @application.get("/api/design-assets/{asset_id}/view-url")
    def view_asset(asset_id: str, _: dict = Depends(current_user)):
        require_storage()
        asset = repository.get_asset(asset_id)
        if not asset or asset["status"] in {"pending", "deleted", "rejected"}:
            raise HTTPException(404, "Image is unavailable.")
        return {"url": storage.view_url(asset["objectKey"]), "expiresIn": 600}

    @application.post("/api/orders/{order_id}/design/review-link", dependencies=[Depends(require_csrf)])
    def review_link(order_id: str, payload: SubmitReviewRequest, actor: dict = Depends(design_staff)):
        require_storage()
        order_document = repository.get_order(order_id)
        asset = repository.get_asset(payload.assetId)
        if not order_document or not asset or asset["orderId"] != order_id or asset["status"] != "available":
            raise HTTPException(422, "Choose an available design version.")
        repository.revoke_reviews(order_id)
        raw_token = secrets.token_urlsafe(32)
        review = {"id": str(uuid4()), "orderId": order_id, "assetId": asset["id"], "tokenHash": hash_token(raw_token),
                  "status": "active", "createdBy": actor["id"], "createdAt": now(), "expiresAt": now() + timedelta(days=7)}
        repository.create_review(review)
        repository.update_asset(asset["id"], {"status": "in_review", "submittedAt": now()})
        repository.add_audit(order_id, actor, "design", f"Sent design version {asset['version']} for customer review.", {"assetId": asset["id"]})
        return {"token": raw_token, "path": f"/review/{raw_token}", "expiresAt": review["expiresAt"]}

    def record_design_decision(review: dict, decision: str, customer_name: str, reason: str | None, method: str, actor: dict | None):
        if decision not in {"approved", "changes_requested"}:
            raise HTTPException(422, "Choose Approve or Request Changes.")
        if decision == "changes_requested" and not reason:
            raise HTTPException(422, "Please explain what needs to change.")
        details = {"customerName": customer_name, "reason": reason, "method": method, "recordedBy": actor["id"] if actor else None}
        if not repository.decide_review(review["id"], decision, details):
            raise HTTPException(409, "A decision has already been recorded for this link.")
        asset = repository.update_asset(review["assetId"], {"status": decision, "decision": decision, "decisionReason": reason, "decidedAt": now()})
        order_document = repository.get_order(review["orderId"])
        if decision == "approved":
            order_document["stages"]["design"].update(status="completed", completedAt=now().isoformat(), approvedAssetId=review["assetId"])
            message = f"Customer approved design version {asset['version']}."
        else:
            order_document["stages"]["design"].update(status="in_progress", note=reason)
            message = f"Customer requested changes to design version {asset['version']}: {reason}"
        refresh_ready_states(order_document)
        repository.replace_order(order_document, order_document["version"])
        audit_actor = actor or {"id": "customer", "name": customer_name, "role": "customer"}
        repository.add_audit(review["orderId"], audit_actor, "design", message, details)
        return {"message": message, "decision": decision}

    @application.get("/api/public/reviews/{token}")
    def public_review(token: str):
        repo()
        require_storage()
        review = repository.get_review(hash_token(token))
        if not review or review["status"] != "active" or review["expiresAt"] <= now():
            raise HTTPException(410, "This review link has expired or is no longer active. Please ask for a new link.")
        order_document = repository.get_order(review["orderId"])
        asset = repository.get_asset(review["assetId"])
        return {"orderNumber": order_document["orderNumber"], "customer": order_document["customer"], "product": order_document["product"],
                "version": asset["version"], "fileName": asset["fileName"], "imageUrl": storage.view_url(asset["objectKey"]), "expiresAt": review["expiresAt"]}

    @application.post("/api/public/reviews/{token}/decision")
    def public_decision(token: str, payload: PublicDecisionRequest):
        repo()
        review = repository.get_review(hash_token(token))
        if not review or review["status"] != "active" or review["expiresAt"] <= now():
            raise HTTPException(410, "This review link has expired or is no longer active.")
        return record_design_decision(review, payload.decision, payload.customerName, payload.reason, "secure_link", None)

    @application.post("/api/orders/{order_id}/design/staff-decision", dependencies=[Depends(require_csrf)])
    def staff_decision(order_id: str, payload: StaffDecisionRequest, actor: dict = Depends(design_staff)):
        review = repository.db.design_reviews.find_one({"orderId": order_id, "assetId": payload.assetId, "status": "active"}, {"_id": 0})
        if not review:
            raise HTTPException(404, "No active review exists for this design version.")
        return record_design_decision(review, payload.decision, payload.customerName, payload.reason, payload.channel, actor)

    @application.get("/api/cron/cleanup")
    def cleanup(authorization: str | None = Header(default=None)):
        if not settings.cron_secret or authorization != f"Bearer {settings.cron_secret}":
            raise HTTPException(401, "Invalid cleanup authorization.")
        require_storage()
        repo()
        removed = 0
        for asset in repository.files_due_for_deletion() + repository.abandoned_assets():
            try:
                storage.delete(asset["objectKey"])
                repository.update_asset(asset["id"], {"status": "deleted", "deletedAt": now(), "objectKey": None})
                removed += 1
            except Exception:
                repository.update_asset(asset["id"], {"cleanupErrorAt": now()})
        return {"message": f"Removed {removed} expired files.", "removed": removed}

    return application


app = create_app()
