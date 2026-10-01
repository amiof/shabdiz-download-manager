import os from "os"
import { TOptionsConfig, TProxyConfig } from "../types"
import {
  TYtDlpFormat,
  TYtDlpPlatform,
  TYtDlpRawFormat,
  TYtDlpRawMediaInfo,
  TYtDlpRawSubtitleFormat,
  TYtDlpSubtitle,
  TYtDlpSubtitleSelection
} from "./type"

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
export const getYtDlpAssetName = (): string => {
  const platform = checkSystemPlatform() as TYtDlpPlatform | undefined

  switch (platform) {
    case "win":
      return "yt-dlp.exe"
    case "linux":
      return process.arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux"
    case "macOS":
      return "yt-dlp_macos"
    default:
      throw new Error("This platform is not supported for yt-dlp")
  }
}

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

// yt-dlp does the merging itself: "VIDEO" when the format already has audio,
// otherwise "VIDEO+AUDIO"
export const buildFormatSelector = (videoFormatId: string, audioFormatId?: string): string =>
  audioFormatId ? `${videoFormatId}+${audioFormatId}` : videoFormatId

// container yt-dlp should write after merging, so the destination folder can be
// resolved before the download starts
export const resolveMergeContainer = (videoFormat: TYtDlpFormat, audioFormat?: TYtDlpFormat): string => {
  if (!audioFormat) return videoFormat.ext

  if (videoFormat.ext === audioFormat.ext) return videoFormat.ext

  const isMp4Audio = audioFormat.ext === "m4a" || (audioFormat.acodec ?? "").startsWith("mp4a")

  if (videoFormat.ext === "mp4" && isMp4Audio) return "mp4"

  return "mkv"
}

export const YT_DLP_PROGRESS_TEMPLATE =
  "@@PROGRESS@@%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s"

export const YT_DLP_FILE_MARKER = "@@FILE@@"

export const YT_DLP_FILE_TEMPLATE = `after_move:${YT_DLP_FILE_MARKER}%(filepath)s`

const toNumber = (value?: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export type TYtDlpProgress = {
  completedLength: number
  totalLength: number
  downloadSpeed: number
  eta?: number
}

// one progress line printed by yt-dlp through YT_DLP_PROGRESS_TEMPLATE
export const parseYtDlpProgressLine = (line: string): TYtDlpProgress | null => {
  if (!line.startsWith("@@PROGRESS@@")) return null

  const [downloaded, total, totalEstimate, speed, eta] = line.replace("@@PROGRESS@@", "").split("|")

  const totalLength = toNumber(total) || toNumber(totalEstimate)

  return {
    completedLength: toNumber(downloaded),
    totalLength,
    downloadSpeed: toNumber(speed),
    eta: eta && eta !== "NA" ? toNumber(eta) : undefined
  }
}

// the printed final file path of a finished download
export const parseYtDlpFilePath = (line: string): string | null => {
  const trimmed = line.trim()
  if (!trimmed.startsWith(YT_DLP_FILE_MARKER)) return null

  const filePath = trimmed.replace(YT_DLP_FILE_MARKER, "").trim()
  return filePath || null
}

// file options of the add link popup are reused for yt-dlp too
export const buildYtDlpAuthArgs = (options?: TOptionsConfig | null, proxyConfig?: TProxyConfig | null): string[] => {
  const args: string[] = []

  if (options?.cookie) args.push("--cookies", options.cookie)
  if (options?.userAgent) args.push("--user-agent", options.userAgent)
  if (options?.referrer) args.push("--referer", options.referrer)

  if (options?.header) {
    try {
      const headers = JSON.parse(options.header) as Record<string, string>
      Object.entries(headers).forEach(([key, value]) => {
        args.push("--add-header", `${key}: ${String(value).trim()}`)
      })
    } catch {
      console.error("Could not parse the header option for yt-dlp")
    }
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
