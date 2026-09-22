import CustomTitleBar from "@components/customTilebar/CustomTitleBar.tsx"
import BackDetails from "@components/startDownload/BackDetails.tsx"
import AccessTimeIcon from "@mui/icons-material/AccessTime"
import HubIcon from "@mui/icons-material/Hub"
import InsertLinkIcon from "@mui/icons-material/InsertLink"
import SaveIcon from "@mui/icons-material/Save"
import SaveAltIcon from "@mui/icons-material/SaveAlt"
import SaveAsIcon from "@mui/icons-material/SaveAs"
import SpeedIcon from "@mui/icons-material/Speed"
import TaskAltIcon from "@mui/icons-material/TaskAlt"
import useDownloaderStore from "@src/store/downloaderStore.ts"
import { TtellRes } from "@src/types.ts"
import { formatBytes, formatTime, isMetadataPhase, isTorrentMode, toFiniteNumber } from "@src/utils.ts"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import styles from "./style.module.scss"
import { DeviceHub, FileUploadOutlined } from "@mui/icons-material"

export type TDetails = {
  label: string
  value: number | string
  icon?: React.ReactElement
  showDetails?: boolean
}

const DownloadStart = () => {
  const { id, fileName } = useParams()

  const gid = id?.replace(/^:/, "") ?? ""
  const name = fileName?.replace(/^:/, "") ?? ""

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

  const [downloadStatus, setDownloadStatus] = useState<TtellRes | null>(null)

  const addLinkToDB = window.electronAPI.addLinkToDB
  const changeStatusDownload = window.electronAPI.updateDownloadRowStatus
  const currentDownloadRow = tellActive.find((downloadRow) => downloadRow.gid === gid)

  const totalLength = toFiniteNumber(downloadStatus?.totalLength)
  const completedLength = toFiniteNumber(downloadStatus?.completedLength)
  const downloadSpeed = toFiniteNumber(downloadStatus?.downloadSpeed)

  // Size is unknown until aria2 reports a positive totalLength (e.g. while
  // fetching torrent metadata), so don't derive an ETA from it yet.
  const hasKnownSize = totalLength > 0
  const remainingBytes = hasKnownSize ? Math.max(0, totalLength - completedLength) : 0
  const remainingSeconds = hasKnownSize && downloadSpeed > 0 ? remainingBytes / downloadSpeed : Infinity

  // const completeDownload = downloadStatus?.status === STATUS_TYPE.COMPLETE
  const getDownloadedFilesDetails = useDownloaderStore((state) => state.getDownloadedFilesDetails)

  useEffect(() => {
    //for add create add in dataGrid
    getDownloadedFilesDetails()
  }, [])

  useEffect(() => {
    if (currentDownloadRow) {
      ;(async () => {
        await addLinkToDB(currentDownloadRow)
      })()
    }
  }, [tellActive.length])

  useEffect(() => {
    if (!gid) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      try {
        const tellStatus = await window.electronAPI.getTellStatus(gid)
        // A failed/empty response must not wipe the last good status.
        if (cancelled || !tellStatus) return
        setDownloadStatus(tellStatus)
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
        setDownloadStatus(null)
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
  }, [gid, tellActive.length])

  const isMetaData = downloadStatus ? isMetadataPhase(downloadStatus) : true
  const isTorrent = downloadStatus ? isTorrentMode(downloadStatus) : false

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
      value: downloadStatus?.files?.[0]?.uris?.[0]?.uri ?? "",
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
      value: hasKnownSize ? formatTime(remainingSeconds) : "—",
      icon: <AccessTimeIcon color={"success"} />,
      showDetails: true
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DownloadStart
