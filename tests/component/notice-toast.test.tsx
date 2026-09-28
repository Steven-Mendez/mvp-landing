// @vitest-environment jsdom
import { screen } from "@testing-library/react"
import { act } from "react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { showNotice } from "@/components/notices/notice-toast"
import { notices } from "@/components/notices/notices"

beforeAll(() => {
  // sonner reads the system theme.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false
  })) as typeof window.matchMedia
})

afterEach(() => {
  document.body.innerHTML = ""
  document.head.innerHTML = ""
})

describe("showNotice", () => {
  it.each(Object.entries(notices))(
    "shows the %s toast",
    async (id, { message }) => {
      await act(async () => showNotice(id as keyof typeof notices))

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(document.head.querySelector("style")?.textContent).toContain(
        "[data-sonner-toaster]"
      )
    }
  )
})
