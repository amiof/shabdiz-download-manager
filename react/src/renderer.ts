import { TAddLinkOptions } from "@components/addLinkPopup/store/addLinkStoreType.ts"
import { TAria2Config, TNotificationDetailes, TProxyConfig, TTorrentConfig } from "@src/store/storeType.ts"
import {
  resMetadataUrls,
  TDownloads,
  TFileDetails,
  TGetGlobalStateResponse,
  TSchedulerConfig,
  TSchedulerGid,
  TtellRes
} from "@src/types.ts"

export interface IElectronAPI {
  addDownload: (url: string) => void
  addDownloadDir: (
    url: string,
    dir?: string,
    outFileName?: string,
    proxyConfig?: TProxyConfig | null,
    options?: TAddLinkOptions | null
  ) => Promise<string>
  getDownloads: () => Promise<TDownloads[] | []>
  addLinkPopup: (id: string) => void
  closePopupWindow: (id: string) => void
  getDataFilesStatus: () => void
  tellActive: () => Promise<TtellRes[]>
  tellStopped: () => Promise<TtellRes[]>
  tellWaiting: () => Promise<TtellRes[]>
  getGlobalStates: () => Promise<TGetGlobalStateResponse>
  addDownloadPopup: (id: string, windowTitle?: string) => void
  getTellStatus: (gid: string) => Promise<TtellRes>
  setActiveDownloadData: (data: TtellRes) => void
  getActiveDownloadData: () => Promise<TtellRes[]>
  onDataChange: (callback: (response: Promise<TtellRes>) => void) => void
  onContextMenuAction: (
    callback: (
      action:
        | string
        | {
            action: string
            [key: string]: unknown
          }
    ) => void
  ) => Promise<unknown>
  getDownloadedFilesDetails: () => Promise<TFileDetails[]>
  addLinkToDB: (downloadRow: TtellRes) => Promise<unknown>
  updateDownloadRowStatus: (gid: string, downloadRow: TtellRes) => Promise<TtellRes>
  getCompletedRowFromDB: () => Promise<TtellRes[]>
  stopDownloadByGid: (gid: string) => Promise<unknown>
  unPauseAll: () => Promise<unknown>
  unPauseByGid: (gid: string) => void
  stopAllDownloads: () => void
  removeDownloadByGid: (gid: string) => void
  removeSelectedDownloads: (gidList: string[]) => void
  openFolder: (path: string) => void
  openOptionsPopup: (id: string) => Promise<string>
  openSchedulerPopup: (id: string) => Promise<void>
  addSchedulerTime: (
    startTime: string | undefined,
    endTime: string | undefined,
    keepAlive: boolean,
    powerOff: boolean
  ) => Promise<unknown>
  openSharePopup: (id: string) => Promise<void>
  setSelectedRowsForShare: (rows: TDownloads[]) => void
  getSelectedRowsForShare: () => Promise<TDownloads[]>
  setProxyConfig: (config: TProxyConfig) => Promise<unknown>
  getProxyConfig: () => Promise<TProxyConfig>
  setAria2Config: (config: TAria2Config) => Promise<unknown>
  getAria2Config: () => Promise<TAria2Config>
  selectStorageDirectory: () => Promise<unknown>
  getSelectedStorageDirectory: () => Promise<string>
  setSelectedStorageDirectory: (basePath: string | null) => Promise<void>
  selectCookieFile: (fileType?: "cookie" | "torrent") => Promise<string | null>
  showNotification: (notif: TNotificationDetailes) => Promise<void>
  getTorrentConfig: () => Promise<TTorrentConfig>
  setTorrentConfig: (config: TTorrentConfig) => Promise<unknown>
  getMetadataUrls: (url: string,customHeader?:string) => Promise<resMetadataUrls>
  getMagnetMetadataUrls: (magnetUrl: string) => Promise<resMetadataUrls>
  getTorrentMetadataUrls: (torrentUrl: string) => Promise<resMetadataUrls>,
  getTorrentMetadataFile: (torrentPath: string) => Promise<resMetadataUrls>,
  addTorrentUrl: (selectedFile: string, filePath: string) => Promise<string>
  showContextMenu: (selectedItems: [] | TDownloads[]) => Promise<unknown>
  readClipboard: () => Promise<string>
  getSchedulerDownloadRows: () => Promise<TSchedulerGid[]>
  addDownloadRowsToSchedulerQueue: (downloadRows: TtellRes[]) => Promise<unknown>
  getSchedulerConfig: () => Promise<TSchedulerConfig>
  onSchedulerConfigUpdated: (callback: (config: TSchedulerConfig) => void) => () => void
  // Edit download options
  getDownloadOptions: (gid: string) => Promise<Record<string, string>>
  getDownloadInfo: (gid: string) => Promise<unknown>
  getSelectedDownloadForEdit: () => Promise<TDownloads | null>
  saveDownloadOptions: (gid: string, options: Record<string, string>) => Promise<boolean>
  resetDownloadOption: (gid: string, optionKey: string) => Promise<boolean>
  getDownloadOptionOverrides: (gid: string) => Promise<Record<string, string>>
  changeDownloadUrl: (oldGid: string, newUrl: string) => Promise<{ newGid: string } | null>
  openEditDownloadPopup: (id: string) => void
  setSelectedDownloadForEdit: (row: TDownloads) => void
  windowMinimize: (id?: string) => void
  windowMaximize: (id?: string) => void
  windowClose: (id?: string) => void
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
