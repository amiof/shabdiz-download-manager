import { exec } from "node:child_process"
import { app } from "electron"
import * as fsnp from "fs"
import * as fs from "fs/promises"
import os from "os"
import path from "path"
import { aria2 } from "./main"
import { electronStore } from "./store/electronStore"
import { TFileDetails, TtellRes, TtorrentFileParsed } from "./types"

const basePathSelected = electronStore.get("selectedStorageDirectory")

export const checkAndCreateFolder = async () => {
  try {
    let target: string[]
    const platform = process.platform
    let basePath: string
    switch (platform) {
      case "win32":
        basePath = basePathSelected ?? app.getPath("downloads")
        target = [
          path.join(basePath, "Shabdiz-DM", "compressed"),
          path.join(basePath, "Shabdiz-DM", "musics"),
          path.join(basePath, "Shabdiz-DM", "videos"),
          path.join(basePath, "Shabdiz-DM", "images"),
          path.join(basePath, "Shabdiz-DM", "documents"),
          path.join(basePath, "Shabdiz-DM", "other"),
          path.join(basePath, "Shabdiz-DM", "torrents")
        ]
        break
      case "linux":
        basePath = basePathSelected ?? os.homedir()
        target = [
          path.join(basePath, "Shabdiz-DM", "compressed"),
          path.join(basePath, "Shabdiz-DM", "musics"),
          path.join(basePath, "Shabdiz-DM", "videos"),
          path.join(basePath, "Shabdiz-DM", "images"),
          path.join(basePath, "Shabdiz-DM", "documents"),
          path.join(basePath, "Shabdiz-DM", "other"),
          path.join(basePath, "Shabdiz-DM", "torrents")
        ]
        break
      case "darwin":
        basePath = basePathSelected ?? os.homedir()
        target = [
          path.join(basePath, "Shabdiz-DM", "compressed"),
          path.join(basePath, "Shabdiz-DM", "musics"),
          path.join(basePath, "Shabdiz-DM", "videos"),
          path.join(basePath, "Shabdiz-DM", "images"),
          path.join(basePath, "Shabdiz-DM", "documents"),
          path.join(basePath, "Shabdiz-DM", "other"),
          path.join(basePath, "Shabdiz-DM", "torrents")
        ]
        break
      default:
        throw new Error("your platform not  supported")
    }
    for (const targetPath of target) {
      try {
        await fs.access(targetPath)
        console.log("directory is available", targetPath)
      }
      catch (error) {
        await fs.mkdir(targetPath, { recursive: true })
        console.log("your  folder  created:", targetPath)
        console.error("error", error)
      }
    }
  }
  catch (error) {
    console.log("error  occured:", error)
  }
}

export const getFolderFromUrl = (url: string) => {
  // const extension = url.split(".").pop()?.toLowerCase() || ""
  const fileName = getFilenameFromUrl(url)
  const extension =
    fileName !== "Download" ? fileName.split(".").pop()?.toLowerCase() : url.split(".").pop()?.toLowerCase()

  const fileTypes: Record<string, string[]> = {
    videos: ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm"],
    musics: ["mp3", "wav", "aac", "flac", "ogg", "m4a"],
    compressed: ["zip", "rar", "7z", "tar", "gz"],
    images: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"],
    documents: ["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx"],
    torrents: ["torrent"]
  }

  let folderExtention: string | null = null

  for (const ext in fileTypes) {
    fileTypes[ext].map((format) => {
      if (format === extension) {
        folderExtention = ext
      }
    })
  }
  if (folderExtention) {
    return folderExtention
  }
  else {
    return "other"
  }
}

export const directionFolder = (url: string) => {
  try {
    const folderName = getFolderFromUrl(url)
    const platform = process.platform
    let direction: string = ""
    let basePath

    switch (platform) {
      case "win32":
        basePath = basePathSelected ?? app.getPath("downloads")
        direction = path.join(basePath, "Shabdiz-DM", folderName)

        break

      case "linux":
        basePath = basePathSelected ?? os.homedir()
        direction = path.join(basePath, "Shabdiz-DM", folderName)

        break

      case "darwin":
        basePath = basePathSelected ?? os.homedir()
        direction = path.join(basePath, "Shabdiz-DM", folderName)

        break

      default:
        throw new Error("your platform not supported")
    }

    if (direction) {
      return direction
    }
    else {
      return " "
    }
  }
  catch (error) {
    console.log("a error occurred:", error)
    return " "
  }
}

