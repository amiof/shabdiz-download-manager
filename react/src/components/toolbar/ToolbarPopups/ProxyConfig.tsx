import { Button, Checkbox, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField } from "@mui/material"
import { useEffect, useState } from "react"
import { TProxyConfig } from "@src/store/storeType.ts"

type Props = {
  id: string
}

const ProxyConfig = (props: Props) => {
  const { id } = props

  const closePopupWindow = window.electronAPI.closePopupWindow

  const [formValues, setFormValues] = useState<TProxyConfig>({
    proxyStatus: false,
    proxyType: "http",
    port: "8080",
    ip: "127.0.0.1",
    proxyUserName: "",
    proxyPassword: ""
  })

  useEffect(() => {
    ;(async () => {
      const defaultProxyConfig = (await window.electronAPI.getProxyConfig()) as TProxyConfig
      setFormValues(defaultProxyConfig)
    })()
  }, [])
  
  const handleInputChange = (field: keyof TProxyConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === "proxyStatus" ? event.target.checked : event.target.value
    
    setFormValues((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleProxyTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({
      ...prev,
      proxyType: event.target.value as "http" | "https"
    }))
  }
  
  const submitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    window.electronAPI.setProxyConfig(formValues) // You can directly use formValues now!
    window.electronAPI.showNotification({
      title: "Proxy Settings Saved",
      body: "Your proxy configuration has been saved successfully.\n for use config please restart program"
    })
  }
  
  return (
    <div className={"w-full h-full flex items-start pt-12 justify-center relative"}>
      <form onSubmit={submitHandler}>
        <FormControl className={"gap-6"}>
          <div className={"flex items-center"}>
            <label id={"proxy-label"} className="mr-2">
              Proxy
            </label>
            <Checkbox name="proxyStatus" checked={formValues.proxyStatus} onChange={handleInputChange("proxyStatus")} />
          </div>
          
          <TextField
            name="ip"
            size={"small"}
            className="w-40"
            value={formValues.ip || ""}
            onChange={handleInputChange("ip")}
            placeholder="example: 127.0.0.1"
            label="IP"
            disabled={!formValues.proxyStatus}
          />
          
          <TextField
            name="port"
            size={"small"}
            className="w-40"
            value={formValues.port || ""}
            onChange={handleInputChange("port")}
            label="Port"
            type="number"
            disabled={!formValues.proxyStatus}
            placeholder="example: 8085"
          />
          
          <TextField
            name="proxyUsername"
            size={"small"}
            className="w-40"
            value={formValues.proxyUserName || ""}
            onChange={handleInputChange("proxyUserName")}
            label="Username"
            disabled={!formValues.proxyStatus}
            placeholder="example: admin"
          />
          
          <TextField
            name="proxyPassword"
            size={"small"}
            className="w-40"
            value={formValues.proxyPassword || ""}
            onChange={handleInputChange("proxyPassword")}
            label="Password"
            type="password" // recommended for passwords
            disabled={!formValues.proxyStatus}
            placeholder="example: 12345"
          />
          
          <FormLabel id="radio-Group">Proxy Type</FormLabel>
          <RadioGroup name="proxyType" value={formValues.proxyType} onChange={handleProxyTypeChange} row>
            <FormControlLabel value="http" control={<Radio />} label="http" disabled={!formValues.proxyStatus} />
            <FormControlLabel value="https" control={<Radio />} label="https" disabled={!formValues.proxyStatus} />
          </RadioGroup>
        </FormControl>
        
        <div className={"w-full flex justify-end gap-2 absolute bottom-3 right-5"}>
          <Button variant="contained" color="primary" type="submit">
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

export default ProxyConfig
