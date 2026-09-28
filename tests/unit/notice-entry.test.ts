// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { showNotice } = vi.hoisted(() => ({ showNotice: vi.fn() }))
vi.mock("@/components/notices/notice-toast", () => ({ showNotice }))

// The module runs on import, reading the current URL.
async function visit(url: string) {
  window.history.replaceState({ scroll: 1 }, "", url)
  vi.resetModules()
  await import("@/components/notices/notice-entry")
}

beforeEach(() => showNotice.mockClear())
afterEach(() => window.history.replaceState(null, "", "/"))

describe("notice entry", () => {
  it("shows a known notice and removes only its parameter from the URL", async () => {
    await visit("/?notice=account-deleted&keep=1#faq")

    expect(showNotice).toHaveBeenCalledExactlyOnceWith("account-deleted")
    expect(`${location.pathname}${location.search}${location.hash}`).toBe(
      "/?keep=1#faq"
    )
    expect(window.history.state).toEqual({ scroll: 1 })
  })

  it.each(["/?notice=unknown", "/?notice=", "/"])(
    "ignores %s and leaves the URL alone",
    async (url) => {
      await visit(url)

      expect(showNotice).not.toHaveBeenCalled()
      expect(`${location.pathname}${location.search}`).toBe(url)
    }
  )
})
