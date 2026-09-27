import { describe, expect, it } from "vitest"
import { isNoticeId, noticeIds } from "@/components/notices/notice-ids"
import { notices } from "@/components/notices/notices"

describe("isNoticeId", () => {
  it.each(noticeIds)("accepts the known id %j", (id) => {
    expect(isNoticeId(id)).toBe(true)
  })

  it.each([null, "", " ", "unknown", "ACCOUNT-DELETED", "Account-Deleted", "Sign-Out-Failed", " account-deleted", "account-deleted ", "account", "<script>"])(
    "rejects %j",
    (id) => {
      expect(isNoticeId(id)).toBe(false)
    }
  )
})

describe("notices", () => {
  it("has copy for every known id, and nothing else", () => {
    expect(Object.keys(notices).sort()).toEqual([...noticeIds].sort())
    for (const { message } of Object.values(notices)) {
      expect(message.trim()).not.toBe("")
    }
  })
})
