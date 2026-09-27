import { STATUS_TYPE } from "../types"

export type GithubUser = {
  login: string
  id: number
  node_id: string
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
  user_view_type: string
  site_admin: boolean
}

export type GithubReleaseAsset = {
  url: string
  id: number
  node_id: string
  name: string
  label: string
  uploader: GithubUser
  content_type: string
  state: string
  size: number
  digest: string
  download_count: number
  created_at: string
  updated_at: string
  browser_download_url: string
}

export type GithubRelease = {
  url: string
  assets_url: string
  upload_url: string
  html_url: string

  id: number

  author: GithubUser

  node_id: string

  tag_name: string
  target_commitish: string
  name: string

  draft: boolean
  immutable: boolean
  prerelease: boolean

  created_at: string
  updated_at: string
  published_at: string

  assets: GithubReleaseAsset[]
}
export type ytDlpInfoData = {
  tag_name: string
  html_url: string
  linux_asset: GithubReleaseAsset | undefined
  winAsset: GithubReleaseAsset | undefined
  macAsset: GithubReleaseAsset | undefined
  // asset matching the platform this app is running on (may be arm64 on linux)
  asset: GithubReleaseAsset | undefined
}

export type TYtDlpPlatform = "win" | "linux" | "macOS"

// state of the yt-dlp executable itself (never of a media download)
export type TYtDlpInstallState = "not-installed" | "downloading" | "installed" | "failed"

export type TYtDlpStatus = {
  state: TYtDlpInstallState
  executablePath: string
  version?: string
  percent: number
  speed: string
  error?: string
  ffmpegAvailable: boolean
}

// one entry of the yt-dlp "formats" list, trimmed to what the UI needs
// hasAudio is derived from vcodec/acodec, never from the file extension
export type TYtDlpFormat = {
  format_id: string
  ext: string
  vcodec?: string
  acodec?: string
  width?: number
  height?: number
  fps?: number
  abr?: number
  vbr?: number
  tbr?: number
  filesize?: number
  filesize_approx?: number
  resolution?: string
  format_note?: string
  language?: string
  asr?: number
  audio_channels?: number
  hasAudio: boolean
}

export type TYtDlpSubtitleFormat = {
  ext: string
  name?: string
}

// a language yt-dlp offers subtitles for, normal or automatic captions
export type TYtDlpSubtitle = {
  language: string
  isAutomatic: boolean
  formats: TYtDlpSubtitleFormat[]
}

export type TYtDlpMediaInfo = {
  id: string
  title: string
  uploader?: string
  duration?: number
  webpageUrl: string
  videoFormats: TYtDlpFormat[]
  audioFormats: TYtDlpFormat[]
  subtitles: TYtDlpSubtitle[]
}

export type TYtDlpSubtitleSelection = {
  language: string
  format: string
  isAutomatic: boolean
}

export type TYtDlpDownloadRequest = {
  url: string
  videoFormatId: string
  audioFormatId?: string
  subtitles: TYtDlpSubtitleSelection[]
  title?: string
}

// mirrors the aria2 fields the download rows already use, so a yt-dlp job can
// be displayed by the download table without any new shape
export type TYtDlpDownloadStatus = {
  id: string
  status: STATUS_TYPE
  percent: number
  completedLength: string
  totalLength: string
  downloadSpeed: string
  eta?: number
  dir: string
  filePath?: string
  title?: string
  errorMessage?: string
}

export type TYtDlpMediaInfoResponse = {
  mediaInfo: TYtDlpMediaInfo | null
  error: string
}

export type TYtDlpDownloadResponse = {
  download: TYtDlpDownloadStatus | null
  error: string
}

// raw shapes of the "yt-dlp -J" output, only used inside the main process
export type TYtDlpRawSubtitleFormat = {
  ext?: string
  name?: string
  url?: string
}

export type TYtDlpRawFormat = {
  format_id?: string
  ext?: string
  vcodec?: string
  acodec?: string
  width?: number
  height?: number
  fps?: number
  abr?: number
  vbr?: number
  tbr?: number
  filesize?: number
  filesize_approx?: number
  resolution?: string
  format_note?: string
  language?: string
  asr?: number
  audio_channels?: number
}

export type TYtDlpRawMediaInfo = {
  _type?: string
  id?: string
  title?: string
  uploader?: string
  duration?: number
  webpage_url?: string
  formats?: TYtDlpRawFormat[]
  subtitles?: Record<string, TYtDlpRawSubtitleFormat[]>
  automatic_captions?: Record<string, TYtDlpRawSubtitleFormat[]>
}
