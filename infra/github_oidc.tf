# The roles GitHub Actions assumes through OIDC, so CI never holds long-lived AWS keys.
# The account's OIDC provider for token.actions.githubusercontent.com is created once, by
# mvp-api's infra/bootstrap; this stack only looks it up.
#
# - deploy: publication in the `production` environment; writes the bucket and
#   invalidates CloudFront. Infrastructure is applied locally.
# - config: main-only jobs read public settings from SSM; no deployment permissions.
# - plan: the Terraform workflow (pull requests that touch infra/). Read-only, plus this
#   stack's state and its lock file.
#
# Both exist only when github_repository is set (envs/prod/prod.tfvars).

locals {
  github_roles = var.github_repository != ""

  # The OIDC subject GitHub issues. New repositories get the immutable form, which pins the
  # owner and repository IDs: a repository recreated under the same name cannot assume the
  # roles. The name-only form covers repositories that still use it. Exact matches only.
  github_subject_prefixes = compact([
    var.github_owner_id != null && var.github_repository_id != null ? format(
      "repo:%s@%d/%s@%d",
      split("/", var.github_repository)[0], var.github_owner_id,
      split("/", var.github_repository)[1], var.github_repository_id,
    ) : "",
    "repo:${var.github_repository}",
  ])

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
    plan   = [for prefix in local.github_subject_prefixes : "${prefix}:pull_request"]
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

resource "aws_iam_role" "github_plan" {
  count = local.github_roles ? 1 : 0

  name               = "${local.name}-landing-github-plan"
  assume_role_policy = data.aws_iam_policy_document.github_trust["plan"].json

  lifecycle {
    precondition {
      condition     = var.tf_state_bucket != ""
      error_message = "github_repository needs tf_state_bucket: the plan role reads this stack's state there."
    }
  }
}

# Only this stack's resources and public core DNS parameters. The sole write permission
# is its state lock. No account-wide managed policy, object reads or application data.
data "aws_iam_policy_document" "github_plan" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${var.tf_state_bucket}/${local.state_key}"]
  }

  statement {
    sid       = "StateLock"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${var.tf_state_bucket}/${local.state_key}.tflock"]
  }

  statement {
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.tf_state_bucket}", aws_s3_bucket.landing.arn]
  }

  statement {
    actions   = ["s3:GetBucket*", "s3:GetEncryptionConfiguration", "s3:GetLifecycleConfiguration"]
    resources = [aws_s3_bucket.landing.arn]
  }

  statement {
    actions = ["ssm:GetParameter", "ssm:GetParameters", "ssm:ListTagsForResource"]
    resources = [
      "arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.ssm_prefix}/landing/*",
      "arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.ssm_prefix}/core/domain_name",
      "arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.ssm_prefix}/core/route53_zone_id",
    ]
  }

  statement {
    # DescribeParameters is metadata-only and does not support resource-level permissions.
    actions   = ["ssm:DescribeParameters"]
    resources = ["*"]
  }

  statement {
    actions = ["iam:GetRole", "iam:GetRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies", "iam:ListRoleTags"]
    resources = [
      "arn:aws:iam::${local.account_id}:role/${local.name}-landing-github-deploy",
      "arn:aws:iam::${local.account_id}:role/${local.name}-landing-github-plan",
      "arn:aws:iam::${local.account_id}:role/${local.name}-landing-github-config",
    ]
  }

  statement {
    actions   = ["iam:GetOpenIDConnectProvider"]
    resources = [local.github_oidc_provider_arn]
  }

  statement {
    actions   = ["cloudfront:GetDistribution", "cloudfront:GetDistributionConfig", "cloudfront:ListTagsForResource"]
    resources = [aws_cloudfront_distribution.landing.arn]
  }

  statement {
    actions   = ["cloudfront:GetFunction", "cloudfront:DescribeFunction", "cloudfront:ListTagsForResource"]
    resources = [aws_cloudfront_function.viewer_request.arn]
  }

  statement {
    actions   = ["cloudfront:GetOriginAccessControl"]
    resources = ["arn:aws:cloudfront::${local.account_id}:origin-access-control/${aws_cloudfront_origin_access_control.landing.id}"]
  }

  dynamic "statement" {
    for_each = var.enable_dns ? [1] : []
    content {
      actions   = ["ssm:GetParametersByPath"]
      resources = ["arn:aws:ssm:${var.region}:${local.account_id}:parameter${local.ssm_prefix}/core"]
    }
  }

  dynamic "statement" {
    for_each = var.enable_dns ? [1] : []
    content {
      actions   = ["acm:DescribeCertificate", "acm:ListTagsForCertificate"]
      resources = aws_acm_certificate.landing[*].arn
    }
  }

  dynamic "statement" {
    for_each = var.enable_dns ? [1] : []
    content {
      actions   = ["route53:GetHostedZone", "route53:ListResourceRecordSets"]
      resources = ["arn:aws:route53:::hostedzone/${local.core.route53_zone_id}"]
    }
  }
}

resource "aws_iam_role_policy" "github_plan" {
  count = local.github_roles ? 1 : 0

  role   = aws_iam_role.github_plan[0].id
  policy = data.aws_iam_policy_document.github_plan.json
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
