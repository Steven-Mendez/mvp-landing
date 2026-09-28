variables {
  environment          = "prod"
  offline_validation   = true
  github_repository    = "owner/mvp-landing"
  github_owner_id      = 1
  github_repository_id = 2
}

run "config_role_is_read_only" {
  command = plan

  assert {
    condition     = toset(keys(data.aws_iam_policy_document.github_trust)) == toset(["deploy", "config"])
    error_message = "Never grant pull request jobs an AWS role."
  }

  assert {
    condition     = toset(local.github_subject_prefixes) == toset(["repo:owner@1/mvp-landing@2"])
    error_message = "Trust only immutable repository ID subjects, never the recyclable name."
  }

  assert {
    condition = alltrue([
      for statement in data.aws_iam_policy_document.github_config.statement :
      statement.actions == toset(["ssm:GetParameter"])
    ])
    error_message = "The configuration role must only read public SSM parameters."
  }
}
