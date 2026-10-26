export type TFileDetails = {
  name: string
  path: string
  size: number // in bytes
  createdAt: Date
  modifiedAt: Date
  isDirectory: boolean
}

// type for download db
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

export type TTorrentRes = {
  bittorrent: {
    announceList: string[][]
  }
  completedLength: string
  connections: string
  dir: string
  downloadSpeed: string
  files: Tfile[]
  gid: string
  infoHash: string
  numPieces: string
  numSeeders: string
  pieceLength: string
  seeder: string
  status: STATUS_TYPE
  totalLength: string
  uploadLength: string
  uploadSpeed: string
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

export type TTorrentFileInfo = {
  path: string
  name: string
  length: number
  offset: number
}
type infoTorrent = {
  files: object[]
  name: any
  "piece length": number
  pieces: any
}
export type TtorrentFileParsed = {
  info: infoTorrent
  infoBuffer: any
  name: string
  announce: string[]
  infoHash: string
  infoHashBuffer: any
  urlList: string[]
  files: TTorrentFileInfo[]
  length: number
  pieceLength: number
  lastPieceLength: number
  pieces: string[]
}

// downloads create in ui  -- some times need use in back
export type TDownloads = {
  Id?: number
  FileName: string
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

// export type TtellRes = {
//   bitfield: string
//   completedLength: string
//   connections: string
//   dir: string
//   downloadSpeed: string
//   errorCode: string
//   errorMessage: string
//   files: Tfile[]
//   gid: string
//   numPieces: string
//   pieceLength: string
//   status: STATUS_TYPE
//   totalLength: string
//   uploadLength: string
//   createdAt?: Date
// }

export type TProxyConfig = {
  proxyStatus: boolean
  ip: string
  port: string
  proxyUserName?: string
  proxyPassword?: string
  proxyType: "http" | "https"
}
export type TOptionsConfig = {
  referrer?: string
  header?: string
  userAgent?: string
  cookie?: string
}

// which backend owns a download shown by the shared download popup
export type TDownloadSource = "aria2" | "yt-dlp"

export type TAria2Config = {
  maxConnection: string
  maxConnectionSplit: string
  maxDownloadLimit: string
  dnsServer: string
  minSplitSize: string
  connectTimeout: string
}
export type TNotificationDetailes = {
  title: string
  body: string
}
export type TTorrentConfig = {
  enableDht: boolean
  enableDht6: boolean
  enableLpd: boolean
  enablePeerExchange: boolean
  maxPeers: string
  requestPeerSpeedLimit: string
  seedTime: string
  seedRatio: string
  stopTimeout: string
  maxOverallUploadLimit: string
  maxUploadLimit: string
  maxOverallDownloadLimit: string
  tracker: string | null
}
export type TScheduler = {
  startTime: string | undefined
  endTime: string | undefined
  keepAlive: boolean
  powerOff: boolean
}

export type TSchedulerDatabase = {
  id: number
  gid: string
  CreatedAt?: Date
}

// export type TTorrentRowDatabase = {
//   bittorrent: {
//     announceList: any[]
//   },
//   completedLength: "0"
//   connections: "0"
//   dir: "/home/amir/Shabdiz-DM/other"
//   downloadSpeed: "0"
//   files: [
//     {
//       completedLength: "0"
//       index: "1"
//       length: "0"
//       path: "[METADATA]The+Tin+Can+Society+#9+(2025)"
//       selected: "true"
//       uris: []
//     }
//   ]
//
//   gid: "fd4e12c313d86fb8"
//   infoHash: "963c59966e79d5edc496c0cc0d0ea97fea061b0e"
//   numPieces: "0"
//   numSeeders: "0"
//   pieceLength: "16384"
//   seeder: "false"
//   status: "active"
//   totalLength: "0"
//   uploadLength: "0"
//   uploadSpeed: "0"
// }
//
// aria2 methods

export enum Aria2Methods {
  // General Methods
  ADD_URI = "aria2.addUri",
  ADD_TORRENT = "aria2.addTorrent",
  ADD_METALINK = "aria2.addMetalink",
  REMOVE = "aria2.remove",
  FORCE_REMOVE = "aria2.forceRemove",
  PAUSE = "aria2.pause",
  PAUSE_ALL = "aria2.pauseAll",
  FORCE_PAUSE = "aria2.forcePause",
  FORCE_PAUSE_ALL = "aria2.forcePauseAll",
  UNPAUSE = "aria2.unpause",
  UNPAUSE_ALL = "aria2.unpauseAll",

  // Status Retrieval Methods
  TELL_STATUS = "aria2.tellStatus",
  GET_URIS = "aria2.getUris",
  GET_FILES = "aria2.getFiles",
  GET_SERVERS = "aria2.getServers",
  TELL_ACTIVE = "aria2.tellActive",
  TELL_WAITING = "aria2.tellWaiting",
  TELL_STOPPED = "aria2.tellStopped",

  // Global Statistics Methods
  GET_GLOBAL_STAT = "aria2.getGlobalStat",

  // Session Management Methods
  SHUTDOWN = "aria2.shutdown",
  FORCE_SHUTDOWN = "aria2.forceShutdown",
  SAVE_SESSION = "aria2.saveSession",

  // Configuration Methods
  CHANGE_POSITION = "aria2.changePosition",
  CHANGE_URI = "aria2.changeUri",
  GET_OPTION = "aria2.getOption",
  CHANGE_OPTION = "aria2.changeOption",
  GET_GLOBAL_OPTION = "aria2.getGlobalOption",
  CHANGE_GLOBAL_OPTION = "aria2.changeGlobalOption",

  // System Information Methods
  SYSTEM_MULTICALL = "system.multicall",
  SYSTEM_LIST_METHODS = "system.listMethods",
  SYSTEM_LIST_NOTIFICATIONS = "system.listNotifications"
}
