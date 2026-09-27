import useAddLinkStore from "@components/addLinkPopup/store/addLinkStore.ts"
import { TYoutubeTabAction, TYoutubeTabStore } from "@components/addLinkPopup/store/youtubeTabStoreType.ts"
import { STATUS_TYPE, TYtDlpDownloadRequest } from "@src/types.ts"
import { StoreApi } from "zustand"

export type SetState = StoreApi<TYoutubeTabStore>["setState"]
export type GetState = StoreApi<TYoutubeTabStore>["getState"]

const INSTALL_POLL_DELAY = 600
const DOWNLOAD_POLL_DELAY = 500

let installTimer: ReturnType<typeof setTimeout> | null = null
let downloadTimer: ReturnType<typeof setTimeout> | null = null

const clearInstallPolling = () => {
  if (installTimer) {
    clearTimeout(installTimer)
    installTimer = null
  }
}

const clearDownloadPolling = () => {
  if (downloadTimer) {
    clearTimeout(downloadTimer)
    downloadTimer = null
  }
}

const isHttpLink = (value: string) => {
  try {
    const parsedUrl = new URL(value)
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
  } catch {
    return false
  }
}

// the yt-dlp executable is downloaded through aria2, its progress is read
// through the same status call the tab uses to detect an existing binary
const pollInstallStatus = async (set: SetState, get: GetState) => {
  try {
    const status = await window.electronAPI.getYtDlpStatus()
    set({ status })

    if (status.state === "installed") {
      set({ step: "url", error: "" })
      return
    }

    if (status.state === "failed" || status.state === "not-installed") {
      set({ step: "install", error: status.state === "failed" ? (status.error ?? "The yt-dlp download failed.") : "" })
      return
    }

    installTimer = setTimeout(() => void pollInstallStatus(set, get), INSTALL_POLL_DELAY)
  } catch (error) {
    console.error(error)
    set({ step: "install", error: "Could not check the yt-dlp installation." })
  }
}

// yt-dlp does the media download itself, so the job is followed through the
// yt-dlp status call instead of an aria2 gid
const pollDownloadStatus = async (set: SetState, get: GetState) => {
  const id = get().downloadStatus?.id
  if (!id) return

  try {
    const status = await window.electronAPI.getYtDlpDownloadStatus(id)

    if (!status) {
      set({ downloading: false, error: "The download status is not available anymore." })
      return
    }

    set({ downloadStatus: status })

    if (status.status === STATUS_TYPE.ACTIVE || status.status === STATUS_TYPE.WAITING) {
      downloadTimer = setTimeout(() => void pollDownloadStatus(set, get), DOWNLOAD_POLL_DELAY)
      return
    }

    set({ downloading: false })

    if (status.status === STATUS_TYPE.ERROR) {
      set({ error: status.errorMessage ?? "The yt-dlp download failed." })
    }
  } catch (error) {
    console.error(error)
    set({ downloading: false, error: "Could not read the download progress." })
  }
}

