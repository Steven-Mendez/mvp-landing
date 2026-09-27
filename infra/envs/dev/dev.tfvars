environment  = "dev"
project_name = "mvp"
region       = "us-east-1"
# <domain> + www.<domain> in the core stack's hosted zone; needs the core stack deployed
# with enable_dns (it publishes core/domain_name and core/route53_zone_id).
enable_dns = false
