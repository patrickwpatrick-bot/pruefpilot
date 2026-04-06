"""
Storage Service — S3-compatible storage (Hetzner Object Storage)
Falls back to local storage if S3 is not configured.
"""
import uuid
import logging
from io import BytesIO
from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_s3_client():
    """Create S3 client for Hetzner Object Storage."""
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=getattr(settings, 'S3_ENDPOINT_URL', None),
        aws_access_key_id=getattr(settings, 'S3_ACCESS_KEY', None),
        aws_secret_access_key=getattr(settings, 'S3_SECRET_KEY', None),
        region_name=getattr(settings, 'S3_REGION', 'eu-central-1'),
    )


def _s3_configured() -> bool:
    """Check if S3 credentials are configured."""
    return bool(
        getattr(settings, 'S3_ACCESS_KEY', None)
        and getattr(settings, 'S3_SECRET_KEY', None)
        and getattr(settings, 'S3_BUCKET', None)
    )


async def upload_file(file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
    """Upload a file to S3 or local storage. Returns the URL."""
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'bin'
    unique_name = f"{uuid.uuid4().hex}.{ext}"

    if _s3_configured():
        try:
            client = _get_s3_client()
            bucket = getattr(settings, 'S3_BUCKET', 'pruefpilot')
            key = f"uploads/{unique_name}"

            client.put_object(
                Bucket=bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )

            # Return the S3 URL
            endpoint = getattr(settings, 'S3_ENDPOINT_URL', '')
            return f"{endpoint}/{bucket}/{key}"
        except Exception as e:
            logger.error("S3 upload failed, falling back to local: %s", e)

    # Fallback: local storage
    import os
    upload_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, unique_name)
    with open(filepath, 'wb') as f:
        f.write(file_bytes)
    return f"/uploads/{unique_name}"


async def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Generate a presigned URL for secure download."""
    if not _s3_configured():
        return key  # Return path as-is for local storage

    try:
        client = _get_s3_client()
        bucket = getattr(settings, 'S3_BUCKET', 'pruefpilot')
        url = client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': key},
            ExpiresIn=expires_in,
        )
        return url
    except Exception as e:
        logger.error("Presigned URL generation failed: %s", e)
        return key


async def delete_file(url: str) -> bool:
    """Delete a file from S3 or local storage."""
    if _s3_configured() and 's3' in url:
        try:
            client = _get_s3_client()
            bucket = getattr(settings, 'S3_BUCKET', 'pruefpilot')
            # Extract key from URL
            key = url.split(f"/{bucket}/")[-1]
            client.delete_object(Bucket=bucket, Key=key)
            return True
        except Exception as e:
            logger.error("S3 delete failed: %s", e)
            return False

    # Local storage
    import os
    if url.startswith("/uploads/"):
        filepath = os.path.join(os.path.dirname(__file__), '..', '..', url.lstrip('/'))
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
    return False
