import { ChildProcess, execFile, spawn } from "child_process"
import { app } from "electron"
import { constants } from "fs"
import { access, chmod, mkdir, rename, rm, stat, writeFile } from "fs/promises"
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
  GithubReleaseAsset,
  TYtDlpDownloadRequest,
  TYtDlpDownloadStatus,
  TYtDlpMediaInfo,
  TYtDlpRawMediaInfo,
  TYtDlpStatus,
  TYtDlpUpdateStatus,
  ytDlpInfoData
} from "./type"
import {
  buildNetscapeCookieFile,
  cookieAuthHint,
  isCookieAuthError,
  parseCookieHeader,
  pickCookieHeaderFromOptions
} from "./yt-dlp-cookie-file"
import { buildYtDlpDownloadArgs } from "./yt-dlp-download-args"
import {
  getYtDlpJobTotalSize,
  parseYtDlpFilePath,
  parseYtDlpProgressLine,
  YtDlpProgressTracker
} from "./yt-dlp-progress"
import { compareYtDlpVersions, isSameYtDlpRelease, isYtDlpVersionComparable } from "./yt-dlp-version"
import {
  buildSubtitleArgs,
  buildYtDlpAuthArgs,
  checkSystemPlatform,
  getYtDlpAssetName,
  getYtDlpReleaseUrl,
  pickMediaInfo,
  resolveMergeContainer,
  toYtDlpUserError
} from "./ytp-dl-utils"

// a day, the update tab must not ask github every time it is opened
const RELEASE_CACHE_TTL = 24 * 60 * 60 * 1000
// temp files of an update that never finished are only trusted for a day
const UPDATE_TEMP_TTL = 24 * 60 * 60 * 1000

export default class YtDlp {
  lastInfo: ytDlpInfoData | undefined = undefined

  private installGid: string | undefined = undefined
  private installError: string | undefined = undefined
  // the update install downloads into a temp file first, so its gid and its
  // error are tracked apart from the fresh installation of a missing binary
  private updateGid: string | undefined = undefined
  private updateError: string | undefined = undefined
  private updateTarget: string | undefined = undefined
  private updateTag: string | undefined = undefined
  private updateStartedAt = 0
  // the swap finished, so the user is shown the result instead of another update
  private updateCompleted = false
  private lastUpdateCheckError: string | undefined = undefined
  private listenersInitialized = false
  private ffmpegAvailable: boolean | undefined = undefined
  // running media downloads, keyed by the id that was handed to the renderer
  private processes = new Map<string, ChildProcess>()
  private downloads = new Map<string, TYtDlpDownloadStatus>()
  // a video+audio selection is downloaded as two files, the tracker adds the
  // bytes of both into the single progress the popup displays
  private progressTrackers = new Map<string, YtDlpProgressTracker>()
  // the last parsed metadata, so a download request does not have to carry the
  // whole yt-dlp format list back to the main process
  private lastMediaInfo: { url: string; info: TYtDlpMediaInfo } | undefined = undefined
  // the netscape cookie file written from the browser extension cookie header
  private cookieFilePath: string | undefined = undefined
  // the cookie header the file was written from, a later link sends new cookies
  private cookieFileHeader: string | undefined = undefined

  // the binary keeps its release tag and the app never gets a stable tag back
  // when the user runs a nightly build, so the metadata is cached on disk for a
  // day and only refreshed when an update is actually offered
  async getLastInfo(force = false): Promise<ytDlpInfoData | undefined> {
    const cached = electronStore.get("ytDlp")?.release

    if (!force && this.lastInfo) return this.lastInfo
    if (!force && cached && cached.tag_name && Date.now() - (cached.checkedAt ?? 0) < RELEASE_CACHE_TTL) {
      this.lastInfo = cached
      return cached
    }

    // a failed check keeps the last known release instead of losing it
    const info = await this.fetchLastInfo()
    if (!info) return this.lastInfo ?? cached

    this.lastUpdateCheckError = undefined
    // checkedAt keeps the cached copy fresh, otherwise a manual check would be
    // thrown away on the next open and github would be asked again
    const stamped = { ...info, checkedAt: Date.now() }
    this.lastInfo = stamped
    electronStore.set("ytDlp", { version: electronStore.get("ytDlp")?.version ?? "", release: stamped })

    return stamped
  }

