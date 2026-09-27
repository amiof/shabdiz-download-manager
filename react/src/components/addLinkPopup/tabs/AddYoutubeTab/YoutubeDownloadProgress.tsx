import useYoutubeTabStore from "@components/addLinkPopup/store/youtubeTabStore.ts"
import FolderOpenIcon from "@mui/icons-material/FolderOpen"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { STATUS_TYPE, TYtDlpDownloadStatus } from "@src/types.ts"
import { formatBytes, formatTime } from "@src/utils.ts"
import { ProgressBar } from "react-progressbar-fancy"

type Props = {
  status: TYtDlpDownloadStatus
}

// yt-dlp does the download itself, this view follows the job through the
// yt-dlp status call instead of an aria2 gid
const YoutubeDownloadProgress = (props: Props) => {
  const { status } = props

  const downloading = useYoutubeTabStore((state) => state.downloading)
  const cancelDownload = useYoutubeTabStore((state) => state.cancelDownload)
  const resetFlow = useYoutubeTabStore((state) => state.resetFlow)

  const isComplete = status.status === STATUS_TYPE.COMPLETE
  const isError = status.status === STATUS_TYPE.ERROR
  const isRemoved = status.status === STATUS_TYPE.REMOVED
  const isRunning = status.status === STATUS_TYPE.ACTIVE || status.status === STATUS_TYPE.WAITING

  return (
    <div className={"w-full flex flex-col gap-4"}>
      <div>
        <Typography variant={"subtitle1"} className={"truncate"}>
          {status.title || "YouTube download"}
        </Typography>
        <Typography variant={"caption"} color={"text.secondary"} className={"break-all"}>
          {status.filePath || status.dir}
        </Typography>
      </div>

      <ProgressBar progressColor={"green"} label={""} darkTheme score={status.percent} />

      <div className={"flex items-center justify-between text-sm text-neutral-400"}>
        <span>{`${status.percent}%`}</span>
        <span>{`${formatBytes(status.completedLength)} of ${formatBytes(status.totalLength)}`}</span>
        <span>{isRunning ? `${formatBytes(status.downloadSpeed, 1)}/s` : status.status}</span>
      </div>

      {isRunning && (
        <Typography variant={"caption"} color={"text.secondary"}>
          {`ETA ${formatTime(status.eta ?? Infinity)}`}
        </Typography>
      )}

      {isComplete && <Alert severity={"success"}>{`Downloaded to ${status.filePath || status.dir}`}</Alert>}
      {isError && <Alert severity={"error"}>{status.errorMessage || "The download failed."}</Alert>}
      {isRemoved && <Alert severity={"info"}>The download was stopped.</Alert>}

      <div className={"flex gap-2"}>
        {isRunning && (
          <Button
            variant={"outlined"}
            color={"error"}
            size={"small"}
            disabled={!downloading}
            onClick={() => void cancelDownload()}
          >
            Stop
          </Button>
        )}
        {(isComplete || isError) && (
          <Button
            variant={"outlined"}
            size={"small"}
            startIcon={<FolderOpenIcon />}
            onClick={() => window.electronAPI.openFolder(status.dir)}
          >
            Open folder
          </Button>
        )}
        {(isComplete || isError || isRemoved) && (
          <Button variant={"outlined"} color={"success"} size={"small"} onClick={resetFlow}>
            New link
          </Button>
        )}
      </div>
    </div>
  )
}

export default YoutubeDownloadProgress
