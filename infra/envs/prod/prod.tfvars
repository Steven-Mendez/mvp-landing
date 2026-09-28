environment  = "prod"
project_name = "mvp"
region       = "us-east-1"
# <domain> + www.<domain> in the core stack's hosted zone; needs the core stack deployed
# with enable_dns (it publishes core/domain_name and core/route53_zone_id).
enable_dns = false
# The GitHub roles depend on this repository's immutable OIDC identity. Supply
# github_repository, github_owner_id and github_repository_id when planning or applying
# locally. CI uses offline placeholders and has no access to the remote state.