  private async fetchLastInfo(): Promise<ytDlpInfoData | undefined> {
    try {
      const response = await fetch("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
        headers: { Accept: "application/vnd.github+json" }
      })

      if (!response.ok) {
        throw new Error(`GitHub answered with ${response.status}`)
      }

      const release: GithubRelease = await response.json()
      const assetName = getYtDlpAssetName()

      return {
        tag_name: release.tag_name,
        html_url: release.html_url,
        linux_asset: release.assets.find((asset) => asset.name === "yt-dlp_linux"),
        winAsset: release.assets.find((asset) => asset.name === "yt-dlp.exe"),
        macAsset: release.assets.find((asset) => asset.name === "yt-dlp_macos"),
        asset: release.assets.find((asset) => asset.name === assetName)
      }
    } catch (error) {
      // the executable can still be installed from the fixed release link
      const message = error instanceof Error ? error.message : String(error)
      console.error("[yt-dlp] Could not read the latest release from GitHub:", error)
      this.lastUpdateCheckError = `Could not read the latest yt-dlp release from GitHub (${message})`
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
    } catch {
      return { installed: false, path: executablePath }
    }

    const stored = electronStore.get("ytDlp")?.version
    if (stored) return { installed: true, path: executablePath, version: stored }

    // a binary that is there but was never stored (an install of an older app
    // version, a cleared config) is read once and remembered, so the tab shows
    // its version instead of "unknown"
    const version = await this.readVersion()
    if (version) electronStore.set("ytDlp", { version, release: electronStore.get("ytDlp")?.release })