export const youtubeTabAction = (set: SetState, get: GetState): TYoutubeTabAction => ({
  checkYtDlpStatus: async () => {
    clearInstallPolling()
    set({ step: "checking", error: "" })

    try {
      const status = await window.electronAPI.getYtDlpStatus()
      set({ status })

      if (status.state === "downloading") {
        set({ step: "install" })
        installTimer = setTimeout(() => void pollInstallStatus(set, get), INSTALL_POLL_DELAY)
        return
      }

      set({ step: status.state === "installed" ? "url" : "install" })
    } catch (error) {
      console.error(error)
      set({ status: null, step: "install", error: "Could not check the yt-dlp installation." })
    }
  },

  installYtDlp: async () => {
    if (get().status?.state === "downloading") return

    clearInstallPolling()
    set({ error: "" })

    try {
      const status = await window.electronAPI.downloadYtDlp()
      set({ status })

      if (status.state === "failed") {
        set({ step: "install", error: status.error ?? "The yt-dlp download could not be started." })
        return
      }

      set({ step: "install" })
      installTimer = setTimeout(() => void pollInstallStatus(set, get), INSTALL_POLL_DELAY)
    } catch (error) {
      console.error(error)
      set({ step: "install", error: "The yt-dlp download could not be started." })
    }
  },

  setUrl: (url) => {
    const mediaInfo = get().mediaInfo

    // editing the link makes the loaded formats invalid
    if (mediaInfo && url.trim() !== mediaInfo.webpageUrl) {
      set({
        url,
        mediaInfo: null,
        videoFormatId: null,
        audioFormatId: null,
        subtitleChoices: [],
        step: "url",
        error: ""
      })
      return
    }

    set({ url })
  },

  fetchMediaInfo: async () => {
    const url = get().url.trim()

    if (!url) {
      set({ error: "Enter a YouTube link first." })
      return
    }

    if (!isHttpLink(url)) {
      set({ error: "Enter a valid YouTube link." })
      return
    }

    set({ fetching: true, error: "", mediaInfo: null, videoFormatId: null, audioFormatId: null, subtitleChoices: [] })

    try {
      const { options, proxyConfig } = useAddLinkStore.getState()
      const response = await window.electronAPI.getYtDlpMediaInfo(url, options, proxyConfig)

      if (!response.mediaInfo) {
        set({ error: response.error || "Could not read the media information." })
        return
      }

      set({ mediaInfo: response.mediaInfo, url: response.mediaInfo.webpageUrl, step: "video" })
    } catch (error) {
      console.error(error)
      set({ error: "Could not read the media information." })
    } finally {
      set({ fetching: false })
    }
  },

  selectVideoFormat: (formatId) => {
    const videoFormat = get().mediaInfo?.videoFormats.find((format) => format.format_id === formatId)

    set({
      videoFormatId: formatId,
      // an audio selection is only needed for video only formats
      audioFormatId: videoFormat?.hasAudio ? null : get().audioFormatId
    })
  },

  selectAudioFormat: (formatId) => {
    set({ audioFormatId: formatId })
  },

  toggleSubtitle: (subtitle, selected) => {
    const choices = get().subtitleChoices

    if (!selected) {
      set({
        subtitleChoices: choices.filter(
          (choice) => !(choice.language === subtitle.language && choice.isAutomatic === subtitle.isAutomatic)
        )
      })
      return
    }

    const defaultFormat = subtitle.formats[0]?.ext
    if (!defaultFormat) return

    set({
      subtitleChoices: [
        ...choices.filter(
          (choice) => !(choice.language === subtitle.language && choice.isAutomatic === subtitle.isAutomatic)
        ),
        { language: subtitle.language, format: defaultFormat, isAutomatic: subtitle.isAutomatic }
      ]
    })
  },

  setSubtitleFormat: (subtitle, format) => {
    set({
      subtitleChoices: get().subtitleChoices.map((choice) =>
        choice.language === subtitle.language && choice.isAutomatic === subtitle.isAutomatic
          ? { ...choice, format }
          : choice
      )
    })
  },

  clearSubtitles: () => {
    set({ subtitleChoices: [] })
  },

  goToStep: (step) => {
    set({ step, error: "" })
  },

  startDownload: async () => {
    const { mediaInfo, videoFormatId, audioFormatId, subtitleChoices, url, downloading } = get()

    if (!mediaInfo || !videoFormatId || downloading) return

    const videoFormat = mediaInfo.videoFormats.find((format) => format.format_id === videoFormatId)
    const audioFormat = mediaInfo.audioFormats.find((format) => format.format_id === audioFormatId)

    // the backend builds the same request again, this only keeps the UI honest
    if (!videoFormat || (!videoFormat.hasAudio && !audioFormat)) {
      set({ error: "Select a video format and, if needed, an audio format." })
      return
    }

    const request: TYtDlpDownloadRequest = {
      url: mediaInfo.webpageUrl || url,
      videoFormatId,
      // an audio stream is only requested for video only formats
      audioFormatId: videoFormat.hasAudio ? undefined : audioFormat?.format_id,
      subtitles: subtitleChoices,
      title: mediaInfo.title
    }

    set({ downloading: true, error: "", downloadStatus: null })

    try {
      const { options, proxyConfig } = useAddLinkStore.getState()
      const response = await window.electronAPI.startYtDlpDownload(request, options, proxyConfig)

      if (!response.download) {
        set({ downloading: false, error: response.error || "The download could not be started." })
        return
      }

      set({ downloadStatus: response.download })
      downloadTimer = setTimeout(() => void pollDownloadStatus(set, get), DOWNLOAD_POLL_DELAY)
    } catch (error) {
      console.error(error)
      set({ downloading: false, error: "The download could not be started." })
    }
  },

  cancelDownload: async () => {
    const id = get().downloadStatus?.id
    if (!id) return

    clearDownloadPolling()

    try {
      await window.electronAPI.cancelYtDlpDownload(id)
      const status = await window.electronAPI.getYtDlpDownloadStatus(id)
      set({ downloadStatus: status, downloading: false })
    } catch (error) {
      console.error(error)
      set({ downloading: false })
    }
  },

  resetFlow: () => {
    clearInstallPolling()
    clearDownloadPolling()

    set({
      url: "",
      fetching: false,
      mediaInfo: null,
      videoFormatId: null,
      audioFormatId: null,
      subtitleChoices: [],
      error: "",
      downloading: false,
      downloadStatus: null,
      step: get().status?.state === "installed" ? "url" : "install"
    })
  }
})
