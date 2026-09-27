import useYoutubeTabStore from "@components/addLinkPopup/store/youtubeTabStore.ts"
import {
  formatAudioPrimaryLabel,
  formatAudioSecondaryLabel,
  formatSizeLabel,
  formatVideoPrimaryLabel,
  formatVideoSecondaryLabel
} from "@components/addLinkPopup/tabs/AddYoutubeTab/youtubeTabHelpers.ts"
import Chip from "@mui/material/Chip"
import Paper from "@mui/material/Paper"
import Radio from "@mui/material/Radio"
import Typography from "@mui/material/Typography"
import clsx from "clsx"

type Props = {
  kind: "video" | "audio"
}

// the same list is used for both steps, only the fields it shows differ
const YoutubeFormatStep = (props: Props) => {
  const { kind } = props

  const mediaInfo = useYoutubeTabStore((state) => state.mediaInfo)
  const videoFormatId = useYoutubeTabStore((state) => state.videoFormatId)
  const audioFormatId = useYoutubeTabStore((state) => state.audioFormatId)
  const selectVideoFormat = useYoutubeTabStore((state) => state.selectVideoFormat)
  const selectAudioFormat = useYoutubeTabStore((state) => state.selectAudioFormat)

  const formats = kind === "video" ? (mediaInfo?.videoFormats ?? []) : (mediaInfo?.audioFormats ?? [])
  const selectedFormatId = kind === "video" ? videoFormatId : audioFormatId

  return (
    <div className={"w-full h-full px-8 py-4 flex flex-col gap-3 overflow-hidden"}>
      <div className={"flex items-start justify-between gap-4"}>
        <div>
          <Typography variant={"subtitle1"}>{kind === "video" ? "Video format" : "Audio format"}</Typography>
          <Typography variant={"caption"} color={"text.secondary"}>
            {kind === "video"
              ? "A format that already contains audio needs no extra audio selection."
              : "Only audio only formats are listed here."}
          </Typography>
        </div>
        <Typography variant={"caption"} color={"text.secondary"} sx={{ whiteSpace: "nowrap" }}>
          {`${formats.length} formats`}
        </Typography>
      </div>

      <Paper
        variant={"outlined"}
        className={"flex-1 overflow-auto max-h-[240px] p-1"}
        sx={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        {formats.length ? (
          formats.map((format) => {
            const isSelected = selectedFormatId === format.format_id
            const primaryLabel = kind === "video" ? formatVideoPrimaryLabel(format) : formatAudioPrimaryLabel(format)
            const secondaryLabel =
              kind === "video" ? formatVideoSecondaryLabel(format) : formatAudioSecondaryLabel(format)

            return (
              <div
                key={format.format_id}
                onClick={() =>
                  kind === "video" ? selectVideoFormat(format.format_id) : selectAudioFormat(format.format_id)
                }
                className={clsx(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/5",
                  isSelected && "bg-white/10"
                )}
              >
                <Radio size={"small"} checked={isSelected} sx={{ pointerEvents: "none" }} />
                <div className={"flex-1 min-w-0"}>
                  <div className={"flex items-center gap-2"}>
                    <Typography variant={"body2"} className={"truncate"}>
                      {primaryLabel}
                    </Typography>
                    {kind === "video" && format.hasAudio && (
                      <Chip size={"small"} variant={"outlined"} color={"success"} label={"audio included"} />
                    )}
                  </div>
                  <Typography variant={"caption"} color={"text.secondary"} className={"block truncate"}>
                    {secondaryLabel}
                  </Typography>
                </div>
                <Typography variant={"caption"} color={"text.secondary"} sx={{ whiteSpace: "nowrap" }}>
                  {formatSizeLabel(format)}
                </Typography>
              </div>
            )
          })
        ) : (
          <div className={"h-full flex items-center justify-center"}>
            <Typography variant={"body2"} color={"text.secondary"}>
              {kind === "video"
                ? "No video formats were returned for this link."
                : "No audio only format was returned for this video."}
            </Typography>
          </div>
        )}
      </Paper>
    </div>
  )
}

export default YoutubeFormatStep
