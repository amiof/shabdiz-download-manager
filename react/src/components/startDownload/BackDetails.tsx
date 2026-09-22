import ChunkMap from "@components/startDownload/ChunkMap.tsx"
import SpeedGraph from "@components/startDownload/SpeedGraph.tsx"
import { TDetails } from "@components/startDownload/startDownload.tsx"
import CancelIcon from "@mui/icons-material/Cancel"
import DeleteIcon from "@mui/icons-material/Delete"
import FolderIcon from "@mui/icons-material/Folder"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import StopIcon from "@mui/icons-material/Stop"
import { SpeedDial, SpeedDialAction, SpeedDialIcon, Tooltip } from "@mui/material"
import MagnetIcon from "@src/assets/MagnetIcon.tsx"
import useDownloaderStore from "@src/store/downloaderStore.ts"
import { STATUS_TYPE, TtellRes } from "@src/types.ts"
import { toFiniteNumber } from "@src/utils.ts"
import { ReactElement, useEffect, useState } from "react"
import { ProgressBar } from "react-progressbar-fancy"
import styles from "./style.module.scss"
import SeedIcon from "@src/assets/seedIcon.tsx"
import Typography from "@mui/material/Typography"

type Props = {
  details: TDetails[]
  downloadStatus: TtellRes | null
  savePath: string
  isMetaData: boolean
  isTorrent: boolean
  gid: string
}
type actionButton = {
  Icon: ReactElement
  title: string
  action?: () => void
}
const BackDetails = (props: Props) => {
  const { details, downloadStatus, savePath, isTorrent, isMetaData, gid } = props

  const closePopup = window.electronAPI.closePopupWindow
  const getAllDownloads = useDownloaderStore((state) => state.getAllDownloadsRow)
  const setDownloadDataToElectron = useDownloaderStore((state) => state.setActiveDataToElectron)

  const [open, setOpen] = useState(false)

  const delecteAction = async () => {
    window.electronAPI.removeSelectedDownloads([gid])
    const tellStatus = await window.electronAPI.getTellStatus(gid)
    if (tellStatus) setDownloadDataToElectron(tellStatus)
    closePopup(gid)
  }

  useEffect(() => {
    setTimeout(() => {
      setOpen(true)
    }, 300)
  }, [])

  const totalLength = toFiniteNumber(downloadStatus?.totalLength)
  const completedLength = toFiniteNumber(downloadStatus?.completedLength)

  const isComplete = downloadStatus?.status === STATUS_TYPE.COMPLETE
  const numSeeders = toFiniteNumber(downloadStatus?.numSeeders)
  // Show the magnet state once seeders are actually known or the torrent is done.
  const hasSeeders = numSeeders > 0 || isComplete

  const percentage =
    !isMetaData && totalLength > 0
      ? Math.min(
        100,
        Math.max(
          0,
          Number(((completedLength / totalLength) * 100).toFixed(0))
        )
      )
      : 0

  const actionButtonData: actionButton[] = [
    {
      action: () => {
        window.electronAPI.stopDownloadByGid(gid)
      },
      Icon: <StopIcon sx={{ color: "darkgray", width: "24px", height: "32px" }} />,
      title: "Pause"
    },
    {
      action: () => {
        window.electronAPI.unPauseByGid(gid)
        getAllDownloads()
      },
      Icon: <PlayArrowIcon sx={{ color: "darkgray", width: "24px", height: "32px" }} />,
      title: "Resume"
    },
    {
      action: () => delecteAction(),
      Icon: <DeleteIcon sx={{ color: "darkgray", width: "24px", height: "32px" }} />,
      title: "delete"
    },
    {
      action: () => closePopup(gid),
      Icon: <CancelIcon sx={{ color: "darkgray", width: "24px", height: "32px" }} />,
      title: "Close"
    },
    {
      action: () => {
        if (savePath) window.electronAPI.openFolder(savePath)
      },
      Icon: <FolderIcon sx={{ color: "darkgray", width: "24px", height: "32px" }} />,
      title: "open"
    }
  ]

  return (
    <>
      <div className={styles.backDetailsContainer}>
        <div className={"h-full w-[50%] flex flex-col justify-between items-center"}>
          <div
            className={
              "h-[68%] border border-white/10 rounded-lg w-full  flex flex-wrap gap-x-5 px-3 backdrop-blur-3xl bg-white/5 shadow-xl"
            }
          >
            <div className={"pt-4 w-full"}>
              {isTorrent && (
                <>
                  {
                    hasSeeders ?
                      <div
                        className={"absolute bottom-2 right-3 animate-pulse border p-1 pl-2 rounded-xl border-white/10  bg-white/5 backdrop-blur-lg flex flex-col items-center justify-center "}>
                        <MagnetIcon style={{ fontSize: "46px" }} />
                      </div>
                      :
                      <div
                        className={"absolute bottom-2 right-3 animate-pulse flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-white/10 backdrop-blur-lg "}>
                        <SeedIcon style={{ fontSize: "46px" }} />
                        <Typography variant={"caption"}>Finding Seeders...</Typography>
                      </div>
                  }
                </>
              )}
              {details.map(
                (item, index) =>
                  item.showDetails && (
                    <div key={`details-${index}`} className="flex items-center gap-2 max-w-[100%] ">
                      <Tooltip title={item.value} placement="bottom">
                        <div className="inline-flex items-center shrink-0 gap-1.5">
                          {item.icon}
                          <span className="font-medium">{item.label}</span>
                        </div>
                      </Tooltip>

                      <span className="text-neutral-400 truncate">{item.value}</span>
                    </div>
                  )
              )}
            </div>
          </div>

          <div
            className={
              "flex flex-col gap-x-5 flex-wrap w-full h-[30%] border border-white/10 rounded-lg  items-center justify-evenly backdrop-blur-lg bg-white/5 shadow-xl"
            }
          >
            <div className={"px-6 w-full"}>
              <ProgressBar progressColor={"green"} label={""} darkTheme score={percentage} />
            </div>

            <SpeedDial
              ariaLabel="More actions"
              icon={<SpeedDialIcon />}
              direction="right"
              open={open}
              onClick={() => setOpen((prev) => !prev)}
              FabProps={{
                size: "small",
                sx: {
                  backgroundColor: "#222",
                  color: "#00f5ff",
                  ":hover": {
                    backgroundColor: "#222"
                  }
                }
              }}
              sx={{
                bottom: 15,
                left: 15
              }}
            >
              {actionButtonData.map((action) => (
                <SpeedDialAction
                  key={action.title}
                  icon={action.Icon}
                  tooltipTitle={action.title}
                  tooltipPlacement="bottom"
                  onClick={action.action}
                  sx={{
                    backgroundColor: "#222",
                    padding: "4px"
                  }}
                />
              ))}
            </SpeedDial>
          </div>
        </div>

        <div
          className={
            "w-[50%] h-full flex justify-center border border-white/10 rounded-lg backdrop-blur-3xl bg-white/4  shadow-xl "
          }
        >
          <div className={"h-full w-full px-8  flex flex-col items-center justify-evenly"}>
            <SpeedGraph speed={Number(downloadStatus?.downloadSpeed) || 0} />
            <ChunkMap percent={percentage} width={"100%"} gridTemp={"repeat(20, 1fr)"} />
          </div>
        </div>
      </div>
    </>
  )
}

export default BackDetails
