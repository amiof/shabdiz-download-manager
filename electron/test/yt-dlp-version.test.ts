import assert from "node:assert/strict"
import { test } from "node:test"
import {
  compareYtDlpVersions,
  isSameYtDlpRelease,
  isYtDlpVersionComparable,
  resolveYtDlpAssetName
} from "../src/yt-dlp/yt-dlp-version"

test("yt-dlp versions are compared as numbers, not as text", () => {
  // a string comparison would put "2026.9.1" above "2026.10.26"
  assert.equal(compareYtDlpVersions("2026.9.1", "2026.10.26"), -1)
  assert.equal(compareYtDlpVersions("2026.10.26", "2026.9.1"), 1)
  assert.equal(compareYtDlpVersions("2026.10.26", "2026.10.26"), 0)
})

test("a v prefix and a nightly build number do not break the comparison", () => {
  assert.equal(compareYtDlpVersions("v2026.10.26", "2026.10.26"), 0)
  assert.equal(compareYtDlpVersions("2026.10.26.123456", "2026.10.26"), 1)
  assert.equal(compareYtDlpVersions("2026.10.26", "2026.10.26.123456"), -1)
})

test("a version without any number cannot be compared", () => {
  assert.equal(isYtDlpVersionComparable("2026.10.26"), true)
  assert.equal(isYtDlpVersionComparable("unknown"), false)
  assert.equal(isYtDlpVersionComparable(""), false)
})

test("a downloaded file is accepted for the release it was read from", () => {
  // the binary of a stable tag may report its nightly build number
  assert.equal(isSameYtDlpRelease("2026.10.26.123456", "2026.10.26"), true)
  assert.equal(isSameYtDlpRelease("2026.10.26", "2026.10.26"), true)
  // another release must never overwrite the installed binary
  assert.equal(isSameYtDlpRelease("2026.10.25", "2026.10.26"), false)
  assert.equal(isSameYtDlpRelease("unknown", "2026.10.26"), false)
  assert.equal(isSameYtDlpRelease("2026.10.26", "nightly"), false)
})

test("every platform resolves the release asset the app already uses", () => {
  assert.equal(resolveYtDlpAssetName("win", "x64"), "yt-dlp.exe")
  assert.equal(resolveYtDlpAssetName("linux", "x64"), "yt-dlp_linux")
  assert.equal(resolveYtDlpAssetName("linux", "arm64"), "yt-dlp_linux_aarch64")
  assert.equal(resolveYtDlpAssetName("macOS", "arm64"), "yt-dlp_macos")
  assert.throws(() => resolveYtDlpAssetName(undefined, "x64"))
})
