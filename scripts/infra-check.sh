#!/usr/bin/env bash
set -euo pipefail
terraform -chdir=infra fmt -check -recursive
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp infra/*.tf infra/.terraform.lock.hcl infra/.tflint.hcl "$work/"
# Only the disposable copy loses its backend. The operator's initialized backend is untouched.
rm -f "$work/backend.tf"
cp -R infra/envs infra/functions infra/tests "$work/"
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1
unset AWS_SESSION_TOKEN AWS_PROFILE
terraform -chdir="$work" init -backend=false -input=false -lockfile=readonly
terraform -chdir="$work" validate
tflint --chdir="$work" --init
tflint --chdir="$work"
terraform -chdir="$work" test
for env in dev staging prod; do
  terraform -chdir="$work" plan -input=false -refresh=false -lock=false -compact-warnings \
    -var offline_validation=true -var-file="envs/$env/$env.tfvars" > "$work/plan-$env.log" || { cat "$work/plan-$env.log"; exit 1; }
  grep 'Plan:' "$work/plan-$env.log"
done
terraform -chdir="$work" plan -input=false -refresh=false -lock=false -compact-warnings \
  -var offline_validation=true -var-file=envs/prod/prod.tfvars -var enable_dns=true \
  -var github_repository=owner/mvp-landing -var github_owner_id=1 -var github_repository_id=2 \
  -var tf_state_bucket=offline-state > "$work/plan-full.log" || { cat "$work/plan-full.log"; exit 1; }
grep 'Plan:' "$work/plan-full.log"
