import assert from "node:assert/strict"
import { test } from "node:test"
import { getFfmpegFileName, getFfmpegReleaseUrl, resolveFfmpegAssetName } from "../src/yt-dlp/ffmpeg-assets.ts"

test("every supported platform resolves an ffmpeg build", () => {
  assert.equal(resolveFfmpegAssetName("win", "x64"), "ffmpeg-win32-x64")
  assert.equal(resolveFfmpegAssetName("linux", "x64"), "ffmpeg-linux-x64")
  assert.equal(resolveFfmpegAssetName("linux", "arm64"), "ffmpeg-linux-arm64")
  assert.equal(resolveFfmpegAssetName("macOS", "arm64"), "ffmpeg-darwin-arm64")
  assert.equal(resolveFfmpegAssetName("macOS", "x64"), "ffmpeg-darwin-x64")
})

test("a platform without a published build is reported instead of guessed", () => {
  // the release has no windows arm64 build, and no other arch is published
  assert.equal(resolveFfmpegAssetName("win", "arm64"), undefined)
  assert.equal(resolveFfmpegAssetName("macOS", "ia32"), undefined)
  assert.equal(resolveFfmpegAssetName(undefined, "x64"), undefined)
})

test("the managed binary keeps the name yt-dlp looks for", () => {
  assert.equal(getFfmpegFileName("win"), "ffmpeg.exe")
  assert.equal(getFfmpegFileName("linux"), "ffmpeg")
  assert.equal(getFfmpegFileName("macOS"), "ffmpeg")
})

test("the release url always serves the newest build of the asset", () => {
  assert.equal(
    getFfmpegReleaseUrl("ffmpeg-win32-x64"),
    "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-win32-x64"
  )
})

