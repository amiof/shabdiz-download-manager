import Store from "electron-store"
import { TAria2Config, TProxyConfig, TScheduler, TTorrentConfig } from "../types"

interface Schema {
  theme: string
  enableSpeedLimit: boolean
  setDns: boolean
  proxyConfig: TProxyConfig
  aria2Config: TAria2Config
  selectedStorageDirectory: string | null
  torrentConfig: TTorrentConfig
  scheduler: TScheduler
  ytDlp: { version: string }
}

//add electron-store for save settings to config.json
export const electronStore = new Store<Schema>({
  name: "shabdiz-config",
  defaults: {
    theme: "black",
    enableSpeedLimit: false,
    setDns: false,
    aria2Config: {
      minSplitSize: "8M",
      connectTimeout: "60",
      maxDownloadLimit: "0",
      maxConnectionSplit: "8",
      maxConnection: "8",
      dnsServer: "8.8.8.8"
    },
    proxyConfig: {
      proxyStatus: false,
      ip: "",
      port: "",
      proxyType: "http",
      proxyUserName: "",
      proxyPassword: ""
    },
    selectedStorageDirectory: null,
    torrentConfig: {
      enableDht: true,
      enableDht6: true,
      enableLpd: true,
      enablePeerExchange: true,
      maxPeers: "100",
      requestPeerSpeedLimit: "0",
      seedTime: "0",
      seedRatio: "0.0",
      stopTimeout: "0",
      maxOverallUploadLimit: "1K",
      maxUploadLimit: "1K",
      maxOverallDownloadLimit: "0",
      tracker: null
    },
    scheduler: {
      startTime: undefined,
      endTime: undefined,
      keepAlive: false,
      powerOff: false
    },
    ytDlp: {
      version: ""
    }
  }
})
