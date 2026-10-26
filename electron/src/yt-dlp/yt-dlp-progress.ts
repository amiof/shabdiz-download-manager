import type { TYtDlpFormat } from "./type"

// the same markers YT_DLP_PROGRESS_TEMPLATE and YT_DLP_FILE_TEMPLATE use in
// yt-dlp-download-args.ts; keeping them local lets the parser be unit tested
// without resolving the extensionless import of a CommonJS build
export const YT_DLP_PROGRESS_MARKER = "@@PROGRESS@@"
export const YT_DLP_FILE_MARKER = "@@FILE@@"

const toNumber = (value?: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

// one progress line printed by yt-dlp through YT_DLP_PROGRESS_TEMPLATE
export type TYtDlpProgress = {
  // the format yt-dlp is downloading right now, e.g. the video or the audio
  formatId?: string
  completedLength: number
  totalLength: number
  downloadSpeed: number
  eta?: number
}

export const parseYtDlpProgressLine = (line: string): TYtDlpProgress | null => {
  if (!line.startsWith(YT_DLP_PROGRESS_MARKER)) return null

  const [formatId, downloaded, total, totalEstimate, speed, eta] = line.replace(YT_DLP_PROGRESS_MARKER, "").split("|")

  return {
    formatId: formatId && formatId !== "NA" ? formatId : undefined,
    completedLength: toNumber(downloaded),
    totalLength: toNumber(total) || toNumber(totalEstimate),
    downloadSpeed: toNumber(speed),
    eta: eta && eta !== "NA" ? toNumber(eta) : undefined
  }
}

// the printed final file path of a finished download
export const parseYtDlpFilePath = (line: string): string | null => {
  const trimmed = line.trim()
  if (!trimmed.startsWith(YT_DLP_FILE_MARKER)) return null

  const filePath = trimmed.replace(YT_DLP_FILE_MARKER, "").trim()
  return filePath || null
}

// the size yt-dlp reports for a selected format, a precise filesize wins over
// the estimate YouTube usually returns
export const getYtDlpFormatSize = (format?: TYtDlpFormat): number => {
  const size = format?.filesize || format?.filesize_approx || 0
  return Number.isFinite(size) && size > 0 ? size : 0
}

// a download of a video-only format plus an audio format writes two files, the
// total size of the job is the sum of both selected formats
export const getYtDlpJobTotalSize = (...formats: Array<TYtDlpFormat | undefined>): number =>
  formats.reduce((total, format) => total + getYtDlpFormatSize(format), 0)

export type TYtDlpAggregateProgress = {
  completedLength: number
  totalLength: number
  percent: number
  downloadSpeed: number
  eta?: number
}

// yt-dlp reports progress per file. A video+audio selection downloads two files
// one after another, so the per-file counters have to be accumulated into one
// job-wide progress or the bar would jump back to zero for the audio stream.
export class YtDlpProgressTracker {
  private readonly expectedTotal: number
  private readonly completedByStream = new Map<string, number>()
  private readonly totalByStream = new Map<string, number>()
  private currentStreamId: string | undefined
  private lastCompleted = 0

  constructor(expectedTotal = 0) {
    this.expectedTotal = Math.max(0, expectedTotal)
  }

  update(progress: TYtDlpProgress): TYtDlpAggregateProgress {
    const streamId = progress.formatId || this.currentStreamId || "default"

    if (streamId !== this.currentStreamId && this.currentStreamId) {
      // the previous file is done, keep its bytes while the new one starts at 0
      this.completedByStream.set(this.currentStreamId, this.lastCompleted)
    }

    this.currentStreamId = streamId
    this.lastCompleted = Math.max(0, progress.completedLength)
    this.completedByStream.set(streamId, this.lastCompleted)

    if (progress.totalLength > 0) this.totalByStream.set(streamId, progress.totalLength)

    const completedLength = sumValues(this.completedByStream)
    const actualTotal = sumValues(this.totalByStream)
    // the expected total comes from the selected formats, so the bar can count
    // the video and the audio from the first byte instead of resetting later
    const totalLength = Math.max(this.expectedTotal, actualTotal, completedLength)
    const percent = totalLength > 0 ? Math.min(100, Math.floor((completedLength / totalLength) * 100)) : 0
    const downloadSpeed = Math.max(0, progress.downloadSpeed)
    const eta = downloadSpeed > 0 ? Math.max(0, totalLength - completedLength) / downloadSpeed : progress.eta

    return { completedLength, totalLength, percent, downloadSpeed, eta }
  }
}

const sumValues = (values: Map<string, number>): number =>
  [...values.values()].reduce((total, value) => total + value, 0)
