/**
 * The marquee only runs while the section is on screen and the tab is visible.
 * Plain DOM code: toggling one attribute does not need a framework island.
 * Returns the cleanup.
 */
export function startTestimonialMarquee(section: HTMLElement): () => void {
  const track = section.querySelector<HTMLElement>(".landing-testimonial-track")
  if (!track || !("IntersectionObserver" in window)) return () => {}
  const toggle = section.querySelector<HTMLButtonElement>(
    "[data-marquee-pause]"
  )
  let paused = false
  let inView = false
  const update = () => {
    track.dataset.running = String(inView && !document.hidden && !paused)
  }
  const onToggle = () => {
    paused = !paused
    toggle?.setAttribute("aria-pressed", String(paused))
    update()
  }
  if (toggle) toggle.hidden = false
  toggle?.addEventListener("click", onToggle)
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? false
    update()
  })
  observer.observe(section)
  document.addEventListener("visibilitychange", update)
  return () => {
    observer.disconnect()
    document.removeEventListener("visibilitychange", update)
    toggle?.removeEventListener("click", onToggle)
  }
}
