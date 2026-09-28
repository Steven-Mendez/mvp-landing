import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { appendFileSync, readFileSync } from "node:fs"
import { validateConfig } from "./deployment.mjs"

const text = readFileSync("infra/envs/prod/prod.tfvars", "utf8")
const value = (name) =>
  text.match(new RegExp(`^${name}\\s*=\\s*"([^"]+)"`, "m"))?.[1]
const project = value("project_name")
const region = value("region") || "us-east-1"
assert(project && /^[a-z][a-z0-9-]+$/.test(project), "Invalid project_name")
assert(/^[a-z]{2}-[a-z]+-\d+$/.test(region), "Invalid AWS region")
const prefix = `/${project}/prod`
let outputs = { region, prefix }
if (process.argv[2] === "stack") {
  const param = (name) =>
    execFileSync(
      "aws",
      [
        "ssm",
        "get-parameter",
        "--region",
        region,
        "--name",
        `${prefix}/${name}`,
        "--query",
        "Parameter.Value",
        "--output",
        "text"
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
    ).trim()
  const mode = process.env.LANDING_MODE || "standalone"
  assert(
    ["standalone", "connected"].includes(mode),
    "LANDING_MODE must be standalone or connected"
  )
  const app_url = mode === "connected" ? param("web/url") : ""
  const config = validateConfig(
    {
      site_url: param("landing/url"),
      app_url,
      bucket: param("landing/bucket"),
      distribution_id: param("landing/distribution_id")
    },
    mode
  )
  assert(
    /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(config.bucket),
    "Invalid landing bucket"
  )
  assert(
    /^[A-Z0-9]+$/.test(config.distribution_id),
    "Invalid CloudFront distribution"
  )
  outputs = { ...outputs, ...config }
} else
  assert.equal(
    process.argv[2],
    "settings",
    "Usage: read-stack.mjs settings|stack"
  )
const output =
  Object.entries(outputs)
    .map(([key, val]) => `${key}=${val}`)
    .join("\n") + "\n"
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output)
else process.stdout.write(output)
