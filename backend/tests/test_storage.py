from io import BytesIO
from unittest.mock import Mock

import pytest
from PIL import Image

from app.config import Settings
from app.storage import ALLOWED_TYPES, MAX_IMAGE_BYTES, R2Storage


def image_bytes(image_format):
    buffer = BytesIO()
    Image.new("RGB", (16, 12), "blue").save(buffer, format=image_format)
    return buffer.getvalue()


def storage_for(body, content_type):
    storage = R2Storage(Settings(r2_account_id=None, r2_access_key_id=None,
                                 r2_secret_access_key=None, r2_bucket=None))
    storage.bucket = "test-private"
    storage.client = Mock()
    storage.client.head_object.return_value = {
        "ContentLength": len(body), "ContentType": content_type,
        "ETag": '"test-etag"', "Metadata": {"note": "preserved"},
        "CacheControl": "private",
    }
    storage.client.get_object.return_value = {"Body": BytesIO(body)}
    return storage


@pytest.mark.parametrize("image_format,detected_type", [("JPEG", "image/jpeg"), ("PNG", "image/png"), ("WEBP", "image/webp")])
@pytest.mark.parametrize("declared_type", list(ALLOWED_TYPES))
def test_real_images_accepted_even_with_wrong_browser_type(image_format, detected_type, declared_type):
    body = image_bytes(image_format)
    storage = storage_for(body, declared_type)
    result = storage.verify_image("orders/test/design/renamed.jpg", declared_type, len(body))
    assert result == {"size": len(body), "contentType": detected_type, "width": 16, "height": 12}
    assert storage.client.get_object.return_value["Body"].closed
    if detected_type == declared_type:
        storage.client.copy_object.assert_not_called()
    else:
        storage.client.copy_object.assert_called_once_with(
            Bucket="test-private", Key="orders/test/design/renamed.jpg",
            CopySource={"Bucket": "test-private", "Key": "orders/test/design/renamed.jpg"},
            MetadataDirective="REPLACE", ContentType=detected_type,
            Metadata={"note": "preserved"}, CacheControl="private", CopySourceIfMatch='"test-etag"',
        )


@pytest.mark.parametrize("body", [b"not an image", b"<svg xmlns='http://www.w3.org/2000/svg'/>", image_bytes("GIF")])
def test_invalid_or_unsupported_content_is_rejected(body):
    storage = storage_for(body, "image/jpeg")
    with pytest.raises(ValueError):
        storage.verify_image("test.jpg", "image/jpeg", len(body))
    storage.client.copy_object.assert_not_called()


def test_size_mismatch_is_rejected():
    body = image_bytes("PNG")
    storage = storage_for(body, "image/png")
    with pytest.raises(ValueError, match="size"):
        storage.verify_image("test.png", "image/png", len(body) + 1)
    storage.client.get_object.assert_not_called()


@pytest.mark.parametrize("size", [0, MAX_IMAGE_BYTES + 1])
def test_empty_and_oversized_files_are_rejected(size):
    storage = storage_for(b"", "image/jpeg")
    storage.client.head_object.return_value["ContentLength"] = size
    with pytest.raises(ValueError, match="size"):
        storage.verify_image("test.jpg", "image/jpeg", size)


def test_truncated_jpeg_is_rejected():
    body = image_bytes("JPEG")[:-20]
    storage = storage_for(body, "image/jpeg")
    with pytest.raises(ValueError, match="not a valid image"):
        storage.verify_image("test.jpg", "image/jpeg", len(body))


def test_incomplete_download_is_rejected():
    body = image_bytes("PNG")
    storage = storage_for(body, "image/png")
    storage.client.get_object.return_value["Body"] = BytesIO(body[:-1])
    with pytest.raises(ValueError, match="incomplete"):
        storage.verify_image("test.png", "image/png", len(body))


def test_upload_metadata_must_still_match_signed_intent():
    body = image_bytes("PNG")
    storage = storage_for(body, "application/pdf")
    with pytest.raises(ValueError, match="file type"):
        storage.verify_image("test.png", "image/png", len(body))
