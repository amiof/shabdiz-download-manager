export type TDownloads = {
  Id?: number
  FileName: string | null
  Url: string
  SavePath: string
  Size: string
  CreatedAt?: Date
  Percentage?: number
  Status?: STATUS_TYPE
  CompletedSize?: string
  Gid: string
  NumberConnections: string
  isTorrent: boolean
  schedulerQueue: boolean
}

export type TUri = {
  status: "used" | "waiting"
  uri: string
}
export type Tfile = {
  completedLength: string
  index: string
  length: string
  path: string
  selected: string
  uris: TUri[]
}

export enum STATUS_TYPE {
  WAITING = "waiting",
  ERROR = "error",
  REMOVED = "removed",
  COMPLETE = "complete",
  PAUSED = "paused",
  ACTIVE = "active"
}

// which backend owns a download shown by the shared DownloadStart popup
export type TDownloadSource = "aria2" | "yt-dlp"

export type TtellRes = {
  bittorrent?: {
    announceList: string[][]
  }
  bitfield?: string
  completedLength: string
  connections: string
  dir: string
  downloadSpeed: string
  errorCode?: string
  errorMessage?: string
  files: Tfile[]
  numSeeders?: string
  seeder?: string
  infoHash?: string
  gid: string
  numPieces: string
  pieceLength: string
  status: STATUS_TYPE
  totalLength: string
  uploadSpeed?: string
  uploadLength: string
  schedulerQueue?: boolean
}
export type TSchedulerGid = {
  id: number
  gid: string
  CreatedAt?: Date
}

// export type TTorrentRes = {
//   bittorrent: {
//     announceList: string[][]
//   },
//   completedLength: string
//   connections: string
//   dir: string
//   downloadSpeed: string
//   files: Tfile[]
//   gid: string
//   infoHash: string
//   numPieces: string
//   numSeeders: string
//   pieceLength: string
//   seeder: string
//   status: STATUS_TYPE
//   totalLength: string
//   uploadLength: string
//   uploadSpeed: string
// }
//

export type TGetGlobalStateResponse = {
  downloadSpeed: string
  numActive: string
  numStopped: string
  numStoppedTotal: string
  numWaiting: string
  uploadSpeed: string
}

export type TFileDetails = {
  name: string
  path: string
  size: number // in bytes
  createdAt: Date
  modifiedAt: Date
  isDirectory: boolean
}

export type TTorrentFileInfo = {
  path: string
  name: string
  length: number
  offset: number
}
export type resMetadataUrls = {
  fileName: string | null
  size: string | null
  typeUrl: "direct" | "torrent" | "magnet"
  savePath: string
  resume: boolean | null
  torrentInfoHash?: string
  gidTorrent?: string
  torrentFiles?: TTorrentFileInfo[]
}

export type TSchedulerConfig = {
  startTime: string | undefined
  endTime: string | undefined
  keepAlive: boolean
  powerOff: boolean
}

// yt-dlp ---------------------------------------------------------------

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

// hasAudio comes from the yt-dlp vcodec/acodec fields, not from the extension
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
  url: string
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
