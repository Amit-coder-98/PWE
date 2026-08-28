from io import BytesIO

import boto3
from botocore.client import Config
from PIL import Image, UnidentifiedImageError

from .config import Settings

MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}


class R2Storage:
    def __init__(self, settings: Settings):
        self.ready = settings.storage_ready
        self.bucket = settings.r2_bucket
        self.client = None
        if self.ready:
            self.client = boto3.client(
                "s3", endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.r2_access_key_id, aws_secret_access_key=settings.r2_secret_access_key,
                region_name="auto", config=Config(signature_version="s3v4"),
            )

    def upload_url(self, key: str, content_type: str) -> str:
        return self.client.generate_presigned_url("put_object", Params={"Bucket": self.bucket, "Key": key, "ContentType": content_type}, ExpiresIn=900)

    def view_url(self, key: str) -> str:
        return self.client.generate_presigned_url("get_object", Params={"Bucket": self.bucket, "Key": key, "ResponseContentDisposition": "inline"}, ExpiresIn=600)

    def verify_image(self, key: str, expected_type: str, expected_size: int) -> dict:
        head = self.client.head_object(Bucket=self.bucket, Key=key)
        actual_size = int(head["ContentLength"])
        actual_type = head.get("ContentType", "")
        if actual_size <= 0 or actual_size > MAX_IMAGE_BYTES or actual_size != expected_size:
            raise ValueError("Uploaded file size does not match or exceeds 10 MB.")
        if actual_type != expected_type or actual_type not in ALLOWED_TYPES:
            raise ValueError("Uploaded file type does not match the selected image.")
        body = self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read(MAX_IMAGE_BYTES + 1)
        if len(body) > MAX_IMAGE_BYTES:
            raise ValueError("Image exceeds 10 MB.")
        try:
            with Image.open(BytesIO(body)) as image:
                image.verify()
            with Image.open(BytesIO(body)) as image:
                if image.format != ALLOWED_TYPES[expected_type]:
                    raise ValueError("The file content does not match its image type.")
                width, height = image.size
                if width < 1 or height < 1 or width * height > 100_000_000:
                    raise ValueError("Image dimensions are invalid or too large.")
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("The uploaded file is not a valid image.") from exc
        return {"size": actual_size, "contentType": actual_type, "width": width, "height": height}

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)
