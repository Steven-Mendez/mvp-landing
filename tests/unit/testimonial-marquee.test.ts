// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { startTestimonialMarquee } from "@/scripts/testimonial-marquee"
import { FakeIntersectionObserver, fakeVisibility } from "./browser-fakes"

let visibility: ReturnType<typeof fakeVisibility>
let section: HTMLElement
let track: HTMLElement

beforeEach(() => {
  FakeIntersectionObserver.install()
  visibility = fakeVisibility()
  document.body.innerHTML =
    '<section><div class="landing-testimonial-track"></div></section>'
  section = document.querySelector("section") as HTMLElement
  track = section.querySelector(".landing-testimonial-track") as HTMLElement
})

afterEach(() => {
  vi.unstubAllGlobals()
  visibility.restore()
})

describe("startTestimonialMarquee", () => {
  it("runs only while the section is on screen", () => {
    startTestimonialMarquee(section)
    const observer = FakeIntersectionObserver.last
    expect(observer.observed.has(section)).toBe(true)

    observer.trigger(section, true)
    expect(track.dataset.running).toBe("true")
    observer.trigger(section, false)
    expect(track.dataset.running).toBe("false")
  })

  it("pauses while the tab is hidden", () => {
    startTestimonialMarquee(section)
    FakeIntersectionObserver.last.trigger(section, true)

    visibility.set(true)
    expect(track.dataset.running).toBe("false")
    visibility.set(false)
    expect(track.dataset.running).toBe("true")
  })

  it("stays paused until the section is first reported on screen", () => {
    startTestimonialMarquee(section)

    visibility.set(false)
    expect(track.dataset.running).toBe("false")
  })

  it("treats an empty observer report as off screen", () => {
    startTestimonialMarquee(section)
    const observer = FakeIntersectionObserver.last
    observer.trigger(section, true)

    observer.callback([], observer as unknown as IntersectionObserver)
    expect(track.dataset.running).toBe("false")
  })

  it("stops listening after cleanup", () => {
    const stop = startTestimonialMarquee(section)
    const observer = FakeIntersectionObserver.last
    observer.trigger(section, true)

    stop()
    visibility.set(true)
    expect(observer.disconnected).toBe(true)
    expect(track.dataset.running).toBe("true")
  })

  it("does nothing without a track or IntersectionObserver", () => {
    track.remove()
    expect(() => startTestimonialMarquee(section)()).not.toThrow()

    vi.stubGlobal("IntersectionObserver", undefined)
    delete (window as { IntersectionObserver?: unknown }).IntersectionObserver
    section.append(track)
    startTestimonialMarquee(section)
    expect(track.dataset.running).toBeUndefined()
  })
})
