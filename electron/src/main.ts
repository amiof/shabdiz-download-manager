import { app, BrowserWindow, ipcMain } from "electron"
import path from "path"
import aria2c from "./aria2c"
import { DataSourceRepo } from "./database/database"
import ipcDownloadHandler from "./ipc/download/downloadHandler"
import ipcGetDataHandler from "./ipc/getData/getDataHandler"
import ipcPopupHandler from "./ipc/openPopup/popupHandler"
import { checkAndCreateFolder, checkSessionExists } from "./utils"
import "./store/electronStore"
import { server } from "./http-server/httpServer"
import { ipcActionsHandler } from "./ipc/actions/actionsHandler"
import { POPUP_CHANNELS } from "./ipc/channels"
import { ipcConfigHandler } from "./ipc/config/configHandler"
import { ipcEditDownloadHandler } from "./ipc/editDownload/editDownloadHandler"
import ipcShareHandler from "./ipc/sahre/shareHandler"
import { ipcSchedulerHandler } from "./ipc/scheduler/scheduler"
import { ipcUtilsHandler } from "./ipc/utils/utils"
import { SchedulerProcess } from "./schedulerProcess/schedulerProcess"

export let mainWindow: BrowserWindow | null

let isQuitting = false

//server port for get download link from browser extension
const PORT = 3325

export const schedulers: Record<string, ReturnType<typeof setTimeout> | undefined> = {}

checkSessionExists()

const iconPath = () => {
  if (process.platform === "win32") {
    return path.join(process.resourcesPath, "assets", "icons", "icon.ico")
  } else if (process.platform === "darwin") {
    return path.join(process.resourcesPath, "assets", "icons", "icon.icns")
  } else if (process.platform === "linux") {
    return path.join(process.resourcesPath, "assets", "icons", "512x512.png")
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    title: "shabdiz",
    height: 600,
    autoHideMenuBar: true,
    frame: false,
    roundedCorners: true,
    transparent: true,
    minWidth: 980,
    minHeight: 600,
    resizable: true,
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload", "preload.js"),
      contextIsolation: true, // Crucial for security
      nodeIntegration: false // Disable node integration in renderer
    }
  })

  mainWindow.setContentSize(1000, 500, true)
  if (process.env.NODE_ENV === "development") {
    // In development, load the React dev server.
    mainWindow.loadURL("http://localhost:3353")
    // mainWindow.webContents.openDevTools();
    const iconPath = path.join(__dirname, "..", "..", "assets", "icons", "512x512.png")
    mainWindow.setIcon(iconPath)
  } else {
    if (process.platform === "linux") {
      const iconPath = path.join(process.resourcesPath, "assets", "icons", "512x512.png")
      mainWindow.setIcon(iconPath)
    }

    // In production, load the built index.html from extraResources.
    // Using process.resourcesPath ensures we reference the correct folder outside the asar.
    const indexPath = path.join(process.resourcesPath, "react", "dist", "index.html")
    // mainWindow.loadFile(indexPath);
    mainWindow.loadFile(indexPath).catch((err) => console.error("Failed to load index.html:", err))
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}
//  create folders for download files
;(async () => {
  await checkAndCreateFolder()
  await DataSourceRepo.initialize()
})()

// app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

export const aria2 = new aria2c()

export const schedulerInstance = new SchedulerProcess()

app.whenReady().then(() => {
  createWindow()
  // startAria2c();
  aria2.start()

  schedulerInstance.initScheduler()

  // setTimeout(connectToAria2c, 1000);
  setTimeout(() => aria2.connect(), 1000)
  // setInterval(()=>aria2.sendAria2cRequest('aria2.getVersion'), 3353);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (aria2.aria2cProcess) {
      aria2.aria2cProcess.kill()
    }
    app.quit()
  }
})

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// Window control IPC handlers
ipcMain.on(POPUP_CHANNELS.WINDOW_POPUP_MINIMIZE, (_, id) => {
  if (id) return
  mainWindow?.minimize()
})

ipcMain.on(POPUP_CHANNELS.WINDOW_POPUP_MAXIMIZE, (_, id) => {
  if (id) return
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on(POPUP_CHANNELS.CLOSE_MAIN_POPUP, (_, id) => {
  if (id) return
  // mainWindow?.close()
  app.quit()
})

app.on("before-quit", async (event) => {
  if (isQuitting) {
    return
  }

  event.preventDefault()

  isQuitting = true

  try {
    await aria2.shutdown()
  } catch (error) {
    console.error("Failed to shutdown aria2:", error)
  } finally {
    app.quit()
  }
})

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Shabdiz API running on http://127.0.0.1:${PORT}`)
})

// IPC handlers
ipcDownloadHandler()
ipcGetDataHandler()
ipcPopupHandler()
ipcActionsHandler()
ipcConfigHandler()
ipcUtilsHandler()
ipcSchedulerHandler()
ipcShareHandler()
ipcEditDownloadHandler()
