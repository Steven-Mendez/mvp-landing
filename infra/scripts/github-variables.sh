#!/usr/bin/env bash
# Sets the GitHub Actions variables of this repository from the applied stack's outputs,
# so CD deploys and the Terraform workflow plans against *your* account. Run it after
# every apply that changes an output; it only overwrites what it sets.
#
#   infra/scripts/github-variables.sh <PUBLIC_APP_URL> [PUBLIC_REPOSITORY_URL]
#
# Needs: gh (logged in, run inside this repository), terraform initialised against the
# stack's state, jq. The repository comes from gh; the environment is `production`.
set -euo pipefail

app_url="${1:?usage: $0 <PUBLIC_APP_URL> [PUBLIC_REPOSITORY_URL]}"
repository_url="${2:-}"
env="${GITHUB_ENVIRONMENT:-production}"
infra="$(cd "$(dirname "$0")/.." && pwd)"

outputs="$(terraform -chdir="$infra" output -json)"
out() { jq -r --arg k "$1" '.[$k].value // empty' <<<"$outputs"; }

plan_role="$(out terraform_plan_role_arn)"
[ -n "$plan_role" ] || { echo "no GitHub roles in the state: apply with -var github_repository=<owner/name>" >&2; exit 1; }

# Where the state lives, from the initialised backend (not from any committed file).
state_bucket="$(jq -r '.backend.config.bucket // empty' "$infra/.terraform/terraform.tfstate" 2>/dev/null || true)"
[ -n "$state_bucket" ] || { echo "the backend is not initialised: terraform -chdir=infra init ..." >&2; exit 1; }

# The environment, deployable from main only.
gh api -X PUT "repos/{owner}/{repo}/environments/$env" --silent \
  -F "deployment_branch_policy[protected_branches]=false" \
  -F "deployment_branch_policy[custom_branch_policies]=true"
if ! gh api "repos/{owner}/{repo}/environments/$env/deployment-branch-policies" \
  --jq '.branch_policies[].name' | grep -qx main; then
  gh api -X POST "repos/{owner}/{repo}/environments/$env/deployment-branch-policies" \
    -f name=main -f type=branch --silent
fi

# The environment the CD job deploys from.
jq -r '.github_environment_variables.value | to_entries[] | "\(.key)=\(.value)"' <<<"$outputs" |
  while IFS='=' read -r name value; do gh variable set "$name" --env "$env" --body "$value"; done
gh variable set PUBLIC_APP_URL --env "$env" --body "$app_url"
if [ -n "$repository_url" ]; then
  gh variable set PUBLIC_REPOSITORY_URL --env "$env" --body "$repository_url"
fi

# The repository, for the Terraform plan on pull requests.
gh variable set AWS_TERRAFORM_PLAN_ROLE_ARN --body "$plan_role"
gh variable set TF_STATE_BUCKET --body "$state_bucket"
gh variable set AWS_REGION --body "$(jq -r '.github_environment_variables.value.AWS_REGION' <<<"$outputs")"

echo "done: environment '$env' and repository variables set"
