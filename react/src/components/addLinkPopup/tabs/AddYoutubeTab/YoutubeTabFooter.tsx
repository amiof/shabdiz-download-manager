import useYoutubeTabStore from "@components/addLinkPopup/store/youtubeTabStore.ts"
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined"
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined"
import NavigateNextOutlinedIcon from "@mui/icons-material/NavigateNextOutlined"
import Button from "@mui/material/Button"

type Props = {
  // the add-link window is closed once the download popup has been opened
  windowId: string
}

// follows the same step based footer the torrent tab uses, every selection is
// kept in the store so going back never loses it
const YoutubeTabFooter = (props: Props) => {
  const { windowId } = props
  const step = useYoutubeTabStore((state) => state.step)
  const mediaInfo = useYoutubeTabStore((state) => state.mediaInfo)
  const videoFormatId = useYoutubeTabStore((state) => state.videoFormatId)
  const audioFormatId = useYoutubeTabStore((state) => state.audioFormatId)
  const downloading = useYoutubeTabStore((state) => state.downloading)
  const goToStep = useYoutubeTabStore((state) => state.goToStep)
  const startDownload = useYoutubeTabStore((state) => state.startDownload)

  const videoFormat = mediaInfo?.videoFormats.find((format) => format.format_id === videoFormatId)
  const needsAudio = !!videoFormat && !videoFormat.hasAudio

  const backButton = (onClick: () => void, disabled = false) => (
    <Button
      variant={"outlined"}
      size={"small"}
      startIcon={<ArrowBackOutlinedIcon />}
      disabled={disabled}
      onClick={onClick}
    >
      Back
    </Button>
  )

  const nextButton = (disabled: boolean, onClick: () => void) => (
    <Button
      variant={"outlined"}
      color={"success"}
      size={"small"}
      endIcon={<NavigateNextOutlinedIcon />}
      disabled={disabled}
      onClick={onClick}
    >
      Next
    </Button>
  )

  const renderButtons = () => {
    switch (step) {
      case "url":
        return nextButton(!mediaInfo, () => goToStep("video"))

      case "video":
        return (
          <>
            {backButton(() => goToStep("url"))}
            {nextButton(!videoFormatId, () => goToStep(needsAudio ? "audio" : "subtitle"))}
          </>
        )

      case "audio":
        return (
          <>
            {backButton(() => goToStep("video"))}
            {nextButton(!audioFormatId, () => goToStep("subtitle"))}
          </>
        )

      case "subtitle":
        return (
          <>
            {backButton(() => goToStep(needsAudio ? "audio" : "video"))}
            {nextButton(false, () => goToStep("summary"))}
          </>
        )

      case "summary":
        return (
          <>
            {backButton(() => goToStep("subtitle"), downloading)}
            <Button
              variant={"contained"}
              color={"success"}
              size={"small"}
              endIcon={<DownloadOutlinedIcon />}
              disabled={downloading}
              onClick={() => void startDownload(windowId)}
            >
              Download
            </Button>
          </>
        )

      default:
        // the install panel carries its own download button
        return null
    }
  }

  return <div className={"flex gap-2"}>{renderButtons()}</div>
}

export default YoutubeTabFooter
