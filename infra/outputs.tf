output "landing_url" {
  description = "URL of the landing site (also written to SSM as landing/url)."
  value       = local.landing_url
}

output "cloudfront_domain" {
  description = "The distribution's hostname (the site's URL without DNS)."
  value       = aws_cloudfront_distribution.landing.domain_name
}

output "bucket" {
  value = aws_s3_bucket.landing.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.landing.id
}

output "landing_url_parameter" {
  description = "The SSM parameter the web deploy reads for VITE_LANDING_URL."
  value       = aws_ssm_parameter.landing_url.name
}

# Copy these into the GitHub `production` environment (Settings → Environments) for the
# CD workflow; the plan role goes into the repository variable AWS_TERRAFORM_PLAN_ROLE_ARN.
output "github_environment_variables" {
  description = "Variables of the GitHub environment the CD workflow deploys from."
  value = {
    AWS_DEPLOY_ROLE_ARN        = one(aws_iam_role.github_deploy[*].arn)
    AWS_REGION                 = var.region
    LANDING_BUCKET             = aws_s3_bucket.landing.bucket
    CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.landing.id
    PUBLIC_SITE_URL            = local.landing_url
  }
}

output "terraform_plan_role_arn" {
  description = "Repository variable AWS_TERRAFORM_PLAN_ROLE_ARN of the Terraform workflow."
  value       = one(aws_iam_role.github_plan[*].arn)
}
