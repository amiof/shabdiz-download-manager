import path from "path"

// the argument list of a yt-dlp media download lives in its own module without
// any relative runtime import, so `node --test` can load it directly

export const YT_DLP_PROGRESS_MARKER = "@@PROGRESS@@"

export const YT_DLP_FILE_MARKER = "@@FILE@@"

// --print implies --quiet in yt-dlp, and quiet mode swallows the progress
// output, so a download run has to pass --progress explicitly. The "download:"
// prefix keeps the template from also replacing the postprocess progress.
// info.format_id tells the main process which of the video/audio files is being
// downloaded, so their byte counters can be added up into one job-wide progress.
export const YT_DLP_PROGRESS_TEMPLATE = `download:${YT_DLP_PROGRESS_MARKER}%(info.format_id)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s`

export const YT_DLP_FILE_TEMPLATE = `after_move:${YT_DLP_FILE_MARKER}%(filepath)s`

// yt-dlp does the merging itself: "VIDEO" when the format already has audio,
// otherwise "VIDEO+AUDIO"
export const buildFormatSelector = (videoFormatId: string, audioFormatId?: string): string =>
  audioFormatId ? `${videoFormatId}+${audioFormatId}` : videoFormatId

export type TYtDlpDownloadArgOptions = {
  // the resolved destination folder and the container yt-dlp should write
  dir: string
  container: string
  // the auth args of buildYtDlpAuthArgs, appended verbatim before the url
  authArgs?: string[]
}

// --progress is mandatory here because --print implies --quiet and quiet would
// swallow the @@PROGRESS@@ lines the main process parses
export const buildYtDlpDownloadArgs = (
  request: { url: string; videoFormatId: string; audioFormatId?: string },
  options: TYtDlpDownloadArgOptions
): string[] => {
  const args = [
    "--no-playlist",
    "--no-warnings",
    "--newline",
    "--no-simulate",
    // keeps the progress lines alive while --print is in the argument list
    "--progress",
    "--progress-template",
    YT_DLP_PROGRESS_TEMPLATE,
    "--print",
    YT_DLP_FILE_TEMPLATE,
    "-f",
    buildFormatSelector(request.videoFormatId, request.audioFormatId),
    "-o",
    path.join(options.dir, "%(title)s.%(ext)s")
  ]

  // only a muxed download has to be merged afterwards
  if (request.audioFormatId) args.push("--merge-output-format", options.container)

  if (options.authArgs?.length) args.push(...options.authArgs)

  args.push(request.url)

  return args
}
