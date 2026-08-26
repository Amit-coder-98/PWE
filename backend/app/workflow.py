from fastapi import HTTPException, status

from .models import Role, StageAction, StageKey, StageStatus


DEPENDENCIES: dict[StageKey, list[StageKey]] = {
    StageKey.MATERIAL: [StageKey.ORDER],
    StageKey.DESIGN: [StageKey.ORDER],
    StageKey.CUTTING: [StageKey.MATERIAL],
    StageKey.PLATE: [StageKey.DESIGN],
    StageKey.PRINTING: [StageKey.CUTTING, StageKey.PLATE],
    StageKey.STITCHING: [StageKey.PRINTING],
    StageKey.PACKING: [StageKey.STITCHING],
    StageKey.DC: [StageKey.PACKING],
    StageKey.BILLING: [StageKey.DC],
    StageKey.PAYMENT: [StageKey.BILLING],
    StageKey.DISPATCH: [StageKey.BILLING],
    StageKey.DELIVERY: [StageKey.PAYMENT, StageKey.DISPATCH],
    StageKey.RETURN: [StageKey.DELIVERY],
    StageKey.REFUND: [StageKey.RETURN],
}

STAGE_ROLES: dict[StageKey, Role] = {
    StageKey.ORDER: Role.ORDER_MANAGER,
    StageKey.MATERIAL: Role.INVENTORY_MANAGER,
    StageKey.DESIGN: Role.DESIGNER,
    StageKey.CUTTING: Role.CUTTING_MANAGER,
    StageKey.PLATE: Role.PLATE_OPERATOR,
    StageKey.PRINTING: Role.PRINTING_OPERATOR,
    StageKey.STITCHING: Role.STITCHING_MANAGER,
    StageKey.PACKING: Role.PACKING_MANAGER,
    StageKey.DC: Role.PACKING_MANAGER,
    StageKey.BILLING: Role.ACCOUNTANT,
    StageKey.PAYMENT: Role.ACCOUNTANT,
    StageKey.DISPATCH: Role.DISPATCH_MANAGER,
    StageKey.DELIVERY: Role.DISPATCH_MANAGER,
    StageKey.RETURN: Role.DISPATCH_MANAGER,
    StageKey.REFUND: Role.ACCOUNTANT,
}


def assert_permission(role: Role, stage: StageKey) -> None:
    if role != Role.ADMIN and STAGE_ROLES[stage] != role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your role cannot update this workflow step.")


def assert_transition(order: dict, stage: StageKey, action: StageAction, completed_quantity: int | None) -> None:
    current = StageStatus(order["stages"][stage.value]["status"])
    if action == StageAction.START:
        dependencies_done = all(order["stages"][dependency.value]["status"] == StageStatus.COMPLETED.value for dependency in DEPENDENCIES.get(stage, []))
        if not dependencies_done:
            raise HTTPException(status_code=409, detail="Previous work is not complete. This step cannot start yet.")
        if current not in {StageStatus.READY, StageStatus.WAITING, StageStatus.NOT_STARTED}:
            raise HTTPException(status_code=409, detail="This step is not ready to start.")
    elif action == StageAction.COMPLETE and current != StageStatus.IN_PROGRESS:
        raise HTTPException(status_code=409, detail="Start this work before marking it complete.")
    elif action == StageAction.PROGRESS:
        if current != StageStatus.IN_PROGRESS:
            raise HTTPException(status_code=409, detail="Start this work before updating quantity.")
        if completed_quantity is None or completed_quantity > order["quantity"]:
            raise HTTPException(status_code=422, detail="Completed quantity must be between zero and the order quantity.")
    elif action == StageAction.RESOLVE and current not in {StageStatus.BLOCKED, StageStatus.ISSUE}:
        raise HTTPException(status_code=409, detail="This step does not have an open issue.")
