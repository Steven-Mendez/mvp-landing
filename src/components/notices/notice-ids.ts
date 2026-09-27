/**
 * The notices the web app may hand over when it sends someone to the landing
 * (`/?notice=<id>`): before the split it showed the toast and navigated in-app, so the
 * toast stayed on screen over the landing. Only these ids are accepted; the text is
 * never taken from the URL (see `notices.ts`).
 */
export const noticeIds = ["account-deleted", "sign-out-failed"] as const

export type NoticeId = (typeof noticeIds)[number]

export const isNoticeId = (id: string | null): id is NoticeId =>
  (noticeIds as readonly (string | null)[]).includes(id)
