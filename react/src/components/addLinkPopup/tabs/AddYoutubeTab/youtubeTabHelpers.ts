import { TYtDlpFormat, TYtDlpSubtitle, TYtDlpSubtitleSelection } from "@src/types.ts"
import { formatBytes } from "@src/utils.ts"

// yt-dlp codec strings carry profiles, the list shows the short family name
const VIDEO_CODEC_NAMES: [string, string][] = [
  ["avc1", "h264"],
  ["avc3", "h264"],
  ["hev1", "h265"],
  ["hvc1", "h265"],
  ["vp09", "vp9"],
  ["vp8", "vp8"],
  ["av01", "av1"]
]

const AUDIO_CODEC_NAMES: [string, string][] = [
  ["mp4a", "aac"],
  ["opus", "opus"],
  ["vorbis", "vorbis"],
  ["ec-3", "eac3"],
  ["ac-3", "ac3"]
]

const prettyCodec = (codec: string | undefined, names: [string, string][]): string | undefined => {
  if (!codec || codec === "none") return undefined

  const match = names.find(([prefix]) => codec.startsWith(prefix))
  return match ? match[1] : codec
}

export const videoCodecLabel = (format: TYtDlpFormat): string | undefined =>
  prettyCodec(format.vcodec, VIDEO_CODEC_NAMES)

export const audioCodecLabel = (format: TYtDlpFormat): string | undefined =>
  prettyCodec(format.acodec, AUDIO_CODEC_NAMES)

export const formatResolutionLabel = (format: TYtDlpFormat): string => {
  if (format.height) return `${format.height}p`
  if (format.resolution) return format.resolution
  return format.format_note ?? "video"
}

export const formatSizeLabel = (format: TYtDlpFormat): string => {
  const size = format.filesize ?? format.filesize_approx
  return size ? formatBytes(size) : "size unknown"
}

export const formatBitrateLabel = (format: TYtDlpFormat): string => {
  const bitrate = format.abr ?? format.vbr ?? format.tbr
  return bitrate ? `${Math.round(bitrate)} kbps` : ""
}

export const formatVideoPrimaryLabel = (format: TYtDlpFormat): string => {
  const parts = [formatResolutionLabel(format), format.ext.toUpperCase()]
  const codec = videoCodecLabel(format)
  if (codec) parts.push(codec)
  if (format.fps && format.fps > 30) parts.push(`${Math.round(format.fps)}fps`)
  return parts.join(" · ")
}

export const formatVideoSecondaryLabel = (format: TYtDlpFormat): string => {
  const parts = [`id ${format.format_id}`]
  const bitrate = formatBitrateLabel(format)
  if (bitrate) parts.push(bitrate)

  if (format.hasAudio) {
    const audioCodec = audioCodecLabel(format)
    parts.push(audioCodec ? `audio ${audioCodec}` : "audio included")
  } else {
    parts.push("video only")
  }

  if (format.format_note) parts.push(format.format_note)
  return parts.join(" · ")
}

export const formatAudioPrimaryLabel = (format: TYtDlpFormat): string => {
  const parts = [format.ext.toUpperCase()]
  const codec = audioCodecLabel(format)
  if (codec) parts.push(codec)
  const bitrate = formatBitrateLabel(format)
  if (bitrate) parts.push(bitrate)
  return parts.join(" · ")
}

export const formatAudioSecondaryLabel = (format: TYtDlpFormat): string => {
  const parts = [`id ${format.format_id}`]
  if (format.asr) parts.push(`${(format.asr / 1000).toFixed(1)} kHz`)
  if (format.audio_channels) parts.push(`${format.audio_channels} ch`)
  if (format.language) parts.push(format.language)
  if (format.format_note) parts.push(format.format_note)
  return parts.join(" · ")
}

export const formatDurationLabel = (duration?: number): string => {
  if (!duration || !Number.isFinite(duration)) return ""

  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = Math.floor(duration % 60)

  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

// full language names come from the platform, unknown codes fall back to the code
export const languageLabel = (language: string): string => {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language
  } catch {
    return language
  }
}

export const subtitleTitle = (subtitle: TYtDlpSubtitle): string =>
  `${languageLabel(subtitle.language)}${subtitle.isAutomatic ? " (auto)" : ""}`

export const subtitleFormatLabel = (ext: string, name?: string): string =>
  name ? `${name} (${ext.toUpperCase()})` : ext.toUpperCase()

export const subtitlesLabel = (choices: TYtDlpSubtitleSelection[]): string => {
  if (!choices.length) return "None"
  return choices
    .map(
      (choice) =>
        `${languageLabel(choice.language)}${choice.isAutomatic ? " (auto)" : ""} · ${choice.format.toUpperCase()}`
    )
    .join(", ")
}

const YOUTUBE_HOSTS = ["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]

// used to open the youtube tab right away when the popup got a youtube link
export const isYoutubeLink = (value: string): boolean => {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase()
    return YOUTUBE_HOSTS.includes(host)
  } catch {
    return false
  }
}

// the real path is resolved by the main process, this only mirrors the existing
// extension mapping for the summary
export const destinationFolderLabel = (format: TYtDlpFormat | undefined): string => {
  if (!format) return "—"

  const videoExtensions = ["mp4", "mkv", "webm", "avi", "mov", "flv", "wmv"]
  if (videoExtensions.includes(format.ext)) return "videos"

  const musicExtensions = ["mp3", "m4a", "wav", "aac", "ogg", "flac"]
  if (musicExtensions.includes(format.ext)) return "musics"

  return "other"
}
