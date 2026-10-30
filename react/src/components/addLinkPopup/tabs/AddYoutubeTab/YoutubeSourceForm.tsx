import useAddLinkStore from "@components/addLinkPopup/store/addLinkStore.ts"
import useYoutubeTabStore from "@components/addLinkPopup/store/youtubeTabStore.ts"
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined"
import Alert from "@mui/material/Alert"
import CircularProgress from "@mui/material/CircularProgress"
import IconButton from "@mui/material/IconButton"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"

const YoutubeSourceForm = () => {
  const url = useYoutubeTabStore((state) => state.url)
  const status = useYoutubeTabStore((state) => state.status)
  const fetching = useYoutubeTabStore((state) => state.fetching)
  const error = useYoutubeTabStore((state) => state.error)
  const setUrl = useYoutubeTabStore((state) => state.setUrl)
  const fetchMediaInfo = useYoutubeTabStore((state) => state.fetchMediaInfo)
  const options = useAddLinkStore((state) => state.options)

  // yt-dlp can only get cookies from a cookie file, so the youtube tab only
  // works when the extension header or a picked cookie file reaches it
  const hasCookieSource = !!options?.cookie || !!options?.header?.toLowerCase().includes("cookie")

  return (
    <div className={"w-full h-full px-10 py-5 flex flex-col gap-4 overflow-auto"}>
      <div className={"flex items-center gap-2"}>
        <TextField
          color={"success"}
          size={"small"}
          fullWidth
          value={url}
          label={"YouTube link"}
          placeholder={"https://www.youtube.com/watch?v=..."}
          onChange={(event) => setUrl(event.target.value)}
        />
        <Tooltip title={"Fetch media information"}>
          <span>
            <IconButton color={"success"} onClick={() => void fetchMediaInfo()} disabled={!url.trim() || fetching}>
              {fetching ? <CircularProgress size={22} color={"inherit"} /> : <DownloadOutlinedIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </div>

      {error && <Alert severity={"error"}>{error}</Alert>}

      {!hasCookieSource && (
        <Alert severity={"warning"}>
          {
            "YouTube may ask you to sign in to confirm you are not a bot. Send this link from the Shabdiz browser extension, or pick a cookies.txt file in the Options tab."
          }
        </Alert>
      )}

      {status?.state === "installed" && !status.ffmpegAvailable && (
        <Alert severity={"warning"}>
          {"ffmpeg was not found, video and audio can only be merged when ffmpeg is installed."}
        </Alert>
      )}
    </div>
  )
}

export default YoutubeSourceForm
