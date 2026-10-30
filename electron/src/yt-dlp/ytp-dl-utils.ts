import os from "os"
// type only imports, so the helpers of this file stay loadable by node --test
// without pulling the extensionless "../types" module into the runtime graph
import type { TOptionsConfig, TProxyConfig } from "../types"
import type {
  TYtDlpFormat,
  TYtDlpPlatform,
  TYtDlpRawFormat,
  TYtDlpRawMediaInfo,
  TYtDlpRawSubtitleFormat,
  TYtDlpSubtitle,
  TYtDlpSubtitleSelection
} from "./type"
import { parseHeaderOption, pickHeader } from "./yt-dlp-cookie-file"
import { resolveYtDlpAssetName } from "./yt-dlp-version"

export const checkSystemPlatform = () => {
  try {
    const systemPlatform = os.platform()
    switch (systemPlatform) {
      case "win32":
        return "win"
        break
      case "darwin":
        return "macOS"
        break
      case "linux":
        return "linux"
        break
      default:
        throw new Error(`Unsupported platform: ${systemPlatform}`)
    }
  } catch (error) {
    console.error(error)
  }
}

// name of the github release asset that is used as the executable on this machine
export const getYtDlpAssetName = (): string =>
  resolveYtDlpAssetName(checkSystemPlatform() as TYtDlpPlatform | undefined, process.arch)

// github serves the newest build of an asset under this fixed link, so the
// app can install yt-dlp even when the releases api is rate limited
export const getYtDlpReleaseUrl = (assetName: string): string =>
  `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`

export const hasVideoStream = (format: { vcodec?: string }): boolean => !!format.vcodec && format.vcodec !== "none"

export const hasAudioStream = (format: { acodec?: string }): boolean => !!format.acodec && format.acodec !== "none"

// a muxed format already carries both streams, so no audio selection is needed
export const isMuxedFormat = (format: { vcodec?: string; acodec?: string }): boolean =>
  hasVideoStream(format) && hasAudioStream(format)

export const mapYtDlpFormat = (format: TYtDlpRawFormat): TYtDlpFormat => ({
  format_id: String(format.format_id),
  ext: format.ext ?? "",
  vcodec: format.vcodec,
  acodec: format.acodec,
  width: format.width,
  height: format.height,
  fps: format.fps,
  abr: format.abr,
  vbr: format.vbr,
  tbr: format.tbr,
  filesize: format.filesize,
  filesize_approx: format.filesize_approx,
  resolution: format.resolution,
  format_note: format.format_note,
  language: format.language,
  asr: format.asr,
  audio_channels: format.audio_channels,
  hasAudio: hasAudioStream(format)
})

// video formats can be video only or already contain the audio track
export const buildVideoFormats = (formats: TYtDlpRawFormat[] = []): TYtDlpFormat[] =>
  formats
    .filter((format) => !!format.format_id && hasVideoStream(format))
    .map(mapYtDlpFormat)
    .sort((first, second) => (second.height ?? 0) - (first.height ?? 0) || (second.tbr ?? 0) - (first.tbr ?? 0))

// only audio only formats are offered as an extra audio selection
export const buildAudioFormats = (formats: TYtDlpRawFormat[] = []): TYtDlpFormat[] =>
  formats
    .filter((format) => !!format.format_id && hasAudioStream(format) && !hasVideoStream(format))
    .map(mapYtDlpFormat)
    .sort((first, second) => (second.abr ?? second.tbr ?? 0) - (first.abr ?? first.tbr ?? 0))

export const buildSubtitleList = (
  subtitles: Record<string, TYtDlpRawSubtitleFormat[]> | undefined,
  automaticCaptions: Record<string, TYtDlpRawSubtitleFormat[]> | undefined
): TYtDlpSubtitle[] => {
  const mapGroup = (
    group: Record<string, TYtDlpRawSubtitleFormat[]> | undefined,
    isAutomatic: boolean
  ): TYtDlpSubtitle[] =>
    Object.entries(group ?? {}).map(([language, formats]) => {
      const seen = new Set<string>()
      const availableFormats = (formats ?? []).reduce<TYtDlpSubtitle["formats"]>((list, format) => {
        if (format.ext && !seen.has(format.ext)) {
          seen.add(format.ext)
          list.push({ ext: format.ext, name: format.name })
        }
        return list
      }, [])

      return { language, isAutomatic, formats: availableFormats }
    })

  return [...mapGroup(subtitles, false), ...mapGroup(automaticCaptions, true)]
}

