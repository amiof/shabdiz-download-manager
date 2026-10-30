import { Button, FormControl, Switch, TextField } from "@mui/material"
import { TTorrentConfig } from "@src/store/storeType"
import { useEffect, useState } from "react"

type Props = {
  id: string
}
type TorrentField =
  | {
      key: keyof TTorrentConfig
      label: string
      type: "switch"
    }
  | {
      key: keyof TTorrentConfig
      label: string
      type: "text"
      inputType?: string
    }

const torrentFields: TorrentField[] = [
  { key: "enableDht", label: "Enable DHT", type: "switch" },
  { key: "enableDht6", label: "Enable DHT6", type: "switch" },
  { key: "enableLpd", label: "Enable LPD", type: "switch" },
  { key: "enablePeerExchange", label: "Enable Peer Exchange", type: "switch" },

  { key: "maxPeers", label: "Max Peers", type: "text" },
  { key: "requestPeerSpeedLimit", label: "Request Peer Speed Limit", type: "text" },
  { key: "seedTime", label: "Seed Time", type: "text" },
  { key: "seedRatio", label: "Seed Ratio", type: "text" },
  { key: "stopTimeout", label: "Stop Timeout", type: "text" },
  { key: "maxOverallUploadLimit", label: "Max Overall Upload Limit", type: "text" },
  { key: "maxUploadLimit", label: "Max Upload Limit", type: "text" },
  { key: "maxOverallDownloadLimit", label: "Max Overall Download Limit", type: "text" },
  { key: "tracker", label: "Add Trackers", type: "text" }
]

const TorrentConf = ({ id }: Props) => {
  const closePopupWindow = window.electronAPI.closePopupWindow

  const [formValues, setFormValues] = useState<TTorrentConfig>({
    enableDht: true,
    enableDht6: true,
    enableLpd: true,
    enablePeerExchange: true,

    maxPeers: "",
    requestPeerSpeedLimit: "",
    seedTime: "",
    seedRatio: "",
    stopTimeout: "",
    maxOverallUploadLimit: "",
    maxUploadLimit: "",
    maxOverallDownloadLimit: "",
    tracker: null
  })

  useEffect(() => {
    ;(async () => {
      const defaultConfig = await window.electronAPI.getTorrentConfig()
      setFormValues(defaultConfig)
    })()
  }, [])

  const handleChange = (key: keyof TTorrentConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value

    setFormValues((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const submitHandler = (e: React.FormEvent) => {
    e.preventDefault()
    window.electronAPI.setTorrentConfig(formValues)
    window.electronAPI.showNotification({
      title: "Torrent Settings Saved",
      body: "Your torrent configuration has been saved successfully.\nRestart the app to apply changes if needed."
    })
  }

  return (
    <div className="flex justify-center w-full h-full min-h-0">
      <form onSubmit={submitHandler} className="flex flex-col w-full h-full min-h-0 pt-8 ">
        <div className="flex-1 min-h-0 overflow-y-auto light-scrollbar flex justify-center">
          <FormControl className="w-[80%] mx-auto gap-3">
            {torrentFields.map((field) => (
              <div key={field.key} className="flex items-center justify-between">
                <p>{field.label}</p>

                {field.type === "switch" ? (
                  <Switch checked={formValues[field.key] as boolean} onChange={handleChange(field.key)} />
                ) : (
                  <TextField
                    size="small"
                    value={formValues[field.key] as string}
                    onChange={handleChange(field.key)}
                    type={field.inputType ?? "text"}
                  />
                )}
              </div>
            ))}
          </FormControl>
        </div>

        <div className="w-full flex justify-end gap-2 shrink-0 pr-5 pb-3 pt-3">
          <Button type="submit" variant="contained">
            Save
          </Button>
          <Button variant="outlined" onClick={() => closePopupWindow(id)}>
            Close
          </Button>
        </div>
      </form>
    </div>
  )
}

export default TorrentConf
