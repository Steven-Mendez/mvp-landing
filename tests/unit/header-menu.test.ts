// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { startHeaderMenu } from "@/scripts/header-menu"

let root: HTMLElement
let trigger: HTMLButtonElement
let dialog: HTMLDialogElement
let showModal: ReturnType<typeof vi.fn>
let close: ReturnType<typeof vi.fn>

const proto = HTMLDialogElement.prototype
const original = { showModal: proto.showModal, close: proto.close }

beforeEach(() => {
  showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "")
  })
  close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open")
    this.dispatchEvent(new Event("close"))
  })
  proto.showModal = showModal as unknown as typeof proto.showModal
  proto.close = close as unknown as typeof proto.close
  document.body.innerHTML = `
    <div data-header-menu>
      <button type="button" aria-expanded="false" data-header-menu-open>Open</button>
      <dialog>
        <div class="panel">
          <p>Text</p>
          <nav><a href="#features" data-header-menu-close><span>Features</span></a></nav>
          <a href="#plain">Plain</a>
        </div>
      </dialog>
    </div>`
  root = document.querySelector("[data-header-menu]") as HTMLElement
  trigger = root.querySelector("[data-header-menu-open]") as HTMLButtonElement
  dialog = root.querySelector("dialog") as HTMLDialogElement
})

afterEach(() => {
  proto.showModal = original.showModal
  proto.close = original.close
  document.body.innerHTML = ""
})

const click = (element: Element) =>
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }))

describe("startHeaderMenu", () => {
  it("opens the dialog as a modal from the trigger", () => {
    startHeaderMenu(root)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    click(trigger)
    expect(showModal).toHaveBeenCalledTimes(1)
    expect(showModal.mock.contexts[0]).toBe(dialog)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(close).not.toHaveBeenCalled()
  })

  it("marks the trigger collapsed when the dialog closes", () => {
    startHeaderMenu(root)
    click(trigger)
    dialog.dispatchEvent(new Event("close"))
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })

  it("closes on a backdrop click (the dialog itself)", () => {
    startHeaderMenu(root)
    click(trigger)
    click(dialog)
    expect(close).toHaveBeenCalledTimes(1)
    expect(close.mock.contexts[0]).toBe(dialog)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })

  it("closes on a navigation link, including clicks inside it", () => {
    startHeaderMenu(root)
    click(root.querySelector("[data-header-menu-close]") as Element)
    expect(close).toHaveBeenCalledTimes(1)
    click(root.querySelector("[data-header-menu-close] span") as Element)
    expect(close).toHaveBeenCalledTimes(2)
  })

  it("stays open on clicks inside the panel", () => {
    startHeaderMenu(root)
    click(trigger)
    click(root.querySelector(".panel") as Element)
    click(root.querySelector("p") as Element)
    click(root.querySelector('a[href="#plain"]') as Element)
    expect(close).not.toHaveBeenCalled()
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
  })

  it("stops listening after cleanup", () => {
    const stop = startHeaderMenu(root)
    stop()
    click(trigger)
    expect(showModal).not.toHaveBeenCalled()
    expect(trigger.getAttribute("aria-expanded")).toBe("false")

    trigger.setAttribute("aria-expanded", "true")
    dialog.dispatchEvent(new Event("close"))
    expect(trigger.getAttribute("aria-expanded")).toBe("true")

    click(dialog)
    expect(close).not.toHaveBeenCalled()
  })

  it("does nothing without a trigger", () => {
    trigger.remove()
    const stop = startHeaderMenu(root)
    expect(stop).toBeTypeOf("function")
    expect(() => stop()).not.toThrow()
    click(dialog)
    expect(close).not.toHaveBeenCalled()
  })

  it("does nothing without a dialog", () => {
    dialog.remove()
    const stop = startHeaderMenu(root)
    expect(() => stop()).not.toThrow()
    click(trigger)
    expect(showModal).not.toHaveBeenCalled()
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })

  it("only wires its own root", () => {
    const other = root.cloneNode(true) as HTMLElement
    document.body.append(other)
    startHeaderMenu(root)
    click(other.querySelector("[data-header-menu-open]") as Element)
    expect(showModal).not.toHaveBeenCalled()
  })
})
