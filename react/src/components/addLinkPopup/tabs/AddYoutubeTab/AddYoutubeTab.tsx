import useYoutubeTabStore from "@components/addLinkPopup/store/youtubeTabStore.ts"
import YoutubeFormatStep from "@components/addLinkPopup/tabs/AddYoutubeTab/YoutubeFormatStep.tsx"
import YoutubeSourceForm from "@components/addLinkPopup/tabs/AddYoutubeTab/YoutubeSourceForm.tsx"
import YoutubeSubtitleStep from "@components/addLinkPopup/tabs/AddYoutubeTab/YoutubeSubtitleStep.tsx"
import YoutubeSummaryStep from "@components/addLinkPopup/tabs/AddYoutubeTab/YoutubeSummaryStep.tsx"
import YtDlpInstallPanel from "@components/addLinkPopup/tabs/AddYoutubeTab/YtDlpInstallPanel.tsx"
import { formatDurationLabel } from "@components/addLinkPopup/tabs/AddYoutubeTab/youtubeTabHelpers.ts"
import { TYtDlpStep } from "@components/addLinkPopup/types.ts"
import CircularProgress from "@mui/material/CircularProgress"
import Typography from "@mui/material/Typography"
import { useEffect } from "react"

const AddYoutubeTab = () => {
  const step = useYoutubeTabStore((state) => state.step)
  const status = useYoutubeTabStore((state) => state.status)
  const mediaInfo = useYoutubeTabStore((state) => state.mediaInfo)
  const checkYtDlpStatus = useYoutubeTabStore((state) => state.checkYtDlpStatus)

  useEffect(() => {
    // an existing executable is detected here, nothing is downloaded automatically
    if (!status) void checkYtDlpStatus()
  }, [])

  const renderStep = () => {
    switch (step) {
      case "checking":
        return (
          <div className={"w-full h-full flex flex-col items-center justify-center gap-3"}>
            <CircularProgress size={26} color={"success"} />
            <Typography variant={"body2"} color={"text.secondary"}>
              Checking yt-dlp
            </Typography>
          </div>
        )
      case "install":
        return <YtDlpInstallPanel />
      case "url":
        return <YoutubeSourceForm />
      case "video":
        return <YoutubeFormatStep kind={"video"} />
      case "audio":
        return <YoutubeFormatStep kind={"audio"} />
      case "subtitle":
        return <YoutubeSubtitleStep />
      case "summary":
        return <YoutubeSummaryStep />
      default:
        return <YoutubeSourceForm />
    }
  }

  const mediaSteps: TYtDlpStep[] = ["video", "audio", "subtitle", "summary"]
  const showMediaHeader = !!mediaInfo && mediaSteps.includes(step)

  return (
    <div className={"w-full h-full flex flex-col overflow-hidden"}>
      {showMediaHeader && (
        <div className={"px-8 pt-4"}>
          <Typography variant={"subtitle2"} className={"truncate"}>
            {mediaInfo?.title}
          </Typography>
          <Typography variant={"caption"} color={"text.secondary"} className={"block truncate"}>
            {[mediaInfo?.uploader, formatDurationLabel(mediaInfo?.duration)].filter(Boolean).join(" · ")}
          </Typography>
        </div>
      )}

      <div className={"flex-1 overflow-hidden"}>{renderStep()}</div>
    </div>
  )
}

export default AddYoutubeTab
