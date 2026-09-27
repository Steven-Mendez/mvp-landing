provider "aws" {
  region = var.region

  # `offline_validation` lets `terraform plan` run with placeholder credentials and no
  # account: nothing is looked up, nothing is created (see `make infra-check`).
  skip_credentials_validation = var.offline_validation
  skip_requesting_account_id  = var.offline_validation
  skip_metadata_api_check     = var.offline_validation
  skip_region_validation      = var.offline_validation

  default_tags {
    tags = {
      project     = var.project_name
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}

# CloudFront and ACM for CloudFront are us-east-1 only.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  skip_credentials_validation = var.offline_validation
  skip_requesting_account_id  = var.offline_validation
  skip_metadata_api_check     = var.offline_validation
  skip_region_validation      = var.offline_validation

  default_tags {
    tags = {
      project     = var.project_name
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}
