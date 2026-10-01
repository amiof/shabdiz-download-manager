import { youtubeTabAction } from "@components/addLinkPopup/store/youtubeTabAction.ts"
import { TYoutubeTabStore } from "@components/addLinkPopup/store/youtubeTabStoreType.ts"
import { create } from "zustand"

const useYoutubeTabStore = create<TYoutubeTabStore>((set, get) => ({
  step: "checking",
  url: "",
  status: null,
  fetching: false,
  mediaInfo: null,
  videoFormatId: null,
  audioFormatId: null,
  subtitleChoices: [],
  error: "",
  downloading: false,
  downloadStatus: null,
  ...youtubeTabAction(set, get)
}))

export default useYoutubeTabStore
