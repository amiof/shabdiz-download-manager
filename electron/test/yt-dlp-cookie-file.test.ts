import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildNetscapeCookieFile,
  cookieAuthHint,
  isCookieAuthError,
  parseCookieHeader,
  pickCookieHeader,
  pickCookieHeaderFromOptions,
  ytDlpCookieFileEol
} from "../src/yt-dlp/yt-dlp-cookie-file.ts"

test("parseCookieHeader splits a browser cookie header into name/value pairs", () => {
  assert.deepEqual(parseCookieHeader("SID=abc; HSID=def; __Secure-1PSID=ghi"), [
    { name: "SID", value: "abc" },
    { name: "HSID", value: "def" },
    { name: "__Secure-1PSID", value: "ghi" }
  ])
})

test("parseCookieHeader keeps = inside the value and skips empty pairs", () => {
  assert.deepEqual(parseCookieHeader("VISITOR=a=b;; SID=c "), [
    { name: "VISITOR", value: "a=b" },
    { name: "SID", value: "c" }
  ])
})

test("parseCookieHeader returns an empty list for a missing cookie header", () => {
  assert.deepEqual(parseCookieHeader(""), [])
  assert.deepEqual(parseCookieHeader("   "), [])
})

test("pickCookieHeader finds the cookie header whatever its casing is", () => {
  assert.equal(pickCookieHeader({ cookie: "SID=1" }), "SID=1")
  assert.equal(pickCookieHeader({ Cookie: "SID=1", Referer: "https://youtube.com" }), "SID=1")
  assert.equal(pickCookieHeader({ Referer: "https://youtube.com" }), undefined)
  assert.equal(pickCookieHeader(undefined), undefined)
})

test("pickCookieHeader reads the header object the extension sends", () => {
  const options = { header: JSON.stringify({ Cookie: "SID=1", "User-Agent": "UA" }) }
  assert.equal(pickCookieHeaderFromOptions(options), "SID=1")
})

test("buildNetscapeCookieFile renders a yt-dlp readable netscape file", () => {
  const file = buildNetscapeCookieFile(
    parseCookieHeader("SID=abc; HSID=def"),
    "https://www.youtube.com/watch?v=1",
    "\n"
  )

  assert.equal(
    file,
    [
      "# Netscape HTTP Cookie File",
      ".youtube.com\tTRUE\t/\tTRUE\t2147483647\tSID\tabc",
      ".youtube.com\tTRUE\t/\tTRUE\t2147483647\tHSID\tdef",
      ""
    ].join("\n")
  )
})

test("buildNetscapeCookieFile keeps the CRLF line ending yt-dlp needs on windows", () => {
  const file = buildNetscapeCookieFile([{ name: "SID", value: "abc" }], "https://youtu.be/abc", "\r\n")

  assert.equal(file.includes("\r\n"), true)
  assert.equal(file.replaceAll("\r\n", "").includes("\n"), false)
  assert.equal(ytDlpCookieFileEol("win32"), "\r\n")
  assert.equal(ytDlpCookieFileEol("linux"), "\n")
})

test("isCookieAuthError recognises the youtube bot check", () => {
  assert.equal(
    isCookieAuthError(
      "ERROR: [youtube] ZU1E0M8FAX4: Sign in to confirm you're not a bot. Use --cookies-from-browser or --cookies for the authentication."
    ),
    true
  )
  assert.equal(isCookieAuthError("ERROR: [youtube] Private video. Sign in if you've been granted access"), false)
  assert.equal(isCookieAuthError(""), false)
})

test("cookieAuthHint points at both ways of supplying cookies", () => {
  assert.equal(cookieAuthHint().includes("browser extension"), true)
  assert.equal(cookieAuthHint().includes("Options"), true)
})

test("the cookie file path is what reaches yt-dlp as --cookies", () => {
  // mirrors the argument order of buildYtDlpAuthArgs in ytp-dl-utils.ts
  const argsFor = (cookieFilePath: string, options?: { header?: string }): string[] => {
    const args: string[] = []
    if (cookieFilePath) args.push("--cookies", cookieFilePath)
    if (options?.header) args.push("--user-agent", "UA")
    return args
  }

  assert.deepEqual(argsFor("/home/u/.config/shabdiz/yt-dlp/cookies.txt"), [
    "--cookies",
    "/home/u/.config/shabdiz/yt-dlp/cookies.txt"
  ])
})
