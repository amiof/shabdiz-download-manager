import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron"
import {
  resMetadataUrls,
  STATUS_TYPE,
  TAria2Config,
  TNotificationDetailes,
  TOptionsConfig,
  TProxyConfig,
  TtellRes,
  TTorrentConfig
} from "../types"

interface Aria2cResponse {
  jsonrpc: "2.0"
  id: string
  result?: any
  error?: {
    code: number
    message: string
  }
}

interface ElectronAPI {
  addDownloadDir: (
    url: string,
    dir?: string,
    outFileName?: string,
    proxyConfig?: TProxyConfig | null,
    options?: TOptionsConfig | null
  ) => void
  onAria2cResponse: (callback: (event: IpcRendererEvent, response: Aria2cResponse) => void) => void
  removeAria2cListener: (callback: (event: IpcRendererEvent, response: Aria2cResponse) => void) => void
  getTellStatus: (gid: string) => Promise<unknown>
  getGlobalStates: () => Promise<unknown>
  addDownloadPopup: (id: string, windowTitle?: string) => void
  addLinkPopup: (id: string,url?:string) => void
  openSharePopup: (id: string) => Promise<unknown>
  setSelectedRowsForShare: (rows: unknown[]) => void
  getSelectedRowsForShare: () => Promise<unknown[]>
  closePopupWindow: (id: string) => void
  tellActive: () => Promise<unknown>
  tellStopped: () => Promise<unknown>
  tellWaiting: () => Promise<unknown>
  setActiveDownloadData: (id: string) => void
  getActiveDownloadData: () => Promise<unknown>
  onDataChange: (callback: (event: IpcRendererEvent, response: Aria2cResponse) => void) => void
  getDownloadedFilesDetails: () => Promise<unknown>
  addLinkToDB: (downloadRow: TtellRes) => Promise<unknown>
  updateDownloadRowStatus: (gid: string, downloadRow: TtellRes) => Promise<unknown>
  getCompletedRowFromDB: () => Promise<unknown>
  stopDownloadByGid: (gid: string) => Promise<unknown>
  unPauseAll: () => Promise<unknown>
  unPauseByGid: (gid: string) => void
  stopAllDownloads: () => void
  removeDownloadByGid: (gid: string) => void
  removeSelectedDownloads: (gidList: string[]) => void
  openFolder: (path: string) => void
  openOptionsPopup: (id: string) => Promise<unknown>
  openSchedulerPopup: (id: string) => Promise<unknown>
  setProxyConfig: (config: TProxyConfig) => Promise<unknown>
  getProxyConfig: () => Promise<unknown>
  setAria2Config: (config: TAria2Config) => Promise<unknown>
  getAria2Config: () => Promise<unknown>
  selectStorageDirectory: () => Promise<unknown>
  getSelectedStorageDirectory: () => Promise<string>
  setSelectedStorageDirectory: (basePath: string) => Promise<void>
  selectCookieFile: (fileType?: "cookie" | "torrent") => Promise<string | null>
  showNotification: (notif: TNotificationDetailes) => Promise<void>
  getTorrentConfig: () => Promise<TTorrentConfig>
  setTorrentConfig: (config: TTorrentConfig) => Promise<unknown>
  getMetadataUrls: (url: string,customHeader?:string) => Promise<unknown>
  getMagnetMetadataUrls: (magnetUrl: string) => Promise<resMetadataUrls>
  getTorrentMetadataUrls: (torrentUrl: string) => Promise<resMetadataUrls>
  getTorrentMetadataFile: (torrentUrl: string) => Promise<resMetadataUrls>
  addTorrentUrl: (selectedFile: string, filePath: string) => Promise<string>
  showContextMenu: (id: string) => Promise<unknown>
  onContextMenuAction: (callback: (action: string | { action: string; [key: string]: any }) => void) => Promise<any>
  readClipboard: () => Promise<string>
  addSchedulerTime: (
    startTime: string | undefined,
    endTime: string | undefined,
    keepAlive: boolean,
    powerOff: boolean
  ) => Promise<unknown>
  getSchedulerDownloadRows: () => Promise<unknown>
  addDownloadRowsToSchedulerQueue: (downloadRows: TtellRes[]) => Promise<unknown>
  removeRowsFromSchedulerQueue: (downloadRows: TtellRes[]) => Promise<unknown>
  getSchedulerConfig: () => Promise<{
    startTime: string | undefined
    endTime: string | undefined
    keepAlive: boolean
    powerOff: boolean
  }>
  onSchedulerConfigUpdated: (
    callback: (config: {
      startTime: string | undefined
      endTime: string | undefined
      keepAlive: boolean
      powerOff: boolean
    }) => void
  ) => () => void
  // Edit download options
  openEditDownloadPopup: (id: string) => void
  setSelectedDownloadForEdit: (download: unknown) => void
  getSelectedDownloadForEdit: () => Promise<unknown>
  getDownloadOptions: (gid: string) => Promise<Record<string, string> | null>
  getDownloadInfo: (gid: string) => Promise<unknown>
  saveDownloadOptions: (gid: string, options: Record<string, string>) => Promise<boolean>
  resetDownloadOption: (gid: string, optionKey: string) => Promise<boolean>
  getDownloadOptionOverrides: (gid: string) => Promise<Record<string, string>>
  changeDownloadUrl: (oldGid: string, newUrl: string) => Promise<{ newGid: string } | null>
  windowMinimize: (id?: string) => void
  windowMaximize: (id?: string) => void
  windowClose: (id?: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

contextBridge.exposeInMainWorld("electronAPI", {
  addDownloadDir: async (
    url: string,
    dir?: string,
    outFileName?: string,
    proxyConfig?: TProxyConfig | null,
    options?: TOptionsConfig | null
  ) => await ipcRenderer.invoke("add-download-dir", url, dir, outFileName, proxyConfig, options),
  getDownloads: () => ipcRenderer.invoke("get-downloads"),
  addLinkPopup: (id: string,url?:string) => ipcRenderer.send("add-link-popup", id,url),
  closePopupWindow: (id: string) => ipcRenderer.send("close-popup", id),
  getTellStatus: (gid: string) => ipcRenderer.invoke("get-tell-status", gid),
  addDownloadPopup: (id: string, windowTitle?: string) => ipcRenderer.invoke("popup-start-download", id, windowTitle),
  getGlobalStates: () => ipcRenderer.invoke("get-global-state"),
  tellActive: () => ipcRenderer.invoke("tell-active"),
  tellStopped: () => ipcRenderer.invoke("tell-stoped"),
  tellWaiting: () => ipcRenderer.invoke("tell-waiting"),

  //popup
  openOptionsPopup: (id: string) => ipcRenderer.send("open-options-popup", id),

  //popup open scheduler
  openSchedulerPopup: (id: string) => ipcRenderer.send("open-scheduler-popup", id),

  //popup open share
  openSharePopup: (id: string) => ipcRenderer.send("open-share-popup", id),
  //share - selected rows
  setSelectedRowsForShare: (rows: unknown[]) => ipcRenderer.send("set-selected-rows-for-share", rows),
  getSelectedRowsForShare: () => ipcRenderer.invoke("get-selected-rows-for-share"),

  // update main window in start download
  setActiveDownloadData: (data: unknown) => ipcRenderer.send("set-download-data-active", data),
  getActiveDownloadData: () => ipcRenderer.invoke("get-download-data-active"),
  onDataChange: (callback: (data: string) => void) => {
    ipcRenderer.on("data-change", (_event, data) => callback(data))
  },
  getDownloadedFilesDetails: () => ipcRenderer.invoke("get-downloaded-files-details"),

  // use DataBase
  addLinkToDB: (downloadRow: TtellRes) => ipcRenderer.invoke("add-link-to-db", downloadRow),
  updateDownloadRowStatus: (gid: string, downloadRow: STATUS_TYPE) =>
    ipcRenderer.invoke("update-downloadRow-status", gid, downloadRow),
  getCompletedRowFromDB: () => ipcRenderer.invoke("get-completed-row-from-db"),

  //action handler
  stopDownloadByGid: (gid: string) => ipcRenderer.send("stop-download-by-gid", gid),
  unPauseAll: () => ipcRenderer.invoke("unpause-all"),
  unPauseByGid: (gid: string) => ipcRenderer.send("unpause-By-gid", gid),
  stopAllDownloads: () => ipcRenderer.send("stop-allDownloads"),
  removeDownloadByGid: (gid: string) => ipcRenderer.send("remove-download-by-gid", gid),
  removeSelectedDownloads: (gidList: string[]) => ipcRenderer.send("remove-selected-downloads", gidList),
  openFolder: (path: string) => ipcRenderer.send("open-folder", path),

  //config
  setProxyConfig: (config: TProxyConfig) => ipcRenderer.invoke("set-proxy-config", config),
  getProxyConfig: () => ipcRenderer.invoke("get-proxy-config"),
  setAria2Config: (config: TAria2Config) => ipcRenderer.invoke("set-aria2-config", config),
  getAria2Config: () => ipcRenderer.invoke("get-aria2-config"),
  selectStorageDirectory: () => ipcRenderer.invoke("select-storage-dir"),
  getSelectedStorageDirectory: () => ipcRenderer.invoke("get-selected=storage-config-dir"),
  setSelectedStorageDirectory: (basePath: string) => ipcRenderer.invoke("set-selected-storage-directory", basePath),
  selectCookieFile: (fileType: "cookie" | "torrent" = "cookie") => ipcRenderer.invoke("select-cookie-file", fileType),
  getTorrentConfig: () => ipcRenderer.invoke("get-torrents-config"),
  setTorrentConfig: (config: TTorrentConfig) => ipcRenderer.invoke("set-torrents-config", config),

  //utils
  showNotification: (notifDetailes: TNotificationDetailes) => ipcRenderer.invoke("show-notification", notifDetailes),
  getMetadataUrls: (url: string,customHeader?:string) => ipcRenderer.invoke("get-metadata-urls", url,customHeader),
  getMagnetMetadataUrls: (magnetUrl: string) => ipcRenderer.invoke("get-magnet-metadata-urls", magnetUrl),
  getTorrentMetadataUrls: (torrentUrl: string) => ipcRenderer.invoke("get-torrent-metadata-urls", torrentUrl),
  getTorrentMetadataFile: (torrentPath: string) => ipcRenderer.invoke("get-torrent-metadata-file", torrentPath),
  addTorrentUrl: (selectedFile: string, filePath: string) => ipcRenderer.invoke("add-torrent-url", selectedFile, filePath),

  showContextMenu: (id: string) => ipcRenderer.invoke("show-context-menu", id),
  onContextMenuAction: (callback: (action: string | { action: string; [key: string]: any }) => void) => {
    ipcRenderer.on("context-menu-action", (_event, payload) => callback(payload))
  },
  readClipboard: () => ipcRenderer.invoke("read-clipboard"),

  //scheduler
  addSchedulerTime: (
    startTime: string | undefined,
    endTime: string | undefined,
    keepAlive: boolean,
    powerOff: boolean
  ) => ipcRenderer.invoke("add-scheduler-time", startTime, endTime, keepAlive, powerOff),

  getSchedulerDownloadRows: () => ipcRenderer.invoke("get-scheduler-download-rows"),

  addDownloadRowsToSchedulerQueue: (downloadRows: TtellRes[]) =>
    ipcRenderer.send("add-rows-to-scheduler-queue", downloadRows),

  removeRowsFromSchedulerQueue: (downloadRows: TtellRes[]) =>
    ipcRenderer.invoke("remove-rows-from-scheduler-queue", downloadRows),

  getSchedulerConfig: () => ipcRenderer.invoke("get-scheduler-config"),
  onSchedulerConfigUpdated: (
    callback: (config: {
      startTime: string | undefined
      endTime: string | undefined
      keepAlive: boolean
      powerOff: boolean
    }) => void
  ) => {
    const listener = (
      _event: IpcRendererEvent,
      config: {
        startTime: string | undefined
        endTime: string | undefined
        keepAlive: boolean
        powerOff: boolean
      }
    ) => callback(config)
    ipcRenderer.on("scheduler-config-updated", listener)
    return () => ipcRenderer.removeListener("scheduler-config-updated", listener)
  },

  // Edit download options
  openEditDownloadPopup: (id: string) => ipcRenderer.send("open-edit-download-popup", id),
  setSelectedDownloadForEdit: (download: unknown) => ipcRenderer.send("set-selected-download-for-edit", download),
  getSelectedDownloadForEdit: () => ipcRenderer.invoke("get-selected-download-for-edit"),
  getDownloadOptions: (gid: string) => ipcRenderer.invoke("get-download-options", gid),
  getDownloadInfo: (gid: string) => ipcRenderer.invoke("get-download-info", gid),
  saveDownloadOptions: (gid: string, options: Record<string, string>) =>
    ipcRenderer.invoke("save-option-overrides", gid, options),
  resetDownloadOption: (gid: string, optionKey: string) => ipcRenderer.invoke("reset-download-option", gid, optionKey),
  getDownloadOptionOverrides: (gid: string) => ipcRenderer.invoke("get-option-overrides", gid),
  changeDownloadUrl: (oldGid: string, newUrl: string) => ipcRenderer.invoke("change-download-url", oldGid, newUrl),

  // Window controls
  windowMinimize: (id?: string) => ipcRenderer.send("window-minimize", id),
  windowMaximize: (id?: string) => ipcRenderer.send("window-maximize", id),
  windowClose: (id?: string) => ipcRenderer.send("window-close", id)
})
