// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { startLandingMotion } from "@/scripts/landing-motion"
import {
  FakeIntersectionObserver,
  fakeMatchMedia,
  fakeVisibility
} from "./browser-fakes"

type Motion = {
  cancel: ReturnType<typeof vi.fn>
  onfinish: (() => void) | null
}

let reducedMotion: ReturnType<typeof fakeMatchMedia>
let visibility: ReturnType<typeof fakeVisibility>
let animate: ReturnType<typeof vi.fn>
let animations: Motion[]
let container: HTMLElement

/** An element with `data-reveal`, placed on screen or below the fold. */
function revealable({ onScreen = false, reveal = "rise", delay = "" } = {}) {
  const element = document.createElement("div")
  element.dataset.reveal = reveal
  if (delay) element.dataset.revealDelay = delay
  element.innerHTML = '<a href="#">Link</a>'
  element.getBoundingClientRect = () =>
    ({ top: onScreen ? 10 : window.innerHeight + 500 }) as DOMRect
  container.append(element)
  return element
}

beforeEach(() => {
  FakeIntersectionObserver.install()
  reducedMotion = fakeMatchMedia(false)
  visibility = fakeVisibility()
  animations = []
  animate = vi.fn(() => {
    const motion: Motion = { cancel: vi.fn(), onfinish: null }
    animations.push(motion)
    return motion
  })
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: animate
  })
  document.body.innerHTML = "<main></main>"
  container = document.querySelector("main") as HTMLElement
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  visibility.restore()
  delete (Element.prototype as { animate?: unknown }).animate
})

describe("startLandingMotion", () => {
  it("never hides content that is already on screen", () => {
    const visible = revealable({ onScreen: true })
    startLandingMotion(container)

    expect(visible.dataset.revealPending).toBeUndefined()
    expect(FakeIntersectionObserver.last.observed.has(visible)).toBe(false)
  })

  it("holds content below the fold, then animates it in once", () => {
    const below = revealable({ reveal: "left", delay: "120" })
    startLandingMotion(container)
    const observer = FakeIntersectionObserver.last
    expect(below.dataset.revealPending).toBe("")
    expect(observer.observed.has(below)).toBe(true)

    observer.trigger(below, true, 0.1)
    expect(below.dataset.revealPending).toBe("")

    observer.trigger(below, true, 0.5)
    observer.trigger(below, true, 0.5)
    expect(below.dataset.revealPending).toBeUndefined()
    expect(observer.observed.has(below)).toBe(false)
    expect(animate).toHaveBeenCalledOnce()
    const [keyframes, options] = animate.mock.calls[0] as [
      Keyframe[],
      KeyframeAnimationOptions
    ]
    expect(keyframes[0]).toMatchObject({ opacity: 0 })
    expect(String(keyframes[0]?.transform)).toContain(
      "translate3d(-24px, 24px, 0)"
    )
    expect(options).toMatchObject({
      duration: 900,
      delay: 120,
      fill: "backwards"
    })
  })

  it("shows everything at once with reduced motion", () => {
    reducedMotion.set(true)
    const below = revealable()
    startLandingMotion(container)

    expect(below.dataset.revealPending).toBeUndefined()
    expect(FakeIntersectionObserver.last.observed.size).toBe(0)
  })

  it("reveals pending content and stops animating when reduced motion turns on", () => {
    const shown = revealable()
    const waiting = revealable()
    startLandingMotion(container)
    const observer = FakeIntersectionObserver.last
    observer.trigger(shown, true, 1)

    reducedMotion.set(true)
    expect(animations[0]?.cancel).toHaveBeenCalled()
    expect(waiting.dataset.revealPending).toBeUndefined()
    expect(observer.disconnected).toBe(true)
  })

  it("reveals without animating while the tab is hidden", () => {
    const below = revealable()
    startLandingMotion(container)
    visibility.set(true)

    FakeIntersectionObserver.last.trigger(below, true, 1)
    expect(below.dataset.revealPending).toBeUndefined()
    expect(animate).not.toHaveBeenCalled()
  })

  it("reveals content as soon as keyboard focus reaches it", () => {
    const below = revealable()
    const hero = document.createElement("div")
    hero.className = "landing-hero-copy"
    hero.innerHTML = '<a href="#">Start</a>'
    container.append(hero)
    startLandingMotion(container)

    below.querySelector("a")?.focus()
    expect(below.dataset.revealPending).toBeUndefined()
    expect(FakeIntersectionObserver.last.observed.has(below)).toBe(false)

    hero.querySelector("a")?.focus()
    expect(hero.dataset.motionComplete).toBe("")
  })

  it("cleans up its observer, listeners and pending flags", () => {
    const below = revealable()
    const stop = startLandingMotion(container)
    const observer = FakeIntersectionObserver.last

    stop()
    expect(observer.disconnected).toBe(true)
    expect(below.dataset.revealPending).toBeUndefined()

    reducedMotion.set(true)
    below.querySelector("a")?.focus()
    expect(animate).not.toHaveBeenCalled()
  })

  it("leaves the page untouched where the APIs are missing", () => {
    delete (Element.prototype as { animate?: unknown }).animate
    const below = revealable()

    expect(() => startLandingMotion(container)()).not.toThrow()
    expect(below.dataset.revealPending).toBeUndefined()
  })
})

