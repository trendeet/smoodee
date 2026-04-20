locals {
  bucket_name = "${var.app_name}-prod-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket" "main" {
  bucket = local.bucket_name

  tags = { Name = local.bucket_name }
}

resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    # 도메인 확정 후 "https://your-domain.com" 으로 변경 권장
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "expire-renders"
    status = "Enabled"

    filter {
      prefix = "renders/"
    }

    expiration {
      days = 90
    }
  }
}
