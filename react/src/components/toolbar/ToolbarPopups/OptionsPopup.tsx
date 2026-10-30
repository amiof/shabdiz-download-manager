import CustomTitleBar from "@components/customTilebar/CustomTitleBar.tsx"
import Aria2Conf from "@components/toolbar/ToolbarPopups/Aria2Conf.tsx"
import ProxyConfig from "@components/toolbar/ToolbarPopups/ProxyConfig.tsx"
import StorageConf from "@components/toolbar/ToolbarPopups/StorageConf.tsx"
import TorrentConf from "@components/toolbar/ToolbarPopups/torrentConf.tsx"
import { TOptionsTabs } from "@components/toolbar/types.ts"
import { Hub, PlayForWork, SdCard, VpnLock } from "@mui/icons-material"
import { Tab, Tabs } from "@mui/material"
import { getIdFromLocation } from "@src/utils.ts"
import clsx from "clsx"
import { useState } from "react"
import { useLocation } from "react-router-dom"
import styles from "../style.module.scss"

const OptionsPopup = () => {
  const [value, setValue] = useState<TOptionsTabs>("aria2")

  const location = useLocation()
  const id = getIdFromLocation(location, ":")

  const handleChange = (_event: React.SyntheticEvent, newValue: TOptionsTabs) => {
    setValue(newValue)
  }
  const changeComponents = () => {
    switch (value) {
      case "proxy":
        return <ProxyConfig id={id} />
      case "aria2":
        return <Aria2Conf id={id} />
      case "storage":
        return <StorageConf id={id} />
      case "torrent":
        return <TorrentConf id={id} />
      default:
        return <ProxyConfig id={id} />
    }
  }

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      <CustomTitleBar id={id} widthTitleBar="40%">
        <div
          className={clsx(
            "w-25 bg-[#0d1420] mb-1 text-center border border-[rgba(255,255,255,0.3)] rounded-xl font-bold",
            styles.slideUp
          )}
        >
          options
        </div>
      </CustomTitleBar>
      <div
        className={
          "w-full flex-1 min-h-0 border-r border-l border-b border-[rgba(255,255,255,0.3)] rounded-xl flex bg-[radial-gradient(circle_at_15%_10%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(34,197,94,0.10),transparent_32%),linear-gradient(145deg,#05080d_0%,#0a1019_45%,#0d1420_100%)]"
        }
      >
        <div className={"w-1/4 h-full border-r border-r-stone-700"}>
          <Tabs orientation={"vertical"} variant="scrollable" value={value} onChange={handleChange}>
            <Tab label={"aria2"} value={"aria2"} iconPosition={"start"} icon={<PlayForWork />} />
            <Tab label={"storage"} value={"storage"} iconPosition={"start"} icon={<SdCard />} />
            <Tab label={"TORRENT"} value={"torrent"} iconPosition={"start"} icon={<Hub />} />
            <Tab label={"proxy"} value={"proxy"} iconPosition={"start"} icon={<VpnLock />} />
          </Tabs>
        </div>

        <div className={"w-full"}>{changeComponents()}</div>
      </div>
    </div>
  )
}

export default OptionsPopup
