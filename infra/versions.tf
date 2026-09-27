terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.66"
    }
  }

  # State: copy `backend.tf.example` to `backend.tf` (gitignored) for real use — an S3
  # backend with `use_lockfile = true`, no DynamoDB lock table, $0 idle — and init with
  # `-backend-config=envs/<env>/backend.hcl`. Without it (offline checks, CI) Terraform
  # plans against an empty local state and never writes one.
}
