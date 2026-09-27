# Optional (enable_dns): <domain> and www.<domain> in the hosted zone the core stack looked
# up (core/route53_zone_id). This stack owns its certificate — CloudFront needs it in
# us-east-1, DNS-validated in that zone — and the alias records. www answers a redirect to
# the apex (functions/viewer_request.js). The api certificate and record stay in the core
# stack; app.<domain> belongs to the web stack.

resource "aws_acm_certificate" "landing" {
  count = var.enable_dns ? 1 : 0

  provider                  = aws.us_east_1
  domain_name               = local.landing_domain
  subject_alternative_names = [local.www_domain]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true

    precondition {
      condition     = local.core.domain_name != "" && local.core.route53_zone_id != ""
      error_message = "enable_dns needs core/domain_name and core/route53_zone_id: deploy the core stack (mvp-api) with enable_dns first."
    }
  }
}

resource "aws_route53_record" "landing_validation" {
  for_each = var.enable_dns ? {
    for option in aws_acm_certificate.landing[0].domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  } : {}

  zone_id         = local.core.route53_zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "landing" {
  count = var.enable_dns ? 1 : 0

  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.landing[0].arn
  validation_record_fqdns = [for record in aws_route53_record.landing_validation : record.fqdn]
}

# The aliases need the distribution, which needs the validated certificate: they come last.
resource "aws_route53_record" "landing" {
  for_each = var.enable_dns ? {
    for pair in setproduct([local.landing_domain, local.www_domain], ["A", "AAAA"]) :
    "${pair[0]}/${pair[1]}" => { name = pair[0], type = pair[1] }
  } : {}

  zone_id = local.core.route53_zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = aws_cloudfront_distribution.landing.domain_name
    zone_id                = aws_cloudfront_distribution.landing.hosted_zone_id
    evaluate_target_health = false
  }
}
