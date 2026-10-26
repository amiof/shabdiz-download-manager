import assert from "node:assert/strict"
import { test } from "node:test"
import { buildDownloadPopupHashRoute } from "../src/ipc/openPopup/downloadPopupRoute.ts"

test("the regular download window keeps its existing route", () => {
  assert.equal(buildDownloadPopupHashRoute("gid123", "my file.zip"), "downloadStart/:gid123/:my file.zip")
  assert.equal(buildDownloadPopupHashRoute("gid123", "my file.zip", "aria2"), "downloadStart/:gid123/:my file.zip")
})

test("a yt-dlp download gets its own route with the same window id", () => {
  const route = buildDownloadPopupHashRoute("yt123", "A title", "yt-dlp")

  assert.equal(route, "downloadStartYtDlp/:yt123/:A%20title")
  assert.notEqual(route, buildDownloadPopupHashRoute("yt123", "A title"))
})

test("youtube titles stay inside one route segment", () => {
  const title = "a/b #c ?d 100%"
  const route = buildDownloadPopupHashRoute("yt123", title, "yt-dlp")
  const encodedTitle = route.split("/:").at(-1) ?? ""

  assert.equal(route.startsWith("downloadStartYtDlp/:yt123/:"), true)
  assert.equal(encodedTitle.includes("/"), false)
  assert.equal(encodedTitle.includes("#"), false)
  assert.equal(encodedTitle.includes("?"), false)
  assert.equal(decodeURIComponent(encodedTitle), title)
})

test("an empty title still produces a loadable popup route", () => {
  assert.equal(buildDownloadPopupHashRoute("gid123", "   "), "downloadStart/:gid123/:download")
  assert.equal(buildDownloadPopupHashRoute("yt123", undefined, "yt-dlp"), "downloadStartYtDlp/:yt123/:download")
})
