import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined"
import RefreshIcon from "@mui/icons-material/Refresh"
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt"
import { Alert, Button, CircularProgress, Paper, Typography } from "@mui/material"
import { TYtDlpStatus, TYtDlpUpdateStatus } from "@src/types.ts"
import { formatBytes } from "@src/utils.ts"
import { useCallback, useEffect, useState } from "react"
import { ProgressBar } from "react-progressbar-fancy"

type Props = {
  id: string
}

const POLL_DELAY = 600

type TYtDlpUpdateState = TYtDlpUpdateStatus["state"]

// every state the main process can report has its own sentence, so a failed
// check is never shown as "an update is available"
const stateText: Record<TYtDlpUpdateState, string> = {
  "not-installed": "yt-dlp is not installed",
  "up-to-date": "yt-dlp is up to date",
  "update-available": "A newer yt-dlp release is available",
  "unknown-version": "The installed yt-dlp version could not be read",
  "check-failed": "The latest yt-dlp release could not be checked",
  downloading: "Downloading the yt-dlp update",
  installing: "Installing the yt-dlp update",
  updated: "yt-dlp was updated",
  "update-failed": "The yt-dlp update failed"
}

const YtDlpConf = ({ id }: Props) => {
  const closePopupWindow = window.electronAPI.closePopupWindow

  const [status, setStatus] = useState<TYtDlpUpdateStatus | null>(null)
  // only set while a missing yt-dlp is being installed, the update status does
  // not carry the progress of that first download
  const [installStatus, setInstallStatus] = useState<TYtDlpStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")

  const refresh = useCallback(async () => {
    setStatus(await window.electronAPI.getYtDlpUpdateStatus())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // aria2 does the download inside the main process, the tab only follows it
  useEffect(() => {
    if (status?.state !== "downloading" && status?.state !== "installing") return

    const timer = setTimeout(() => void refresh(), POLL_DELAY)
    return () => clearTimeout(timer)
  }, [status, refresh])

  useEffect(() => {
    if (installStatus?.state !== "downloading") return

    const timer = setTimeout(async () => setInstallStatus(await window.electronAPI.getYtDlpStatus()), POLL_DELAY)
    return () => clearTimeout(timer)
  }, [installStatus])

  // a finished install is announced once and then read again, so the tab shows
  // the version the download really left behind
  useEffect(() => {
    if (installStatus?.state !== "installed") return

    setInstallStatus(null)
    setNotice("yt-dlp was installed.")
    void refresh()
  }, [installStatus, refresh])

  // the "updated" state is a one shot result, it is dropped once it was shown
  useEffect(() => {
    if (status?.state !== "updated") return

    setNotice(`yt-dlp was updated to ${status.installedVersion ?? "the latest release"}.`)
    void window.electronAPI.clearYtDlpUpdateResult()
  }, [status])

  const checkForUpdate = async () => {
    setBusy(true)
    setNotice("")

    try {
      setStatus(await window.electronAPI.checkYtDlpUpdate())
    } finally {
      setBusy(false)
    }
  }

  const update = async () => {
    setBusy(true)
    setNotice("")

    try {
      setStatus(await window.electronAPI.startYtDlpUpdate())
    } finally {
      setBusy(false)
    }
  }

  const install = async () => {
    setBusy(true)
    setNotice("")

    try {
      setInstallStatus(await window.electronAPI.downloadYtDlp())
    } finally {
      setBusy(false)
    }
  }

  const installing = installStatus?.state === "downloading"
  const running = busy || installing || status?.state === "downloading" || status?.state === "installing"
  const error = installStatus?.state === "failed" ? installStatus.error : status?.error
  const currentState = installStatus?.state === "failed" ? undefined : status?.state

  return (
    <div className="flex justify-center pt-12 w-full h-full">
      <div className="w-[80%] flex flex-col gap-4">
        <Typography variant={"h6"}>yt-dlp</Typography>

        <Paper variant={"outlined"} className={"px-4 py-3"} sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
          <div className={"grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 items-center"}>
            <Typography variant={"caption"} color={"text.secondary"}>
              Status
            </Typography>
            <Typography variant={"body2"}>{currentState ? stateText[currentState] : "Checking yt-dlp"}</Typography>

            <Typography variant={"caption"} color={"text.secondary"}>
              Installed version
            </Typography>
            <Typography variant={"body2"} className={"truncate"}>
              {status?.installed ? (status.installedVersion ?? "unknown") : "not installed"}
            </Typography>

            <Typography variant={"caption"} color={"text.secondary"}>
              Latest version
            </Typography>
            <Typography variant={"body2"} className={"truncate"}>
              {status?.latestVersion ?? "not checked"}
            </Typography>

            <Typography variant={"caption"} color={"text.secondary"}>
              Executable
            </Typography>
            <Typography variant={"body2"} className={"break-all"}>
              {status?.executablePath || "not available"}
            </Typography>
          </div>
        </Paper>

        {(status?.state === "downloading" || status?.state === "installing") && (
          <div className={"w-full flex flex-col gap-2"}>
            <ProgressBar progressColor={"green"} label={""} darkTheme score={status.percent} />
            <div className={"flex items-center justify-between text-sm text-neutral-400"}>
              <span>{`${status.percent}%`}</span>
              <span>{status.state === "installing" ? "installing" : `${formatBytes(status.speed, 1)}/s`}</span>
            </div>
          </div>
        )}

        {installing && (
          <div className={"w-full flex flex-col gap-2"}>
            <ProgressBar progressColor={"green"} label={""} darkTheme score={installStatus?.percent ?? 0} />
            <div className={"flex items-center justify-between text-sm text-neutral-400"}>
              <span>{`${installStatus?.percent ?? 0}%`}</span>
              <span>{`${formatBytes(installStatus?.speed, 1)}/s`}</span>
            </div>
          </div>
        )}

        {notice && <Alert severity={"success"}>{notice}</Alert>}

        {error && <Alert severity={"error"}>{error}</Alert>}

        <div className={"flex items-center gap-2"}>
          <Button
            variant={"outlined"}
            size={"small"}
            startIcon={busy ? <CircularProgress size={16} color={"inherit"} /> : <RefreshIcon />}
            disabled={running}
            onClick={() => void checkForUpdate()}
          >
            Check for updates
          </Button>

          {currentState === "not-installed" && (
            <Button
              variant={"contained"}
              color={"success"}
              size={"small"}
              startIcon={<DownloadOutlinedIcon />}
              disabled={running}
              onClick={() => void install()}
            >
              Install
            </Button>
          )}

          {(currentState === "update-available" || currentState === "unknown-version") && (
            <Button
              variant={"contained"}
              color={"success"}
              size={"small"}
              startIcon={<SystemUpdateAltIcon />}
              disabled={running}
              onClick={() => void update()}
            >
              Update
            </Button>
          )}
        </div>

        <div className="w-full flex justify-end gap-2 absolute bottom-3 right-5">
          <Button variant="outlined" onClick={() => closePopupWindow(id)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default YtDlpConf