export const getFilesInDirectory = (directoryPath?: string): TFileDetails[] => {
  const routes = directoryPath ? [directoryPath] : savedPath()
  try {
    const filesDetails: TFileDetails[] = []
    routes.map((route) => {
      const files = fsnp.readdirSync(route)
      const dir = files.map((file) => {
        const filePath = path.join(route, file)
        const stats = fsnp.statSync(filePath)

        return {
          name: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          isDirectory: stats.isDirectory()
        }
      })

      filesDetails.push(...dir)
    })
    return filesDetails
  }
  catch (error) {
    console.error("Error reading directory:", error)
    return []
  }
}

export const savedPath = () => {
  try {
    const target: string[] = []
    const platform = process.platform
    let basePath: string
    const folders = ["compressed", "musics", "videos", "images", "documents", "other", "torrents"]
    switch (platform) {
      case "win32":
        basePath = basePathSelected ?? app.getPath("downloads")
        folders.map((folder) => {
          const route = path.join(basePath, "Shabdiz-DM", folder)
          target.push(route)
        })
        break
      case "linux":
        basePath = basePathSelected ?? os.homedir()

        folders.map((folder) => {
          const route = path.join(basePath, "Shabdiz-DM", folder)
          target.push(route)
        })
        break
      case "darwin":
        basePath = basePathSelected ?? os.homedir()
        folders.map((folder) => {
          const route = path.join(basePath, "Shabdiz-DM", folder)
          target.push(route)
        })
        break
      default:
        throw new Error("your platform not  supported")
    }

    return target
  }
  catch (error) {
    console.error(error)
    return []
  }
}

export const getSessionPath = () => {
  return path.join(app.getPath("userData"), "Shabdiz-data", "aria2.session")
}

export const checkSessionExists = () => {
  const sessionPath = getSessionPath()
  const parentDir = path.dirname(sessionPath)

  if (!fsnp.existsSync(parentDir)) {
    fsnp.mkdirSync(parentDir, { recursive: true }) // This creates the full path
  }
  if (!fsnp.existsSync(sessionPath)) {
    const fd = fsnp.openSync(sessionPath, "w")
    fsnp.closeSync(fd)

    console.log("session file  created ✌ ")
  }
  else {
    console.log("session file is exist 😇")
  }
}

export const aria2BinPath = () => {
  const systemPlatform = os.platform()
  let aria2cBinaryPath: string
  let basePath
  if (process.env.NODE_ENV === "development") {
    basePath = path.join(__dirname, "..", "src", "release-aria2", "bin") // for develop mode
  }
  else {
    basePath = path.join(process.resourcesPath, "electron", "dist", "bin") //for product mode
  }

  try {
    switch (systemPlatform) {
      case "win32":
        aria2cBinaryPath = path.join(basePath, "win", "aria2c.exe")
        break
      case "darwin":
        aria2cBinaryPath = path.join(basePath, "macOS", "aria2c")
        break
      case "linux":
        // must install aria2 by user
        aria2cBinaryPath = "aria2c"
        break
      default:
        throw new Error(`Unsupported platform: ${systemPlatform}`)
    }
    return aria2cBinaryPath
  }
  catch (error) {
    console.error(error)
    return "aria2c"
  }
}

