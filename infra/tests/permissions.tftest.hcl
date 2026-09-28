variables {
  environment          = "prod"
  offline_validation   = true
  github_repository    = "owner/mvp-landing"
  tf_state_bucket      = "test-state"
  github_owner_id      = 1
  github_repository_id = 2
}

run "lock_is_readable_and_only_lock_is_writable" {
  command = plan

  assert {
    condition = alltrue([
      for action in ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"] :
      contains(one([
        for statement in data.aws_iam_policy_document.github_plan.statement : statement.actions
        if statement.sid == "StateLock"
      ]), action)
    ])
    error_message = "The S3 backend needs read/write/delete on its lock."
  }

  assert {
    condition = alltrue([
      for statement in data.aws_iam_policy_document.github_plan.statement :
      statement.resources == toset(["arn:aws:s3:::test-state/mvp-landing/prod/terraform.tfstate.tflock"])
      if contains(statement.actions, "s3:PutObject") || contains(statement.actions, "s3:DeleteObject")
    ])
    error_message = "A plan must not write state, application objects, or another stack's lock."
  }

  assert {
    condition = alltrue([
      for statement in data.aws_iam_policy_document.github_config.statement :
      statement.actions == toset(["ssm:GetParameter"])
    ])
    error_message = "The configuration role must only read public SSM parameters."
  }
}
