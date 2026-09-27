variable "region" {
  description = "AWS region for every regional resource: the core stack's region (the SSM parameters are read here)."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix for resource names and the SSM path (/<project_name>/<environment>/); must match the core stack."
  type        = string
  default     = "mvp"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}$", var.project_name))
    error_message = "project_name must be lowercase letters, digits and hyphens (2-31 chars)."
  }
}

variable "environment" {
  description = "dev, staging or prod: goes into names, tags and the SSM path."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging or prod."
  }
}

variable "enable_dns" {
  description = "Serve the landing on <domain>, with www.<domain> redirecting to it: an ACM certificate (us-east-1) validated in the core stack's hosted zone plus the alias records. Needs core/domain_name and core/route53_zone_id (the core stack with enable_dns)."
  type        = bool
  default     = false
}

variable "offline_validation" {
  description = "true for offline checks (CI): placeholder credentials, no API calls, and placeholder values instead of the core stack's SSM parameters and the GitHub OIDC provider."
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "owner/name of this repository on GitHub. Set, it creates the roles the CD and Terraform workflows assume through OIDC (github_oidc.tf); blank creates none."
  type        = string
  default     = ""

  validation {
    condition     = var.github_repository == "" || can(regex("^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$", var.github_repository))
    error_message = "github_repository must be owner/name."
  }
}

variable "github_owner_id" {
  description = "Numeric ID of the repository's owner (gh api repos/<owner>/<repo> --jq .owner.id). With github_repository_id, the roles also trust GitHub's immutable OIDC subject, which new repositories use."
  type        = number
  default     = null
}

variable "github_repository_id" {
  description = "Numeric ID of the repository (gh api repos/<owner>/<repo> --jq .id)."
  type        = number
  default     = null
}

variable "github_environment" {
  description = "GitHub environment the deploy job runs in; only it may assume the deploy role."
  type        = string
  default     = "production"
}

variable "tf_state_bucket" {
  description = "The Terraform state bucket (envs/<env>/backend.hcl): the plan role reads this stack's state in it and writes its lock file. Required with github_repository."
  type        = string
  default     = ""
}
