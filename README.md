# mvp-landing

The kit's public landing page: a static Astro site with React islands and Tailwind. It
runs on S3 + CloudFront, and "Sign in" and "Try it now" open the web app (`mvp-web`).

## Getting started

Needs Node 22 and pnpm 11.

```sh
pnpm install
cp .env.example .env   # optional: the defaults point at localhost
pnpm dev               # http://localhost:4321
```

| Variable                | What                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| `PUBLIC_APP_URL`        | the web app's origin, for "Sign in" and "Try it now"                    |
| `PUBLIC_SITE_URL`       | this site's own origin, used for absolute `og:image` URLs               |
| `PUBLIC_REPOSITORY_URL` | optional link to the kit's source; if blank, "Get the source" is hidden |

These values are baked into the HTML at build time.

## Scripts

| Command              | What                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| `pnpm build`         | static build in `dist/`                                                   |
| `pnpm check`         | type check (`astro check`)                                                |
| `pnpm test`          | unit and component tests (Vitest)                                         |
| `pnpm test:e2e`      | end-to-end and accessibility tests (Playwright, needs `pnpm build` first) |
| `pnpm test:mutation` | mutation tests (Stryker)                                                  |

## CI/CD

| Workflow                   | When                      | What                                            |
| -------------------------- | ------------------------- | ----------------------------------------------- |
| `ci.yml`                   | pull requests             | types, build, unit, e2e, Terraform offline      |
| `lighthouse.yml`           | pull requests             | performance, accessibility and SEO ≥ 90         |
| `security.yml`             | pull requests, Mondays    | `pnpm audit`, Trivy on `infra/`                 |
| `terraform.yml`            | pull requests to `infra/` | the prod plan as a comment                      |
| `cd.yml`                   | push to `main`            | CI, then upload to S3 and invalidate CloudFront |
| `mutation.yml`             | push to `main`            | Stryker, without blocking the deploy            |
| `dependabot-automerge.yml` | Dependabot pull requests  | merges minor and patch updates once checks pass |

The infrastructure and setting up the first deploy are covered in
[`infra/README.md`](infra/README.md). Deploy order across the repos: api → web → landing.
