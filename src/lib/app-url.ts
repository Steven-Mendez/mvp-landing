import { PUBLIC_APP_URL } from "astro:env/client"

/** An absolute link into the web app (mvp-web), which lives on another origin. */
export function appHref(path: `/${string}`): string {
  return `${PUBLIC_APP_URL.replace(/\/+$/, "")}${path}`
}

export const signUpHref = () => appHref("/login?mode=sign-up")
export const signInHref = () => appHref("/login")
