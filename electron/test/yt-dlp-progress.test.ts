import assert from "node:assert/strict"
import { test } from "node:test"
import { getYtDlpJobTotalSize, parseYtDlpProgressLine, YtDlpProgressTracker } from "../src/yt-dlp/yt-dlp-progress.ts"

test("a progress line carries the format that is being downloaded", () => {
  const progress = parseYtDlpProgressLine("@@PROGRESS@@137|500|1000|NA|250|2")

  assert.deepEqual(progress, {
    formatId: "137",
    completedLength: 500,
    totalLength: 1000,
    downloadSpeed: 250,
    eta: 2
  })
})

test("the total job size adds the selected video and audio formats", () => {
  const video = { filesize: 20_000_000 } as Parameters<typeof getYtDlpJobTotalSize>[0]
  const audio = { filesize_approx: 5_000_000 } as Parameters<typeof getYtDlpJobTotalSize>[0]

  assert.equal(getYtDlpJobTotalSize(video, audio), 25_000_000)
  assert.equal(getYtDlpJobTotalSize(video), 20_000_000)
  assert.equal(getYtDlpJobTotalSize(undefined), 0)
})

test("the audio stream continues the video progress instead of restarting it", () => {
  const tracker = new YtDlpProgressTracker(25_000_000)

  const videoHalf = tracker.update({
    formatId: "137",
    completedLength: 10_000_000,
    totalLength: 20_000_000,
    downloadSpeed: 2_000_000
  })
  assert.equal(videoHalf.completedLength, 10_000_000)
  assert.equal(videoHalf.totalLength, 25_000_000)
  assert.equal(videoHalf.percent, 40)

  const videoDone = tracker.update({
    formatId: "137",
    completedLength: 20_000_000,
    totalLength: 20_000_000,
    downloadSpeed: 2_000_000
  })
  assert.equal(videoDone.percent, 80)

  // yt-dlp starts the audio file at zero bytes, the job must stay at 80%
  const audioStart = tracker.update({
    formatId: "140",
    completedLength: 0,
    totalLength: 5_000_000,
    downloadSpeed: 2_000_000
  })
  assert.equal(audioStart.completedLength, 20_000_000)
  assert.equal(audioStart.totalLength, 25_000_000)
  assert.equal(audioStart.percent, 80)

  const audioDone = tracker.update({
    formatId: "140",
    completedLength: 5_000_000,
    totalLength: 5_000_000,
    downloadSpeed: 2_000_000
  })
  assert.equal(audioDone.completedLength, 25_000_000)
  assert.equal(audioDone.percent, 100)
})

test("a missing expected size still sums up the observed stream totals", () => {
  const tracker = new YtDlpProgressTracker(0)

  tracker.update({ formatId: "137", completedLength: 20_000_000, totalLength: 20_000_000, downloadSpeed: 0 })
  const audioStart = tracker.update({
    formatId: "140",
    completedLength: 0,
    totalLength: 5_000_000,
    downloadSpeed: 0
  })

  assert.equal(audioStart.completedLength, 20_000_000)
  assert.equal(audioStart.totalLength, 25_000_000)
  assert.equal(audioStart.percent, 80)
})

test("the eta counts the bytes that are still missing from the whole job", () => {
  const tracker = new YtDlpProgressTracker(25_000_000)

  tracker.update({ formatId: "137", completedLength: 20_000_000, totalLength: 20_000_000, downloadSpeed: 0 })
  const status = tracker.update({
    formatId: "140",
    completedLength: 5_000_000,
    totalLength: 5_000_000,
    downloadSpeed: 1_000_000
  })

  assert.equal(status.eta, 0)
})
