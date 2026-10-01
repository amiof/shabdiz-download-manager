import { ChildProcess, execFile, spawn } from "child_process"
import { app } from "electron"
import { constants } from "fs"
import { access, chmod, mkdir, writeFile } from "fs/promises"
import path from "path"
import { DataSourceRepo } from "../database/database"
import { Download } from "../database/entities/download"
import { GET_DATA_CHANNELS } from "../ipc/channels"
import { aria2, mainWindow } from "../main"
import { electronStore } from "../store/electronStore"
import { STATUS_TYPE, Tfile, TOptionsConfig, TProxyConfig, TtellRes } from "../types"
import { directionFolder, generateId } from "../utils"
import {
  GithubRelease,
  TYtDlpDownloadRequest,
  TYtDlpDownloadStatus,
  TYtDlpMediaInfo,
  TYtDlpRawMediaInfo,
  TYtDlpStatus,
  ytDlpInfoData
} from "./type"
import {
  buildNetscapeCookieFile,
  cookieAuthHint,
  isCookieAuthError,
  parseCookieHeader,
  pickCookieHeaderFromOptions
} from "./yt-dlp-cookie-file"
import {
  buildFormatSelector,
  buildSubtitleArgs,
  buildYtDlpAuthArgs,
  checkSystemPlatform,
  getYtDlpAssetName,
  getYtDlpReleaseUrl,
  parseYtDlpFilePath,
  parseYtDlpProgressLine,
  pickMediaInfo,
  resolveMergeContainer,
  toYtDlpUserError,
  YT_DLP_FILE_TEMPLATE,
  YT_DLP_PROGRESS_TEMPLATE
} from "./ytp-dl-utils"

export default class YtDlp {
  lastInfo: ytDlpInfoData | undefined = undefined

  private installGid: string | undefined = undefined
  private installError: string | undefined = undefined
  private listenersInitialized = false
  private ffmpegAvailable: boolean | undefined = undefined
  // running media downloads, keyed by the id that was handed to the renderer
  private processes = new Map<string, ChildProcess>()
  private downloads = new Map<string, TYtDlpDownloadStatus>()
  // the last parsed metadata, so a download request does not have to carry the
  // whole yt-dlp format list back to the main process
  private lastMediaInfo: { url: string; info: TYtDlpMediaInfo } | undefined = undefined
  // the netscape cookie file written from the browser extension cookie header
  private cookieFilePath: string | undefined = undefined
  // the cookie header the file was written from, a later link sends new cookies
  private cookieFileHeader: string | undefined = undefined

  checkVersion() {
    console.log("checkVersion")
  }

  async getLastInfo() {
    if (this.lastInfo) return this.lastInfo

    try {
      const response = await fetch("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest")

      if (!response.ok) {
        throw new Error(`GitHub answered with ${response.status}`)
      }

      const release: GithubRelease = await response.json()
      const assetName = getYtDlpAssetName()

      const InfoData: ytDlpInfoData = {
        tag_name: release.tag_name,
        html_url: release.html_url,
        linux_asset: release.assets.find((asset) => asset.name === "yt-dlp_linux"),
        winAsset: release.assets.find((asset) => asset.name === "yt-dlp.exe"),
        macAsset: release.assets.find((asset) => asset.name === "yt-dlp_macos"),
        asset: release.assets.find((asset) => asset.name === assetName)
      }
      this.lastInfo = InfoData

      return this.lastInfo
    } catch (error) {
      // the executable can still be installed from the fixed release link
      console.error("[yt-dlp] Could not read the latest release from GitHub:", error)
      return undefined
    }
  }

  // userData/yt-dlp only ever holds the executable, never downloaded media
  async ytDlpCreatePath() {
    const ytDlpPath = path.join(app.getPath("userData"), "yt-dlp")
    try {
      await access(ytDlpPath)
      console.log("yt-dl path avaiale: ", ytDlpPath)
    } catch {
      try {
        await mkdir(ytDlpPath, { recursive: true })
        console.log("yt-dl path created : ", ytDlpPath)
      } catch (e) {
        console.error("Failed to create yt-dlp directory:", e)
      }
    }
    return ytDlpPath
  }

  getExecutablePath = (): string => path.join(app.getPath("userData"), "yt-dlp", getYtDlpAssetName())

  async isInstalled(): Promise<{ installed: boolean; path: string; version?: string }> {
    const executablePath = this.getExecutablePath()
    try {
      // on linux and macOS the file also has to be executable
      if (checkSystemPlatform() === "win") await access(executablePath)
      else await access(executablePath, constants.X_OK)

      const stored = electronStore.get("ytDlp")

      return { installed: true, path: executablePath, version: stored?.version || undefined }
    } catch {
      return { installed: false, path: executablePath }
    }
  }

