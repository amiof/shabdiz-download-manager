import useYoutubeTabStore from "@components/addLinkPopup/store/youtubeTabStore.ts"
import FfmpegNotice from "@components/addLinkPopup/tabs/AddYoutubeTab/FfmpegNotice.tsx"
import {
  destinationFolderLabel,
  formatAudioPrimaryLabel,
  formatVideoPrimaryLabel,
  subtitlesLabel
} from "@components/addLinkPopup/tabs/AddYoutubeTab/youtubeTabHelpers.ts"
import Alert from "@mui/material/Alert"
import Paper from "@mui/material/Paper"
import Typography from "@mui/material/Typography"
import { formatBytes } from "@src/utils.ts"

const YoutubeSummaryStep = () => {
  const mediaInfo = useYoutubeTabStore((state) => state.mediaInfo)
  const videoFormatId = useYoutubeTabStore((state) => state.videoFormatId)
  const audioFormatId = useYoutubeTabStore((state) => state.audioFormatId)
  const subtitleChoices = useYoutubeTabStore((state) => state.subtitleChoices)
  const error = useYoutubeTabStore((state) => state.error)

  const videoFormat = mediaInfo?.videoFormats.find((format) => format.format_id === videoFormatId)
  const audioFormat = mediaInfo?.audioFormats.find((format) => format.format_id === audioFormatId)
  const needsAudio = !!videoFormat && !videoFormat.hasAudio

  const estimatedSize = [videoFormat, needsAudio ? audioFormat : undefined]
    .filter((format) => !!format)
    .reduce((total, format) => total + (format?.filesize ?? format?.filesize_approx ?? 0), 0)

  const rows: [string, string][] = [
    ["Title", mediaInfo?.title || "—"],
    ["Video", videoFormat ? formatVideoPrimaryLabel(videoFormat) : "—"],
    [
      "Audio",
      videoFormat?.hasAudio
        ? "Included in the selected video format"
        : audioFormat
          ? formatAudioPrimaryLabel(audioFormat)
          : "—"
    ],
    ["Subtitles", subtitlesLabel(subtitleChoices)],
    ["Destination", `Shabdiz-DM/${destinationFolderLabel(videoFormat)}`]
  ]

  if (estimatedSize > 0) {
    rows.push(["Estimated size", formatBytes(estimatedSize)])
  }

  return (
    <div className={"w-full h-full px-8 py-4 flex flex-col gap-3 overflow-auto"}>
      <Typography variant={"subtitle1"}>Summary</Typography>

      <Paper variant={"outlined"} className={"px-4 py-3"} sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
        <div className={"grid grid-cols-[auto_1fr] gap-x-5 gap-y-2"}>
          {rows.map(([label, value]) => (
            <div className={"contents"} key={label}>
              <Typography variant={"caption"} color={"text.secondary"}>
                {label}
              </Typography>
              <Typography variant={"body2"} className={"break-all"}>
                {value}
              </Typography>
            </div>
          ))}
        </div>
      </Paper>

      {needsAudio && (
        <FfmpegNotice action={"The selected video format has no audio, so the two streams have to be merged"} />
      )}

      {error && <Alert severity={"error"}>{error}</Alert>}
    </div>
  )
}

export default YoutubeSummaryStep
