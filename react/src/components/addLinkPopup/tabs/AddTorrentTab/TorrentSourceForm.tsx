import { TTorrentInputType } from "@components/addLinkPopup/types.ts"
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined"
import FolderOpenIcon from "@mui/icons-material/FolderOpen"
import {
  Alert,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"
import { resMetadataUrls } from "@src/types.ts"
import { buildMetadataRows } from "./torrentTabHelpers.ts"

type TorrentSourceFormProps = {
  inputType: TTorrentInputType
  inputValue: string
  loading: boolean
  error: string
  metadata: resMetadataUrls | null
  onInputTypeChange: (inputType: TTorrentInputType) => void
  onInputValueChange: (value: string) => void
  onSelectTorrentFile: () => void
  onSubmit: () => void
}

const TorrentSourceForm = (props: TorrentSourceFormProps) => {
  const {
    inputType,
    inputValue,
    loading,
    error,
    metadata,
    onInputTypeChange,
    onInputValueChange,
    onSelectTorrentFile,
    onSubmit
  } = props

  const handleInputTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onInputTypeChange(event.target.value as TTorrentInputType)
  }

  const metadataRows = metadata ? buildMetadataRows(metadata) : []

  return (
    <div className="w-full h-full px-10 py-5 flex flex-col gap-4 overflow-auto">
      <FormControl>
        <FormLabel>Source</FormLabel>
        <RadioGroup row value={inputType} onChange={handleInputTypeChange}>
          <FormControlLabel value="Magnet URL" control={<Radio size="small" />} label="Magnet URL" />
          <FormControlLabel value="Torrent Link" control={<Radio size="small" />} label="Torrent Link" />
          <FormControlLabel value="Torrent File" control={<Radio size="small" />} label="Torrent File" />
        </RadioGroup>
      </FormControl>

      <div className="flex items-center gap-2">
        <TextField
          color="success"
          size="small"
          fullWidth
          value={inputValue}
          label={inputType}
          placeholder={inputType === "Magnet URL" ? "magnet:?xt=urn:btih:..." : "https://example.com/file.torrent"}
          onChange={(event) => onInputValueChange(event.target.value)}
          InputProps={
            inputType === "Torrent File"
              ? {
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={onSelectTorrentFile} edge="end" size="small">
                      <FolderOpenIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }
              : undefined
          }
        />
        {(
          <Tooltip title="Fetch metadata">
            <span>
              <IconButton color="success" onClick={onSubmit} disabled={!inputValue.trim() || loading}>
                {loading ? <CircularProgress size={22} color="inherit" /> : <DownloadOutlinedIcon />}
              </IconButton>
            </span>
          </Tooltip>
        )}
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {metadata && (
        <Paper variant="outlined" className="px-4 py-2" sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Metadata
          </Typography>
          <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
            {metadataRows.map(([label, value]) => (
              <div className="contents truncate" key={label}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" className="break-all truncate">
                  {value}
                </Typography>
              </div>
            ))}
          </div>
        </Paper>
      )}
    </div>
  )
}

export default TorrentSourceForm
