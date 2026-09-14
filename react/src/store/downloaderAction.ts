import { TDownloads, TFileDetails, TtellRes } from "@src/types.ts"
import { formatBytes, getFileName, isTorrentMode } from "@src/utils.ts"
import * as _ from "lodash"
import { StoreApi } from "zustand"
import { TDownloaderActions, TDownloaderStore } from "./storeType"

export type SetState = StoreApi<TDownloaderStore>["setState"]
export type GetState = StoreApi<TDownloaderStore>["getState"]

export const downloaderAction = (set: SetState, get: GetState): TDownloaderActions => ({
  getFiles: (file: string) => {
    const currentFiles = get().files
    if (currentFiles && !currentFiles.includes(file)) {
      set({ files: [...currentFiles, file] })
    }
  },
  getDownloads: async () => {
    try {
      const downloadsRecords = await window.electronAPI.getDownloads()
      set({ downloadsRow: [...downloadsRecords] })
    } catch (error) {
      console.error(error)
    }
  },

  getAllDownloadsRow: async () => {
    await get().getTellStopped()
    await get().getTellActive()
    await get().getTellWaiting()
    await get().getDownloadedFilesDetails()
    await get().getSchedulerGidRow()

    const tellActive = get().tellActive
    const tellWaiting = get().tellWaiting
    const tellStopped = get().tellStopped
    const schedulerGidRows = get().schedulerGidRows
    const completedRowsFromDB = get().completedRowFromDB

    const filteredCompletedStop: TtellRes[] = []

    for (const stopItem of tellStopped) {
      const isNotDouble = completedRowsFromDB.every((completedItem) => completedItem.gid !== stopItem.gid)

      if (isNotDouble) {
        filteredCompletedStop.push(stopItem)
      }
    }

    const downloadedFilesDetails = get().downloadedFilesDetails

    const downloads = [...filteredCompletedStop, ...tellWaiting, ...tellActive, ...completedRowsFromDB]


    const downloadsRows: TDownloads[] = await Promise.all(
      downloads.map(async (download, index) => {
        const fileName = getFileName(download.files[0].path)

        const fileCreateAte = downloadedFilesDetails?.[fileName]?.createdAt
          ? downloadedFilesDetails[fileName].createdAt
          : new Date()

        const getTorrentFolderName = (filePath: string) => {
          const parts = filePath.split("/");
          const torrentsIndex = parts.indexOf("torrents");

          if (torrentsIndex === -1) return "";

          return parts[torrentsIndex + 1] ?? "";
        };

        const optionFileName =
          download.status === "complete" ? fileName : await get().getFilenameFromOption(download.gid)

        return {
          Id: index + 1,
          FileName:download.infoHash? getTorrentFolderName(download.files[0].path) : optionFileName ,
          Url: download.infoHash? "Torrent" :download?.files[0]?.uris[0]?.uri,
          SavePath: download?.dir,
          Size: formatBytes(+download.totalLength),
          CreatedAt: fileCreateAte,
          CompletedSize: formatBytes(+download.completedLength),
          Percentage: isNaN(+download.completedLength / +download.totalLength)
            ? 0
            : Number(((+download.completedLength / +download.totalLength) * 100).toFixed(0)),
          Status: download?.status,
          Gid: download?.gid,
          NumberConnections: download?.connections,
          isTorrent: isTorrentMode(download),
          schedulerQueue: schedulerGidRows.some((row) => row.gid === download.gid)
        }
      })
    )

    set({ allDownloadsRow: downloadsRows })

    const groupByResult = _.groupBy(downloadsRows, (row) => getFileName(row.SavePath))

    set({ downloadsGroupByLabel: groupByResult })
  },
  getFilenameFromOption: async (gid: string | undefined) => {
    if (!gid) return null
    const file = await window.electronAPI.getDownloadOptions(gid)
    return file?.out ?? null
  },
  getCompletedRowFromDB: async () => {
    const result = await window.electronAPI.getCompletedRowFromDB()
    set({ completedRowFromDB: result })
  },
  getTellActive: async () => {
    const tellActive = await window.electronAPI.tellActive()
    if (tellActive?.length) {
      set({ tellActive: [...tellActive] })
    } else {
      set({ tellActive: [] })
    }
  },
  getTellStopped: async () => {
    const tellStopped = await window.electronAPI.tellStopped()
    if (tellStopped?.length) {
      set({ tellStopped: [...tellStopped] })
    } else {
      set({ tellStopped: [] })
    }
  },
  getTellWaiting: async () => {
    const tellWaiting = await window.electronAPI.tellWaiting()
    if (tellWaiting?.length) {
      set({ tellWaiting: [...tellWaiting] })
    } else {
      set({ tellWaiting: [] })
    }
  },

  // set active data in electron for update dataGrid download rows
  setActiveDataToElectron: async (data: TtellRes) => {
    await window.electronAPI.setActiveDownloadData(data)
  },

  getActiveDataFromElectron: async () => {
    const result = await window.electronAPI.getActiveDownloadData()
    set({ activeDownloads: [...result] })
  },
  getDownloadedFilesDetails: async () => {
    const filesDetails = await window.electronAPI.getDownloadedFilesDetails()
    //change array to object
    const filesObject: Record<string, TFileDetails> = filesDetails.reduce(
      (acc, file) => {
        acc[file.name] = file
        return acc
      },
      {} as Record<string, TFileDetails>
    )
    set({ downloadedFilesDetails: { ...filesObject } })
  },

  setSelectedRow: (rows: TDownloads[]) => {
    set({ selectedRows: rows })
  },

  setSearchValue: (text: string) => {
    set({ searchValue: text })
  },

  setSidebarSelectedLabel: (label: string) => {
    set({ sidebarSelectedLabel: label })
  },
  refreshMainTableId: (id: string) => {
    set({ mainTableId: id })
  },
  getSchedulerGidRow: async () => {
    const gidRows = await window.electronAPI.getSchedulerDownloadRows()
    set({ schedulerGidRows: gidRows })
  },
  toggleCloseBackDrop:()=>{
    const backdropStatus=get().showCloseBackDrop
    set({showCloseBackDrop: !backdropStatus})
  }

  // removeFile: (file: string) => {
  //   set((state) => ({ files: state.files.filter(f => f !== file) }));
  // },
  // clearFiles: () => {
  //   set({ files: [] });
  // },
})
