environment  = "prod"
project_name = "mvp"
region       = "us-east-1"
# <domain> + www.<domain> in the core stack's hosted zone; needs the core stack deployed
# with enable_dns (it publishes core/domain_name and core/route53_zone_id).
enable_dns = false
# GitHub Actions (github_oidc.tf): owner/name of this repository, and the state bucket
# from envs/prod/backend.hcl. Blank creates no roles.
github_repository = ""
tf_state_bucket   = ""
