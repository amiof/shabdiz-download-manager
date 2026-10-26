import CustomTitleBar from "@components/customTilebar/CustomTitleBar.tsx"
import BackDetails from "@components/startDownload/BackDetails.tsx"
import { DeviceHub, FileUploadOutlined } from "@mui/icons-material"
import AccessTimeIcon from "@mui/icons-material/AccessTime"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline"
import HubIcon from "@mui/icons-material/Hub"
import InsertLinkIcon from "@mui/icons-material/InsertLink"
import SaveIcon from "@mui/icons-material/Save"
import SaveAltIcon from "@mui/icons-material/SaveAlt"
import SaveAsIcon from "@mui/icons-material/SaveAs"
import SpeedIcon from "@mui/icons-material/Speed"
import TaskAltIcon from "@mui/icons-material/TaskAlt"
import useDownloaderStore from "@src/store/downloaderStore.ts"
import { STATUS_TYPE, TDownloadSource, TtellRes, TYtDlpDownloadStatus } from "@src/types.ts"
import { formatBytes, formatTime, isMetadataPhase, isTorrentMode, toFiniteNumber } from "@src/utils.ts"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import styles from "./style.module.scss"

export type TDetails = {
  label: string
  value: number | string
  icon?: React.ReactElement
  showDetails?: boolean
}

type Props = {
  // the shared popup reads its status from whichever backend owns the download
  downloadSource?: TDownloadSource
}

// yt-dlp jobs keep their own state in the main process; this maps the fields the
// existing DownloadStart details and progress bar already understand
const toTellRes = (status: TYtDlpDownloadStatus): TtellRes => ({
  gid: status.id,
  status: status.status,
  totalLength: status.totalLength,
  completedLength: status.completedLength,
  downloadSpeed: status.downloadSpeed,
  connections: "0",
  dir: status.dir,
  errorCode: status.status === STATUS_TYPE.ERROR ? "1" : "0",
  errorMessage: status.errorMessage ?? "",
  files: status.filePath
    ? [
        {
          index: "1",
          path: status.filePath,
          length: status.totalLength,
          completedLength: status.completedLength,
          selected: "true",
          uris: [{ status: "used", uri: status.url }]
        }
      ]
    : [],
  numPieces: "1",
  pieceLength: "1048576",
  bitfield: "",
  uploadLength: "0",
  schedulerQueue: false
})