    return { installed: true, path: executablePath, version }
  }

  hasFfmpeg = async (): Promise<boolean> => {
    if (this.ffmpegAvailable !== undefined) return this.ffmpegAvailable

    this.ffmpegAvailable = await new Promise<boolean>((resolve) => {
      execFile("ffmpeg", ["-version"], (error) => resolve(!error))
    })

    return this.ffmpegAvailable
  }

  // the asset of the latest release when the check could not read it (github
  // down, rate limited). The user asked for an install, so it is attempted
  private async resolveLatestAsset(): Promise<{ tag?: string; asset?: GithubReleaseAsset }> {
    const info = await this.getLastInfo()
    return { tag: info?.tag_name, asset: info?.asset }
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
    const { asset } = await this.resolveLatestAsset()
    // a cached asset survives a failed release check, it can be a release behind,
    // and the fixed link always serves the newest build
    const url =
      asset?.browser_download_url && !this.lastUpdateCheckError
        ? asset.browser_download_url
        : getYtDlpReleaseUrl(assetName)
    const directory = await this.ytDlpCreatePath()

    await this.clearUpdateTempFiles()
    this.installError = undefined

    const gid = (await aria2.sendAria2cRequest("addUri", [
      [url],
      {
        dir: directory,
        out: assetName,
        // aresume is not safe here: an aborted attempt leaves a file of the
        // right size that aria2 then reports as complete, and the broken file
        // is what the user keeps. Always fetching it again replaces it.
        continue: false,
        // a retry has to replace a file that was left behind by a failed attempt
        "allow-overwrite": "true"
      }
    ])) as string | undefined

    if (!gid) throw new Error("The yt-dlp download could not be started")

    this.installGid = gid
    console.log(`[yt-dlp] downloading ${assetName} into ${directory} (gid ${gid})`)

    return gid
  }

  // how the update tab sees the executable: an installed version is only called
  // outdated when it could be compared against a latest release that was really
  // read, a failed check stays "check-failed" and never offers an update
  async getUpdateStatus(): Promise<TYtDlpUpdateStatus> {
    const installed = await this.isInstalled()
    const executablePath = this.getExecutablePath()

    if (this.updateGid) {
      const tell = (await aria2.sendAria2cRequest("tellStatus", [this.updateGid])) as TtellRes | undefined

      if (tell?.gid && tell.status !== STATUS_TYPE.COMPLETE && tell.status !== STATUS_TYPE.ERROR) {
        const totalLength = Number(tell.totalLength)
        const completedLength = Number(tell.completedLength)

        return {
          state: "downloading",
          installed: installed.installed,
          installedVersion: installed.version,
          latestVersion: this.updateTag,
          executablePath,
          percent: totalLength > 0 ? Math.min(100, Math.round((completedLength / totalLength) * 100)) : 0,
          speed: tell.downloadSpeed
        }
      }

      // the download finished, the swap that follows is short but not instant
      if (tell?.gid && !this.updateError) {
        return {
          state: "installing",
          installed: installed.installed,
          installedVersion: installed.version,
          latestVersion: this.updateTag,
          executablePath,
          percent: 100,
          speed: "0"
        }
      }

      // aria2 lost the job (the app was restarted) or it failed
      if (!this.updateError) {
        this.updateError = "The yt-dlp update download did not finish, try again"
      }
      this.updateGid = undefined
    }

    if (this.updateError) {
      return {
        state: this.updateStartedAt ? "update-failed" : "check-failed",
        installed: installed.installed,
        installedVersion: installed.version,
        latestVersion: this.updateTag,
        executablePath,
        percent: 0,
        speed: "0",
        error: this.updateError
      }
    }

    if (!installed.installed) {
      return {
        state: "not-installed",
        installed: false,
        executablePath,
        percent: 0,
        speed: "0",
        latestVersion: this.lastInfo?.tag_name
      }
    }

    const info = await this.getLastInfo()
    const latestVersion = info?.tag_name
    const installedVersion = installed.version

    // without a release tag there is nothing to compare against. That is not an
    // update, it is a check that could not be completed
    if (!latestVersion || !isYtDlpVersionComparable(latestVersion)) {
      return {
        state: "check-failed",
        installed: true,
        installedVersion,
        executablePath,
        percent: 0,
        speed: "0",
        error: this.lastUpdateCheckError ?? "The latest yt-dlp version could not be read"
      }
    }

    if (!installedVersion || !isYtDlpVersionComparable(installedVersion)) {
      return {
        state: "unknown-version",
        installed: true,
        latestVersion,
        executablePath,
        percent: 0,
        speed: "0",
        error: "The installed yt-dlp version could not be read, installing the latest release will repair it"
      }
    }

    // the finished update is reported before the comparison, the replaced
    // binary is already the latest release and would only read as "up to date"
    if (this.updateCompleted) {
      return {
        state: "updated",
        installed: true,
        installedVersion,
        latestVersion,
        executablePath,
        percent: 100,
        speed: "0"
      }
    }

    const comparison = compareYtDlpVersions(installedVersion, latestVersion)

    // a newer binary than the published release is never called outdated, and a
    // downgrade is never offered for it
    if (comparison >= 0) {
      return {
        state: "up-to-date",
        installed: true,
        installedVersion,
        latestVersion,
        executablePath,
        percent: 0,
        speed: "0"
      }
    }

    if (!info?.asset) {
      return {
        state: "check-failed",
        installed: true,
        installedVersion,
        latestVersion,
        executablePath,
        percent: 0,
        speed: "0",
        error: `The ${getYtDlpAssetName()} file is missing from the ${latestVersion} release`
      }
    }

    return {
      state: "update-available",
      installed: true,
      installedVersion,
      latestVersion,
      executablePath,
      percent: 0,
      speed: "0"
    }
  }

  // the download of an update lands next to the executable, so the final
  // replacement is a rename inside the same folder and never a cross device move
  async startUpdate(): Promise<TYtDlpUpdateStatus> {
    if (this.updateGid) {
      console.log("[yt-dlp] an update is already running")
      return this.getUpdateStatus()
    }

    await this.clearUpdateTempFiles()
    this.updateError = undefined
    this.updateCompleted = false

    const status = await this.getUpdateStatus()
    if (status.state !== "update-available" && status.state !== "unknown-version") return status

    const assetName = getYtDlpAssetName()
    const info = await this.getLastInfo()
    const url = info?.asset?.browser_download_url

    if (!url) {
      this.updateError = "The yt-dlp update file could not be resolved, check for updates again"
      return this.getUpdateStatus()
    }

    const directory = await this.ytDlpCreatePath()
    const target = path.join(directory, `${assetName}.update`)

    this.updateTarget = target
    this.updateTag = info?.tag_name
    this.updateStartedAt = Date.now()

    const gid = (await aria2.sendAria2cRequest("addUri", [
      [url],
      // always a fresh download, a finished update file must not be resumed
      { dir: directory, out: path.basename(target), continue: false, "allow-overwrite": "true" }
    ])) as string | undefined

    if (!gid) {
      this.updateError = "The yt-dlp update download could not be started"
      return this.getUpdateStatus()
    }

    this.updateGid = gid
    console.log(`[yt-dlp] downloading ${assetName} ${info?.tag_name} for an update (gid ${gid})`)

    return this.getUpdateStatus()
  }

  // the manual "check for updates" button, it always asks github again
  async checkUpdate(): Promise<TYtDlpUpdateStatus> {
    if (this.updateGid) return this.getUpdateStatus()

    this.updateError = undefined
    this.updateCompleted = false
    await this.getLastInfo(true)

    return this.getUpdateStatus()
  }

  // lets the tab drop the "updated" result once the user looked at it
  clearUpdateResult = () => {
    this.updateCompleted = false
    this.updateError = undefined
  }

  // temp download files belong to an update, the media downloads and the
  // cookies.txt of the youtube tab are never touched
  private clearUpdateTempFiles = async (): Promise<number> => {
    const force = !this.updateGid

    if (!force && Date.now() - this.updateStartedAt < UPDATE_TEMP_TTL) return 0

    let removed = 0

    try {
      const directory = await this.ytDlpCreatePath()
      const assetName = getYtDlpAssetName()

      for (const filePath of [
        path.join(directory, `${assetName}.update`),
        path.join(directory, `${assetName}.update.aria2`)
      ]) {
        try {
          const fileStat = await stat(filePath)
          // a temp file of a running update is kept, only stale leftovers go
          if (!force && Date.now() - fileStat.mtimeMs < UPDATE_TEMP_TTL) continue

          await rm(filePath, { force: true })
          removed++
        } catch {
          // the file is not there, nothing to clean up
        }
      }
    } catch (error) {
      console.error("[yt-dlp] Could not clean up the update temp files:", error)
    }

    return removed
  }

  // the downloaded file is validated before the working executable is touched,
  // and the previous one is only dropped once the new one really runs
  private applyUpdate = async (tempPath: string): Promise<"installed" | "failed"> => {
    const executablePath = this.getExecutablePath()
    const backupPath = `${executablePath}.old`
    const expected = this.updateTag

    // aria2 writes the file with the umask, so it is not executable yet. The
    // bit is set before the file is started, otherwise the validation below
    // fails with EACCES on every linux and macOS update (win has no such bit)
    if (checkSystemPlatform() !== "win") {
      try {
        await chmod(tempPath, 0o755)
      } catch (error) {
        console.error("[yt-dlp] Could not make the update executable:", error)
        this.updateError = "The downloaded yt-dlp file could not be made executable, the installed version was kept"
        await rm(tempPath, { force: true })
        return "failed"
      }
    }

    const version = await this.readVersionFrom(tempPath)
    if (!version) {
      this.updateError = "The downloaded yt-dlp file could not be started, the installed version was kept"
      await rm(tempPath, { force: true })
      return "failed"
    }

    // a nightlies tag or an asset of another release must not overwrite the binary
    if (expected && !isSameYtDlpRelease(version, expected)) {
      this.updateError = `The downloaded file reports version ${version} instead of ${expected}, the installed version was kept`
      await rm(tempPath, { force: true })
      return "failed"
    }

    // the previous executable is moved aside on every platform, so a new file
    // that stops answering can always be replaced by the one that worked. win
    // also needs the move because it keeps a running executable locked
    const hadExecutable = await access(executablePath).then(
      () => true,
      () => false
    )

    try {
      await rm(backupPath, { force: true })
    } catch (error) {
      console.error("[yt-dlp] Could not drop the previous update backup:", error)
    }

    if (hadExecutable) {
      try {
        await rename(executablePath, backupPath)
      } catch (error) {
        this.updateError = this.toReplaceError(error, executablePath)
        await rm(tempPath, { force: true })
        console.error("[yt-dlp] Could not move the previous yt-dlp executable:", error)
        return "failed"
      }
    }

    try {
      await rename(tempPath, executablePath)
    } catch (error) {
      // the executable is restored before the failure is reported
      await this.restoreExecutable(backupPath, executablePath, hadExecutable)

      this.updateError = this.toReplaceError(error, executablePath)
      await rm(tempPath, { force: true })
      console.error("[yt-dlp] Could not replace the yt-dlp executable:", error)
      return "failed"
    }

    // never reported as an update before the new executable really answers
    const installedVersion = await this.readVersion()
    if (!installedVersion) {
      await this.restoreExecutable(backupPath, executablePath, hadExecutable)
      this.updateError = "The updated yt-dlp could not be started, the previous version was restored"
      return "failed"
    }

    await rm(backupPath, { force: true })
    await this.clearUpdateTempFiles()

    electronStore.set("ytDlp", {
      version: installedVersion,
      release: electronStore.get("ytDlp")?.release
    })
    this.updateError = undefined
    this.updateCompleted = true

    console.log(`[yt-dlp] update finished, the installed version is now ${installedVersion}`)

    return "installed"
  }

  // brings the executable that was moved aside back when the new file cannot
  // replace it on any platform, win included
  private restoreExecutable = async (backupPath: string, executablePath: string, hadExecutable: boolean) => {
    if (!hadExecutable) return

    try {
      await rm(executablePath, { force: true })
      await rename(backupPath, executablePath)
    } catch (error) {
      console.error("[yt-dlp] Could not restore the previous yt-dlp executable:", error)
    }
  }

  private toReplaceError = (error: unknown, executablePath: string): string => {
    const message = error instanceof Error ? error.message : String(error)

    if (checkSystemPlatform() === "win") {
      return `The yt-dlp update could not replace ${executablePath}. Close any running YouTube download and try again (${message})`
    }

    return `The yt-dlp update could not replace ${executablePath} (${message})`
  }

  private finishUpdate = async (gid: string): Promise<"installed" | "failed"> => {
    const tempPath = this.updateTarget
    this.updateGid = undefined

    if (!tempPath) {
      this.updateError = "The yt-dlp update file could not be found, try again"
      await this.clearAria2Result(gid)
      return "failed"
    }

    try {
      const result = await this.applyUpdate(tempPath)
      if (result === "failed") await this.clearUpdateTempFiles()
      return result
    } catch (error) {
      this.updateError = error instanceof Error ? error.message : "The yt-dlp update failed"
      console.error("[yt-dlp] The update failed:", error)
      await this.clearUpdateTempFiles()
      return "failed"
    } finally {
      await this.clearAria2Result(gid)
    }
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
      if (this.updateGid && gid === this.updateGid) {
        const result = await this.finishUpdate(gid)
        console.log(`[yt-dlp] update finished with state: ${result}`)
        return
      }

      if (!this.installGid || gid !== this.installGid) return

      const result = await this.finalizeInstall(gid)
      this.installGid = undefined
      console.log(`[yt-dlp] installation finished with state: ${result}`)
    })

    aria2.on("onDownloadError", async ({ gid }: { gid: string }) => {
      if (this.updateGid && gid === this.updateGid) {
        const tell = (await aria2.sendAria2cRequest("tellStatus", [gid]).catch(() => undefined)) as TtellRes | undefined

        this.updateError = tell?.errorMessage || "The yt-dlp update download failed"
        await this.clearUpdateTempFiles()
        this.updateGid = undefined
        console.error(`[yt-dlp] update download failed for gid ${gid}`)
        return
      }

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

    // the job total is the size of the video file plus the audio file, the
    // progress percentage has to be based on that combined size
    const totalLength = getYtDlpJobTotalSize(videoFormat, audioFormat)

    const id = generateId()
    const status: TYtDlpDownloadStatus = {
      id,
      status: STATUS_TYPE.ACTIVE,
      percent: 0,
      completedLength: "0",
      totalLength: String(totalLength),
      downloadSpeed: "0",
      dir,
      url: request.url,
      title: request.title || mediaInfo.title
    }

    const cookieFilePath = await this.resolveCookieFile(options)
    const authArgs = buildYtDlpAuthArgs(options, proxyConfig, cookieFilePath)
    const args = buildYtDlpDownloadArgs(
      {
        url: request.url,
        // the ids resolved from the fetched media info, not the raw request
        videoFormatId: videoFormat.format_id,
        audioFormatId: audioFormat?.format_id
      },
      { dir, container, authArgs }
    )

    this.downloads.set(id, status)
    this.progressTrackers.set(id, new YtDlpProgressTracker(totalLength))
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
      const tracker = this.progressTrackers.get(id)
      if (!tracker) return

      const aggregate = tracker.update(progress)

      this.downloads.set(id, {
        ...status,
        percent: aggregate.percent,
        completedLength: String(aggregate.completedLength),
        totalLength: String(aggregate.totalLength),
        downloadSpeed: String(aggregate.downloadSpeed),
        eta: aggregate.eta
      })
      return
    }

    const filePath = parseYtDlpFilePath(line)
    if (filePath) {
      this.downloads.set(id, {
        ...status,
        filePath,
        percent: 100,
        completedLength: status.totalLength,
        downloadSpeed: "0"
      })
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
    this.progressTrackers.delete(id)
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
    // aria2 leaves the file without the execute bit, so it is set before the
    // version is read, otherwise the read fails with EACCES
    await this.ensureExecutablePermission()

    // the file has to be in the folder the youtube downloads read it from, a
    // download that landed anywhere else is reported instead of stored
    const executablePath = this.getExecutablePath()
    const present = await access(executablePath).then(
      () => true,
      () => false
    )

    if (!present) {
      this.installError = `The downloaded yt-dlp file is missing from ${executablePath}, please download it again`
      await this.clearAria2Result(gid)
      return "failed"
    }

    const version = await this.readVersion()
    if (!version) {
      this.installError = "The downloaded yt-dlp file could not be started, please download it again"
      await this.clearAria2Result(gid)
      return "failed"
    }

    // the cached release has to survive, electron-store replaces the whole object
    electronStore.set("ytDlp", { version, release: electronStore.get("ytDlp")?.release })
    this.installError = undefined
    await this.clearAria2Result(gid)

    return "installed"
  }

  // the browser extension sends its youtube cookies as a header, yt-dlp only
  // accepts them as a netscape cookie file, so it is written once and reused
  private resolveCookieFile = async (options?: TOptionsConfig | null): Promise<string | undefined> => {
    // a cookie file the user picked in the options tab is never overwritten
    if (options?.cookie) return options.cookie

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

  private readVersion = (): Promise<string | undefined> => this.readVersionFrom(this.getExecutablePath())

  private readVersionFrom = (filePath: string): Promise<string | undefined> =>
    new Promise((resolve) => {
      execFile(filePath, ["--version"], (error, stdout) => {
        if (error) {
          console.error(`[yt-dlp] ${filePath} could not be executed:`, error.message)
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
