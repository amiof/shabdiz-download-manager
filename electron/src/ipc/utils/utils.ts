import { BrowserWindow, clipboard, ipcMain, Menu, Notification } from "electron"
import * as fsp from "fs/promises"
import path from "path"
import { aria2, mainWindow } from "../../main"
import { resMetadataUrls, STATUS_TYPE, TDownloads, TNotificationDetailes, TtellRes } from "../../types"
import {
  directionFolder,
  extractFilenameFromDisposition,
  generateId,
  getFilenameFromUrl,
  parseTorrentFile,
  torrentSavePath
} from "../../utils"
import {
  ACTIONS_CHANNELS,
  EDIT_DOWNLOAD_CHANNELS,
  POPUP_CHANNELS,
  SCHEDULE_CHANNELS,
  UTILS_CHANNELS
} from "../channels"
import { createPopupWindow, iconPathContextMenu } from "../utils"
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent

// const parseTorrent = require("parse-torrent")
// import parseTorrent from "parse-torrent/index.js"

export const ipcUtilsHandler = () => {
  ipcMain.handle(
    UTILS_CHANNELS.SHOW_NOTIFICATION,
    (_event: IpcMainInvokeEvent, notifDetailes: TNotificationDetailes) => {
      const { title, body } = notifDetailes

      const notif = new Notification({
        title: title,
        body: body
        // You can also add an icon
        // icon: path.join(__dirname, 'icon.png')
      })
      notif.show()
      // Handle click events
      // notif.on("click", () => {
      //   console.log("User clicked the notification")
      //   // e.g., focus your main window
      // })
    }
  )

  ipcMain.handle(UTILS_CHANNELS.GET_MAGNET_METADATA_URLS, async (_event: IpcMainInvokeEvent, magnetUrl: string) => {
    try {
      const urlResponse: resMetadataUrls = {
        fileName: null,
        size: null,
        typeUrl: "magnet",
        savePath: "",
        resume: null,
        torrentInfoHash: "",
        gidTorrent: "",
        torrentFiles: []
      }
      
      if (magnetUrl.startsWith("magnet:") || magnetUrl.endsWith(".torrent")) {
        urlResponse.savePath = torrentSavePath()
        urlResponse.typeUrl = "magnet"
        const download = async () => {
          const gidUrl = (await aria2.sendAria2cRequest("addUri", [
            [magnetUrl],
            {
              "bt-metadata-only": "true",
              "bt-save-metadata": "true",
              "allow-overwrite": "true",
              "follow-torrent": "false",
              dir: `${torrentSavePath()}`
            }
          ])) as string
          
          let isCompleted = false
          const timeout = 60000 // 60 seconds timeout
          const startTime = Date.now()
          
          while (!isCompleted && Date.now() - startTime < timeout) {
            const statusResponse = (await aria2.sendAria2cRequest("tellStatus", [gidUrl, ["status"]])) as TtellRes
            
            if (statusResponse.status === "complete") {
              isCompleted = true
            }
            else if (statusResponse.status === "error" || statusResponse.status === "removed") {
              throw new Error("Download failed or was removed")
            }
            
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
          
          if (!isCompleted) {
            throw new Error("Download timeout")
          }
          if (isCompleted) {
            // const status = await waitForTorrentMetadata(gidUrl, 60000)
            
            const status = (await aria2.sendAria2cRequest("tellStatus", [gidUrl])) as TtellRes
            
            if (status?.infoHash) {
              const parsed = parseTorrentFile(torrentSavePath(), status.infoHash)
              urlResponse.fileName = parsed.name
              urlResponse.size = String(parsed.length)
              urlResponse.resume = true
              urlResponse.typeUrl = "torrent"
              urlResponse.torrentInfoHash = status.infoHash
              urlResponse.savePath = torrentSavePath()
              urlResponse.gidTorrent = gidUrl
              urlResponse.torrentFiles = parsed.files
            }
          }
        }
        
        await download()
      }
      return urlResponse
    }
    catch (err) {
      console.error("error in  get Torrent metaData", err)
    }
  })
  ipcMain.handle(
    UTILS_CHANNELS.ADD_TORRENT_URL,
    async (_event: IpcMainInvokeEvent, selectedFile: string, torrentFilePath: string) => {
      console.log(selectedFile, torrentFilePath)
      
      const torrentBuffer = await fsp.readFile(torrentFilePath)
      const torrentBase64 = torrentBuffer.toString("base64")
      
      const gidUrl = (await aria2.sendAria2cRequest("addTorrent", [
        torrentBase64,
        [],
        {
          "select-file": `${selectedFile}`,
          dir: `${torrentSavePath()}`
        }
      ])) as string
      
      console.log("%c 1 --> Line: 140||utils.ts\n gidUrl: ", "color:#f0f;", gidUrl)
      return gidUrl
    }
  )
  
  ipcMain.handle(UTILS_CHANNELS.GET_TORRENT_METADATA_URLS, async (_event: IpcMainInvokeEvent, torrentUrl: string) => {
    try {
      if (torrentUrl.startsWith("magnet:")) return
      
      const urlResponse: resMetadataUrls = {
        fileName: null,
        size: null,
        typeUrl: "magnet",
        savePath: "",
        resume: null,
        torrentInfoHash: "",
        gidTorrent: "",
        torrentFiles: []
      }
      
      if (torrentUrl.endsWith(".torrent")) {
        const gidUrl = (await aria2.sendAria2cRequest("addUri", [
          [torrentUrl],
          {
            "bt-metadata-only": "true",
            "bt-save-metadata": "true",
            "allow-overwrite": "true",
            "follow-torrent": "false",
            dir: `${torrentSavePath()}`
          }
        ])) as string
        
        let isCompleted = false
        const timeout = 60000 // 60 seconds timeout
        const startTime = Date.now()
        
        while (!isCompleted && Date.now() - startTime < timeout) {
          const statusResponse = (await aria2.sendAria2cRequest("tellStatus", [gidUrl, ["status"]])) as TtellRes
          
          if (statusResponse.status === "complete") {
            isCompleted = true
          }
          else if (statusResponse.status === "error" || statusResponse.status === "removed") {
            throw new Error("Download failed or was removed")
          }
          
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
        
        if (!isCompleted) {
          throw new Error("Download timeout")
        }
        
        const fileName = getFilenameFromUrl(torrentUrl)
        const infoHash = fileName.split(".torrent")[0]
        
        const parsed = parseTorrentFile(torrentSavePath(), infoHash)
        
        if (parsed) {
          urlResponse.fileName = parsed.name
          urlResponse.size = String(parsed.length)
          urlResponse.resume = true
          urlResponse.typeUrl = "torrent"
          urlResponse.savePath = torrentSavePath()
          urlResponse.torrentInfoHash = infoHash
          urlResponse.gidTorrent = gidUrl
          urlResponse.torrentFiles = parsed.files
        }
      }
      
      return urlResponse
    }
    catch (error) {
      console.error("error in  get Torrent metaData", error)
    }
  })
  
  ipcMain.handle(UTILS_CHANNELS.GET_TORRENT_METADATA_FILE, async (_event: IpcMainInvokeEvent, torrentPath: string) => {
    const urlResponse: resMetadataUrls = {
      fileName: null,
      size: null,
      typeUrl: "magnet",
      savePath: "",
      resume: null,
      torrentInfoHash: "",
      torrentFiles: []
    }
    const infoHash = path.basename(torrentPath, ".torrent")
    const address=path.dirname(torrentPath)
    const parsed = parseTorrentFile(address, infoHash)
    
    if (parsed) {
      urlResponse.fileName = parsed.name
      urlResponse.size = String(parsed.length)
      urlResponse.resume = true
      urlResponse.typeUrl = "torrent"
      urlResponse.torrentInfoHash = infoHash
      urlResponse.torrentFiles = parsed.files
      urlResponse.savePath = torrentSavePath()
    }
    return urlResponse
  })

  ipcMain.handle(UTILS_CHANNELS.GET_METADATA_URLS, async (_event: IpcMainInvokeEvent, url: string) => {
    const urlResponse: resMetadataUrls = {
      fileName: null,
      size: null,
      typeUrl: "direct",
      savePath: directionFolder(url),
      resume: null
    }
    try {
      if (!url.startsWith("magnet:")) {
        const response = await fetch(url, { method: "HEAD" })
        const contentType = response.headers.get("content-type") || ""
        const disposition = response.headers.get("Content-Disposition")
        const fileName = extractFilenameFromDisposition(disposition) ?? getFilenameFromUrl(url)
        const contentLength = response.headers.get("Content-Length")
        const acceptRanges = response.headers.get("Accept-ranges")
        
        urlResponse.size = contentLength
        urlResponse.fileName = fileName
        
        if (
          fileName?.endsWith(".torrent") ||
          url.startsWith(".torrent") ||
          contentType.includes("application/x-bittorrent") ||
          contentType.includes("application/bittorrent")
        ) {
          urlResponse.typeUrl = "torrent"
        }
        
        //for check resume able link
        urlResponse.resume = !!(contentLength && acceptRanges === "bytes")
      }
    } catch (error) {
      try {
        if (url.startsWith("magnet:")) return
        const response = await fetch(url, {
          method: "GET",
          headers: { Range: "bytes=0-0" } // get first byte
        })
        const contentLength2 = response.headers.get("Content-Range")?.split("/")[1]
        const disposition = response.headers.get("Content-Disposition")
        const fileName = extractFilenameFromDisposition(disposition)
        const contentType = response.headers.get("content-type") || ""
        const acceptRanges = response.headers.get("Accept-ranges")

        if (contentLength2) {
          urlResponse.size = contentLength2
        } else {
          urlResponse.size = null
        }
        urlResponse.fileName = fileName

        if (
          fileName?.endsWith(".torrent") ||
          url.startsWith(".torrent") ||
          contentType.includes("application/x-bittorrent") ||
          contentType.includes("application/bittorrent")
        ) {
          urlResponse.typeUrl = "torrent"
        }

        //for check resumeable link
        urlResponse.resume = !!(contentLength2 && acceptRanges === "bytes")
      } catch (error) {
        console.error("error in get url header2", error)
      }

      console.error("error in get url header1", error)
    }
    
    if (url.startsWith("magnet:")) {
      const urlResponse: resMetadataUrls = {
        fileName: "drive test torrents",
        size: "130000",
        typeUrl: "torrent",
        savePath: "/home/amir/Shabdiz-DM/other",
        resume: null
      }
      
      return urlResponse
    }

    return urlResponse
  })

  ipcMain.handle(
    UTILS_CHANNELS.SHOW_CONTEXT_MENU,
    async (event: IpcMainInvokeEvent, selectedDownloadRow: TDownloads[] | []) => {
      // const iconPath = path.join(process.resourcesPath, "assets", "icon.png")
      const isActive = selectedDownloadRow.filter((item) => item.Status === STATUS_TYPE.ACTIVE)
      const isResume = selectedDownloadRow.filter(
        (item) => item.Status !== STATUS_TYPE.ACTIVE && item.Status !== STATUS_TYPE.COMPLETE
      )
      const isScheduler = selectedDownloadRow.some((row) => row.schedulerQueue === true)

      const menu = Menu.buildFromTemplate([
        {
          label: "Add new link",
          icon: iconPathContextMenu("plus-32i.png"),
          visible: !selectedDownloadRow.length,
          click: () => {
            const id = generateId()
            ipcMain.emit(POPUP_CHANNELS.ADD_LINK_POPUP, event, id)
            mainWindow?.webContents.send(UTILS_CHANNELS.CONTEXT_MENU_ACTION, "add-link")
          }
        },
        {
          label: "Options",
          visible: !selectedDownloadRow.length,
          icon: iconPathContextMenu("option-32i.png"),
          click: () => {
            const id = generateId()
            ipcMain.emit(POPUP_CHANNELS.POPUP_OPEN_OPTIONS, event, id)
            mainWindow?.webContents.send(UTILS_CHANNELS.CONTEXT_MENU_ACTION, "open-options")
          }
        },
        {
          label: "Reload",
          visible: !selectedDownloadRow.length,
          role: "reload",
          icon: iconPathContextMenu("reload-32i.png"),
          click: () => {
            mainWindow?.webContents.send(UTILS_CHANNELS.CONTEXT_MENU_ACTION, "reload-app")
          }
        },
        {
          label: "Quite",
          visible: !selectedDownloadRow.length,
          role: "quit",
          icon: iconPathContextMenu("exit-32i.png")
        },
        //-------------
        {
          // icon:path.join(process.resourcesPath, "assets", "icon_32x32.png"),
          // icon:path.join(__dirname,"..","..","..","..","assets","icon_32x32.png"),
          label: "Delete rows",
          icon: iconPathContextMenu("delete-32i.png"),
          visible: !!selectedDownloadRow.length,
          click: () => {
            const gidList = selectedDownloadRow.map((selected) => selected.Gid)
            ipcMain.emit(ACTIONS_CHANNELS.REMOVE_SELECTED_DOWNLOADS, event, gidList)
            mainWindow?.webContents.send(UTILS_CHANNELS.CONTEXT_MENU_ACTION, "delete-rows")
          }
        },
        {
          label: "Stop rows",
          icon: iconPathContextMenu("pause-32i.png"),
          visible: !!selectedDownloadRow.length,
          enabled: !!isActive.length,
          click: () => {
            const ActiveGid = isActive.map((selected) => selected.Gid)
            ActiveGid.map((gid) => {
              ipcMain.emit(ACTIONS_CHANNELS.STOP_DOWNLOAD_BY_GID, event, gid)
              mainWindow?.webContents.send(UTILS_CHANNELS.CONTEXT_MENU_ACTION, "stop-downloads")
            })
          }
        },
        {
          label: "Resume downloads",
          visible: !!selectedDownloadRow.length,
          enabled: !!isResume.length,
          icon: iconPathContextMenu("resume-32i.png"),
          click: () => {
            isResume.map((item) => {
              const gid = item?.Gid
              const fileName = item?.FileName
              createPopupWindow({
                windowTitle: fileName?.trim() ? fileName : "download",
                height: 450,
                width: 900,
                hashRoute: `downloadStart/:${gid}/:`,
                windowId: gid
              })
              ipcMain.emit(ACTIONS_CHANNELS.UNPAUSE_BY_GID, event, gid)
              mainWindow?.webContents.send(UTILS_CHANNELS.CONTEXT_MENU_ACTION, "resume")
            })
          }
        },
        // {
        //   label: "Delete downloaded Files",
        //   visible: !!selectedDownloadRow.length,
        //   icon: iconPathContextMenu("delete-32.png"),
        //   click: () => {
        //     console.log("delete")
        //   }
        // },
        {
          label: "Open folder",
          visible: !!selectedDownloadRow.length,
          icon: iconPathContextMenu("folder-32i.png"),
          click: () => {
            selectedDownloadRow.map((item) => {
              ipcMain.emit(ACTIONS_CHANNELS.OPEN_FOLDER, event, item.SavePath)
              mainWindow?.webContents.send(UTILS_CHANNELS.CONTEXT_MENU_ACTION, "open-folders")
            })
          }
        },
        {
          label: "Edit option",
          visible: !!selectedDownloadRow.length,
          enabled: selectedDownloadRow.length === 1,
          icon: iconPathContextMenu("option-32i.png"),
          click: () => {
            const row = selectedDownloadRow[0]
            ipcMain.emit(EDIT_DOWNLOAD_CHANNELS.SET_SELECTED_DOWNLOAD_FOR_EDIT, event, row)
            const id = generateId()
            ipcMain.emit(POPUP_CHANNELS.POPUP_OPEN_EDIT_DOWNLOAD, event, id)
            mainWindow?.webContents.send(UTILS_CHANNELS.CONTEXT_MENU_ACTION, "edit-download")
          }
        },
        {
          label: "Add to scheduler",
          visible: !!selectedDownloadRow.length,
          enabled: !isScheduler,
          icon: iconPathContextMenu("schedule-32i.png"),
          click: () => {
            ipcMain.emit(SCHEDULE_CHANNELS.ADD_ROWS_TO_SCHEDULER_QUEUE, event, selectedDownloadRow)
            mainWindow?.webContents.send(UTILS_CHANNELS.CONTEXT_MENU_ACTION, "add-scheduler")
          }
        },
        {
          label: "Remove scheduler",
          visible: !!selectedDownloadRow.length,
          enabled: isScheduler,
          icon: iconPathContextMenu("scheduler-32i.png"),
          click: () => {
            ipcMain.emit(SCHEDULE_CHANNELS.Remove_Rows_From_SCHEDULE_QUEUE, event, selectedDownloadRow)
            mainWindow?.webContents.send(UTILS_CHANNELS.CONTEXT_MENU_ACTION, "remove-scheduler")
          }
        }
      ])

      const window = BrowserWindow.fromWebContents(event.sender) as BrowserWindow

      menu.popup({
        window: window
      })
    }
  )

  ipcMain.handle(UTILS_CHANNELS.READ_CLIPBOARD, () => {
    const text = clipboard.readText().trim()

    if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("magnet:")) {
      return text
    }
    return null
  })
}
