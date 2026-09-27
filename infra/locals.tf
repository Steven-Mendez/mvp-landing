locals {
  name = "${var.project_name}-${var.environment}"

  # With enable_dns the landing lives on the apex of the core stack's zone, and www.<domain>
  # redirects to it (functions/viewer_request.js); otherwise on the CloudFront hostname.
  landing_domain = var.enable_dns ? local.core.domain_name : ""
  www_domain     = var.enable_dns ? "www.${local.core.domain_name}" : ""
  landing_url    = var.enable_dns ? "https://${local.landing_domain}" : "https://${aws_cloudfront_distribution.landing.domain_name}"

  # The key in envs/<env>/backend.hcl; the plan role may read nothing else in the bucket.
  state_key = "mvp-landing/${var.environment}/terraform.tfstate"
}