  hasFfmpeg = async (): Promise<boolean> => {
    if (this.ffmpegAvailable !== undefined) return this.ffmpegAvailable

    this.ffmpegAvailable = await new Promise<boolean>((resolve) => {
      execFile("ffmpeg", ["-version"], (error) => resolve(!error))
    })

    return this.ffmpegAvailable
  }

  // downloads the platform asset of the latest release through aria2 and
  // returns the aria2 gid, exactly like the previous implementation did
  async downloadLastVersion() {
    if (this.installGid) {
      const running = (await aria2.sendAria2cRequest("tellStatus", [this.installGid])) as TtellRes | undefined

      if (running && (running.status === STATUS_TYPE.ACTIVE || running.status === STATUS_TYPE.WAITING)) {
        console.log("[yt-dlp] a yt-dlp download is already running")
        return this.installGid
      }
    }

    const assetName = getYtDlpAssetName()
    const info = await this.getLastInfo()
    const url = info?.asset?.browser_download_url ?? getYtDlpReleaseUrl(assetName)
    const directory = await this.ytDlpCreatePath()

    this.installError = undefined

    const gid = (await aria2.sendAria2cRequest("addUri", [
      [url],
      {
        dir: directory,
        out: assetName,
        continue: true,
        // a retry has to replace a file that was left behind by a failed attempt
        "allow-overwrite": "true"
      }
    ])) as string | undefined

    if (!gid) throw new Error("The yt-dlp download could not be started")

    this.installGid = gid
    console.log(`[yt-dlp] downloading ${assetName} into ${directory} (gid ${gid})`)

    return gid
  }

  async getStatus(): Promise<TYtDlpStatus> {
    const executablePath = this.getExecutablePath()
    const ffmpegAvailable = await this.hasFfmpeg()

    const installed = await this.isInstalled()
    if (installed.installed) {
      if (this.installGid) {
        await this.clearAria2Result(this.installGid)
        this.installGid = undefined
      }

      return {
        state: "installed",
        executablePath,
        version: installed.version,
        percent: 100,
        speed: "0",
        ffmpegAvailable
      }
    }

    if (this.installGid) {
      const tell = (await aria2.sendAria2cRequest("tellStatus", [this.installGid])) as TtellRes | undefined

      if (tell?.gid) {
        if (tell.status === STATUS_TYPE.ERROR || tell.status === STATUS_TYPE.REMOVED) {
          this.installError = tell.errorMessage || "The yt-dlp download failed"
          await this.clearAria2Result(tell.gid)
          this.installGid = undefined

          return { state: "failed", executablePath, percent: 0, speed: "0", error: this.installError, ffmpegAvailable }
        }

        if (tell.status === STATUS_TYPE.COMPLETE) {
          const result = await this.finalizeInstall(tell.gid)
          this.installGid = undefined

          if (result === "installed") {
            return {
              state: "installed",
              executablePath,
              version: electronStore.get("ytDlp")?.version || undefined,
              percent: 100,
              speed: "0",
              ffmpegAvailable
            }
          }

          return { state: "failed", executablePath, percent: 0, speed: "0", error: this.installError, ffmpegAvailable }
        }

        const totalLength = Number(tell.totalLength)
        const completedLength = Number(tell.completedLength)

        return {
          state: "downloading",
          executablePath,
          percent: totalLength > 0 ? Math.min(100, Math.round((completedLength / totalLength) * 100)) : 0,
          speed: tell.downloadSpeed,
          ffmpegAvailable
        }
      }

      // the aria2 result is gone, the next check starts from scratch
      this.installGid = undefined
    }

    return {
      state: this.installError ? "failed" : "not-installed",
      executablePath,
      percent: 0,
      speed: "0",
      error: this.installError,
      ffmpegAvailable
    }
  }

  // keeps the installer download out of the main window download list and makes
  // sure the executable can be started once aria2 is done with it
  setupAria2Listeners = () => {
    if (this.listenersInitialized) return
    this.listenersInitialized = true

    aria2.on("onDownloadComplete", async ({ gid }: { gid: string }) => {
      if (!this.installGid || gid !== this.installGid) return

      const result = await this.finalizeInstall(gid)
      this.installGid = undefined
      console.log(`[yt-dlp] installation finished with state: ${result}`)
    })

    aria2.on("onDownloadError", async ({ gid }: { gid: string }) => {
      if (!this.installGid || gid !== this.installGid) return

      this.installError = "The yt-dlp download failed"
      await this.clearAria2Result(gid)
      this.installGid = undefined
      console.error(`[yt-dlp] installation failed for gid ${gid}`)
    })
  }

