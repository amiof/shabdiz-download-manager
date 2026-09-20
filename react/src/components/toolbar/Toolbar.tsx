import ButtonAction from "@components/buttonAction/ButtonAction.tsx"
import AddLinkOutlinedIcon from "@mui/icons-material/AddLinkOutlined"
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined"
import DangerousOutlinedIcon from "@mui/icons-material/DangerousOutlined"
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined"
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined"
import ReplyOutlinedIcon from "@mui/icons-material/ReplyOutlined"
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined"
import StopOutlinedIcon from "@mui/icons-material/StopOutlined"
import { Divider, IconButton, InputAdornment, TextField } from "@mui/material"
import useDownloaderStore from "@src/store/downloaderStore.ts"
import { generateId } from "@src/utils.ts"
import { ReactElement, useEffect, useState } from "react"
import styles from "./style.module.scss"

type TButtonActions = {
  IconElement: ReactElement
  title: string
  action?: () => void
  badgeActive?: boolean
  tooltipText?: string
}

const Toolbar = () => {
  const getAllDownloads = useDownloaderStore((state) => state.getAllDownloadsRow)
  const getSelectedRows = useDownloaderStore((state) => state.selectedRows)
  const getCompletedRowsDB = useDownloaderStore((state) => state.getCompletedRowFromDB)
  const setSelectedRows = useDownloaderStore((state) => state.setSelectedRow)
  const refreshMainTableId = useDownloaderStore((state) => state.refreshMainTableId)

  const [schedulerConfig, setSchedulerConfig] = useState<{
    startTime: string | undefined
    endTime: string | undefined
  } | null>(null)

  useEffect(() => {
    const unsubscribe = window.electronAPI.onSchedulerConfigUpdated((config) => {
      if (config.startTime && config.endTime) {
        setSchedulerConfig({ startTime: config.startTime, endTime: config.endTime })
      } else {
        setSchedulerConfig(null)
      }
    })

    window.electronAPI.getSchedulerConfig().then((config) => {
      if (config.startTime && config.endTime) {
        setSchedulerConfig({ startTime: config.startTime, endTime: config.endTime })
      }
    })

    return unsubscribe
  }, [])

  const openOptionsHandler = () => {
    const id = generateId()
    openOptionsPopup(id)
  }

  const openSchedulerHandler = () => {
    const id = generateId()
    openSchedulerPopup(id)
  }

  const openShareHandler = () => {
    // Send selected rows to main process before opening popup
    window.electronAPI.setSelectedRowsForShare(getSelectedRows)
    const id = generateId()
    openSharePopup(id)
  }

  const openEditHandler = () => {
    if (!getSelectedRows[0]?.Gid) return
    // Send selected download to main process before opening popup
    window.electronAPI.setSelectedDownloadForEdit(getSelectedRows[0])
    const id = generateId()
    openEditDownloadPopup(id)
  }

  const firstButtonActions: TButtonActions[] = [
    {
      IconElement: <PlayArrowOutlinedIcon fontSize={"medium"} />,
      title: "Resume",
      action: () => {
        if (getSelectedRows[0]?.Gid) {
          window.electronAPI.addDownloadPopup(getSelectedRows[0].Gid, getSelectedRows[0].FileName??"downloading..")
          window.electronAPI.unPauseByGid(getSelectedRows[0].Gid)
          getAllDownloads()
        }
      }
    },
    {
      IconElement: <StopOutlinedIcon fontSize={"medium"} />,
      title: "Stop",
      action: () => {
        if (getSelectedRows[0]?.Gid) {
          window.electronAPI.stopDownloadByGid(getSelectedRows[0].Gid)
        }
      }
    },
    {
      IconElement: <DangerousOutlinedIcon fontSize={"medium"} />,
      title: "Stop All",
      action: () => {
        window.electronAPI.stopAllDownloads()
      }
    }
  ]
  const secondButtonActions: TButtonActions[] = [
    {
      IconElement: <DeleteOutlineOutlinedIcon fontSize={"medium"} />,
      title: "Delete",
      action: async () => {
        const gidList = []
        for (const item of getSelectedRows) {
          gidList.push(item.Gid)
        }
        window.electronAPI.removeSelectedDownloads(gidList)
        await getCompletedRowsDB()
        setSelectedRows([])
        refreshMainTableId(generateId())
      }
    },
    {
      IconElement: <SettingsOutlinedIcon fontSize={"medium"} />,
      title: "Options",
      action: openOptionsHandler
    },
    {
      IconElement: <EditOutlinedIcon fontSize={"medium"} />,
      title: "Edit",
      action: openEditHandler,
      tooltipText: getSelectedRows[0]?.Gid
        ? `Edit options for ${getSelectedRows[0].FileName || getSelectedRows[0].Gid}`
        : "Select a download to edit"
    },

    {
      IconElement: <PendingActionsOutlinedIcon fontSize={"medium"} />,
      title: "Scheduler",
      action: openSchedulerHandler,
      badgeActive: !!schedulerConfig,
      tooltipText: schedulerConfig ? `Scheduled: ${schedulerConfig.startTime} → ${schedulerConfig.endTime}` : undefined
    },
    {
      IconElement: <ReplyOutlinedIcon sx={{ transform: "ScaleX(-1)" }} fontSize={"medium"} />,
      title: "Share",
      action: openShareHandler
    }
  ]
  
  // const addDownloadDir = window.electronAPI.addDownloadDir
  const addLinkPopup = window.electronAPI.addLinkPopup
  const openOptionsPopup = window.electronAPI.openOptionsPopup
  const openSchedulerPopup = window.electronAPI.openSchedulerPopup
  const openSharePopup = window.electronAPI.openSharePopup
  const openEditDownloadPopup = window.electronAPI.openEditDownloadPopup
  
  // const getAllDownloadRow = useDownloaderStore((state) => state.getAllDownloadsRow)

  const clickHandler = async () => {
    console.log("this is test for download")
    // const result = await addDownloadDir(
    //   "https://www.pixelstalk.net/wp-content/uploads/2016/08/Best-Free-Desktop-Wallpaper-HD.jpg"
    // )
    // if (result) {
    //   getAllDownloadRow()
    // }
  }
  const createPopup = () => {
    const id = generateId()
    addLinkPopup(id)
  }

  return (
    <div className={styles.container}>
      <div className={"px-5"}>
        <TextField
          size={"small"}
          placeholder={"Add Url"}
          sx={{
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderRadius: "15px",
            color: "white",
            width: "180px",
            "& .MuiOutlinedInput-root": {
              borderRadius: "15px",
              "&.Mui-focused fieldset": {
                border: "0.5px solid green",
                borderRadius: "15px",
                outline: "none"
              },
              "&:hover fieldset": {
                borderColor: "green",
                borderRadius: "15px",
                outline: "none"
              }
            }
          }}
          slotProps={{
            input: {
              style: { color: "white" }, // Change text color to green
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton onClick={clickHandler}>
                    <AddLinkOutlinedIcon
                      style={{
                        color: "white",
                        rotate: "300deg",
                        transform: "scaleX(-1)"
                      }}
                    />
                  </IconButton>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position={"end"}>
                  <IconButton onClick={createPopup}>
                    <CloudDownloadOutlinedIcon sx={{ color: "white" }} />
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
        />
      </div>

      <Divider orientation={"vertical"} variant={"middle"} flexItem className={"bg-neutral-700"} />

      <div className={styles.secondLineAction}>
        {firstButtonActions.map((item, index) => (
          <ButtonAction
            key={`buttonAction-${index}`}
            iconElement={item.IconElement}
            title={item.title}
            action={item.action ? item.action : undefined}
          />
        ))}
      </div>

      <Divider orientation={"vertical"} variant={"middle"} flexItem className={"bg-neutral-700"} />

      <div className={styles.secondLineAction}>
        {secondButtonActions.map((item, index) => (
          <ButtonAction
            key={`secondButtonAction-${index}`}
            iconElement={item.IconElement}
            title={item.title}
            action={item.action}
            badgeActive={item.badgeActive}
            tooltipText={item.tooltipText}
          />
        ))}
      </div>
    </div>
  )
}

export default Toolbar
