import type { TYtDlpPlatform } from "./type"

// the version rules of the yt-dlp binary live in their own module without any
// relative runtime import, so `node --test` can load them directly
export const resolveYtDlpAssetName = (platform: TYtDlpPlatform | undefined, arch: string): string => {
  switch (platform) {
    case "win":
      return "yt-dlp.exe"
    case "linux":
      return arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux"
    case "macOS":
      return "yt-dlp_macos"
    default:
      throw new Error("This platform is not supported for yt-dlp")
  }
}

// yt-dlp versions are date based ("2026.10.26", nightlies add a build number and
// old tags may carry a "v"), so they are compared number by number. A string
// comparison would order "2026.9.1" above "2026.10.26"
export const parseYtDlpVersion = (version: string): number[] =>
  (version.trim().replace(/^v/i, "").match(/\d+/g) ?? []).map(Number)

export const isYtDlpVersionComparable = (version: string): boolean => parseYtDlpVersion(version).length > 0

export const compareYtDlpVersions = (first: string, second: string): number => {
  const firstParts = parseYtDlpVersion(first)
  const secondParts = parseYtDlpVersion(second)
  const length = Math.max(firstParts.length, secondParts.length)

  for (let index = 0; index < length; index++) {
    const difference = (firstParts[index] ?? 0) - (secondParts[index] ?? 0)
    if (difference !== 0) return difference < 0 ? -1 : 1
  }

  return 0
}

// a stable release tag is "YYYY.MM.DD" while the binary of that release may
// report a nightly build number on top of it, so only the tagged parts have to
// match. Returns false when either side has no numbers at all
export const isSameYtDlpRelease = (reported: string, expected: string): boolean => {
  const reportedParts = parseYtDlpVersion(reported)
  const expectedParts = parseYtDlpVersion(expected)

  if (!reportedParts.length || !expectedParts.length) return false

  return expectedParts.every((part, index) => reportedParts[index] === part)
}
