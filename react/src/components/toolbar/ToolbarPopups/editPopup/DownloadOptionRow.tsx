import RestartAltIcon from "@mui/icons-material/RestartAlt"
import { Chip, TextField, Tooltip } from "@mui/material"
import type { DownloadOption } from "./editDownloadTypes.ts"

type Props = {
  definition: DownloadOption
  value: string
  globalValue: string
  saved: boolean
  onChange: (value: string) => void
  onReset: () => void
  statusDownload: string
}

export default function DownloadOptionRow({
  definition,
  value,
  globalValue,
  saved,
  onChange,
  onReset,
  statusDownload
}: Props) {
  const disabled = statusDownload === "error" || statusDownload === "complete"
  const overridden = value !== globalValue
  return (
    <div className="flex items-center gap-2">
      {/*<Tooltip*/}
      {/*  title={definition.description}*/}
      {/*  placement="bottom"*/}
      {/*  arrow*/}
      {/*>*/}
      <TextField
        size="small"
        disabled={disabled}
        fullWidth
        label={definition.label}
        value={value}
        type={definition.type ?? "text"}
        onChange={(event) => onChange(event.target.value)}
        placeholder={definition.placeholder}
        slotProps={{
          input: {
            endAdornment: saved ? (
              <Chip
                label="saved"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: "0.65rem", height: 20 }}
              />
            ) : undefined
          }
        }}
        sx={{ "& .MuiOutlinedInput-root": { backgroundColor: overridden ? "action.hover" : "transparent" } }}
      />
      {/*</Tooltip>*/}
      <Tooltip title={`Reset "${definition.label}" to global default`}>
        <span>
          <RestartAltIcon
            fontSize="small"
            onClick={onReset}
            sx={{
              cursor: overridden ? "pointer" : "default",
              color: overridden ? "primary.main" : "action.disabled",
              "&:hover": overridden ? { color: "primary.light" } : {}
            }}
          />
        </span>
      </Tooltip>
    </div>
  )
}
