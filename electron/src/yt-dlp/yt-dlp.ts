import { app } from "electron"
import { access, mkdir } from "fs/promises"
import path from "path"
import { aria2 } from "../main"
import { GithubRelease, ytDlpInfoData } from "./type"
import { checkSystemPlatform } from "./ytp-dl-utils"

export default class YtDlp {
  lastInfo: ytDlpInfoData | undefined = undefined

  checkVersion() {
    console.log("checkVersion")
  }

  async getLastInfo() {
    const response: GithubRelease = await fetch("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest").then(
      (res) => res.json()
    )
    const linuxAsset = response.assets.find((asset) => asset.name === "yt-dlp_linux")
    const winAsset = response.assets.find((asset) => asset.name === "yt-dlp.exe")

    const macAsset = response.assets.find((asset) => asset.name === "yt-dlp_macos")

    const InfoData: ytDlpInfoData = {
      tag_name: response.tag_name,
      html_url: response.html_url,
      linux_asset: linuxAsset,
      winAsset: winAsset,
      macAsset: macAsset
    }
    this.lastInfo = InfoData
  }

  async ytDlpCreatePath() {
    try {
      const userDataPath = app.getPath("userData")
      const ytDlpPath = path.join(userDataPath, "yt-dlp")
      try {
        await access(ytDlpPath)
        console.log("yt-dl path avaiale: ", ytDlpPath)
      }
      catch {
        await mkdir(ytDlpPath, { recursive: true })
        console.log("yt-dl path created : ", ytDlpPath)
      }
      return ytDlpPath
    }
    catch (e) {
      console.error("Failed to create yt-dlp directory:", e)
    }
  }

  async downloadLastVersion() {
    if (!this.lastInfo) {
     await this.getLastInfo()
    }

    const directory = await this.ytDlpCreatePath()

    let url
    if (checkSystemPlatform() === "win") {
      url = this.lastInfo?.winAsset?.browser_download_url
    }
    else if (checkSystemPlatform() === "linux") {
      url = this.lastInfo?.linux_asset?.browser_download_url
    }
    else if (checkSystemPlatform() === "macOS") {
      url = this.lastInfo?.macAsset?.browser_download_url
    }

    if (!url) return

    const gid = await aria2.sendAria2cRequest("addUri", [
      [url],
      {
        dir: directory,
        continue: true
      }
    ])

    return gid
  }
}
