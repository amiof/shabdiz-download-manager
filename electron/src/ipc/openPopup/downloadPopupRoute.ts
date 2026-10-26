import type { TDownloadSource } from "../../types"

// the renderer routes a download window by source, while the regular popup
// route has to keep its exact old shape
export const buildDownloadPopupHashRoute = (
  id: string,
  windowTitle: string | undefined,
  downloadSource: TDownloadSource = "aria2"
): string => {
  const title = windowTitle?.trim() ? windowTitle : "download"

  // a youtube title can contain '/', '#' or '?', the popup route has to keep it
  // in one segment; the regular route is left untouched
  if (downloadSource === "yt-dlp") return `downloadStartYtDlp/:${id}/:${encodeURIComponent(title)}`

  return `downloadStart/:${id}/:${title}`
}
