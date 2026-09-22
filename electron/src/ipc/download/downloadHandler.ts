import { ipcMain } from "electron"
import { directionFolder } from "../../utils"
import { aria2 } from "../../main"
import { DOWNLOAD_CHANNELS } from "../channels"
import { TOptionsConfig, TProxyConfig } from "../../types"
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent

const ipcDownloadHandler = () => {
  ipcMain.handle(
    DOWNLOAD_CHANNELS.ADD_DOWNLOAD_LINK,
    async (
      event: IpcMainInvokeEvent,
      url: string,
      directory?: string,
      fileName?: string,
      proxyConfig?: TProxyConfig | null,
      options?: TOptionsConfig | null
    ) => {
      const dir = directionFolder(url)

      const proxyArgs = {} as any
      if (proxyConfig) {
        const { ip, port, proxyPassword, proxyType, proxyStatus, proxyUserName } = proxyConfig
        if (proxyStatus && ip && port) {
          proxyArgs["all-proxy"] = `${proxyType}://${ip}:${port}`
          if (proxyUserName) proxyArgs["all-proxy-user"] = proxyUserName
          if (proxyPassword) proxyArgs["all-proxy-passwd"] = proxyPassword
        }
      }
      const optionsConfig = {} as any
      if (options) {
        const { referrer, header, cookie, userAgent } = options

        const aria2Headers = header && Object.entries(JSON.parse(header)).map(
          ([key, value]) => `${key}: ${(value as string).trim()}`
        )
        if (referrer) optionsConfig["referer"] = referrer
        if (header) optionsConfig["header"] = aria2Headers
        if (cookie) optionsConfig["load-cookies"] = cookie
        if (userAgent) optionsConfig["user-agent"] = userAgent
      }

      return await aria2.sendAria2cRequest("addUri", [
        [url],
        {
          dir: directory ? directory : dir,
          continue: true, // Enable resuming}]);
          out: fileName,
          ...proxyArgs,
          ...optionsConfig
        }
      ])
    }
  )

  ipcMain.handle("tell-active", async (_: IpcMainInvokeEvent) => {
    return await aria2.sendAria2cRequest("tellActive")
  })

  ipcMain.handle("tell-stoped", async (_: IpcMainInvokeEvent) => {
    return await aria2.sendAria2cRequest("tellStopped", [-1, 100])
  })

  ipcMain.handle("tell-waiting", async (_: IpcMainInvokeEvent) => {
    return await aria2.sendAria2cRequest("tellWaiting", [-1, 100])
  })
}

export default ipcDownloadHandler
