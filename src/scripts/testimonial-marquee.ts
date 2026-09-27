/**
 * The marquee only runs while the section is on screen and the tab is visible.
 * Plain DOM code: toggling one attribute does not need a framework island.
 * Returns the cleanup.
 */
export function startTestimonialMarquee(section: HTMLElement): () => void {
  const track = section.querySelector<HTMLElement>(".landing-testimonial-track")
  if (!track || !("IntersectionObserver" in window)) return () => {}
  let inView = false
  const update = () => {
    track.dataset.running = String(inView && !document.hidden)
  }
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? false
    update()
  })
  observer.observe(section)
  document.addEventListener("visibilitychange", update)
  return () => {
    observer.disconnect()
    document.removeEventListener("visibilitychange", update)
  }
}
