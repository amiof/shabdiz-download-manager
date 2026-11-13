import type { TYtDlpPlatform } from "./type"

// yt-dlp does not ship ffmpeg, so the app downloads a static build itself.
// The rules of that download live in their own module without any relative
// runtime import, so `node --test` can load them directly

// the ffmpeg-static release serves one self contained binary per platform, no
// archive has to be extracted after the download
export const resolveFfmpegAssetName = (platform: TYtDlpPlatform | undefined, arch: string): string | undefined => {
  switch (platform) {
    case "win":
      // the release has no arm64 windows build
      return arch === "x64" ? "ffmpeg-win32-x64" : undefined
    case "linux":
      switch (arch) {
        case "x64":
          return "ffmpeg-linux-x64"
        case "arm64":
          return "ffmpeg-linux-arm64"
        case "arm":
          return "ffmpeg-linux-arm"
        case "ia32":
          return "ffmpeg-linux-ia32"
        default:
          return undefined
      }
    case "macOS":
      if (arch === "arm64") return "ffmpeg-darwin-arm64"
      return arch === "x64" ? "ffmpeg-darwin-x64" : undefined
    default:
      return undefined
  }
}

// the file name yt-dlp looks for inside the location it is given
export const getFfmpegFileName = (platform: TYtDlpPlatform | undefined): string =>
  platform === "win" ? "ffmpeg.exe" : "ffmpeg"

// github serves the newest build of an asset under this fixed link. The plain
// binary is downloaded, not its .gz twin: an unpack step would need a second
// file next to the binary and would make the install depend on it running
export const getFfmpegReleaseUrl = (assetName: string): string =>
  `https://github.com/eugeneware/ffmpeg-static/releases/latest/download/${assetName}`
