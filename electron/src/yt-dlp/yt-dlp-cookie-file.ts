import os from "os"

// one cookie of a Netscape cookie file, the shape the renderer never sees
export type TYtDlpCookie = { name: string; value: string }

// yt-dlp only accepts a cookie file whose first line is one of these two
export const NETSCAPE_COOKIE_FILE_HEADER = "# Netscape HTTP Cookie File"

// a cookie without an explicit expiry has to stay valid for the whole run
const COOKIE_EXPIRY = "2147483647"

// yt-dlp answers HTTP Error 400 on a cookie file with the wrong newline format
export const ytDlpCookieFileEol = (platform: NodeJS.Platform = os.platform()): string =>
  platform === "win32" ? "\r\n" : "\n"

// a browser cookie header is "name=value; name=value"
export const parseCookieHeader = (header: string | undefined | null): TYtDlpCookie[] =>
  (header ?? "")
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const separator = pair.indexOf("=")
      if (separator < 0) return { name: pair, value: "" }
      return { name: pair.slice(0, separator).trim(), value: pair.slice(separator + 1).trim() }
    })
    .filter((cookie) => cookie.name.length > 0)

export const pickCookieHeader = (headers?: Record<string, string> | null): string | undefined => {
  if (!headers) return undefined

  const entry = Object.entries(headers).find(([key]) => key.trim().toLowerCase() === "cookie")
  return entry?.[1]
}

// the add link popup keeps the extension headers as a JSON string in options
export const pickCookieHeaderFromOptions = (options?: { header?: string } | null): string | undefined => {
  if (!options?.header) return undefined

  try {
    return pickCookieHeader(JSON.parse(options.header) as Record<string, string>)
  } catch {
    console.error("[yt-dlp] Could not parse the header option to read the cookies")
    return undefined
  }
}

// ".youtube.com" for www.youtube.com and youtu.be, so one cookie file works for
// every youtube host
const cookieDomain = (url: string): string => {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "")
    const labels = host.split(".")
    if (labels.length <= 2) return `.${host}`
    return `.${labels.slice(-2).join(".")}`
  } catch {
    return ".youtube.com"
  }
}

// yt-dlp reads a Mozilla/Netscape cookie file: domain, includeSubdomains, path,
// secure, expiry, name and value, all separated by tabs
export const buildNetscapeCookieFile = (
  cookies: TYtDlpCookie[],
  url: string,
  eol: string = ytDlpCookieFileEol()
): string => {
  const domain = cookieDomain(url)
  const lines = [
    NETSCAPE_COOKIE_FILE_HEADER,
    ...cookies.map((cookie) => [domain, "TRUE", "/", "TRUE", COOKIE_EXPIRY, cookie.name, cookie.value].join("\t"))
  ]

  // the trailing newline keeps the last cookie line complete
  return `${lines.join(eol)}${eol}`
}

const COOKIE_AUTH_PATTERNS = [/sign in to confirm you'?re not a bot/i, /not a bot/i, /use --cookies-from-browser/i]

export const isCookieAuthError = (detail: string): boolean =>
  COOKIE_AUTH_PATTERNS.some((pattern) => pattern.test(detail ?? ""))

// the raw yt-dlp message is a wall of text, the user only needs the two ways of
// getting cookies into the app
export const cookieAuthHint = (): string =>
  "Send the link from the Shabdiz browser extension so its cookies are used, or pick a cookies.txt file in the Options tab."