describe("startLandingMotion (precise behaviour)", () => {
  const stubTransform = (transform: string) =>
    vi.stubGlobal(
      "getComputedStyle",
      () => ({ transform }) as CSSStyleDeclaration
    )

  it("asks for the reduced-motion preference and observes at a 0.16 threshold", () => {
    const matchMedia = vi.fn(window.matchMedia)
    vi.stubGlobal("matchMedia", matchMedia)
    startLandingMotion(container)
    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)")
    expect(FakeIntersectionObserver.last.options).toEqual({ threshold: 0.16 })
  })

  it.each([
    ["rise", "translate3d(0, 32px, 0)"],
    ["workspace", "translate3d(0, 40px, 0) scale(.97)"],
    ["phone", "translate3d(24px, 40px, 0) rotate(3deg) scale(.97)"],
    ["left", "translate3d(-24px, 24px, 0)"],
    ["right", "translate3d(24px, 24px, 0)"],
    ["unknown", "translate3d(0, 32px, 0)"]
  ])("animates %s in with its exact keyframes and options", (reveal, from) => {
    stubTransform("none")
    const below = revealable({ reveal })
    startLandingMotion(container)
    FakeIntersectionObserver.last.trigger(below, true, 1)
    expect(animate).toHaveBeenCalledWith(
      [
        { opacity: 0, transform: ` ${from}` },
        { opacity: 1, transform: "none" }
      ],
      {
        duration: 900,
        delay: 0,
        easing: "cubic-bezier(.23,1,.32,1)",
        fill: "backwards"
      }
    )
  })

  it("keeps a resting transform underneath the entrance", () => {
    stubTransform("rotate(2deg)")
    const below = revealable({ reveal: "right", delay: "40" })
    startLandingMotion(container)
    FakeIntersectionObserver.last.trigger(below, true, 1)
    expect(animate.mock.calls[0]).toEqual([
      [
        { opacity: 0, transform: "rotate(2deg) translate3d(24px, 24px, 0)" },
        { opacity: 1, transform: "rotate(2deg)" }
      ],
      {
        duration: 900,
        delay: 40,
        easing: "cubic-bezier(.23,1,.32,1)",
        fill: "backwards"
      }
    ])
  })

  it("reveals at exactly the 0.16 ratio but not just below it", () => {
    const below = revealable()
    startLandingMotion(container)
    const observer = FakeIntersectionObserver.last
    observer.trigger(below, true, 0.159)
    expect(below.dataset.revealPending).toBe("")
    observer.trigger(below, false, 1)
    expect(below.dataset.revealPending).toBe("")
    observer.trigger(below, true, 0.16)
    expect(below.dataset.revealPending).toBeUndefined()
    expect(animate).toHaveBeenCalledOnce()
  })

  it("animates a target only once when queued twice in one batch", () => {
    const below = revealable()
    startLandingMotion(container)
    const observer = FakeIntersectionObserver.last
    const unobserve = vi.spyOn(observer, "unobserve")
    const entry = { target: below, isIntersecting: true, intersectionRatio: 1 }
    observer.callback(
      [entry, entry] as unknown as IntersectionObserverEntry[],
      observer as unknown as IntersectionObserver
    )
    expect(animate).toHaveBeenCalledOnce()
    expect(unobserve).toHaveBeenCalledOnce()
    expect(unobserve).toHaveBeenCalledWith(below)
  })

  it("never animates content that was already shown on screen", () => {
    const visible = revealable({ onScreen: true })
    startLandingMotion(container)
    FakeIntersectionObserver.last.trigger(visible, true, 1)
    expect(animate).not.toHaveBeenCalled()
  })

  it("holds content whose top sits exactly at the fold", () => {
    const edge = revealable()
    edge.getBoundingClientRect = () => ({ top: window.innerHeight }) as DOMRect
    startLandingMotion(container)
    expect(edge.dataset.revealPending).toBe("")
  })

  it("skips the animation when focus is already inside the element", () => {
    const below = revealable()
    startLandingMotion(container)
    const observer = FakeIntersectionObserver.last
    const link = below.querySelector("a") as HTMLElement
    // Focus arrives without a focusin event reaching the container.
    vi.spyOn(document, "activeElement", "get").mockReturnValue(link)
    observer.trigger(below, true, 1)
    expect(below.dataset.revealPending).toBeUndefined()
    expect(animate).not.toHaveBeenCalled()
  })

  it("forgets finished animations and cancels running ones only once", () => {
    const first = revealable()
    const second = revealable()
    startLandingMotion(container)
    const observer = FakeIntersectionObserver.last
    observer.trigger(first, true, 1)
    observer.trigger(second, true, 1)
    animations[0]?.onfinish?.()

    visibility.set(false)
    expect(animations[1]?.cancel).not.toHaveBeenCalled()
    visibility.set(true)
    expect(animations[0]?.cancel).not.toHaveBeenCalled()
    expect(animations[1]?.cancel).toHaveBeenCalledOnce()
    visibility.set(true)
    expect(animations[1]?.cancel).toHaveBeenCalledOnce()
  })

  it("keeps observing pending content while the tab is merely hidden", () => {
    const shown = revealable()
    const waiting = revealable()
    startLandingMotion(container)
    const observer = FakeIntersectionObserver.last
    observer.trigger(shown, true, 1)
    visibility.set(true)
    expect(waiting.dataset.revealPending).toBe("")
    expect(observer.disconnected).toBe(false)
    expect(observer.observed.has(waiting)).toBe(true)
  })

  it("cancels animations on focus and only reveals the focused pending element", () => {
    const moving = revealable()
    const focused = revealable()
    const other = revealable()
    startLandingMotion(container)
    const observer = FakeIntersectionObserver.last
    const unobserve = vi.spyOn(observer, "unobserve")
    observer.trigger(moving, true, 1)
    expect(unobserve).toHaveBeenCalledTimes(1)

    focused.querySelector("a")?.focus()
    expect(animations[0]?.cancel).toHaveBeenCalledOnce()
    expect(focused.dataset.revealPending).toBeUndefined()
    expect(other.dataset.revealPending).toBe("")
    expect(observer.observed.has(other)).toBe(true)
    expect(unobserve).toHaveBeenCalledTimes(2)
    expect(unobserve).toHaveBeenLastCalledWith(focused)

    // Already revealed elements are no longer pending: focusing them again is a no-op.
    moving.querySelector("a")?.focus()
    focused.querySelector("a")?.focus()
    expect(unobserve).toHaveBeenCalledTimes(2)
  })

  it("ignores focus events whose target is not an element", () => {
    const below = revealable()
    const text = document.createTextNode("text")
    below.append(text)
    startLandingMotion(container)
    const errors = vi.fn()
    window.addEventListener("error", errors)
    const onError = (event: Event) => event.preventDefault()
    window.addEventListener("error", onError)
    text.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
    window.removeEventListener("error", errors)
    window.removeEventListener("error", onError)
    expect(errors).not.toHaveBeenCalled()
    expect(below.dataset.revealPending).toBe("")
  })

  it("registers and removes exactly its own listeners", () => {
    const add = vi.spyOn(document, "addEventListener")
    const remove = vi.spyOn(document, "removeEventListener")
    const addPref = vi.spyOn(reducedMotion, "addEventListener")
    const removePref = vi.spyOn(reducedMotion, "removeEventListener")
    const stop = startLandingMotion(container)
    const visibilityListener = add.mock.calls.find(
      ([type]) => type === "visibilitychange"
    )?.[1]
    expect(visibilityListener).toBeTypeOf("function")
    expect(addPref).toHaveBeenCalledWith("change", visibilityListener)

    stop()
    expect(remove).toHaveBeenCalledWith("visibilitychange", visibilityListener)
    expect(removePref).toHaveBeenCalledWith("change", visibilityListener)
  })

  it("stops reacting to focus, intersections and running animations after cleanup", () => {
    const moving = revealable()
    const below = revealable()
    const hero = document.createElement("div")
    hero.className = "landing-hero-copy"
    hero.innerHTML = '<a href="#">Start</a>'
    container.append(hero)
    const stop = startLandingMotion(container)
    const observer = FakeIntersectionObserver.last
    observer.trigger(moving, true, 1)

    stop()
    expect(animations[0]?.cancel).toHaveBeenCalledOnce()
    hero.querySelector("a")?.focus()
    expect(hero.dataset.motionComplete).toBeUndefined()
    observer.trigger(below, true, 1)
    expect(animate).toHaveBeenCalledOnce()
  })

  it("does nothing without IntersectionObserver", () => {
    delete (window as { IntersectionObserver?: unknown }).IntersectionObserver
    const below = revealable()
    startLandingMotion(container)
    expect(below.dataset.revealPending).toBeUndefined()
  })

  it("does nothing without Element.animate, before cleanup too", () => {
    delete (Element.prototype as { animate?: unknown }).animate
    const below = revealable()
    startLandingMotion(container)
    expect(below.dataset.revealPending).toBeUndefined()
    expect(FakeIntersectionObserver.instances).toHaveLength(0)
  })
})
