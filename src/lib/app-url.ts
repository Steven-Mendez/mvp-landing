import { PUBLIC_APP_URL } from "astro:env/client"

export const appEnabled = Boolean(PUBLIC_APP_URL)

/** An absolute link into the web app (mvp-web), which lives on another origin. */
export function appHref(path: `/${string}`): string {
  if (!PUBLIC_APP_URL) throw new Error("The web app is not connected")
  return `${PUBLIC_APP_URL.replace(/\/+$/, "")}${path}`
}

export const signUpHref = () => appHref("/login?mode=sign-up")
export const signInHref = () => appHref("/login")

export const primaryCta = {
  href: appEnabled ? signUpHref() : "/#workspace",
  label: appEnabled ? "Try it live" : "Explore the demo"
}
