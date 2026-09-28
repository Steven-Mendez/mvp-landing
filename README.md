# mvp-landing

The kit's public landing: static Astro, React islands and Tailwind on private S3 +
CloudFront. It deploys independently with an on-page demo. Optionally connect
`mvp-web` for sign-in/sign-up. MIT licensed; see [LICENSE](LICENSE).

## Local development

Use Node from `.node-version` (Node 24 also supported) and pnpm 11.8.0.

```sh
pnpm install --frozen-lockfile
cp .env.example .env        # optional; defaults use localhost
pnpm dev                    # http://localhost:4321
```

| Build-time variable     | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `PUBLIC_APP_URL`        | Optional web app origin; blank keeps the landing standalone |
| `PUBLIC_SITE_URL`       | Landing origin for canonical and social URLs                |
| `PUBLIC_REPOSITORY_URL` | Optional HTTPS source link; blank hides it                  |

Production defaults to standalone mode. Set repository variable `LANDING_MODE=connected`
when the web app exists: CD then requires a valid HTTPS `web/url` in SSM. For local
connected development, set `PUBLIC_APP_URL=http://localhost:3000`.
See [infra/README.md](infra/README.md).

## Checks

```sh
pnpm lint && pnpm format:check && pnpm check
pnpm test:coverage && pnpm test:delivery
pnpm exec playwright install chromium webkit  # once; add --with-deps on Linux
pnpm build && pnpm test:e2e
pnpm test:lighthouse                         # needs Chrome/Chromium
pnpm infra:check                             # Terraform 1.15.4, TFLint 0.64.0
```

`pnpm format` applies formatting. `pnpm test` runs unit/component tests;
`pnpm test:mutation` runs Stryker. E2E covers desktop Chromium, mobile Chromium and
WebKit. Coverage floors: 95% lines/statements/functions, 90% branches; generated UI
primitives are excluded. Delivery tests cover release integrity and smoke failures.

## Delivery

| Workflow                         | Purpose                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| CI                               | Lint, format, types, coverage, delivery tests, E2E, offline Terraform, actionlint                  |
| Lighthouse                       | PR performance, accessibility and SEO ≥90                                                          |
| Security                         | PR/CD and weekly dependency + infrastructure scans                                                 |
| Terraform                        | Real prod plan on internal PRs; skipped before setup and for forks                                 |
| CD                               | On `main`: CI/security → public settings → build/E2E/Lighthouse → retained artifact → deploy/smoke |
| Rollback                         | Restore a successful CD artifact without rebuilding                                                |
| Production health                | Every 30 minutes; open one incident and close it on recovery                                       |
| Mutation / Dependabot auto-merge | Nonblocking mutation score; merge minor/patch updates after required checks                        |

CD and rollback share a deployment queue. Build jobs have no AWS credentials;
only publication can write the bucket. Artifacts contain a commit and checksums,
are retained for 90 days, and publish their identity at `/release.json`.

## GitHub setup

- Import `.github/rulesets/main.json`: required PR, resolved conversations, all quality
  checks, no force-push/deletion or bypass. It uses zero approvals for a solo maintainer;
  require one independent approval when a second maintainer joins.
- Allow auto-merge; enable Dependabot alerts/security updates, secret scanning and push protection.
- Restrict environment `production` to `main`.
- Set repository variable `OPERATIONS_OWNER` to the incident assignee. Enable GitHub
  email/Actions notifications and watch issues; the monitor also fails its workflow.
- AWS setup, deployment and recovery: [infra/README.md](infra/README.md).
