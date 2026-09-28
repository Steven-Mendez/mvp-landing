# The standalone landing stack: static Astro on private S3 + CloudFront. Optional
# custom DNS reads the core stack's zone from SSM (ssm.tf). Pay-per-use only;
# the optional hosted zone belongs to the core stack.
#
# Terraform creates the infrastructure; the CD workflow only uploads dist/ and
# invalidates the cache, with the narrow role from github_oidc.tf.
#
# Standalone mode has no app dependency. For connected mode deploy api/core and web
# first, then enable the integration. The web build reads this site's landing/url.

locals {
  # AWS-managed policies, by id (no data source needed offline).
  policy_caching_optimized = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  policy_security_headers  = "67f7725c-6f97-4210-82d7-5512b31e9d03"
  not_found_page           = "/404.html"
}

# Private: only the distribution reads it (bucket policy below), only CD writes it.
resource "aws_s3_bucket" "landing" {
  bucket_prefix = "${local.name}-landing-"
  force_destroy = true # its content is a build artefact, recreated by every deploy
}

resource "aws_s3_bucket_public_access_block" "landing" {
  bucket                  = aws_s3_bucket.landing.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "landing" {
  bucket = aws_s3_bucket.landing.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_cloudfront_origin_access_control" "landing" {
  name                              = "${local.name}-landing"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Pretty URLs (/foo/ → /foo/index.html) and the www → apex redirect.
resource "aws_cloudfront_function" "viewer_request" {
  name    = "${local.name}-landing-viewer-request"
  runtime = "cloudfront-js-2.0"
  comment = "index.html for directory URLs; www redirects to the apex"
  publish = true
  code    = file("${path.module}/functions/viewer_request.js")
}

resource "aws_cloudfront_distribution" "landing" {
  enabled             = true
  comment             = "${local.name} landing"
  price_class         = "PriceClass_100"
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = var.enable_dns ? [local.landing_domain, local.www_domain] : []

  origin {
    origin_id                = "landing"
    domain_name              = aws_s3_bucket.landing.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.landing.id
  }

  # The cache follows the Cache-Control the CD workflow sets per object: hashed _astro/*
  # for a year; HTML and other files have max-age=0. CachingOptimized imposes a
  # one-second edge minimum; every publication also waits for invalidation.
  default_cache_behavior {
    target_origin_id           = "landing"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = local.policy_caching_optimized
    response_headers_policy_id = local.policy_security_headers

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.viewer_request.arn
    }
  }

  # Without s3:ListBucket a missing key answers 403, not 404: both show the 404 page.
  dynamic "custom_error_response" {
    for_each = [403, 404]

    content {
      error_code            = custom_error_response.value
      response_code         = 404
      response_page_path    = local.not_found_page
      error_caching_min_ttl = 60
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = !var.enable_dns
    acm_certificate_arn            = var.enable_dns ? aws_acm_certificate_validation.landing[0].certificate_arn : null
    ssl_support_method             = var.enable_dns ? "sni-only" : null
    minimum_protocol_version       = var.enable_dns ? "TLSv1.2_2021" : "TLSv1"
  }
}

# Only this distribution may read the bucket.
data "aws_iam_policy_document" "landing" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.landing.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.landing.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "landing" {
  bucket = aws_s3_bucket.landing.id
  policy = data.aws_iam_policy_document.landing.json

  depends_on = [aws_s3_bucket_public_access_block.landing]
}
