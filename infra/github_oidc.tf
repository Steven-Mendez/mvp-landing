# The roles GitHub Actions assumes through OIDC, so CI never holds long-lived AWS keys.
# The account's OIDC provider for token.actions.githubusercontent.com is created once, by
# mvp-api's infra/bootstrap; this stack only looks it up.
#
# - deploy: publication in the `production` environment; writes the bucket and
#   invalidates CloudFront. Infrastructure is applied locally.
# - config: main-only jobs read public settings from SSM; no deployment permissions.
#
# Roles exist only when github_repository is set (envs/prod/prod.tfvars).

locals {
  github_roles = var.github_repository != ""

  # Trust only immutable OIDC subjects. A repository recreated under the same name
  # cannot assume these roles. Opt older repositories into immutable subjects first.
  github_subject_prefixes = var.github_repository == "" ? [] : [
    format(
      "repo:%s@%d/%s@%d",
      split("/", var.github_repository)[0], var.github_owner_id,
      split("/", var.github_repository)[1], var.github_repository_id,
    ),
  ]

  github_oidc_provider_arn = var.offline_validation ? (
    "arn:aws:iam::000000000000:oidc-provider/token.actions.githubusercontent.com"
  ) : one(data.aws_iam_openid_connect_provider.github[*].arn)
  account_id = var.offline_validation ? "000000000000" : data.aws_caller_identity.current[0].account_id
}

data "aws_caller_identity" "current" {
  count = var.offline_validation ? 0 : 1
}

data "aws_iam_openid_connect_provider" "github" {
  count = local.github_roles && !var.offline_validation ? 1 : 0

  arn = "arn:aws:iam::${local.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

# Trust: exact OIDC subjects per role, no wildcards.
data "aws_iam_policy_document" "github_trust" {
  for_each = local.github_roles ? {
    deploy = [for prefix in local.github_subject_prefixes : "${prefix}:environment:${var.github_environment}"]
    config = [for prefix in local.github_subject_prefixes : "${prefix}:ref:refs/heads/main"]
  } : {}

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = each.value
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  count = local.github_roles ? 1 : 0

  name               = "${local.name}-landing-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_trust["deploy"].json
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.landing.arn]
  }

  statement {
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.landing.arn}/*"]
  }

  statement {
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.landing.arn]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  count = local.github_roles ? 1 : 0

  role   = aws_iam_role.github_deploy[0].id
  policy = data.aws_iam_policy_document.github_deploy.json
}

# Config jobs and monitoring run on main with read-only SSM credentials. The build job
# receives only public outputs, never an AWS session or id-token permission.
resource "aws_iam_role" "github_config" {
  count = local.github_roles ? 1 : 0

  name               = "${local.name}-landing-github-config"
  assume_role_policy = data.aws_iam_policy_document.github_trust["config"].json
}

data "aws_iam_policy_document" "github_config" {
  statement {
    actions = ["ssm:GetParameter"]
    resources = [
      "arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.ssm_prefix}/landing/*",
      "arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.ssm_prefix}/web/url",
    ]
  }
}

resource "aws_iam_role_policy" "github_config" {
  count = local.github_roles ? 1 : 0

  role   = aws_iam_role.github_config[0].id
  policy = data.aws_iam_policy_document.github_config.json
}