  async getMediaInfo(
    url: string,
    options?: TOptionsConfig | null,
    proxyConfig?: TProxyConfig | null
  ): Promise<TYtDlpMediaInfo> {
    const installed = await this.isInstalled()
    if (!installed.installed) throw new Error("yt-dlp is not downloaded yet")

    const cookieFilePath = await this.resolveCookieFile(options)
    const stdout = await this.runYtDlp([
      "-J",
      "--no-playlist",
      "--no-warnings",
      ...buildYtDlpAuthArgs(options, proxyConfig, cookieFilePath),
      url
    ])

    let raw: TYtDlpRawMediaInfo
    try {
      raw = JSON.parse(stdout) as TYtDlpRawMediaInfo
    } catch (error) {
      console.error("[yt-dlp] Unexpected metadata output:", error)
      throw new Error("yt-dlp returned unexpected data for this link")
    }

    if (raw._type === "playlist" || raw._type === "multi_video") {
      throw new Error("Playlists are not supported yet, use a single video link")
    }

    const { videoFormats, audioFormats, subtitles } = pickMediaInfo(raw)

    if (!videoFormats.length) throw new Error("No downloadable formats were found for this link")

    const mediaInfo: TYtDlpMediaInfo = {
      id: raw.id ?? "",
      title: raw.title ?? "",
      uploader: raw.uploader,
      duration: raw.duration,
      webpageUrl: raw.webpage_url ?? url,
      videoFormats,
      audioFormats,
      subtitles
    }

    this.lastMediaInfo = { url: mediaInfo.webpageUrl, info: mediaInfo }

    return mediaInfo
  }

  // yt-dlp performs the whole download (and the video/audio merge) itself,
  // the finished file is written into the folder the app already uses for the
  // file type and a row is stored so the main window can list it
  async startDownload(
    request: TYtDlpDownloadRequest,
    options?: TOptionsConfig | null,
    proxyConfig?: TProxyConfig | null
  ): Promise<TYtDlpDownloadStatus> {
    const installed = await this.isInstalled()
    if (!installed.installed) throw new Error("yt-dlp is not downloaded yet")

    if (!this.lastMediaInfo || this.lastMediaInfo.url !== request.url) {
      throw new Error("Fetch the media information again before downloading")
    }

    const mediaInfo = this.lastMediaInfo.info

    const videoFormat = mediaInfo.videoFormats.find((format) => format.format_id === request.videoFormatId)
    if (!videoFormat) throw new Error("The selected video format is not available anymore")

    // a video format that already carries audio is downloaded on its own
    const audioFormat = videoFormat.hasAudio
      ? undefined
      : mediaInfo.audioFormats.find((format) => format.format_id === request.audioFormatId)

    if (!videoFormat.hasAudio && !audioFormat) {
      throw new Error("Select an audio format for this video")
    }

    if (audioFormat && !(await this.hasFfmpeg())) {
      throw new Error("Merging video and audio needs ffmpeg, which was not found on this system")
    }

    const container = resolveMergeContainer(videoFormat, audioFormat)
    const dir = directionFolder(`youtube-media.${container}`)

    if (!dir.trim()) throw new Error("Could not resolve the destination folder")

    const id = generateId()
    const status: TYtDlpDownloadStatus = {
      id,
      status: STATUS_TYPE.ACTIVE,
      percent: 0,
      completedLength: "0",
      totalLength: "0",
      downloadSpeed: "0",
      dir,
      title: request.title || mediaInfo.title
    }

    const cookieFilePath = await this.resolveCookieFile(options)
    const args = [
      "--no-playlist",
      "--no-warnings",
      "--newline",
      "--no-simulate",
      "--progress-template",
      YT_DLP_PROGRESS_TEMPLATE,
      "--print",
      YT_DLP_FILE_TEMPLATE,
      "-f",
      buildFormatSelector(videoFormat.format_id, audioFormat?.format_id),
      "-o",
      path.join(dir, "%(title)s.%(ext)s"),
      ...(audioFormat ? ["--merge-output-format", container] : []),
      ...buildYtDlpAuthArgs(options, proxyConfig, cookieFilePath),
      request.url
    ]

    this.downloads.set(id, status)
    this.pruneDownloads()
    await this.saveDownloadRow(id, status, request.url)
    this.spawnDownload(id, args, request, options, proxyConfig, dir)

    return status
  }

  getDownloadStatus = (id: string): TYtDlpDownloadStatus | null => this.downloads.get(id) ?? null

