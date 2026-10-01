import { TYtDlpStep } from "@components/addLinkPopup/types.ts"
import {
  TYtDlpDownloadStatus,
  TYtDlpMediaInfo,
  TYtDlpStatus,
  TYtDlpSubtitle,
  TYtDlpSubtitleSelection
} from "@src/types.ts"

export type TYoutubeTabStore = TYoutubeTabAction & TYoutubeTab

export type TYoutubeTab = {
  step: TYtDlpStep
  url: string
  status: TYtDlpStatus | null
  fetching: boolean
  mediaInfo: TYtDlpMediaInfo | null
  videoFormatId: string | null
  audioFormatId: string | null
  subtitleChoices: TYtDlpSubtitleSelection[]
  error: string
  downloading: boolean
  downloadStatus: TYtDlpDownloadStatus | null
}

export type TYoutubeTabAction = {
  checkYtDlpStatus: () => Promise<void>
  installYtDlp: () => Promise<void>
  setUrl: (url: string) => void
  fetchMediaInfo: () => Promise<void>
  selectVideoFormat: (formatId: string) => void
  selectAudioFormat: (formatId: string) => void
  toggleSubtitle: (subtitle: TYtDlpSubtitle, selected: boolean) => void
  setSubtitleFormat: (subtitle: TYtDlpSubtitle, format: string) => void
  clearSubtitles: () => void
  goToStep: (step: TYtDlpStep) => void
  startDownload: () => Promise<void>
  cancelDownload: () => Promise<void>
  resetFlow: () => void
}
