import { isNoticeId } from "./notice-ids"
import { showNotice } from "./notice-toast"

// Loaded by notice-check.astro only when the URL names a known notice.
const url = new URL(window.location.href)
const id = url.searchParams.get("notice")
if (isNoticeId(id)) {
  showNotice(id)
  url.searchParams.delete("notice")
  window.history.replaceState(window.history.state, "", url)
}
