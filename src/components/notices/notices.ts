import type { NoticeId } from "./notice-ids"

/**
 * The app's own copy and toast variant for each notice, as mvp-web shows them:
 * `ACCOUNT_DELETED_MESSAGE` (delete account) and `SIGN_OUT_FAILED_MESSAGE`
 * (`use-sign-out.ts`). Keep in step with the app's messages.
 */
export const notices: Record<
  NoticeId,
  { variant: "success" | "error"; message: string }
> = {
  "account-deleted": { variant: "success", message: "Account deleted" },
  "sign-out-failed": {
    variant: "error",
    message: "Could not sign out. Check your connection and try again."
  }
}
