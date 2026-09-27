import useYoutubeTabStore from "@components/addLinkPopup/store/youtubeTabStore.ts"
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined"
import YouTubeIcon from "@mui/icons-material/YouTube"
import { Alert, Button, Typography } from "@mui/material"
import { formatBytes } from "@src/utils.ts"
import { ProgressBar } from "react-progressbar-fancy"

const YtDlpInstallPanel = () => {
  const status = useYoutubeTabStore((state) => state.status)
  const error = useYoutubeTabStore((state) => state.error)
  const installYtDlp = useYoutubeTabStore((state) => state.installYtDlp)

  const isDownloading = status?.state === "downloading"
  const isFailed = status?.state === "failed"

  return (
    <div className={"w-full h-full px-10 py-6 flex flex-col items-center justify-center gap-6 text-center"}>
      <YouTubeIcon sx={{ fontSize: 46, color: "#b7c6d8" }} />

      <div className={"flex flex-col gap-2"}>
        <Typography variant={"subtitle1"}>{"yt-dlp is not downloaded"}</Typography>
        <Typography variant={"body2"} color={"text.secondary"} sx={{ maxWidth: 420 }}>
          {"Shabdiz reads YouTube links and downloads the selected formats with yt-dlp. The tool is stored in the app "}
          {"data folder, your media still goes to the normal Shabdiz download folders."}
        </Typography>
      </div>

      {isDownloading && (
        <div className={"w-full max-w-[420px] flex flex-col gap-2"}>
          <ProgressBar progressColor={"green"} label={""} darkTheme score={status?.percent ?? 0} />
          <div className={"flex items-center justify-between text-sm text-neutral-400"}>
            <span>{`${status?.percent ?? 0}%`}</span>
            <span>{`${formatBytes(status?.speed, 1)}/s`}</span>
          </div>
        </div>
      )}

      {error && (
        <Alert severity={"error"} className={"w-full max-w-[460px]"}>
          {error}
        </Alert>
      )}

      <Button
        variant={"contained"}
        color={"success"}
        size={"small"}
        startIcon={<DownloadOutlinedIcon />}
        disabled={isDownloading}
        onClick={() => void installYtDlp()}
      >
        {isDownloading ? "Downloading yt-dlp..." : isFailed ? "Try again" : "Download yt-dlp"}
      </Button>
    </div>
  )
}

export default YtDlpInstallPanel
