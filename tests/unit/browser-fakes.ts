import { vi } from "vitest"

/** jsdom has no IntersectionObserver: this one lets a test decide what is on screen. */
export class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  readonly observed = new Set<Element>()
  disconnected = false

  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit
  ) {
    FakeIntersectionObserver.instances.push(this)
  }

  observe(target: Element) {
    this.observed.add(target)
  }
  unobserve(target: Element) {
    this.observed.delete(target)
  }
  disconnect() {
    this.observed.clear()
    this.disconnected = true
  }
  takeRecords() {
    return []
  }

  /** Reports `target` entering (or leaving) the viewport. */
  trigger(
    target: Element,
    isIntersecting = true,
    intersectionRatio = isIntersecting ? 1 : 0
  ) {
    this.callback(
      [
        {
          target,
          isIntersecting,
          intersectionRatio
        } as IntersectionObserverEntry
      ],
      this as unknown as IntersectionObserver
    )
  }

  static install() {
    FakeIntersectionObserver.instances = []
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
  }

  static get last() {
    const observer = FakeIntersectionObserver.instances.at(-1)
    if (!observer) throw new Error("No IntersectionObserver was created")
    return observer
  }
}

/** A `matchMedia` whose answer a test can change, notifying its listeners. */
export function fakeMatchMedia(initial = false) {
  const listeners = new Set<() => void>()
  const query = {
    matches: initial,
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
    set(matches: boolean) {
      query.matches = matches
      for (const listener of listeners) listener()
    }
  }
  vi.stubGlobal("matchMedia", () => query)
  return query
}

/** Controls `document.hidden` and fires `visibilitychange`. */
export function fakeVisibility() {
  let hidden = false
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden
  })
  return {
    set(value: boolean) {
      hidden = value
      document.dispatchEvent(new Event("visibilitychange"))
    },
    restore() {
      // Drop the own property so jsdom's prototype getter applies again.
      delete (document as { hidden?: boolean }).hidden
    }
  }
}
