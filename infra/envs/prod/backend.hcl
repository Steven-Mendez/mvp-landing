# terraform -chdir=infra init -backend-config=envs/prod/backend.hcl
# The same state bucket as the other stacks; each stack has its own key.
bucket = "CHANGE-ME-terraform-state"
key    = "mvp-landing/prod/terraform.tfstate"