  cancelDownload = (id: string): boolean => {
    const process = this.processes.get(id)
    if (!process) return false

    process.kill()
    this.processes.delete(id)
    void this.finishDownload(id, STATUS_TYPE.REMOVED)

    return true
  }

  private spawnDownload = (
    id: string,
    args: string[],
    request: TYtDlpDownloadRequest,
    options: TOptionsConfig | null | undefined,
    proxyConfig: TProxyConfig | null | undefined,
    dir: string
  ) => {
    const child = spawn(this.getExecutablePath(), args)
    this.processes.set(id, child)

    let stdoutBuffer = ""

    child.stdout?.on("data", (data: Buffer) => {
      stdoutBuffer += data.toString()
      const lines = stdoutBuffer.split("\n")
      stdoutBuffer = lines.pop() ?? ""
      lines.forEach((line) => this.handleDownloadLine(id, line))
    })

    child.stderr?.on("data", (data: Buffer) => {
      console.log(`[yt-dlp] ${data.toString().trim()}`)
    })

    child.on("error", (error) => {
      this.processes.delete(id)
      console.error("[yt-dlp] The download process failed:", error)
      void this.finishDownload(id, STATUS_TYPE.ERROR, "The yt-dlp process could not be started")
    })

    child.on("close", async (code) => {
      this.processes.delete(id)

      const status = this.downloads.get(id)
      // a cancelled download already moved away from active
      if (!status || status.status !== STATUS_TYPE.ACTIVE) return

      if (code !== 0) {
        void this.finishDownload(id, STATUS_TYPE.ERROR, `yt-dlp exited with code ${code}`)
        return
      }

      await this.downloadSubtitles(request, options, proxyConfig, dir)
      await this.finishDownload(id, STATUS_TYPE.COMPLETE)
    })
  }

  private handleDownloadLine = (id: string, line: string) => {
    const status = this.downloads.get(id)
    if (!status) return

    const progress = parseYtDlpProgressLine(line.trim())
    if (progress) {
      const totalLength = progress.totalLength || Number(status.totalLength)
      const percent =
        totalLength > 0 ? Math.min(100, Math.round((progress.completedLength / totalLength) * 100)) : status.percent

      this.downloads.set(id, {
        ...status,
        percent,
        completedLength: String(progress.completedLength),
        totalLength: String(totalLength),
        downloadSpeed: String(progress.downloadSpeed),
        eta: progress.eta
      })
      return
    }

    const filePath = parseYtDlpFilePath(line)
    if (filePath) {
      this.downloads.set(id, { ...status, filePath, completedLength: status.totalLength, downloadSpeed: "0" })
    }
  }

  // every selected subtitle language is fetched in its own yt-dlp run so the
  // format that was picked for that language is respected
  private downloadSubtitles = async (
    request: TYtDlpDownloadRequest,
    options: TOptionsConfig | null | undefined,
    proxyConfig: TProxyConfig | null | undefined,
    dir: string
  ) => {
    const cookieFilePath = await this.resolveCookieFile(options)

    for (const selection of request.subtitles) {
      try {
        await this.runYtDlp([
          "--no-playlist",
          "--no-warnings",
          ...buildSubtitleArgs(selection),
          "-o",
          path.join(dir, "%(title)s.%(ext)s"),
          ...buildYtDlpAuthArgs(options, proxyConfig, cookieFilePath),
          request.url
        ])
      } catch (error) {
        // a missing subtitle must never fail the finished media download
        console.error(`[yt-dlp] Could not download the ${selection.language} subtitles:`, error)
      }
    }
  }

  private finishDownload = async (id: string, outcome: STATUS_TYPE, errorMessage?: string) => {
    const status = this.downloads.get(id)
    if (!status) return

    const finished: TYtDlpDownloadStatus = {
      ...status,
      status: outcome,
      percent: outcome === STATUS_TYPE.COMPLETE ? 100 : status.percent,
      downloadSpeed: "0",
      completedLength:
        outcome === STATUS_TYPE.COMPLETE && Number(status.totalLength) > 0
          ? status.totalLength
          : status.completedLength,
      errorMessage
    }

    this.downloads.set(id, finished)
    await this.saveDownloadRow(id, finished)

    if (outcome === STATUS_TYPE.COMPLETE) {
      console.log(`[yt-dlp] download finished: ${finished.filePath ?? finished.dir}`)
    } else {
      console.error(`[yt-dlp] download ${id} ended with ${outcome}${errorMessage ? `: ${errorMessage}` : ""}`)
    }

    // so the main window picks the new row up with its existing refresh flow
    mainWindow?.webContents.send(GET_DATA_CHANNELS.DATA_CHANGE, finished)
  }

