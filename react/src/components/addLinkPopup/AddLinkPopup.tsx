import useAddLinkStore from "@components/addLinkPopup/store/addLinkStore.ts"
import AddLinkOptions from "@components/addLinkPopup/tabs/AddLinkOptions.tsx"
import AddLinkProxy from "@components/addLinkPopup/tabs/AddLinkProxy.tsx"
import AddLinkTab from "@components/addLinkPopup/tabs/AddLinkTab.tsx"
import AddTorrentTab from "@components/addLinkPopup/tabs/AddTorrentTab.tsx"
import { TAddLinkTabs, TTorrentInputType, TTorrentStep } from "@components/addLinkPopup/types.ts"
import CustomTitleBar from "@components/customTilebar/CustomTitleBar.tsx"
import { AddLink, Settings, VpnLock } from "@mui/icons-material"
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined"
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined"
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined"
import NavigateNextOutlinedIcon from "@mui/icons-material/NavigateNextOutlined"
import { Button, Tab, Tabs } from "@mui/material"
import useDownloaderStore from "@src/store/downloaderStore.ts"
import { resMetadataUrls } from "@src/types.ts"
import { getIdFromLocation } from "@src/utils.ts"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import styles from "./sytle.module.scss"

type TSwitchToTorrentLink = {
  isMagnet: boolean,
  isTorrent: boolean,
  linkAddress: string,
}
const AddLinkPopup = () => {
  const closePopupWindow = window.electronAPI.closePopupWindow
  const addDownloadDir = window.electronAPI.addDownloadDir
  const addDownloadPopup = window.electronAPI.addDownloadPopup

  const [switchToTorrentLink, setSwitchToTorrentLink] = useState<TSwitchToTorrentLink>({
    isMagnet: false,
    isTorrent: false,
    linkAddress: ""
  })

  const [clipboardLink, setClipboardLink] = useState("")

  const location = useLocation()
  const id = getIdFromLocation(location, ":")

  const linkAddressStore = useAddLinkStore((state) => state.linkAddressStore)
  const savePathStore = useAddLinkStore((state) => state.savePathStore)
  const fileNameStore = useAddLinkStore((state) => state.fileNameStore)
  const proxyConfigs = useAddLinkStore((state) => state.proxyConfig)
  const options = useAddLinkStore((state) => state.options)
  const setDownloadDataToElectron = useDownloaderStore((state) => state.setActiveDataToElectron)

  // Detect clipboard content once on mount
  useEffect(() => {
    (async () => {
      try {
        const clipboardContent = await window.electronAPI.readClipboard()
        if (clipboardContent.trim().startsWith("magnet:")) {
          setSwitchToTorrentLink({ isMagnet: true, isTorrent: false, linkAddress: clipboardContent })
          return
        }
        const cleanUrl = new URL(clipboardContent)
        cleanUrl.search = ""
        if (cleanUrl.toString().endsWith(".torrent")) {
          setSwitchToTorrentLink({ isMagnet: false, isTorrent: true, linkAddress: clipboardContent })
          return
        }
        // Normal link - pass to AddLinkTab
        setClipboardLink(clipboardContent)
      } catch {
        // Clipboard content is not a valid URL, ignore
      }
    })()
  }, [])

  // Switch to Torrent tab once when clipboard is detected as magnet/torrent
  useEffect(() => {
    if (switchToTorrentLink.isTorrent || switchToTorrentLink.isMagnet) {
      setValue("Torrent")
    }
  }, [switchToTorrentLink])

  const downloadHandler = async () => {
    if (linkAddressStore) {
      const gid = await addDownloadDir(linkAddressStore, savePathStore, fileNameStore, proxyConfigs, options)
      addDownloadPopup(gid, fileNameStore)
      closePopupWindow(id)
    }
  }
  const addDownloadLink = async () => {
    const gid = await addDownloadDir(linkAddressStore, savePathStore, fileNameStore, proxyConfigs, options)
    const tellStatus = await window.electronAPI.getTellStatus(gid)
    setDownloadDataToElectron(tellStatus)
    window.electronAPI.stopDownloadByGid(gid)
    setTimeout(async () => {
      closePopupWindow(id)
    }, 1000)
  }

  const [value, setValue] = useState<TAddLinkTabs>("Link")
  const [torrentInputType, setTorrentInputType] = useState<TTorrentInputType>("Magnet URL")
  const [torrentInputValue, setTorrentInputValue] = useState("")
  const [torrentMetadata, setTorrentMetadata] = useState<resMetadataUrls | null>(null)
  const [selectedTorrentIndexes, setSelectedTorrentIndexes] = useState<number[]>([])
  const [torrentStep, setTorrentStep] = useState<TTorrentStep>("metadata")
  const [torrentLoading, setTorrentLoading] = useState(false)
  const [torrentError, setTorrentError] = useState("")

  const handleChange = (_event: React.SyntheticEvent, newValue: TAddLinkTabs) => {
    setValue(newValue)
  }

  const resetTorrentResult = () => {
    setTorrentMetadata(null)
    setSelectedTorrentIndexes([])
    setTorrentStep("metadata")
    setTorrentError("")
  }

  const handleTorrentInputTypeChange = (inputType: TTorrentInputType) => {
    setTorrentInputType(inputType)
    setTorrentInputValue("")
    resetTorrentResult()
  }

  const handleTorrentInputValueChange = (inputValue: string) => {
    setTorrentInputValue(inputValue)
    resetTorrentResult()
  }

  const handleSelectTorrentFile = async () => {
    try {
      const selectedPath = await window.electronAPI.selectCookieFile("torrent")
      if (selectedPath) {
        setTorrentInputValue(selectedPath)
        resetTorrentResult()
      }
    }
    catch (error) {
      console.error("Failed to select torrent file:", error)
      setTorrentError("Failed to select a torrent file.")
    }
  }

  const handleTorrentMetadata = async () => {
    const inputValue = torrentInputValue.trim()
    if (!inputValue || torrentLoading) return
    try {
      if (torrentInputType === "Torrent File") {
        const metadata = await window.electronAPI.getTorrentMetadataFile(inputValue)
        setTorrentMetadata(metadata)
        setSelectedTorrentIndexes(metadata.torrentFiles?.map((_file, index) => index) ?? [])
      }
    }
    catch (error) {
      console.error("Failed to get torrent metadata File:", error)
    }

    if (torrentInputType === "Magnet URL" && !inputValue.startsWith("magnet:")) {
      setTorrentError("Enter a valid magnet URL.")
      return
    }

    if (torrentInputType === "Torrent Link") {
      try {
        const url = new URL(inputValue)
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Invalid protocol")
      }
      catch {
        setTorrentError("Enter a valid HTTP or HTTPS torrent link.")
        return
      }
    }

    setTorrentLoading(true)
    setTorrentError("")
    try {
      if (torrentInputType === "Torrent Link" || torrentInputType === "Magnet URL") {
        const metadata =
          torrentInputType === "Magnet URL"
            ? await window.electronAPI.getMagnetMetadataUrls(inputValue)
            : await window.electronAPI.getTorrentMetadataUrls(inputValue)
        setTorrentMetadata(metadata)
        setSelectedTorrentIndexes(metadata.torrentFiles?.map((_file, index) => index) ?? [])
      }
    }
    catch (error) {
      console.error("Failed to get torrent metadata:", error)
      setTorrentError("Failed to retrieve torrent metadata.")
    }
    finally {
      setTorrentLoading(false)
    }
  }

  const downloadTorrentHandler = async () => {
    const indexes = selectedTorrentIndexes.map((torrentIndex) => {
      return torrentIndex + 1
    })
    const joinIndexes = indexes.join(",")
    let gid

    if (torrentInputType === "Torrent File") {
      const inputValue = torrentInputValue.trim()
      gid = await window.electronAPI.addTorrentUrl(
        joinIndexes,
        inputValue
      )
    }
    else {

      gid = await window.electronAPI.addTorrentUrl(
        joinIndexes,
        `${torrentMetadata?.savePath}/${torrentMetadata?.torrentInfoHash}.torrent`
      )
    }
    addDownloadPopup(gid, torrentMetadata?.fileName ?? "torrent download")
    closePopupWindow(id)

  }

  const changeComponents = () => {
    switch (value) {
      case "Link":
        return <AddLinkTab initialLink={clipboardLink} />
      case "Proxy":
        return <AddLinkProxy />
      case "Options":
        return <AddLinkOptions />
      case "Torrent":
        return (
          <AddTorrentTab
            setSwitchToTorrentLink={setSwitchToTorrentLink}
            switchToTorrentLink={switchToTorrentLink}
            inputType={torrentInputType}
            inputValue={torrentInputValue}
            metadata={torrentMetadata}
            selectedTorrentIndexes={selectedTorrentIndexes}
            step={torrentStep}
            loading={torrentLoading}
            error={torrentError}
            onInputTypeChange={handleTorrentInputTypeChange}
            onInputValueChange={handleTorrentInputValueChange}
            onSelectTorrentFile={handleSelectTorrentFile}
            onSubmit={handleTorrentMetadata}
            onSelectedTorrentIndexesChange={setSelectedTorrentIndexes}
          />
        )
      default:
        return <AddLinkTab initialLink={clipboardLink} />
    }
  }

  return (
    <div className="flex flex-col w-full h-full">
      <CustomTitleBar id={id}>
        <div
          className={clsx(
            "w-25 bg-[#0d1420] mb-1 text-center rounded-xl font-bold border border-[rgba(255,255,255,0.3)] ",
            styles.slideUp
          )}
        >
          add link
        </div>
      </CustomTitleBar>
      <div
        className={
          "h-full w-full border-r border-l border-b rounded-xl border-[rgba(255,255,255,0.3)] flex flex-col bg-[radial-gradient(circle_at_15%_10%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(34,197,94,0.10),transparent_32%),linear-gradient(145deg,#05080d_0%,#0a1019_45%,#0d1420_100%)] "
        }
      >
        <div className={"w-full px-10"}>
          <Tabs orientation={"horizontal"} variant="scrollable" value={value} onChange={handleChange}>
            <Tab label={"Link"} value={"Link"} iconPosition={"start"} icon={<AddLink sx={{ rotate: "120deg" }} />} />
            <Tab label={"Torrent"} value={"Torrent"} iconPosition={"start"} icon={<DownloadOutlinedIcon />} />
            <Tab label={"Proxy"} value={"Proxy"} iconPosition={"start"} icon={<VpnLock />} />
            <Tab label={"Options"} value={"Options"} iconPosition={"start"} icon={<Settings />} />
          </Tabs>
        </div>
        <div
          className={
            "flex items-center justify-center h-full border border-white/10 m-5  rounded-2xl backdrop-blur-2xl bg-white/5 shadow-2xl"
          }
        >
          {changeComponents()}
        </div>
        <div className={"flex items-center justify-between w-full px-10 h-[20%]"}>
          {value === "Torrent" ? (
            <div className={"flex gap-2"}>
              {torrentStep === "files" && (
                <div className={"flex gap-2"}>
                  <Button
                    variant={"outlined"}
                    size={"small"}
                    startIcon={<ArrowBackOutlinedIcon />}
                    onClick={() => setTorrentStep("metadata")}
                  >
                    Back
                  </Button>

                  <Button
                    variant={"contained"}
                    size={"small"}
                    color={"success"}
                    endIcon={<DownloadOutlinedIcon />}
                    onClick={downloadTorrentHandler}
                  >
                    Download
                  </Button>
                </div>
              )}
              {torrentStep === "metadata" && (
                <Button
                  variant={"outlined"}
                  color={"success"}
                  size={"small"}
                  endIcon={<NavigateNextOutlinedIcon />}
                  disabled={!torrentMetadata || torrentLoading}
                  onClick={() => setTorrentStep("files")}
                >
                  Next
                </Button>
              )}
            </div>
          ) : (
            <div className={"flex gap-2 "}>
              <Button
                variant={"contained"}
                color={"success"}
                size={"small"}
                endIcon={<DownloadOutlinedIcon />}
                disabled={!linkAddressStore || !savePathStore}
                onClick={downloadHandler}
              >
                download
              </Button>
              <Button
                variant={"outlined"}
                size={"small"}
                disabled={!linkAddressStore || !savePathStore}
                endIcon={<AddCircleOutlineOutlinedIcon />}
                onClick={addDownloadLink}
              >
                add
              </Button>
            </div>
          )}
          <Button variant={"contained"} color={"error"} size={"small"} onClick={() => closePopupWindow(id)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AddLinkPopup
