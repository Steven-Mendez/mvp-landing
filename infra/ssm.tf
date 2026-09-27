# The cross-repo contract (SPLIT-CONTRACT): the core stack in mvp-api writes String
# parameters under /<project_name>/<environment>/core/; this stack reads the DNS ones
# (with enable_dns only) and writes landing/url, which the web deploy reads for
# VITE_LANDING_URL when there is no custom domain.
#
# Under offline_validation nothing is read: placeholder values stand in, so the offline
# plan runs with no AWS account.

locals {
  ssm_prefix = "/${var.project_name}/${var.environment}"

  core_placeholders = {
    domain_name     = var.enable_dns ? "example.com" : ""
    route53_zone_id = var.enable_dns ? "Z0000000000OFFLINE" : ""
  }

  # What the core stack published directly under core/ (names are full paths). Plain
  # String values; nonsensitive because domain names and zone ids are not secrets.
  core_published = length(data.aws_ssm_parameters_by_path.core_dns) == 0 ? {} : zipmap(
    data.aws_ssm_parameters_by_path.core_dns[0].names,
    nonsensitive(data.aws_ssm_parameters_by_path.core_dns[0].values),
  )

  core = var.offline_validation ? local.core_placeholders : {
    # "" when missing: dns.tf's precondition then says to deploy the core stack with DNS.
    domain_name     = lookup(local.core_published, "${local.ssm_prefix}/core/domain_name", "")
    route53_zone_id = lookup(local.core_published, "${local.ssm_prefix}/core/route53_zone_id", "")
  }
}

# SSM rejects empty values, so the core stack writes domain_name and route53_zone_id only
# with enable_dns. Reading them by name would fail with ParameterNotFound before dns.tf
# could explain what to do; reading the path answers with whatever exists, so a missing
# one becomes "" and the certificate's precondition names the fix.
data "aws_ssm_parameters_by_path" "core_dns" {
  count = var.enable_dns && !var.offline_validation ? 1 : 0

  path = "${local.ssm_prefix}/core"
}

resource "aws_ssm_parameter" "landing_url" {
  name        = "${local.ssm_prefix}/landing/url"
  description = "The landing site's public URL (written by the mvp-landing stack)."
  type        = "String"
  value       = local.landing_url
}