export const pickMediaInfo = (raw: TYtDlpRawMediaInfo) => ({
  videoFormats: buildVideoFormats(raw.formats),
  audioFormats: buildAudioFormats(raw.formats),
  subtitles: buildSubtitleList(raw.subtitles, raw.automatic_captions)
})

// container yt-dlp should write after merging, so the destination folder can be
// resolved before the download starts
export const resolveMergeContainer = (videoFormat: TYtDlpFormat, audioFormat?: TYtDlpFormat): string => {
  if (!audioFormat) return videoFormat.ext

  if (videoFormat.ext === audioFormat.ext) return videoFormat.ext

  const isMp4Audio = audioFormat.ext === "m4a" || (audioFormat.acodec ?? "").startsWith("mp4a")

  if (videoFormat.ext === "mp4" && isMp4Audio) return "mp4"

  return "mkv"
}

export {
  buildFormatSelector,
  buildYtDlpDownloadArgs,
  YT_DLP_FILE_TEMPLATE,
  YT_DLP_PROGRESS_TEMPLATE
} from "./yt-dlp-download-args"

// file options of the add link popup are reused for yt-dlp too. cookieFilePath
// is the netscape file written from the browser extension cookie header, it wins
// over the cookie file the user picked in the options tab
export const buildYtDlpAuthArgs = (
  options?: TOptionsConfig | null,
  proxyConfig?: TProxyConfig | null,
  cookieFilePath?: string
): string[] => {
  const args: string[] = []
  const headers = parseHeaderOption(options?.header)

  const cookieFile = cookieFilePath ?? options?.cookie
  if (cookieFile) args.push("--cookies", cookieFile)

  // the browser extension sends the user agent and the referer as headers, they
  // keep their own options because yt-dlp only honours those two there
  const userAgent = options?.userAgent ?? pickHeader(headers, "user-agent")
  if (userAgent) args.push("--user-agent", userAgent)

  const referrer = options?.referrer ?? pickHeader(headers, "referer")
  if (referrer) args.push("--referer", referrer)

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      // the cookie header only works as a cookie file, and the user agent and
      // the referer were already turned into their own options above
      const headerName = key.trim().toLowerCase()
      if (headerName === "cookie" || headerName === "user-agent" || headerName === "referer") return

      args.push("--add-header", `${key}: ${String(value).trim()}`)
    })
  }

  if (proxyConfig?.proxyStatus && proxyConfig.ip && proxyConfig.port) {
    args.push("--proxy", `${proxyConfig.proxyType}://${proxyConfig.ip}:${proxyConfig.port}`)
    if (proxyConfig.proxyUserName) {
      const credentials = proxyConfig.proxyPassword
        ? `${proxyConfig.proxyUserName}:${proxyConfig.proxyPassword}`
        : proxyConfig.proxyUserName
      args.push("--proxy-user", credentials)
    }
  }

  return args
}

// every selected subtitle language is fetched in its own run so that the
// format chosen for that language is respected
export const buildSubtitleArgs = (selection: TYtDlpSubtitleSelection): string[] => [
  "--skip-download",
  selection.isAutomatic ? "--write-auto-subs" : "--write-subs",
  "--sub-langs",
  selection.language,
  "--sub-format",
  `${selection.format}/best`
]

// yt-dlp errors are multi line and full of technical detail, only the first
// line is useful for the user
export const toYtDlpUserError = (detail: string): string => {
  const firstLine = detail
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  if (!firstLine) return "yt-dlp could not process this link"

  return firstLine.replace(/^ERROR:\s*/i, "").slice(0, 300)
}
