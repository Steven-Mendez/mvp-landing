environment  = "prod"
project_name = "mvp"
region       = "us-east-1"
# <domain> + www.<domain> in the core stack's hosted zone; needs the core stack deployed
# with enable_dns (it publishes core/domain_name and core/route53_zone_id).
enable_dns = false
# The GitHub roles (github_oidc.tf) depend on who uses the template, so their inputs are
# never committed: pass -var github_repository=<owner/name> -var tf_state_bucket=<bucket>
# (CI takes them from the repository and the TF_STATE_BUCKET variable).