  // yt-dlp downloads are stored in the same downloads table the aria2 rows use,
  // which keeps the download list, the folders and the finished view unchanged
  private saveDownloadRow = async (id: string, status: TYtDlpDownloadStatus, url?: string) => {
    try {
      const repository = DataSourceRepo.getRepository(Download)

      const files: Tfile[] = status.filePath
        ? [
            {
              index: "1",
              path: status.filePath,
              length: status.totalLength || "0",
              completedLength: status.completedLength || "0",
              selected: "true",
              uris: [{ uri: url ?? "", status: "used" }]
            }
          ]
        : []

      const row: Partial<Download> = {
        gid: id,
        dir: status.dir,
        totalLength: status.totalLength,
        completedLength: status.completedLength,
        downloadSpeed: status.downloadSpeed,
        uploadLength: "0",
        connections: "0",
        numPieces: "1",
        pieceLength: "1048576",
        bitfield: "",
        errorCode: status.status === STATUS_TYPE.ERROR ? "1" : "0",
        errorMessage: status.errorMessage ?? "",
        status: status.status,
        files,
        schedulerQueue: false,
        optionOverrides: {}
      }

      await repository.delete({ gid: id })
      await repository.insert(row)
    } catch (error) {
      console.error("[yt-dlp] Could not save the download record:", error)
    }
  }

  private finalizeInstall = async (gid: string): Promise<"installed" | "failed"> => {
    await this.ensureExecutablePermission()

    const version = await this.readVersion()
    if (!version) {
      this.installError = "The downloaded yt-dlp file could not be started, please download it again"
      await this.clearAria2Result(gid)
      return "failed"
    }

    electronStore.set("ytDlp", { version })
    this.installError = undefined
    await this.clearAria2Result(gid)

    return "installed"
  }

  // the browser extension sends its youtube cookies as a header, yt-dlp only
  // accepts them as a netscape cookie file, so it is written once and reused
  private resolveCookieFile = async (options?: TOptionsConfig | null): Promise<string | undefined> => {
    // a cookie file the user picked in the options tab is never overwritten
    if (options?.cookie) return undefined

    const cookieHeader = pickCookieHeaderFromOptions(options)
    if (!cookieHeader) return undefined

    // the header does not change while one link is being set up, so the file is
    // written once and reused for the metadata, the download and the subtitles
    if (this.cookieFilePath && this.cookieFileHeader === cookieHeader) return this.cookieFilePath

    const directory = await this.ytDlpCreatePath()
    const filePath = path.join(directory, "cookies.txt")

    await writeFile(filePath, buildNetscapeCookieFile(parseCookieHeader(cookieHeader), "https://www.youtube.com/"), {
      encoding: "utf8"
    })

    this.cookieFilePath = filePath
    this.cookieFileHeader = cookieHeader
    return filePath
  }

  private ensureExecutablePermission = async () => {
    if (checkSystemPlatform() === "win") return

    try {
      await chmod(this.getExecutablePath(), 0o755)
    } catch (error) {
      console.error("[yt-dlp] Could not make the downloaded file executable:", error)
    }
  }

  private readVersion = (): Promise<string | undefined> =>
    new Promise((resolve) => {
      execFile(this.getExecutablePath(), ["--version"], (error, stdout) => {
        if (error) {
          console.error("[yt-dlp] The downloaded file could not be executed:", error.message)
          resolve(undefined)
          return
        }

        resolve(stdout.trim().split("\n")[0] || undefined)
      })
    })

  private clearAria2Result = async (gid: string) => {
    try {
      await aria2.sendAria2cRequest("removeDownloadResult", [gid])
    } catch (error) {
      console.error("[yt-dlp] Could not clear the aria2 result:", error)
    }
  }

  private runYtDlp = (args: string[]): Promise<string> =>
    new Promise((resolve, reject) => {
      execFile(this.getExecutablePath(), args, { maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error("[yt-dlp] command failed:", error.message, "\n", stderr)
          const detail = stderr || error.message
          const userError = toYtDlpUserError(detail)

          // the bot check is the one error the user can fix from the popup
          reject(new Error(isCookieAuthError(detail) ? `${userError} — ${cookieAuthHint()}` : userError))
          return
        }

        resolve(stdout)
      })
    })

  private pruneDownloads = () => {
    const maxEntries = 20
    if (this.downloads.size <= maxEntries) return

    const finished = [...this.downloads.entries()].filter(([, status]) => status.status !== STATUS_TYPE.ACTIVE)
    finished.slice(0, this.downloads.size - maxEntries).forEach(([id]) => this.downloads.delete(id))
  }
}
