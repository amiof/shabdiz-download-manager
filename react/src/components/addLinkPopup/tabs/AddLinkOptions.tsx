import useAddLinkStore from "@components/addLinkPopup/store/addLinkStore.ts"
import { TAddLinkOptions } from "@components/addLinkPopup/store/addLinkStoreType.ts"
import ClearIcon from "@mui/icons-material/Clear"
import FolderOpenIcon from "@mui/icons-material/FolderOpen"
import { Autocomplete, IconButton, InputAdornment, TextField } from "@mui/material"
import { useEffect, useState } from "react"

const USER_AGENT_PRESETS = [
  {
    label: "Chrome (Windows)",
    value:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
  },
  {
    label: "Chrome (Linux)",
    value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
  },
  {
    label: "Chrome (macOS)",
    value:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
  },
  {
    label: "Firefox (Linux)",
    value: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0"
  },
  {
    label: "Edge (Windows)",
    value:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0"
  }
]

const AddLinkOptions = () => {
  const setOptionItem = useAddLinkStore((state) => state.setOptionsItem)
  const optionsStore = useAddLinkStore((state) => state.options)

  const [formValues, setFormValues] = useState<TAddLinkOptions | null>(null)

  useEffect(() => {
    if (!formValues) {
      setFormValues(optionsStore)
    }
  }, [])

  const handleChange = (field: keyof TAddLinkOptions) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormValues((prev) => ({
      ...prev,
      [field]: value
    }))

    setOptionItem(field, value)
  }
  const handleUserAgentChange = (_event: React.SyntheticEvent, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      userAgent: value || undefined
    }))
    setOptionItem("userAgent", value)
  }

  const handleClearCookieFile = () => {
    setFormValues((prev) => ({
      ...prev,
      cookie: undefined
    }))
    setOptionItem("cookie", "")
  }

  const handleSelectCookieFile = async () => {
    const selectedPath = (await window.electronAPI.selectCookieFile()) as string | null
    if (selectedPath) {
      setFormValues((prev) => ({
        ...prev,
        cookie: selectedPath
      }))
      setOptionItem("cookie", selectedPath)
    }
  }

  const currentUaPreset = USER_AGENT_PRESETS.find((preset) => preset.value === formValues?.userAgent)

  return (
    <div className={"w-full h-full px-20 "}>
      <div className={"w-full h-full gap-6 flex flex-col items-center justify-center  "}>
        <TextField
          size={"small"}
          name="referre"
          fullWidth={true}
          value={formValues?.referrer || ""}
          onChange={handleChange("referrer")}
          label="referre"
        />

        <TextField
          size={"small"}
          name="header"
          fullWidth={true}
          onChange={handleChange("header")}
          value={formValues?.header || ""}
          label="header"
        />

        <Autocomplete
          freeSolo
          fullWidth
          size="small"
          options={USER_AGENT_PRESETS}
          getOptionLabel={(option) => {
            if (typeof option === "string") {
              const match = USER_AGENT_PRESETS.find((p) => p.value === option)
              return match ? match.label : option
            }
            return option.label
          }}
          isOptionEqualToValue={(option, value) => {
            if (typeof value === "string") {
              return option.value === value
            }
            return option.value === value.value
          }}
          value={currentUaPreset ? currentUaPreset : formValues?.userAgent || null}
          onChange={(_event, newValue) => {
            if (typeof newValue === "string") {
              handleUserAgentChange(_event, newValue)
            } else if (newValue) {
              handleUserAgentChange(_event, newValue.value)
            } else {
              handleUserAgentChange(_event, "")
            }
          }}
          onInputChange={(_event, value) => {
            const match = USER_AGENT_PRESETS.find((p) => p.label === value || p.value === value)
            if (!match) {
              handleUserAgentChange(_event, value)
            }
          }}
          renderOption={(props, option) => (
            <li {...props} key={option.value}>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-gray-400 truncate max-w-[400px]">{option.value}</span>
              </div>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label="User-Agent" placeholder="Select or type custom user-agent" />
          )}
        />

        <TextField
          size={"small"}
          name="cookie"
          fullWidth={true}
          value={formValues?.cookie || ""}
          label="Cookie File"
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                {formValues?.cookie && (
                  <IconButton onClick={handleClearCookieFile} edge="end" size="small">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton onClick={handleSelectCookieFile} edge="end" size="small">
                  <FolderOpenIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </div>
    </div>
  )
}

export default AddLinkOptions
