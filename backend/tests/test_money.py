from unittest.mock import Mock

import pytest
from pydantic import TypeAdapter, ValidationError

from app.money import Money, remaining_money
from app.repository import MongoRepository


@pytest.mark.parametrize("value", [7.45, 8940, 0, 0.1, 22.350000000000001])
def test_money_remains_a_json_number_with_two_decimal_precision(value):
    adapter = TypeAdapter(Money)
    assert adapter.validate_python(value) == round(value, 2)


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -0.01, 7.451])
def test_money_rejects_invalid_values(value):
    with pytest.raises(ValidationError):
        TypeAdapter(Money).validate_python(value)


def test_remaining_money_has_no_binary_subtraction_artifacts():
    assert remaining_money(0.87, 0.1) == 0.77
    assert remaining_money(8940, 0) == 8940


def test_atlas_validator_accepts_decimal_and_existing_integer_amounts():
    repository = object.__new__(MongoRepository)
    repository.db = Mock()
    repository.db.list_collection_names.return_value = ["orders"]
    repository.ensure_schema_validation()
    call = repository.db.command.call_args
    assert call.args == ("collMod", "orders")
    schema = call.kwargs["validator"]["$jsonSchema"]
    assert schema["properties"]["amount"]["bsonType"] == ["int", "long", "double"]
    assert schema["properties"]["quantity"]["bsonType"] == "int"
    assert call.kwargs["validationLevel"] == "strict"
