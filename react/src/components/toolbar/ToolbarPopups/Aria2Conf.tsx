import { Button, FormControl, TextField } from "@mui/material"
import ConfigInfo from "./ConfigInfo.tsx"
import { useEffect, useState } from "react"
import { TAria2Config } from "@src/store/storeType"

type Props = {
  id: string
}

type Aria2Field = {
  key: keyof TAria2Config
  label: string
  description: string
  placeholder?: string
  type?: string
}

const aria2Fields: Aria2Field[] = [
  {
    key: "dnsServer",
    label: "DNS Server",
    description: "DNS server used to resolve download host names.",
    placeholder: "example: 8.8.8.8"
  },
  {
    key: "maxConnection",
    label: "Max connection per server",
    description: "Maximum number of connections aria2 opens to one server.",
    placeholder: "example: 8"
  },
  {
    key: "maxConnectionSplit",
    label: "Split",
    description:
      "Number of connections used to download one file. More splits can improve speed when the server supports it.",
    placeholder: "example: 8"
  },
  {
    key: "minSplitSize",
    label: "Min split size",
    description: "Minimum file size for aria2 to split a download into multiple connections.",
    placeholder: "example: 8M"
  },
  {
    key: "maxDownloadLimit",
    label: "Max download limit",
    description: "Maximum download speed; use 0 for no limit. Examples: 100K or 1M.",
    placeholder: "example: 100K"
  },
  {
    key: "connectTimeout",
    label: "Connect timeout (seconds)",
    description: "Seconds aria2 waits for a server connection before timing out.",
    placeholder: "example: 60"
    // type: "number"
  }
]

const Aria2Conf = ({ id }: Props) => {
  const closePopupWindow = window.electronAPI.closePopupWindow

  const [formValue, setFormValue] = useState<TAria2Config>({
    minSplitSize: "8M",
    connectTimeout: "60",
    maxDownloadLimit: "0",
    maxConnectionSplit: "8",
    maxConnection: "8",
    dnsServer: "8.8.8.8"
  })

  useEffect(() => {
    ;(async () => {
      const defaultConfig = await window.electronAPI.getAria2Config()
      setFormValue(defaultConfig)
    })()
  }, [])

  const handleChange = (key: keyof TAria2Config) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValue((prev) => ({
      ...prev,
      [key]: event.target.value
    }))
  }

  const submitHandler = (e: React.FormEvent) => {
    e.preventDefault()
    window.electronAPI.setAria2Config(formValue)
    window.electronAPI.showNotification({
      title: "Aria2 Settings Saved",
      body: "Your aria2 configuration has been saved successfully.\nPlease restart the program to apply changes."
    })
  }

  return (
    <div className="flex justify-center pt-12 w-full h-full">
      <form onSubmit={submitHandler} className="w-[80%]">
        <FormControl className="w-full gap-4">
          {aria2Fields.map((field) => (
            <div key={field.key} className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm">{field.label}</p>
                <ConfigInfo label={field.label} description={field.description} />
              </div>

              <TextField
                size="small"
                className="w-40"
                placeholder={field.placeholder}
                type={field.type ?? "text"}
                value={formValue[field.key] || ""}
                onChange={handleChange(field.key)}
              />
            </div>
          ))}
        </FormControl>

        <div className="w-full flex justify-end gap-2 absolute bottom-3 right-5">
          <Button variant="contained" type="submit">
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

export default Aria2Conf
