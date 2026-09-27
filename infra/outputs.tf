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

# The CD workflow reads everything else from SSM (landing/*, web/url) and the project and
# region from envs/<env>/<env>.tfvars: these are the only values GitHub needs.
output "github_deploy_role_arn" {
  description = "Variable AWS_DEPLOY_ROLE_ARN of the GitHub environment the CD workflow deploys from."
  value       = one(aws_iam_role.github_deploy[*].arn)
}

output "terraform_plan_role_arn" {
  description = "Repository variable AWS_TERRAFORM_PLAN_ROLE_ARN of the Terraform workflow."
  value       = one(aws_iam_role.github_plan[*].arn)
}
