import { ipcMain, IpcMainEvent } from "electron"
import { POPUP_CHANNELS } from "../channels"
import { createPopupWindow } from "../utils"
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent

const ipcPopupHandler = () => {
  ipcMain.on(POPUP_CHANNELS.ADD_LINK_POPUP, (_: IpcMainEvent, id,url) => {
    const urlLink=url? url : ""
    createPopupWindow({ windowTitle: "addLink", height: 600, width: 650, hashRoute: `popup/:${id}/:${urlLink}/:""`, windowId: id })
  })

  ipcMain.handle(POPUP_CHANNELS.POPUP_START_DOWNLOAD, (event: IpcMainInvokeEvent, id, windowTitle) => {
    createPopupWindow({
      windowTitle: windowTitle.trim() ? windowTitle : "download",
      height: 450,
      width: 900,
      hashRoute: `downloadStart/:${id}/:${windowTitle}`,
      windowId: id
    })
    return id
  })

  ipcMain.on(POPUP_CHANNELS.POPUP_OPEN_OPTIONS, (event: IpcMainInvokeEvent, id) => {
    createPopupWindow({
      windowTitle: "options",
      height: 530,
      width: 750,
      hashRoute: `options/:${id}`,
      windowId: id
    })
  })

  ipcMain.on(POPUP_CHANNELS.POPUP_OPEN_SCHEDULER, (event: IpcMainInvokeEvent, id) => {
    console.log(id)
    createPopupWindow({
      windowTitle: "scheduler",
      height: 400,
      width: 400,
      hashRoute: `scheduler/:${id}`,
      windowId: id
    })
  })
  ipcMain.on(POPUP_CHANNELS.POPUP_OPEN_SHARE, (event: IpcMainInvokeEvent, id) => {
    createPopupWindow({
      windowTitle: "share",
      height: 530,
      width: 600,
      hashRoute: `share/:${id}`,
      windowId: id
    })
  })
  ipcMain.on(POPUP_CHANNELS.POPUP_OPEN_EDIT_DOWNLOAD, (event: IpcMainInvokeEvent, id) => {
    createPopupWindow({
      windowTitle: "edit-download",
      height: 630,
      width: 520,
      hashRoute: `edit-download/:${id}`,
      windowId: id
    })
  })
}
export default ipcPopupHandler
