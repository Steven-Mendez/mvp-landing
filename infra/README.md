# infra

Terraform for the landing stack: the static Astro build (`dist/`) in a private S3 bucket
behind CloudFront, optionally on `<domain>` with `www.<domain>` redirecting to it. It sits
on top of the core stack from `mvp-api`, which it reads through SSM Parameter Store.
Pay-per-use only: an idle landing costs nothing beyond storage.

No workflow applies this stack; you apply it locally. GitHub Actions only checks it:

| Workflow        | What it does with `infra/`                                                        |
| --------------- | --------------------------------------------------------------------------------- |
| `ci.yml`        | `fmt`, `validate`, `tflint` and an offline plan of every environment (no account) |
| `terraform.yml` | the real prod plan, as a comment on pull requests that touch `infra/`             |
| `cd.yml`        | nothing: it uploads `dist/` to the bucket and invalidates the cache               |

## Files

| Path                                                | What                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `main.tf`                                           | the bucket (readable by CloudFront only), the distribution, the 404 page, security headers   |
| `functions/viewer_request.js`                       | CloudFront Function: `/foo/` → `/foo/index.html`, `www.<domain>` → `<domain>` (301)          |
| `dns.tf`                                            | with `enable_dns`: ACM certificate for `<domain>` + `www.<domain>` and the alias records     |
| `ssm.tf`                                            | reads the core stack's DNS parameters, writes `landing/url`                                  |
| `github_oidc.tf`                                    | with `github_repository`: the roles GitHub Actions assumes (deploy and plan)                 |
| `variables.tf`, `locals.tf`, `outputs.tf`           | inputs, names and URLs, outputs                                                              |
| `versions.tf`, `providers.tf`, `backend.tf.example` | pinned providers (`hashicorp/aws ~> 6.66`) and the S3 backend with `use_lockfile`            |
| `envs/<env>/<env>.tfvars`, `envs/<env>/backend.hcl` | values and state key (`mvp-landing/<env>/terraform.tfstate`) for `dev`, `staging` and `prod` |

## Checking it locally

The same checks as CI, with no AWS account (`offline_validation` swaps every lookup for a
placeholder):

```sh
terraform -chdir=infra fmt -check -recursive
terraform -chdir=infra init -backend=false
terraform -chdir=infra validate
tflint --chdir=infra --init && tflint --chdir=infra
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
  terraform -chdir=infra plan -refresh=false -lock=false \
  -var-file=envs/prod/prod.tfvars -var offline_validation=true
```

## First deploy

Deploy the stacks in this order: api (core) → web → landing. The GitHub OIDC provider and
the state bucket come from `mvp-api/infra/bootstrap`.

1. **Fill in prod.** Put the state bucket in `envs/prod/backend.hcl`. In
   `envs/prod/prod.tfvars`, set `github_repository` (`owner/name`) and `tf_state_bucket`.
2. **Apply** with administrator credentials:

   ```sh
   cp infra/backend.tf.example infra/backend.tf
   terraform -chdir=infra init -backend-config=envs/prod/backend.hcl
   terraform -chdir=infra apply -var-file=envs/prod/prod.tfvars
   ```

3. **Set up the `production` environment** (Settings → Environments). Restrict it to
   `main`, then add these variables:
   - every entry of `terraform -chdir=infra output github_environment_variables`
   - `PUBLIC_APP_URL`: the web app's URL (`web/url` in SSM)
   - `PUBLIC_REPOSITORY_URL`: optional
4. **Add the repository variables** (Settings → Secrets and variables → Actions):
   - `AWS_TERRAFORM_PLAN_ROLE_ARN`: from `terraform -chdir=infra output -raw terraform_plan_role_arn`
   - `TF_STATE_BUCKET`
   - `AWS_REGION`

   The Terraform workflow skips its plan until the role variable exists.
5. **Without DNS**, run the web deploy again. It reads this site's URL from `landing/url`,
   which exists only after this first apply.

From then on every push to `main` passes CI and publishes the site. Apply changes to
`infra/` yourself after merging; the pull request shows their plan first.

## Contract with the other stacks

All values are `String` parameters under `/<project_name>/<environment>/`.

| Parameter                                  | Direction                    | Used for                                                                             |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------ |
| `core/domain_name`, `core/route53_zone_id` | read, only with `enable_dns` | `<domain>`. If either is missing, the plan fails and says to deploy mvp-api with DNS |
| `landing/url`                              | **written**                  | the web deploy's `VITE_LANDING_URL` when it has no `LANDING_URL` variable            |

DNS: the core stack owns the hosted zone and the API record, and the web stack owns
`app.<domain>`. This stack owns the certificate and records for `<domain>` and
`www.<domain>`.

## GitHub roles

| Role                                    | Who assumes it                                   | What it can do                                                                                              |
| --------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `<project>-<env>-landing-github-deploy` | the CD job, only in the `production` environment | sync the bucket, invalidate the distribution                                                                |
| `<project>-<env>-landing-github-plan`   | pull request jobs                                | read everything (`ReadOnlyAccess`) except other objects in S3, read this stack's state, write its lock file |

The plan role can't read other stacks' state, which holds secrets.

Two Trivy findings are accepted in `/.trivyignore`, each with its reason: no WAF, and no
customer-managed KMS key. Both add a fixed monthly cost with nothing to protect on a
public static site.
