from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pymongo import ASCENDING, DESCENDING, MongoClient, ReturnDocument
from pymongo.database import Database

from .config import Settings
from .workflow import initial_stages


def now() -> datetime:
    return datetime.now(timezone.utc)


def clean(document: dict | None) -> dict | None:
    if document:
        document.pop("_id", None)
    return document


class MongoRepository:
    def __init__(self, settings: Settings, database: Database | None = None):
        self.ready = False
        self.error: str | None = None
        self.client: MongoClient | None = None
        if database is not None:
            self.db = database
            self.ready = True
            self.ensure_indexes()
            return
        if not settings.mongodb_url:
            self.db = None
            self.error = "MONGODB_URL is not configured."
            return
        try:
            self.client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=4000, tz_aware=True)
            self.client.admin.command("ping")
            self.db = self.client[settings.mongodb_database]
            self.ensure_schema_validation()
            self.ensure_indexes()
            self.ready = True
        except Exception as exc:
            self.db = None
            self.error = f"MongoDB is unavailable: {exc.__class__.__name__}"

    def ensure_schema_validation(self) -> None:
        """Create or update validators for application-owned Atlas collections."""
        assert self.db is not None
        required_fields = {
            "users": {
                "id": "string", "name": "string", "email": "string", "role": "string",
                "passwordHash": "string", "active": "bool", "createdAt": "date", "updatedAt": "date",
            },
            "sessions": {
                "id": "string", "userId": "string", "tokenHash": "string", "csrfHash": "string",
                "createdAt": "date", "expiresAt": "date",
            },
            "customers": {
                "id": "string", "companyName": "string", "contactPerson": "string", "phone": "string",
                "address": "string", "active": "bool", "createdAt": "date", "updatedAt": "date",
            },
            "orders": {
                "id": "string", "orderNumber": "string", "customerId": "string", "quantity": "int",
                "amount": "int", "stages": "object", "version": "int", "status": "string",
                "createdAt": "date", "updatedAt": "date",
            },
            "design_assets": {
                "id": "string", "orderId": "string", "version": "int", "fileName": "string",
                "contentType": "string", "status": "string", "createdAt": "date", "updatedAt": "date",
            },
            "design_reviews": {
                "id": "string", "orderId": "string", "assetId": "string", "tokenHash": "string",
                "status": "string", "createdAt": "date", "expiresAt": "date",
            },
            "audit_events": {
                "id": "string", "actorId": "string", "actorName": "string", "stage": "string",
                "message": "string", "at": "date",
            },
            "counters": {"_id": "string", "value": "int"},
        }
        existing = set(self.db.list_collection_names())
        for collection_name, properties in required_fields.items():
            validator = {
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": list(properties),
                    "properties": {name: {"bsonType": kind} for name, kind in properties.items()},
                }
            }
            if collection_name in existing:
                self.db.command("collMod", collection_name, validator=validator, validationLevel="strict", validationAction="error")
            else:
                self.db.create_collection(collection_name, validator=validator, validationLevel="strict", validationAction="error")

    def ensure_indexes(self) -> None:
        assert self.db is not None
        self.db.users.create_index([("email", ASCENDING)], unique=True)
        self.db.users.create_index([("active", ASCENDING), ("role", ASCENDING)])
        self.db.sessions.create_index([("tokenHash", ASCENDING)], unique=True)
        self.db.sessions.create_index([("expiresAt", ASCENDING)], expireAfterSeconds=0)
        self.db.customers.create_index([("companyName", ASCENDING)])
        self.db.customers.create_index([("phone", ASCENDING)])
        self.db.orders.create_index([("orderNumber", ASCENDING)], unique=True)
        self.db.orders.create_index([("customerId", ASCENDING), ("updatedAt", DESCENDING)])
        self.db.orders.create_index([("currentStage", ASCENDING), ("status", ASCENDING)])
        self.db.audit_events.create_index([("orderId", ASCENDING), ("at", DESCENDING)])
        self.db.design_assets.create_index([("orderId", ASCENDING), ("version", DESCENDING)])
        self.db.design_assets.create_index([("deleteAfter", ASCENDING), ("status", ASCENDING)])
        self.db.design_reviews.create_index([("tokenHash", ASCENDING)], unique=True)
        self.db.design_reviews.create_index([("expiresAt", ASCENDING)])

    def count_users(self) -> int:
        return self.db.users.count_documents({})

    def create_user(self, document: dict) -> dict:
        self.db.users.insert_one(document.copy())
        return clean(document) or {}

    def find_user_by_email(self, email: str, include_secret: bool = False) -> dict | None:
        projection = None if include_secret else {"passwordHash": 0, "_id": 0}
        return clean(self.db.users.find_one({"email": email.lower()}, projection))

    def get_user(self, user_id: str, include_secret: bool = False) -> dict | None:
        projection = None if include_secret else {"passwordHash": 0, "_id": 0}
        return clean(self.db.users.find_one({"id": user_id}, projection))

    def list_users(self) -> list[dict]:
        return [clean(item) for item in self.db.users.find({}, {"passwordHash": 0, "_id": 0}).sort("name", 1)]

    def update_user(self, user_id: str, fields: dict) -> dict | None:
        fields["updatedAt"] = now()
        return clean(self.db.users.find_one_and_update({"id": user_id}, {"$set": fields}, projection={"passwordHash": 0, "_id": 0}, return_document=ReturnDocument.AFTER))

    def delete_user(self, user_id: str) -> bool:
        """Permanently remove an account after its sessions have been revoked.

        Audit events deliberately remain untouched: they store the actor name and
        role at the time of the business action, so production history stays
        understandable after an unused account is removed.
        """
        return self.db.users.delete_one({"id": user_id}).deleted_count == 1

    def register_failed_login(self, user_id: str) -> None:
        self.db.users.update_one({"id": user_id}, {"$inc": {"failedLoginCount": 1}, "$set": {"lastFailedLoginAt": now()}})

    def clear_failed_logins(self, user_id: str) -> None:
        self.db.users.update_one({"id": user_id}, {"$set": {"failedLoginCount": 0}, "$unset": {"lockedUntil": ""}})

    def create_session(self, document: dict) -> None:
        self.db.sessions.insert_one(document)

    def find_session(self, token_hash: str) -> dict | None:
        return clean(self.db.sessions.find_one({"tokenHash": token_hash, "revokedAt": None}))

    def revoke_session(self, token_hash: str) -> None:
        self.db.sessions.update_one({"tokenHash": token_hash}, {"$set": {"revokedAt": now()}})

    def revoke_user_sessions(self, user_id: str) -> None:
        self.db.sessions.update_many({"userId": user_id, "revokedAt": None}, {"$set": {"revokedAt": now()}})

    def create_customer(self, payload: dict, actor_id: str) -> dict:
        timestamp = now()
        document = {"id": str(uuid4()), **payload, "active": True, "createdBy": actor_id, "createdAt": timestamp, "updatedAt": timestamp}
        self.db.customers.insert_one(document.copy())
        return clean(document) or {}

    def list_customers(self, query: str = "") -> list[dict]:
        criteria: dict[str, Any] = {}
        if query:
            criteria["$or"] = [{field: {"$regex": query, "$options": "i"}} for field in ("companyName", "contactPerson", "phone", "email")]
        return [clean(item) for item in self.db.customers.find(criteria, {"_id": 0}).sort("companyName", 1)]

    def get_customer(self, customer_id: str) -> dict | None:
        return clean(self.db.customers.find_one({"id": customer_id}, {"_id": 0}))

    def update_customer(self, customer_id: str, payload: dict) -> dict | None:
        payload["updatedAt"] = now()
        return clean(self.db.customers.find_one_and_update({"id": customer_id}, {"$set": payload}, projection={"_id": 0}, return_document=ReturnDocument.AFTER))

    def next_order_number(self) -> str:
        year = now().year
        counter = self.db.counters.find_one_and_update({"_id": f"orders-{year}"}, {"$inc": {"value": 1}}, upsert=True, return_document=ReturnDocument.AFTER)
        return f"ORD-{year}-{counter['value']:05d}"

    def create_order(self, payload: dict, customer: dict, actor: dict) -> dict:
        timestamp = now()
        document = {
            "id": str(uuid4()), "orderNumber": self.next_order_number(), "customerId": customer["id"],
            "customer": customer["companyName"], "contactPerson": customer["contactPerson"], "phone": customer["phone"],
            "product": payload["product"], "quantity": payload["quantity"], "amount": payload["amount"],
            "orderDate": timestamp.date().isoformat(), "expectedDelivery": payload["expectedDelivery"],
            "priority": payload.get("priority", "normal"), "notes": payload.get("notes"),
            "currentStage": "material", "stages": initial_stages(), "version": 1, "status": "active",
            "createdBy": actor["id"], "createdAt": timestamp, "updatedAt": timestamp, "closedAt": None,
        }
        self.db.orders.insert_one(document.copy())
        self.add_audit(document["id"], actor, "order", "Order booked and preparation teams notified.", {"orderNumber": document["orderNumber"]})
        return clean(document) or {}

    def list_orders(self, query: str = "", stage: str | None = None) -> list[dict]:
        criteria: dict[str, Any] = {}
        if query:
            criteria["$or"] = [{field: {"$regex": query, "$options": "i"}} for field in ("orderNumber", "customer", "product", "phone")]
        if stage:
            criteria["currentStage"] = stage
        return [clean(item) for item in self.db.orders.find(criteria, {"_id": 0}).sort("updatedAt", -1)]

    def get_order(self, order_id: str) -> dict | None:
        return clean(self.db.orders.find_one({"id": order_id}, {"_id": 0}))

    def replace_order(self, order: dict, expected_version: int) -> dict | None:
        order = order.copy()
        order["version"] = expected_version + 1
        order["updatedAt"] = now()
        order.pop("_id", None)
        return clean(self.db.orders.find_one_and_replace({"id": order["id"], "version": expected_version}, order, return_document=ReturnDocument.AFTER))

    def add_audit(self, order_id: str | None, actor: dict, stage: str, message: str, details: dict | None = None) -> dict:
        document = {"id": str(uuid4()), "orderId": order_id, "actorId": actor["id"], "actorName": actor["name"], "actorRole": actor["role"], "stage": stage, "message": message, "details": details or {}, "at": now()}
        self.db.audit_events.insert_one(document.copy())
        return clean(document) or {}

    def list_audit(self, order_id: str) -> list[dict]:
        return [clean(item) for item in self.db.audit_events.find({"orderId": order_id}, {"_id": 0}).sort("at", -1)]

    def next_design_version(self, order_id: str) -> int:
        last = self.db.design_assets.find_one({"orderId": order_id}, sort=[("version", -1)])
        return (last.get("version", 0) if last else 0) + 1

    def create_asset(self, document: dict) -> dict:
        self.db.design_assets.insert_one(document.copy())
        return clean(document) or {}

    def get_asset(self, asset_id: str) -> dict | None:
        return clean(self.db.design_assets.find_one({"id": asset_id}, {"_id": 0}))

    def list_assets(self, order_id: str) -> list[dict]:
        return [clean(item) for item in self.db.design_assets.find({"orderId": order_id}, {"_id": 0}).sort("version", -1)]

    def update_asset(self, asset_id: str, fields: dict) -> dict | None:
        fields["updatedAt"] = now()
        return clean(self.db.design_assets.find_one_and_update({"id": asset_id}, {"$set": fields}, projection={"_id": 0}, return_document=ReturnDocument.AFTER))

    def revoke_reviews(self, order_id: str) -> None:
        self.db.design_reviews.update_many({"orderId": order_id, "status": "active"}, {"$set": {"status": "revoked", "revokedAt": now()}})

    def create_review(self, document: dict) -> None:
        self.db.design_reviews.insert_one(document.copy())

    def get_review(self, token_hash: str) -> dict | None:
        return clean(self.db.design_reviews.find_one({"tokenHash": token_hash}, {"_id": 0}))

    def decide_review(self, review_id: str, decision: str, details: dict) -> bool:
        result = self.db.design_reviews.update_one({"id": review_id, "status": "active"}, {"$set": {"status": decision, "decision": decision, "decisionDetails": details, "decidedAt": now()}})
        return result.modified_count == 1

    def files_due_for_deletion(self, limit: int = 100) -> list[dict]:
        return [clean(item) for item in self.db.design_assets.find({"status": {"$ne": "deleted"}, "deleteAfter": {"$lte": now()}}, {"_id": 0}).limit(limit)]

    def abandoned_assets(self, limit: int = 100) -> list[dict]:
        return [clean(item) for item in self.db.design_assets.find({"status": "pending", "uploadExpiresAt": {"$lte": now()}}, {"_id": 0}).limit(limit)]

    def schedule_order_assets(self, order_id: str, delete_after: datetime) -> None:
        self.db.design_assets.update_many({"orderId": order_id, "status": {"$ne": "deleted"}}, {"$set": {"deleteAfter": delete_after}})
