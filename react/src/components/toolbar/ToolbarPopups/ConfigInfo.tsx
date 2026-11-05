import InfoOutlined from "@mui/icons-material/InfoOutlined"
import { IconButton, Tooltip } from "@mui/material"

type Props = {
  label: string
  description: string
}

const ConfigInfo = ({ label, description }: Props) => (
  <Tooltip title={description} arrow describeChild>
    <IconButton type="button" size="small" aria-label={`About ${label}`}>
      <InfoOutlined fontSize="small" />
    </IconButton>
  </Tooltip>
)

export default ConfigInfo
