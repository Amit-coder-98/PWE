from copy import deepcopy
from datetime import datetime, timezone
from threading import Lock

from pymongo import ASCENDING, MongoClient, ReturnDocument

from .config import Settings


def _seed_orders() -> list[dict]:
    keys = ["order", "material", "design", "cutting", "plate", "printing", "stitching", "packing", "dc", "billing", "payment", "dispatch", "delivery", "return", "refund"]
    stages = {key: {"status": "waiting", "owner": key.replace("_", " ").title()} for key in keys}
    for key in ["order", "material", "design", "cutting", "plate", "printing"]:
        stages[key]["status"] = "completed"
    stages["stitching"] = {"status": "in_progress", "owner": "Meena Deshmukh", "completedQuantity": 320, "progress": 64}
    stages["return"]["status"] = stages["refund"]["status"] = "not_applicable"
    return [{
        "id": "o125", "orderNumber": "ORD-2026-00125", "customer": "Shree Ganesh Agro",
        "contactPerson": "Amit Kulkarni", "phone": "+91 98220 14567",
        "product": "Custom Printed Woven Bags", "quantity": 500, "amount": 245000,
        "orderDate": "2026-08-20", "expectedDelivery": "2026-08-28", "priority": "urgent",
        "currentStage": "stitching", "stages": stages, "activity": [], "version": 1,
        "updatedAt": datetime.now(timezone.utc),
    }]


class OrderRepository:
    """MongoDB repository with an in-memory development fallback."""

    def __init__(self, settings: Settings):
        self._lock = Lock()
        self._memory = {item["id"]: item for item in _seed_orders()}
        self._collection = None
        if settings.mongodb_url:
            client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=1500)
            try:
                client.admin.command("ping")
                self._collection = client[settings.mongodb_database]["orders"]
                self._collection.create_index([("id", ASCENDING)], unique=True)
                self._collection.create_index([("orderNumber", ASCENDING)], unique=True)
                if self._collection.count_documents({}) == 0:
                    self._collection.insert_many(_seed_orders())
            except Exception:
                client.close()
                self._collection = None

    @property
    def mode(self) -> str:
        return "mongodb" if self._collection is not None else "memory-demo"

    def list(self) -> list[dict]:
        if self._collection is not None:
            return list(self._collection.find({}, {"_id": 0}).sort("updatedAt", -1))
        return [deepcopy(item) for item in self._memory.values()]

    def get(self, order_id: str) -> dict | None:
        if self._collection is not None:
            return self._collection.find_one({"id": order_id}, {"_id": 0})
        item = self._memory.get(order_id)
        return deepcopy(item) if item else None

    def replace_versioned(self, order: dict, expected_version: int) -> dict | None:
        order["version"] = expected_version + 1
        order["updatedAt"] = datetime.now(timezone.utc)
        if self._collection is not None:
            return self._collection.find_one_and_replace(
                {"id": order["id"], "version": expected_version}, order,
                projection={"_id": 0}, return_document=ReturnDocument.AFTER,
            )
        with self._lock:
            current = self._memory.get(order["id"])
            if not current or current["version"] != expected_version:
                return None
            self._memory[order["id"]] = deepcopy(order)
            return deepcopy(order)
