import useYoutubeTabStore from "@components/addLinkPopup/store/youtubeTabStore.ts"
import { subtitleFormatLabel, subtitleTitle } from "@components/addLinkPopup/tabs/AddYoutubeTab/youtubeTabHelpers.ts"
import Button from "@mui/material/Button"
import Checkbox from "@mui/material/Checkbox"
import MenuItem from "@mui/material/MenuItem"
import Paper from "@mui/material/Paper"
import Select from "@mui/material/Select"
import Typography from "@mui/material/Typography"
import { TYtDlpSubtitle } from "@src/types.ts"
import clsx from "clsx"

const YoutubeSubtitleStep = () => {
  const mediaInfo = useYoutubeTabStore((state) => state.mediaInfo)
  const subtitleChoices = useYoutubeTabStore((state) => state.subtitleChoices)
  const toggleSubtitle = useYoutubeTabStore((state) => state.toggleSubtitle)
  const setSubtitleFormat = useYoutubeTabStore((state) => state.setSubtitleFormat)
  const clearSubtitles = useYoutubeTabStore((state) => state.clearSubtitles)

  const subtitles = mediaInfo?.subtitles ?? []
  const manualSubtitles = subtitles.filter((subtitle) => !subtitle.isAutomatic)
  const automaticSubtitles = subtitles.filter((subtitle) => subtitle.isAutomatic)

  const choiceOf = (subtitle: TYtDlpSubtitle) =>
    subtitleChoices.find(
      (choice) => choice.language === subtitle.language && choice.isAutomatic === subtitle.isAutomatic
    )

  const renderGroup = (title: string, list: TYtDlpSubtitle[]) => {
    if (!list.length) return null

    return (
      <div className={"flex flex-col gap-1"}>
        <Typography variant={"overline"} color={"text.secondary"}>
          {title}
        </Typography>
        {list.map((subtitle) => {
          const choice = choiceOf(subtitle)

          return (
            <div key={`${subtitle.isAutomatic}-${subtitle.language}`} className={"rounded-lg px-2 py-1.5"}>
              <div className={"flex items-center gap-2"}>
                <Checkbox
                  size={"small"}
                  checked={!!choice}
                  onChange={(event) => toggleSubtitle(subtitle, event.target.checked)}
                />
                <Typography variant={"body2"} className={"flex-1 truncate"}>
                  {subtitleTitle(subtitle)}
                </Typography>
                <Typography variant={"caption"} color={"text.secondary"}>
                  {subtitle.isAutomatic ? "automatic" : subtitle.language}
                </Typography>
              </div>

              {choice && subtitle.formats.length > 0 && (
                <div className={"flex items-center gap-2 pl-9 pb-1"}>
                  <Typography variant={"caption"} color={"text.secondary"}>
                    Format
                  </Typography>
                  <Select
                    size={"small"}
                    value={choice.format}
                    onChange={(event) => setSubtitleFormat(subtitle, event.target.value)}
                    sx={{ minWidth: 170 }}
                  >
                    {subtitle.formats.map((format) => (
                      <MenuItem key={format.ext} value={format.ext}>
                        {subtitleFormatLabel(format.ext, format.name)}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={"w-full h-full px-8 py-4 flex flex-col gap-3 overflow-hidden"}>
      <div className={"flex items-start justify-between gap-4"}>
        <div>
          <Typography variant={"subtitle1"}>Subtitles</Typography>
          <Typography variant={"caption"} color={"text.secondary"}>
            {subtitleChoices.length
              ? `${subtitleChoices.length} language(s) selected`
              : "No subtitle will be downloaded"}
          </Typography>
        </div>
        <Button
          size={"small"}
          variant={"outlined"}
          color={subtitleChoices.length ? "error" : "success"}
          className={clsx(!subtitleChoices.length && "pointer-events-none opacity-60")}
          onClick={clearSubtitles}
        >
          Don't download subtitles
        </Button>
      </div>

      <Paper
        variant={"outlined"}
        className={"flex-1 overflow-auto max-h-[240px] p-2"}
        sx={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        {subtitles.length ? (
          <div className={"flex flex-col gap-3"}>
            {renderGroup("Subtitles", manualSubtitles)}
            {renderGroup("Automatic captions", automaticSubtitles)}
          </div>
        ) : (
          <div className={"h-full flex flex-col items-center justify-center gap-2 px-6 text-center"}>
            <Typography variant={"body2"}>{"yt-dlp did not report any subtitle for this video."}</Typography>
            <Typography variant={"caption"} color={"text.secondary"}>
              {"You can continue to the summary and download without subtitles."}
            </Typography>
          </div>
        )}
      </Paper>
    </div>
  )
}

export default YoutubeSubtitleStep
