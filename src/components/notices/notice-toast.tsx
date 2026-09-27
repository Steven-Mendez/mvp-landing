import { useEffect } from "react"
import { createRoot } from "react-dom/client"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import type { NoticeId } from "./notice-ids"
import { notices } from "./notices"

// ui-web globals.css: keep feedback in the product's font (sonner sets its own).
const TOASTER_FONT =
  "[data-sonner-toaster]{font-family:var(--font-family-sans)}"

function Notice({ id }: { id: NoticeId }) {
  // Runs after the Toaster below has subscribed (child effects run first).
  useEffect(() => {
    const { variant, message } = notices[id]
    toast[variant](message)
  }, [id])
  // No ThemeProvider: the Toaster falls back to the "system" theme, like the page.
  return <Toaster position="top-right" />
}

/** Mounts the toast in its own React root, outside the page's islands. */
export function showNotice(id: NoticeId) {
  const style = document.createElement("style")
  style.textContent = TOASTER_FONT
  document.head.append(style)
  const container = document.createElement("div")
  document.body.append(container)
  createRoot(container).render(<Notice id={id} />)
}
