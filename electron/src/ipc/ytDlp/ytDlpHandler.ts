import { ipcMain } from "electron"
import { ytDlp } from "../../main"
import { TOptionsConfig, TProxyConfig } from "../../types"
import {
  TYtDlpDownloadRequest,
  TYtDlpDownloadResponse,
  TYtDlpMediaInfoResponse,
  TYtDlpStatus,
  TYtDlpUpdateStatus
} from "../../yt-dlp/type"
import { YT_DLP_CHANNELS } from "../channels"

import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong while talking to yt-dlp"

const emptyStatus = (error: string): TYtDlpStatus => ({
  state: "failed",
  executablePath: "",
  percent: 0,
  speed: "0",
  error,
  ffmpegAvailable: false
})

const emptyUpdateStatus = (error: string): TYtDlpUpdateStatus => ({
  state: "update-failed",
  installed: false,
  executablePath: "",
  percent: 0,
  speed: "0",
  error
})

export const ipcYtDlpHandler = () => {
  // the installer download is finalized from main so it also finishes when the
  // popup is closed while yt-dlp is being downloaded
  ytDlp.setupAria2Listeners()

  ipcMain.handle(YT_DLP_CHANNELS.GET_STATUS, async () => {
    try {
      return await ytDlp.getStatus()
    } catch (error) {
      console.error("[yt-dlp] Failed to read the installation status:", error)
      return emptyStatus("Could not check the yt-dlp installation")
    }
  })

  ipcMain.handle(YT_DLP_CHANNELS.GET_UPDATE_STATUS, async (): Promise<TYtDlpUpdateStatus> => {
    try {
      return await ytDlp.getUpdateStatus()
    } catch (error) {
      console.error("[yt-dlp] Failed to read the update status:", error)
      return emptyUpdateStatus("Could not check the yt-dlp update status")
    }
  })

  ipcMain.handle(YT_DLP_CHANNELS.CHECK_UPDATE, async (): Promise<TYtDlpUpdateStatus> => {
    try {
      return await ytDlp.checkUpdate()
    } catch (error) {
      console.error("[yt-dlp] Failed to check for a yt-dlp update:", error)
      return emptyUpdateStatus(toErrorMessage(error))
    }
  })

  ipcMain.handle(YT_DLP_CHANNELS.START_UPDATE, async (): Promise<TYtDlpUpdateStatus> => {
    try {
      return await ytDlp.startUpdate()
    } catch (error) {
      console.error("[yt-dlp] Failed to start the yt-dlp update:", error)
      return emptyUpdateStatus(toErrorMessage(error))
    }
  })

  ipcMain.handle(YT_DLP_CHANNELS.CLEAR_UPDATE_RESULT, () => {
    ytDlp.clearUpdateResult()
  })

  ipcMain.handle(YT_DLP_CHANNELS.DOWNLOAD, async () => {
    try {
      await ytDlp.downloadLastVersion()
      return await ytDlp.getStatus()
    } catch (error) {
      console.error("[yt-dlp] Failed to start the yt-dlp download:", error)
      return emptyStatus(toErrorMessage(error))
    }
  })

  ipcMain.handle(
    YT_DLP_CHANNELS.GET_MEDIA_INFO,
    async (
      _event: IpcMainInvokeEvent,
      url: string,
      options?: TOptionsConfig | null,
      proxyConfig?: TProxyConfig | null
    ): Promise<TYtDlpMediaInfoResponse> => {
      try {
        const mediaInfo = await ytDlp.getMediaInfo(url, options, proxyConfig)
        return { mediaInfo, error: "" }
      } catch (error) {
        console.error("[yt-dlp] Failed to read the media information:", error)
        return { mediaInfo: null, error: toErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(
    YT_DLP_CHANNELS.START_DOWNLOAD,
    async (
      _event: IpcMainInvokeEvent,
      request: TYtDlpDownloadRequest,
      options?: TOptionsConfig | null,
      proxyConfig?: TProxyConfig | null
    ): Promise<TYtDlpDownloadResponse> => {
      try {
        const download = await ytDlp.startDownload(request, options, proxyConfig)
        return { download, error: "" }
      } catch (error) {
        console.error("[yt-dlp] Failed to start the media download:", error)
        return { download: null, error: toErrorMessage(error) }
      }
    }
  )

  ipcMain.handle(YT_DLP_CHANNELS.GET_DOWNLOAD_STATUS, (_event: IpcMainInvokeEvent, id: string) => {
    return ytDlp.getDownloadStatus(id)
  })

  ipcMain.handle(YT_DLP_CHANNELS.CANCEL_DOWNLOAD, (_event: IpcMainInvokeEvent, id: string) => {
    return ytDlp.cancelDownload(id)
  })
}