const DownloadStart = ({ downloadSource = "aria2" }: Props) => {
  const { id, fileName } = useParams()

  const gid = id?.replace(/^:/, "") ?? ""
  const name = fileName?.replace(/^:/, "") ?? ""
  const isYtDlpDownload = downloadSource === "yt-dlp"

  const [filename, setFilename] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!gid) return

    // First prefer filename from URL
    if (name) {
      setFilename(name)
      return
    }

    // Otherwise get it from aria2/download options
    let cancelled = false
    ;(async () => {
      const file = await window.electronAPI.getDownloadOptions(gid)
      if (!cancelled) setFilename(file?.out ?? "")
    })()

    return () => {
      cancelled = true
    }
  }, [gid, name])

  const getAllDownloads = useDownloaderStore((state) => state.getAllDownloadsRow)
  const tellActive = useDownloaderStore((state) => state.tellActive)
  const getTellActive = useDownloaderStore((state) => state.getTellActive)
  const setDownloadDataToElectron = useDownloaderStore((state) => state.setActiveDataToElectron)

  const [aria2Status, setAria2Status] = useState<TtellRes | null>(null)
  const [ytDlpStatus, setYtDlpStatus] = useState<TYtDlpDownloadStatus | null>(null)
  const [statusReadError, setStatusReadError] = useState("")

  const addLinkToDB = window.electronAPI.addLinkToDB
  const changeStatusDownload = window.electronAPI.updateDownloadRowStatus
  const currentDownloadRow = tellActive.find((downloadRow) => downloadRow.gid === gid)

  const downloadStatus = isYtDlpDownload ? (ytDlpStatus ? toTellRes(ytDlpStatus) : null) : aria2Status

  const totalLength = toFiniteNumber(downloadStatus?.totalLength)
  const completedLength = toFiniteNumber(downloadStatus?.completedLength)
  const downloadSpeed = toFiniteNumber(downloadStatus?.downloadSpeed)

  // Size is unknown until aria2 reports a positive totalLength (e.g. while
  // fetching torrent metadata), so don't derive an ETA from it yet.
  const hasKnownSize = totalLength > 0
  const remainingBytes = hasKnownSize ? Math.max(0, totalLength - completedLength) : 0
  const remainingSeconds = isYtDlpDownload
    ? (ytDlpStatus?.eta ?? Infinity)
    : hasKnownSize && downloadSpeed > 0
      ? remainingBytes / downloadSpeed
      : Infinity

  // const completeDownload = downloadStatus?.status === STATUS_TYPE.COMPLETE
  const getDownloadedFilesDetails = useDownloaderStore((state) => state.getDownloadedFilesDetails)

  useEffect(() => {
    //for add create add in dataGrid
    getDownloadedFilesDetails()
  }, [])

  useEffect(() => {
    // a yt-dlp row is already stored by the main process
    if (isYtDlpDownload) return

    if (currentDownloadRow) {
      ;(async () => {
        await addLinkToDB(currentDownloadRow)
      })()
    }
  }, [tellActive.length, isYtDlpDownload])

  // yt-dlp owns its job state in the main process, so the popup only has to
  // follow that job id; the current status is fetched on mount, which means no
  // progress event that happened before the window loaded is lost
  useEffect(() => {
    if (!gid || !isYtDlpDownload) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      try {
        const nextStatus = await window.electronAPI.getYtDlpDownloadStatus(gid)
        if (cancelled) return

        if (!nextStatus) {
          setStatusReadError("The download status is not available anymore.")
          return
        }

        setYtDlpStatus(nextStatus)
        setStatusReadError("")

        if (nextStatus.status === STATUS_TYPE.ACTIVE || nextStatus.status === STATUS_TYPE.WAITING) {
          timer = setTimeout(() => void poll(), 400)
        }
      } catch (error) {
        console.error("Failed to poll the yt-dlp download status:", error)
        if (cancelled) return

        setStatusReadError("Could not read the download progress.")
        timer = setTimeout(() => void poll(), 1000)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }
  }, [gid, isYtDlpDownload])

  useEffect(() => {
    if (!gid || isYtDlpDownload) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      try {
        const tellStatus = await window.electronAPI.getTellStatus(gid)
        // A failed/empty response must not wipe the last good status.
        if (cancelled || !tellStatus) return
        setAria2Status(tellStatus)
      } catch (error) {
        console.error("Failed to poll download status:", error)
      }
    }

    if (tellActive.length) {
      // Recursive timeout instead of setInterval: a slow request can no longer
      // overlap the next one or let a stale response overwrite a newer one.
      const scheduleNext = () => {
        timer = setTimeout(async () => {
          await poll()
          await getTellActive()
          if (!cancelled) scheduleNext()
        }, 400)
      }
      scheduleNext()

      setDownloadDataToElectron(tellActive[0])
    } else {
      poll()
      getAllDownloads()
    }
    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
        timer = null
        setAria2Status(null)
      }
      //for update status in db when closed popup
      ;(async () => {
        try {
          const tellStatus = await window.electronAPI.getTellStatus(gid)
          if (tellStatus?.gid) {
            await changeStatusDownload(tellStatus.gid, tellStatus)
          }
        } catch (error) {
          console.error("Failed to persist download status:", error)
        }
      })()
    }
  }, [gid, tellActive.length, isYtDlpDownload])

  const cancelYtDlpDownload = async () => {
    try {
      await window.electronAPI.cancelYtDlpDownload(gid)
      const nextStatus = await window.electronAPI.getYtDlpDownloadStatus(gid)
      setYtDlpStatus(nextStatus)
    } catch (error) {
      console.error("Failed to cancel the yt-dlp download:", error)
    }
  }

  const isMetaData = isYtDlpDownload ? false : downloadStatus ? isMetadataPhase(downloadStatus) : true
  const isTorrent = isYtDlpDownload ? false : downloadStatus ? isTorrentMode(downloadStatus) : false
  // aria2 can serialize an empty error as "0", only a real message is shown
  const downloadError =
    (downloadStatus?.errorMessage && downloadStatus.errorMessage !== "0" ? downloadStatus.errorMessage : "") ||
    statusReadError

  const isTorrentsDetails = isTorrent
    ? ([
        {
          label: "Number Seeders: ",
          value: downloadStatus?.numSeeders ?? "0",
          showDetails: isTorrent,
          icon: <DeviceHub color={"success"} />
        },
        {
          label: "Upload length: ",
          value: downloadStatus?.uploadLength ?? "0",
          showDetails: isTorrent,
          icon: <FileUploadOutlined color={"success"} />
        }
      ] as TDetails[])
    : ([] as TDetails[])

  const details: TDetails[] = [
    {
      label: "Speed : ",
      // formatBytes renders "—" whenever speed is not reported yet.
      value: formatBytes(downloadStatus?.downloadSpeed, 1),
      icon: <SpeedIcon color={"success"} />,
      showDetails: true
    },
    {
      label: "Link : ",
      value: downloadStatus?.files?.[0]?.uris?.[0]?.uri ?? (isYtDlpDownload ? (ytDlpStatus?.url ?? "") : ""),
      icon: <InsertLinkIcon color={"success"} />,
      showDetails: !isTorrent
    },
    {
      label: "Saved Path : ",
      value: downloadStatus?.dir ?? "",
      icon: <SaveIcon color={"success"} />,
      showDetails: true
    },
    {
      label: "Connection :",
      value: downloadStatus?.connections ?? 0,
      icon: <HubIcon color={"success"} />,
      showDetails: true
    },
    {
      label: "Status :",
      value: downloadStatus?.status ?? "",
      icon: <TaskAltIcon color={"success"} />,
      showDetails: true
    },
    {
      label: "File Size:",
      // Unknown until aria2 reports a positive totalLength (e.g. metadata phase).
      value: hasKnownSize ? formatBytes(totalLength) : "—",
      icon: <SaveAsIcon color={"success"} />,
      showDetails: true
    },
    {
      label: "Downloaded Size:",
      value: formatBytes(completedLength),
      icon: <SaveAltIcon color={"success"} />,
      showDetails: true
    },
    {
      label: "Eta :",
      value: hasKnownSize || isYtDlpDownload ? formatTime(remainingSeconds) : "—",
      icon: <AccessTimeIcon color={"success"} />,
      showDetails: true
    },
    {
      label: "Error :",
      value: downloadError,
      icon: <ErrorOutlineIcon color={"error"} />,
      showDetails: !!downloadError
    },
    ...isTorrentsDetails
  ]
  return (
    <div className="flex flex-col w-full h-full">
      <CustomTitleBar id={gid} widthTitleBar="30%">
        <div
          className={clsx(
            "w-fit bg-[#0d1420] max-w-[68%]  mb-1 text-center  rounded-xl font-medium px-3  border border-[rgba(255,255,255,0.2)] truncate",
            styles.slideUp
          )}
        >
          {filename}
        </div>
      </CustomTitleBar>
      <div
        className={clsx(
          "w-full h-full flex justify-center items-center overflow-hidden rounded-xl border-r border-l border-b border-[rgba(255,255,255,0.3)]",
          styles.backgroundStyle
        )}
      >
        <div className={styles.container}>
          <div className={clsx(styles.card)}>
            <div className={styles.back}>
              <BackDetails
                gid={gid}
                details={details}
                downloadStatus={downloadStatus}
                savePath={downloadStatus?.dir ?? ""}
                isMetaData={isMetaData}
                isTorrent={isTorrent}
                downloadSource={downloadSource}
                progressPercent={isYtDlpDownload ? ytDlpStatus?.percent : undefined}
                onCancelDownload={isYtDlpDownload ? cancelYtDlpDownload : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DownloadStart
