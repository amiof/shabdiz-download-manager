import assert from "node:assert/strict"
import { test } from "node:test"
import { buildYtDlpDownloadArgs } from "../src/yt-dlp/yt-dlp-download-args"

const request = {
  url: "https://www.youtube.com/watch?v=abc",
  videoFormatId: "160",
  audioFormatId: "140",
  subtitles: [],
  title: "A title"
}

test("the download args keep the progress output alive next to --print", () => {
  const args = buildYtDlpDownloadArgs(request, { container: "mp4", dir: "/tmp/out" })

  // --print implies --quiet, which silences the progress template
  assert.ok(args.includes("--progress"), "expected --progress in the yt-dlp args")
  assert.ok(args.includes("--print"))
  assert.ok(args.includes("--newline"))
})

test("the progress template is typed so it only applies to the download", () => {
  const args = buildYtDlpDownloadArgs(request, { container: "mp4", dir: "/tmp/out" })
  const template = args[args.indexOf("--progress-template") + 1]

  assert.ok(template.startsWith("download:@@PROGRESS@@"), `unexpected template: ${template}`)
  assert.ok(template.includes("%(progress.downloaded_bytes)s"))
  assert.ok(template.includes("%(progress.total_bytes)s"))
  assert.ok(template.includes("%(progress.total_bytes_estimate)s"))
  assert.ok(template.includes("%(progress.speed)s"))
  assert.ok(template.includes("%(progress.eta)s"))
})

test("a video only format is downloaded without a merge container", () => {
  const args = buildYtDlpDownloadArgs({ ...request, audioFormatId: undefined }, { container: "mp4", dir: "/tmp/out" })

  assert.ok(args.includes("160"), "expected the video format selector")
  assert.ok(!args.includes("--merge-output-format"))
  assert.equal(args[args.length - 1], request.url, "the url must be the last argument")
})

test("the output template and the destination carry the title and the dir", () => {
  const args = buildYtDlpDownloadArgs(request, { container: "mp4", dir: "/tmp/out" })
  const outputTemplate = args[args.indexOf("-o") + 1]
  const printTemplate = args[args.indexOf("--print") + 1]

  assert.equal(outputTemplate, "/tmp/out/%(title)s.%(ext)s")
  assert.equal(printTemplate, "after_move:@@FILE@@%(filepath)s")
})

test("the auth args are passed before the url", () => {
  const args = buildYtDlpDownloadArgs(request, {
    container: "mp4",
    dir: "/tmp/out",
    authArgs: ["--cookies", "/tmp/cookies.txt"]
  })

  assert.deepEqual(args.slice(-3), ["--cookies", "/tmp/cookies.txt", request.url])
})
