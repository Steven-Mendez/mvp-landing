const entrances: Record<string, string> = {
  rise: "translate3d(0, 32px, 0)",
  workspace: "translate3d(0, 40px, 0) scale(.97)",
  phone: "translate3d(24px, 40px, 0) rotate(3deg) scale(.97)",
  left: "translate3d(-24px, 24px, 0)",
  right: "translate3d(24px, 24px, 0)",
}

/**
 * Progressive enhancement: content stays visible without JS or with reduced motion.
 * Plain DOM code (no framework): the landing page runs it from a module script, so
 * the entrances never wait for, or pay for, a React runtime. Returns the cleanup.
 */
export function startLandingMotion(container: HTMLElement): () => void {
  if (!("IntersectionObserver" in window) || !("animate" in Element.prototype))
    return () => {}
  const revealed = new WeakSet<Element>()
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
  const animations = new Set<Animation>()
  const pending = new Set<HTMLElement>()
  let disposed = false
  const show = (element: HTMLElement) => {
    revealed.add(element)
    pending.delete(element)
    delete element.dataset.revealPending
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (disposed) return
      // Read the resting transforms together, before starting any animations.
      // This preserves the device angles and their responsive CSS overrides.
      const arriving = entries
        .filter((entry) => {
          if (
            !entry.isIntersecting ||
            entry.intersectionRatio < 0.16 ||
            revealed.has(entry.target)
          )
            return false
          // unobserve does not discard already queued entries for this target.
          revealed.add(entry.target)
          return true
        })
        .map(({ target }) => {
          observer.unobserve(target)
          const element = target as HTMLElement
          return {
            element,
            transform: getComputedStyle(element).transform,
          }
        })
      for (const { element, transform } of arriving) {
        show(element)
        if (
          preference.matches ||
          document.hidden ||
          element.contains(document.activeElement)
        )
          continue
        const from = entrances[element.dataset.reveal ?? ""] ?? entrances.rise
        const resting = transform === "none" ? "" : transform
        const animation = element.animate(
          [
            { opacity: 0, transform: `${resting} ${from}` },
            { opacity: 1, transform },
          ],
          {
            duration: 900,
            delay: Number(element.dataset.revealDelay ?? 0),
            easing: "cubic-bezier(.23,1,.32,1)",
            fill: "backwards",
          }
        )
        animations.add(animation)
        animation.onfinish = () => animations.delete(animation)
      }
    },
    { threshold: 0.16 }
  )
  const targets = Array.from(
    container.querySelectorAll<HTMLElement>("[data-reveal]")
  ).map((element) => ({
    element,
    // Even a sliver already on screen must never disappear and enter again.
    alreadyVisible: element.getBoundingClientRect().top < window.innerHeight,
  }))
  for (const { element, alreadyVisible } of targets) {
    if (alreadyVisible || preference.matches || revealed.has(element)) {
      show(element)
    } else {
      pending.add(element)
      element.dataset.revealPending = ""
      observer.observe(element)
    }
  }
  const cancelAnimations = () => {
    for (const animation of animations) animation.cancel()
    animations.clear()
  }
  const stop = () => {
    if (preference.matches || document.hidden) cancelAnimations()
    if (preference.matches) {
      for (const element of pending) show(element)
      observer.disconnect()
    }
  }
  const onFocus = (event: FocusEvent) => {
    cancelAnimations()
    if (!(event.target instanceof Element)) return
    const hero = event.target.closest<HTMLElement>(".landing-hero-copy")
    // Keep this flag after blur; removing animation:none would restart CSS.
    if (hero) hero.dataset.motionComplete = ""
    for (const element of pending) {
      if (element.contains(event.target)) {
        show(element)
        observer.unobserve(element)
      }
    }
  }
  // Keyboard navigation must never land on an element still fading in.
  container.addEventListener("focusin", onFocus)
  document.addEventListener("visibilitychange", stop)
  preference.addEventListener("change", stop)
  return () => {
    disposed = true
    observer.disconnect()
    container.removeEventListener("focusin", onFocus)
    document.removeEventListener("visibilitychange", stop)
    preference.removeEventListener("change", stop)
    cancelAnimations()
    for (const element of pending) delete element.dataset.revealPending
  }
}
