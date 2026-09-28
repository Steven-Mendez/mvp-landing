# Infrastructure and operations

Terraform owns a private S3 bucket, CloudFront/OAC, security headers, routing,
SSM parameters and GitHub OIDC roles. Optional DNS adds ACM and apex/www records.
Infrastructure is planned and applied locally; Actions runs offline checks and publishes static artifacts.

## Offline checks

Install Terraform 1.15.4 and TFLint 0.64.0, then run `pnpm infra:check`.
The script checks formatting, validation, lint, IAM regression tests and offline plans for
dev/staging/prod plus prod with DNS/roles in a disposable copy without a backend.
It never changes your initialized backend or reads remote state.

## First deployment

The landing deploys **without an API or web app** in the default standalone mode.
It needs an AWS account, a Terraform state bucket and the GitHub OIDC provider
(the shared bootstrap can provision these). With `enable_dns=false`, no core SSM
parameters are needed. Optional custom DNS reads the core stack's DNS parameters.
Before enabling deployment credentials, import the ruleset and restrict the
`production` GitHub environment to `main` as described in the root README.

```sh
BUCKET=<project>-terraform-state-<account_id>
REPO=<owner>/<repository>
export TF_VAR_github_repository="$REPO"
export TF_VAR_github_owner_id="$(gh api "repos/$REPO" --jq .owner.id)"
export TF_VAR_github_repository_id="$(gh api "repos/$REPO" --jq .id)"
cp infra/backend.tf.example infra/backend.tf
terraform -chdir=infra init -backend-config=envs/prod/backend.hcl -backend-config="bucket=$BUCKET"
terraform -chdir=infra plan -var-file=envs/prod/prod.tfvars -out=production.tfplan
terraform -chdir=infra apply production.tfplan

gh variable set AWS_DEPLOY_ROLE_ARN --env production --body "$(terraform -chdir=infra output -raw github_deploy_role_arn)"
gh variable set AWS_CONFIG_ROLE_ARN --body "$(terraform -chdir=infra output -raw github_config_role_arn)"
```

`github_repository` enables the roles. Owner/repository
IDs are required: the roles trust only immutable OIDC subjects. Repositories
created before July 15, 2026 must opt into immutable OIDC subjects in GitHub
Actions settings before applying this policy. Check the actual subject with
`gh api "repos/$REPO/actions/oidc/customization/sub"`; it must report
`use_immutable_subject: true`. Optional repository variable
`PUBLIC_REPOSITORY_URL` enables the source link.
Apply the GitHub settings in the root README **before setting the deploy role
variable**. Importing the ruleset and restricting the production environment to
`main` must be verified in GitHub; Terraform cannot enforce those settings here.
If upgrading an existing stack, inspect the Terraform plan: it removes the
obsolete PR plan role. Apply it to revoke that role and remove the old
`AWS_TERRAFORM_PLAN_ROLE_ARN`/`TF_STATE_BUCKET` repository variables.

Run CD on `main`. Standalone mode hides login links and offers the on-page demo.
When API/core and web are ready, set repository variable `LANDING_MODE=connected`
and rerun CD. Connected mode requires their `web/url` SSM parameter, a public HTTPS
origin different from the landing. Without DNS, rerun the web deploy after the first
landing apply so it learns `landing/url`.

## Routine changes and recovery

- **Site:** PR → required checks → squash merge → CD. The production-configured build
  passes E2E and Lighthouse, then the same checksummed artifact is published.
- **Infrastructure:** CI runs offline plans only. Review the PR and run an
  authenticated `terraform -chdir=infra plan` locally from a trusted checkout,
  with the exports and backend above, before applying. Unreviewed PR code must
  never execute with a role that can read Terraform state.
- **Configuration:** apply its owning stack, then rerun CD. Builds contain public URLs;
  changing SSM alone does not update deployed HTML.
- **Inspect:** CD's summary records the commit, site and artifact run. `/release.json`
  identifies the running version. Smoke checks home/canonical, real CTA responses,
  assets, 404 status and the expected commit.
- **Cache:** hashed assets are immutable for a year. HTML has `max-age=0`; CloudFront's
  managed policy has a one-second minimum. Publication waits for cache invalidation.
- **Rollback:** choose an earlier successful CD run with its artifact still retained
  (90 days), then `gh workflow run rollback.yml --ref main -f run_id=<RUN_ID>`.
  The workflow checks the source run, commit, origins and every file checksum, republishes
  without rebuilding, invalidates CloudFront and runs the same smoke test. A changed
  app/site origin or expired artifact requires reverting the change and running CD instead.
- **Compromised asset:** rollback restores HTML but does not delete old hashed
  `_astro/*` assets, which may still be loaded by open tabs or caches. After
  confirming the active release and any rollback versions to keep, delete the
  identified malicious object keys from S3, invalidate those paths in CloudFront,
  and advise affected users to reload. Do not blanket-delete `_astro/*`: that
  breaks active pages and retained rollback artifacts.
- **Recovery drill:** after two successful releases, restore the earlier one, confirm
  `/release.json` and green smoke, then restore the newer one. CD/rollback are serialized.
- **Incident:** Production health runs every 30 minutes, assigns a GitHub issue to
  `OPERATIONS_OWNER` and closes it on recovery. Check the linked run, SSM and the last
  deployment; use rollback for a site regression. GitHub scheduling/notifications are
  best-effort, so monitor externally if a stricter availability target is required.

## Stack contract

All parameters are plain `String` under `/<project_name>/<environment>/`.

| Parameter                                   | Owner / use                                         |
| ------------------------------------------- | --------------------------------------------------- |
| `core/domain_name`, `core/route53_zone_id`  | Core; read when DNS is enabled                      |
| `web/url`                                   | Web stack; required only in connected mode          |
| `landing/url`                               | This stack; canonical origin and web's return links |
| `landing/bucket`, `landing/distribution_id` | This stack; deployment destinations                 |

State keys are `mvp-landing/<env>/terraform.tfstate`, with native S3 locking. Each
stack owns its state. The core owns the zone/API records; web owns `app.<domain>`;
landing owns apex/www. Main files: `main.tf`, `dns.tf`, `ssm.tf`, `github_oidc.tf`;
`functions/viewer_request.js` handles directory URLs and www redirects.

## Permissions

| OIDC role               | Trust / permissions                                           |
| ----------------------- | ------------------------------------------------------------- |
| `landing-github-config` | This repository's `main`; only read `landing/*` and `web/url` |
| `landing-github-deploy` | Environment `production`; bucket writes and invalidations     |

Roles are prefixed `<project>-<env>-`. PRs have no AWS role. Trivy exceptions in `.trivyignore` document the
cost tradeoffs for WAF and customer-managed KMS on public static content.
