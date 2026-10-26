import { BrowserWindow, ipcMain, IpcMainEvent } from "electron"
import path from "path"
import { POPUP_CHANNELS } from "./channels"

type TCreatePopupWindow = {
  windowTitle: string
  width: number
  height: number
  hashRoute: string
  windowId: string
}

export const createPopupWindow = (arg: TCreatePopupWindow) => {
  const { windowTitle, hashRoute, height, width, windowId } = arg
  let popupWindow: BrowserWindow | null
  popupWindow = new BrowserWindow({
    width: width,
    height: height,
    title: windowTitle,
    resizable: false,
    frame: false,
    roundedCorners: true,
    transparent: true,
    movable: true,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, "../", "preload", "preload.js"),
      contextIsolation: true, // Crucial for security
      nodeIntegration: false // Disable node integration in renderer
    }
  })

  popupWindow.setContentSize(width, height, true)

  // one listener set per popup is only useful while that popup exists, so the
  // closed event has to release it again
  const handleClosePopup = (_event: IpcMainEvent, id: string) => {
    if (popupWindow && id === windowId) {
      popupWindow.close()
    }
  }
  const handleMaximizePopup = (_event: IpcMainEvent, id?: string) => {
    if (id && id !== windowId) return

    if (popupWindow?.isMaximized()) {
      popupWindow.unmaximize()
    } else {
      popupWindow?.maximize()
    }
  }
  const handleMinimizePopup = (_event: IpcMainEvent, id?: string) => {
    if (id && id !== windowId) return
    popupWindow?.minimize()
  }

  ipcMain.on(POPUP_CHANNELS.CLOSE_POPUP_WINDOW, handleClosePopup)
  ipcMain.on(POPUP_CHANNELS.WINDOW_POPUP_MAXIMIZE, handleMaximizePopup)
  ipcMain.on(POPUP_CHANNELS.WINDOW_POPUP_MINIMIZE, handleMinimizePopup)
  popupWindow.setMenuBarVisibility(false)
  const isDev = process.env.NODE_ENV === "development"

  const popupURL = isDev
    ? `http://localhost:3353/#/${hashRoute}`
    : `file://${path.join(process.resourcesPath, "react", "dist", "index.html")}#/${hashRoute}`
  popupWindow.loadURL(popupURL)

  popupWindow.on("closed", () => {
    ipcMain.removeListener(POPUP_CHANNELS.CLOSE_POPUP_WINDOW, handleClosePopup)
    ipcMain.removeListener(POPUP_CHANNELS.WINDOW_POPUP_MAXIMIZE, handleMaximizePopup)
    ipcMain.removeListener(POPUP_CHANNELS.WINDOW_POPUP_MINIMIZE, handleMinimizePopup)
    popupWindow = null
  })
}

export const iconPathContextMenu = (iconName: string) => {
  if (process.env.NODE_ENV === "development") {
    return path.join(__dirname, "..", "..", "..", "assets", `${iconName}`)
  } else {
    return path.join(process.resourcesPath, "assets", `${iconName}`)
  }
}
