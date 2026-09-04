from datetime import datetime, timezone

from fastapi import HTTPException

from .models import Role, StageAction, StageKey, StageStatus


DEPENDENCIES: dict[StageKey, list[StageKey]] = {
    StageKey.MATERIAL: [StageKey.ORDER], StageKey.DESIGN: [StageKey.ORDER],
    StageKey.CUTTING: [StageKey.ORDER], StageKey.PLATE: [StageKey.ORDER],
    StageKey.PRINTING: [StageKey.MATERIAL, StageKey.CUTTING, StageKey.DESIGN, StageKey.PLATE], StageKey.STITCHING: [StageKey.PRINTING],
    StageKey.PACKING: [StageKey.STITCHING], StageKey.DC: [StageKey.PACKING],
    StageKey.BILLING: [StageKey.DC], StageKey.PAYMENT: [StageKey.BILLING],
    StageKey.DISPATCH: [StageKey.BILLING], StageKey.DELIVERY: [StageKey.PAYMENT, StageKey.DISPATCH],
    StageKey.RETURN: [StageKey.DELIVERY], StageKey.REFUND: [StageKey.RETURN],
}

STAGE_ROLES: dict[StageKey, Role] = {
    StageKey.ORDER: Role.ADMIN, StageKey.MATERIAL: Role.CUTTING_MASTER,
    StageKey.DESIGN: Role.DESIGNER, StageKey.CUTTING: Role.CUTTING_MASTER,
    StageKey.PLATE: Role.TRANSPORT_MANAGER, StageKey.PRINTING: Role.PRINTING_OPERATOR,
    StageKey.STITCHING: Role.MANAGER, StageKey.PACKING: Role.MANAGER,
    StageKey.DC: Role.MANAGER, StageKey.BILLING: Role.ACCOUNTANT,
    StageKey.PAYMENT: Role.ACCOUNTANT, StageKey.DISPATCH: Role.TRANSPORT_MANAGER,
    StageKey.DELIVERY: Role.MARKETING, StageKey.RETURN: Role.MARKETING,
    StageKey.REFUND: Role.ACCOUNTANT,
}

LEGACY_ROLE_ALIASES = {
    Role.INVENTORY_MANAGER: Role.CUTTING_MASTER,
    Role.CUTTING_MANAGER: Role.CUTTING_MASTER,
    Role.PLATE_OPERATOR: Role.TRANSPORT_MANAGER,
    Role.DISPATCH_MANAGER: Role.TRANSPORT_MANAGER,
    Role.STITCHING_MANAGER: Role.MANAGER,
    Role.PACKING_MANAGER: Role.MANAGER,
}

SEQUENCE = [StageKey.MATERIAL, StageKey.DESIGN, StageKey.CUTTING, StageKey.PLATE, StageKey.PRINTING,
            StageKey.STITCHING, StageKey.PACKING, StageKey.DC, StageKey.BILLING, StageKey.PAYMENT,
            StageKey.DISPATCH, StageKey.DELIVERY, StageKey.RETURN, StageKey.REFUND]


def initial_stages() -> dict[str, dict]:
    result = {key.value: {"status": StageStatus.WAITING.value, "ownerRole": STAGE_ROLES[key].value} for key in StageKey}
    result[StageKey.ORDER.value] = {"status": StageStatus.COMPLETED.value, "ownerRole": Role.ADMIN.value,
                                    "completedAt": datetime.now(timezone.utc).isoformat()}
    result[StageKey.MATERIAL.value]["status"] = StageStatus.READY.value
    result[StageKey.DESIGN.value]["status"] = StageStatus.READY.value
    result[StageKey.CUTTING.value]["status"] = StageStatus.READY.value
    result[StageKey.PLATE.value]["status"] = StageStatus.READY.value
    return result


def assert_permission(role: Role, stage: StageKey) -> None:
    owner = STAGE_ROLES[stage]
    effective_role = LEGACY_ROLE_ALIASES.get(role, role)
    if owner != effective_role:
        raise HTTPException(
            403,
            f"This step belongs to the {owner.value.replace('_', ' ')}. Ask that team member to update it.",
        )


def ready(order: dict, stage: StageKey) -> bool:
    return all(order["stages"][item.value]["status"] == StageStatus.COMPLETED.value for item in DEPENDENCIES.get(stage, []))


def refresh_ready_states(order: dict) -> None:
    for stage in SEQUENCE:
        state = order["stages"][stage.value]
        if state["status"] == StageStatus.WAITING.value and ready(order, stage):
            state["status"] = StageStatus.READY.value
    candidates = [stage for stage in SEQUENCE if order["stages"][stage.value]["status"] in {
        StageStatus.BLOCKED.value, StageStatus.ISSUE.value, StageStatus.IN_PROGRESS.value, StageStatus.READY.value,
    }]
    order["currentStage"] = (candidates[0] if candidates else StageKey.DELIVERY).value


def apply_action(order: dict, stage: StageKey, action: StageAction, quantity: int | None, note: str | None, data: dict) -> str:
    state = order["stages"][stage.value]
    current = StageStatus(state["status"])
    now = datetime.now(timezone.utc).isoformat()
    if stage == StageKey.DESIGN and action == StageAction.COMPLETE:
        raise HTTPException(409, "Design must be approved or marked as having no customer image.")
    if action == StageAction.START:
        if current != StageStatus.READY or not ready(order, stage):
            raise HTTPException(409, "Previous work is not complete. This step cannot start yet.")
        state.update(status=StageStatus.IN_PROGRESS.value, startedAt=now)
        message = f"Started {stage.value}."
    elif action == StageAction.PROGRESS:
        if current != StageStatus.IN_PROGRESS:
            raise HTTPException(409, "Start this work before updating progress.")
        if quantity is None or quantity > order["quantity"]:
            raise HTTPException(422, "Completed quantity must not exceed the order quantity.")
        state.update(completedQuantity=quantity, progress=round(quantity / order["quantity"] * 100), data=data)
        message = f"Updated {stage.value} progress to {quantity} of {order['quantity']}."
    elif action == StageAction.BLOCK:
        if not note:
            raise HTTPException(422, "Explain the issue so the next person knows what to resolve.")
        state.update(status=StageStatus.BLOCKED.value, note=note)
        message = f"Blocked {stage.value}: {note}"
    elif action == StageAction.RESOLVE:
        if current not in {StageStatus.BLOCKED, StageStatus.ISSUE}:
            raise HTTPException(409, "This step has no open issue.")
        state.update(status=StageStatus.READY.value, note=note or "Issue resolved.")
        message = f"Resolved the {stage.value} issue."
    else:
        if current != StageStatus.IN_PROGRESS:
            raise HTTPException(409, "Start this work before marking it complete.")
        state.update(status=StageStatus.COMPLETED.value, completedAt=now, progress=100,
                     completedQuantity=order["quantity"], data=data, note=note)
        message = f"Completed {stage.value}."
    refresh_ready_states(order)
    return message
