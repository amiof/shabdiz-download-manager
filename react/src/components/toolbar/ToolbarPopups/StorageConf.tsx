import { Button, IconButton, InputAdornment, TextField } from "@mui/material"
import ConfigInfo from "./ConfigInfo.tsx"
import FolderOpenIcon from "@mui/icons-material/FolderOpen"
import { useEffect, useState } from "react"

type Props = {
  id: string
}

const StorageConf = (props: Props) => {
  const { id } = props
  const closePopupWindow = window.electronAPI.closePopupWindow

  const [basePath, setBasePath] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const path = await window.electronAPI.getSelectedStorageDirectory()
      setBasePath(path)
    })()
  }, [])

  const handleSelectDirectory = async () => {
    const selectedPath = (await window.electronAPI.selectStorageDirectory()) as string | null
    if (selectedPath) {
      setBasePath(selectedPath)
      // Optionally save it back via another API call
      // await window.electronAPI.setStoragePathConfig(selectedPath);
    }
  }

  const saveHandleer = async () => {
    await window.electronAPI.setSelectedStorageDirectory(basePath)
    await window.electronAPI.showNotification({
      title: "Storage Settings Saved",
      body: "Your storage configuration has been saved successfully.\n for use config please restart program"
    })
  }

  return (
    <div className="flex justify-center items-start pt-12 w-full h-full">
      <div className="flex items-center gap-2 w-[80%]">
        <ConfigInfo label="Storage Path" description="Folder where new downloads are saved." />
        <TextField
          label="Storage Path"
          size="small"
          value={basePath || ""}
          sx={{ width: "100%" }}
          slotProps={{
            input: {
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSelectDirectory} edge="end">
                    <FolderOpenIcon />
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
        />
      </div>

      <div className={"w-full flex justify-end gap-2 absolute bottom-3 right-5"}>
        <Button variant="contained" color="primary" onClick={saveHandleer}>
          Save
        </Button>
        <Button variant="outlined" onClick={() => closePopupWindow(id)}>
          Close
        </Button>
      </div>
    </div>
  )
}

export default StorageConf
