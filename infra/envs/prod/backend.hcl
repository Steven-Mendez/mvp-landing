# terraform -chdir=infra init -backend-config=envs/prod/backend.hcl
# The same state bucket as the other stacks, each with its own key. The bucket names the
# account, so pass it instead: -backend-config="bucket=<bucket>".
bucket = "CHANGE-ME-terraform-state"
key    = "mvp-landing/prod/terraform.tfstate"
