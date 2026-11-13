import useYoutubeTabStore from "@components/addLinkPopup/store/youtubeTabStore.ts"
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined"
import Alert from "@mui/material/Alert"
import AlertTitle from "@mui/material/AlertTitle"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import LinearProgress from "@mui/material/LinearProgress"

// yt-dlp does not ship ffmpeg, so the app installs a static copy itself. This
// notice is the only place the user can start that download, and it stays out
// of the way once the binary is there
const FfmpegNotice = ({ action }: { action: string }) => {
  const status = useYoutubeTabStore((state) => state.status)
  const ffmpegStatus = useYoutubeTabStore((state) => state.ffmpegStatus)
  const installFfmpeg = useYoutubeTabStore((state) => state.installFfmpeg)

  // only a checked install can tell whether the merge works, and the backend
  // already counts a system wide ffmpeg as available
  if (status?.state !== "installed" || status.ffmpegAvailable) return null

  const downloading = ffmpegStatus?.state === "downloading"
  const failed = ffmpegStatus?.state === "failed"

  return (
    <Alert severity={"warning"} className={"flex flex-col gap-2 items-start"}>
      <AlertTitle>ffmpeg is needed</AlertTitle>
      {`${action}. Shabdiz downloads a static ffmpeg build next to yt-dlp, it is never added to your system PATH.`}

      {downloading && (
        <Box className={"w-full"}>
          <LinearProgress variant={"determinate"} value={ffmpegStatus?.percent ?? 0} color={"success"} />
          <Box className={"text-xs text-neutral-400 pt-1"}>{`${ffmpegStatus?.percent ?? 0}%`}</Box>
        </Box>
      )}

      {failed && ffmpegStatus?.error && <Box className={"text-xs text-neutral-300"}>{ffmpegStatus.error}</Box>}

      <Button
        variant={"contained"}
        size={"small"}
        color={"success"}
        startIcon={<DownloadOutlinedIcon />}
        disabled={downloading}
        onClick={() => void installFfmpeg()}
      >
        {downloading ? "Downloading ffmpeg..." : failed ? "Try again" : "Download ffmpeg"}
      </Button>
    </Alert>
  )
}

export default FfmpegNotice
