import { TDownloads, TFileDetails, TtellRes } from "@src/types.ts"
import { formatBytes, getAddedAt, getFileName, isTorrentMode, saveAddedAtRegistry } from "@src/utils.ts"
import * as _ from "lodash"
import { StoreApi } from "zustand"
import { TDownloaderActions, TDownloaderStore } from "./storeType"

export type SetState = StoreApi<TDownloaderStore>["setState"]
export type GetState = StoreApi<TDownloaderStore>["getState"]

// The first poll of a session can only see downloads that were already there
// before the app started. There is no reliable "added at" for those, so they
// are stamped backwards in the order they are currently shown (keeping the
// existing order). Every gid seen for the first time after that pass is really
// a new download. See getAddedAt in utils.ts.
let didSeedAddedAtRegistry = false

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

    const downloads = [...filteredCompletedStop, ...tellWaiting, ...tellActive, ...completedRowsFromDB]

    const now = Date.now()

    // on the first pass of a session, unseen rows are stamped backwards so they
    // keep the relative order they are shown in today
    const getAddedAtTimestamp = (gid: string | undefined, index: number) =>
      getAddedAt(gid, didSeedAddedAtRegistry ? now : now - (downloads.length - index))

    // Id is assigned after sorting so it always counts 1..n top down
    const rowsWithoutId: Omit<TDownloads, "Id">[] = await Promise.all(
      downloads.map(async (download, index) => {
        // files can be missing while a torrent is still fetching metadata
        const firstFile = download.files?.[0]
        const fileName = getFileName(firstFile?.path ?? "")

        const getTorrentFolderName = (filePath: string) => {
          const parts = filePath.split("/");
          const torrentsIndex = parts.indexOf("torrents");

          if (torrentsIndex === -1) return "";

          return parts[torrentsIndex + 1] ?? "";
        };

        const optionFileName =
          download.status === "complete" ? fileName : await get().getFilenameFromOption(download.gid)

        return {
          FileName: download.infoHash ? getTorrentFolderName(firstFile?.path ?? "") : optionFileName,
          Url: download.infoHash ? "Torrent" : (download?.files?.[0]?.uris?.[0]?.uri ?? ""),
          SavePath: download?.dir,
          Size: formatBytes(+download.totalLength),
          CreatedAt: new Date(getAddedAtTimestamp(download.gid, index)),
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

    saveAddedAtRegistry()
    didSeedAddedAtRegistry = true

    // newest added first, so the row just added always sits at the top
    const downloadsRows: TDownloads[] = rowsWithoutId
      .sort((a, b) => {
        const aTime = a.CreatedAt?.getTime() ?? 0
        const bTime = b.CreatedAt?.getTime() ?? 0

        if (bTime !== aTime) return bTime - aTime

        // deterministic order for rows stamped in the same millisecond
        return (a.Gid ?? "").localeCompare(b.Gid ?? "")
      })
      .map((row, index) => ({ ...row, Id: index + 1 }))

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
