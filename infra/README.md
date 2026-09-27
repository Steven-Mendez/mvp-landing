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
| `scripts/github-variables.sh`                       | sets the GitHub Actions variables from the outputs                                           |
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

1. **Apply** with administrator credentials. The values that depend on your account and
   repository are passed on the command line, never committed:

   ```sh
   BUCKET=<project>-terraform-state-<account_id>   # the state bucket from the bootstrap
   REPO=<owner>/<name>                              # this repository on GitHub
   cp infra/backend.tf.example infra/backend.tf
   terraform -chdir=infra init -backend-config=envs/prod/backend.hcl -backend-config="bucket=$BUCKET"
   terraform -chdir=infra apply -var-file=envs/prod/prod.tfvars \
     -var "github_repository=$REPO" -var "tf_state_bucket=$BUCKET"
   ```

   Leave out both `-var` flags to apply without the GitHub roles (no CD).

2. **Set the GitHub variables** from the stack's outputs. Nothing about your account is
   committed; the workflows read it all from these variables:

   ```sh
   infra/scripts/github-variables.sh <PUBLIC_APP_URL> [PUBLIC_REPOSITORY_URL]
   ```

   `PUBLIC_APP_URL` is the web app's URL (`web/url` in SSM). Until the web app exists, use
   this site's own URL: its "Sign in" and "Try it now" links show the 404 page meanwhile.
   Run the script again whenever a value changes (a new domain, the web app's real URL).

   | Where                      | Variable                                                                                        |
   | -------------------------- | ----------------------------------------------------------------------------------------------- |
   | environment `production`   | `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`, `LANDING_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `PUBLIC_SITE_URL`, `PUBLIC_APP_URL`, `PUBLIC_REPOSITORY_URL` (optional) |
   | repository                 | `AWS_TERRAFORM_PLAN_ROLE_ARN`, `TF_STATE_BUCKET`, `AWS_REGION`                                  |

   The script also restricts the `production` environment to `main`. The Terraform
   workflow skips its plan until `AWS_TERRAFORM_PLAN_ROLE_ARN` exists.
3. **Without DNS**, run the web deploy again. It reads this site's URL from `landing/url`,
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
