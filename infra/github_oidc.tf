# The roles GitHub Actions assumes through OIDC, so CI never holds long-lived AWS keys.
# The account's OIDC provider for token.actions.githubusercontent.com is created once, by
# mvp-api's infra/bootstrap; this stack only looks it up.
#
# - deploy: the CD workflow (push to main, `production` environment). Uploads dist/ to
#   the bucket and invalidates the distribution; nothing else. The infrastructure itself
#   is applied locally.
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
}

data "aws_iam_openid_connect_provider" "github" {
  count = local.github_roles && !var.offline_validation ? 1 : 0

  url = "https://token.actions.githubusercontent.com"
}

# Trust: exact OIDC subjects per role, no wildcards.
data "aws_iam_policy_document" "github_trust" {
  for_each = local.github_roles ? {
    deploy = [for prefix in local.github_subject_prefixes : "${prefix}:environment:${var.github_environment}"]
    plan   = [for prefix in local.github_subject_prefixes : "${prefix}:pull_request"]
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

resource "aws_iam_role_policy_attachment" "github_plan_readonly" {
  count = local.github_roles ? 1 : 0

  role       = aws_iam_role.github_plan[0].name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# ReadOnlyAccess can read every object in the account, including the other stacks' state
# (which holds secrets): the deny keeps object reads to this stack's own state. The lock
# file is the only thing the plan writes; the state itself is never written by a plan.
data "aws_iam_policy_document" "github_plan" {
  statement {
    effect        = "Deny"
    actions       = ["s3:GetObject", "s3:GetObjectVersion"]
    not_resources = ["arn:aws:s3:::${var.tf_state_bucket}/${local.state_key}"]
  }

  statement {
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${var.tf_state_bucket}/${local.state_key}"]
  }

  statement {
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${var.tf_state_bucket}/${local.state_key}.tflock"]
  }
}

resource "aws_iam_role_policy" "github_plan" {
  count = local.github_roles ? 1 : 0

  role   = aws_iam_role.github_plan[0].id
  policy = data.aws_iam_policy_document.github_plan.json
}
