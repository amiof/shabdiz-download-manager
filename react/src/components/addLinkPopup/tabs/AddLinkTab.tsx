import useAddLinkStore from "@components/addLinkPopup/store/addLinkStore.ts"
import CancelIcon from "@mui/icons-material/Cancel"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import FolderOpenIcon from "@mui/icons-material/FolderOpen"
import { IconButton, InputAdornment, TextField } from "@mui/material"
import { resMetadataUrls } from "@src/types.ts"
import { formatBytes, getFileName } from "@src/utils.ts"
import { useCallback, useEffect, useState } from "react"

type Props = {
  initialLink?: string
}
const AddLinkTab = (props: Props) => {
  const { initialLink } = props

  const linkAddressStore = useAddLinkStore((state) => state.linkAddressStore)
  const savePathStore = useAddLinkStore((state) => state.savePathStore)
  const fileNameStore = useAddLinkStore((state) => state.fileNameStore)
  const setLinkAddressStore = useAddLinkStore((state) => state.setLinkAddressStore)
  const setFileNameStore = useAddLinkStore((state) => state.setFileNameStore)
  const setSavePathStore = useAddLinkStore((state) => state.setSavePathStore)


  const [linkAddress, setLinkAddress] = useState<string>(initialLink || linkAddressStore)
  const [selectedDownloadPath, setSelectedDownloadPath] = useState<string>(savePathStore)
  const [fileName, setFileName] = useState<string>(fileNameStore)
  const [metadataUrl, setMetadataUrl] = useState<resMetadataUrls>({
    size: "0",
    typeUrl: "direct",
    fileName: "",
    savePath: "",
    resume: null
  })
  useEffect(() => {
    if(initialLink){
      setLinkAddress(initialLink)
    }
  }, [initialLink])

  useEffect(() => {
    if (savePathStore) {
      setMetadataUrl({ ...metadataUrl, savePath: savePathStore })
    }
  }, [])

  useEffect(() => {
    setSavePathStore(metadataUrl.savePath)
  }, [metadataUrl.savePath])

  useEffect(() => {
    setLinkAddressStore(linkAddress)

    if (linkAddress) {
      ;(async () => {
        const resMetadata = await window.electronAPI.getMetadataUrls(linkAddress)
        if (selectedDownloadPath) {
          setMetadataUrl({ ...resMetadata, savePath: selectedDownloadPath })
        }
        else {
          setMetadataUrl(resMetadata)
        }
      })()
    }
    else {
      if (selectedDownloadPath) {
        setMetadataUrl({ size: "0", typeUrl: "direct", fileName: "", savePath: selectedDownloadPath, resume: null })
      }
      else {
        setMetadataUrl({ size: "0", typeUrl: "direct", fileName: "", savePath: "", resume: null })
      }
    }
  }, [linkAddress])

  const defaultFileName = useCallback(() => {
    if (fileName) {
      return fileName
    }

    if (linkAddress) {
      if (metadataUrl.fileName) {
        return metadataUrl.fileName
      }
      else {
        return getFileName(linkAddress)
      }
    }
    else {
      return ""
    }
  }, [fileName, metadataUrl.fileName, linkAddress])

  useEffect(() => {
    setFileNameStore(defaultFileName())
  }, [fileName, metadataUrl.fileName, linkAddress])

  const handleSelectDirectory = async () => {
    const selectedPath = (await window.electronAPI.selectStorageDirectory()) as string | null
    if (selectedPath) {
      setSelectedDownloadPath(selectedPath)
      setMetadataUrl({ ...metadataUrl, savePath: selectedPath })
    }
  }

  return (
    <div className={"flex gap-9 p-10 w-full flex-col"}>
      <TextField
        color={"success"}
        size={"small"}
        value={linkAddress}
        variant={"outlined"}
        sx={{ width: "97%" }}
        placeholder={"http://www.example.com"}
        label={"Link"}
        onChange={(e) => setLinkAddress(e.target.value)}
      />

      <TextField
        color={"success"}
        size={"small"}
        variant={"outlined"}
        value={defaultFileName()}
        onChange={(e) => setFileName(e.target.value)}
        sx={{ width: "97%" }}
        placeholder={"file.zip"}
        label={"File name"}
      />

      <div className={"flex w-full  justify-between items-center"}>
        <TextField
          label="Storage Path"
          sx={{ width: "80%" }}
          value={metadataUrl?.savePath}
          size="small"
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleSelectDirectory} edge="end">
                  <FolderOpenIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        {metadataUrl.size && +metadataUrl?.size !== 0 && <span>{formatBytes(+metadataUrl.size)}</span>}
      </div>
      <div>
        {linkAddress && metadataUrl.resume !== null ? (
          metadataUrl.resume ? (
            <div className={"flex"}>
              <CheckCircleIcon color={"success"} />

              <p className={"text-green-500"}>resume available</p>
            </div>
          ) : (
            <div className={"flex"}>
              <CancelIcon color={"error"} />

              <p className={"text-red-500"}>resume unavailable</p>
            </div>
          )
        ) : (
          <span className={"block"}> </span>
        )}
      </div>

      {/*<TextField color={"success"} size={"small"} variant={"outlined"} value={64} sx={{ width: "30%" }}*/}
      {/*           placeholder={"64"} label={"connections"} />*/}
    </div>
  )
}

export default AddLinkTab