export const openFileExplorer = (directoryPath: string) => {
  const platform = os.platform() // Get the current operating system

  let command
  switch (platform) {
    case "win32": // Windows
      command = `explorer "${directoryPath}"`
      break
    case "darwin": // macOS
      command = `open "${directoryPath}"`
      break
    case "linux": // Linux
      command = `xdg-open "${directoryPath}"`
      break
    default:
      console.error("Unsupported platform:", platform)
      return
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error opening file explorer: ${error.message}`)
      return
    }
    if (stderr) {
      console.error(`File explorer stderr: ${stderr}`)
      return
    }
    console.log(`File explorer opened successfully: ${stdout}`)
  })
}

// for get metaData
export async function waitForTorrentMetadata(gid: string, timeout = 60_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeout) {
    const status = (await aria2.sendAria2cRequest("tellStatus", [gid])) as TtellRes

    if (status.errorCode) {
      throw new Error(`${status.errorCode}: ${status.errorMessage}`)
    }

    if (status.files?.length > 0) {
      return status
    }
    
    if (status.status === "error" || status.status === "removed") {
      throw new Error(`aria2 metadata failed: ${status.status}`)
    }
    
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  
  throw new Error("Timed out waiting for torrent metadata")
}

// get file name from link
export const getFilenameFromUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url)
    
    return decodeURIComponent(parsedUrl.pathname.split("/").pop() || "Download")
  }
  catch {
    return "Download"
  }
}

// get name from header of a link
export const extractFilenameFromDisposition = (headerValue: string | null): string | null => {
  if (!headerValue) return null

  // filename*
  const encodedMatch = headerValue.match(/filename\*=(?:UTF-8'')?([^;]+)/i)

  if (encodedMatch?.[1]) {
    try {
      const filename = decodeURIComponent(encodedMatch[1].trim().replace(/^"(.*)"$/, "$1"))

      if (filename) {
        return filename
      }
    }
    catch {
      // برو سراغ filename معمولی
    }
  }

  // filename
  const filenameMatch = headerValue.match(/filename="?([^";]+)"?/i)

  if (filenameMatch?.[1]) {
    const filename = filenameMatch[1].trim()

    if (filename) {
      return filename
    }
  }

  // هیچ filename قابل استفاده‌ای پیدا نشد
  return null
}
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export const parseTorrentFile = (pathFile: string, infoHash: string) => {
  const parseTorrent = require("parse-torrent")
  const torrentFilePath = path.join(pathFile, `${infoHash}.torrent`)
  const torrentBuffer = fsnp.readFileSync(torrentFilePath)
  
  const parsed = parseTorrent(torrentBuffer) as TtorrentFileParsed
  return parsed as TtorrentFileParsed
}

export const torrentSavePath = () => {
  const platform = process.platform
  const basePathSelected = electronStore.get("selectedStorageDirectory")
  let fullPath
  if (platform === "win32") {
   const  basePath = basePathSelected ?? app.getPath("downloads")
     fullPath =`${basePath}\\Shabdiz-DM\\torrents`
  }
  else {
  const basePath = basePathSelected ?? os.homedir()
    fullPath =`${basePath}/Shabdiz-DM/torrents`
  }
  return fullPath
}

// time must be like "12:30" for use this function
// export const diffTimeNow = (time: string) => {
//   const [h, m] = time.split(":").map(Number)
//
//   const now = new Date()
//   const target = new Date()
//
//   target.setHours(h, m, 0, 0)
//
//   return target.getTime() - now.getTime()
// }
//
// // for set setTimeout for run action
// export const schedulerRun = (startTime: string | null, endTime: string | null) => {
//   if (startTime) {
//     const startDiff = diffTimeNow(startTime)
//
//     schedulers["start"] = setTimeout(() => {
//       console.log("start time reached")
//
//       if (!schedulers["end"]) {
//         clearScheduler()
//       }
//     }, startDiff)
//   }
//
//   if (endTime) {
//     const endDiff = diffTimeNow(endTime)
//     // end timer
//     schedulers["end"] = setTimeout(() => {
//       console.log("end time reached")
//       clearScheduler()
//       // powerOffSystem()
//     }, endDiff)
//   }
//
//   console.log("active timers:", schedulers)
// }
// // for clear scheduler setTimeout id and store scheduler
// export const clearScheduler = () => {
//   if (schedulers["start"]) {
//     clearTimeout(schedulers["start"])
//   }
//
//   if (schedulers["end"]) {
//     clearTimeout(schedulers["end"])
//   }
//
//   const storeScheduler: TScheduler = {
//     startTime: undefined,
//     endTime: undefined,
//     keepAlive: false,
//     powerOff: false
//   }
//   electronStore.set("scheduler", storeScheduler)
// }
//
// when program start check if set scheduler in store run scheduler
// export const initScheduler = () => {
//   const schedulerStore = electronStore.get("scheduler")
//   const { startTime, endTime } = schedulerStore
//   if (startTime) {
//     schedulerRun(startTime, endTime)
//   } else {
//     clearScheduler()
//   }
// }
//
// export const powerOffSystem = () => {
//   const platform = os.platform()
//   if (platform === "win32") {
//     exec("shutdown /s /t 0")
//   } else if (platform === "linux") {
//     exec("shutdown now")
//   } else if (platform === "darwin") {
//     exec("sudo shutdown -h now")
//   }
// }
