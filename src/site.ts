// Site-wide constants. Keep the name in step with the app's brand (mvp-web and
// mvp-mobile carry their own copy); public/site.webmanifest repeats the name and the
// description as static JSON.
export const site = {
  name: "MVP Starter Kit",
  tagline: "Your next big idea, minus the plumbing",
  description:
    "A starter kit for products on the web, iOS and Android: accounts, team workspaces, a typed API and a complete example feature, ready to build on."
} as const

export const pageTitle = (page: string) => `${page} · ${site.name}`
