from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, Field


# Keep the existing rupee-valued JSON/MongoDB contract, including old integers.
# Validate cents and normalize harmless binary float noise before storing numbers.
Money = Annotated[
    float,
    Field(ge=0, allow_inf_nan=False, multiple_of=0.01),
    AfterValidator(lambda value: round(value, 2)),
]


def remaining_money(total: float, advance: float) -> float:
    return float(Decimal(str(total)) - Decimal(str(advance)))
