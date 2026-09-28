/**
 * The native modal handles focus trapping, Esc and returning focus to the trigger;
 * this adds the backdrop click, closing on navigation and the trigger's state.
 * Returns the cleanup.
 */
export function startHeaderMenu(root: HTMLElement): () => void {
  const trigger = root.querySelector<HTMLButtonElement>(
    "[data-header-menu-open]"
  )
  const dialog = root.querySelector("dialog")
  if (!trigger || !dialog) return () => {}

  const open = () => {
    dialog.showModal()
    trigger.setAttribute("aria-expanded", "true")
  }
  const onClose = () => {
    trigger.setAttribute("aria-expanded", "false")
  }
  const onClick = (event: Event) => {
    const target = event.target as Element
    // The panel fills the dialog, so only the backdrop targets the dialog itself.
    if (target === dialog || target.closest("[data-header-menu-close]")) {
      dialog.close()
    }
  }

  trigger.addEventListener("click", open)
  dialog.addEventListener("close", onClose)
  dialog.addEventListener("click", onClick)
  return () => {
    trigger.removeEventListener("click", open)
    dialog.removeEventListener("close", onClose)
    dialog.removeEventListener("click", onClick)
  }
}
