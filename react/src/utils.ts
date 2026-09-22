import { TDownloads, TtellRes } from "@src/types.ts"
import { Location } from "react-router-dom"

export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// aria2 returns most numeric fields as strings, so coerce defensively.
// Anything that cannot be parsed to a finite number becomes 0.
export const toFiniteNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const formatBytes = (bytes: number | string | null | undefined, decimals = 2) => {
  const value = Number(bytes)
  // Avoid producing "NaN undefined" when size/speed is not reported yet.
  if (!Number.isFinite(value)) return "—"
  if (value === 0) return "0 Bytes"
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  const i = Math.min(sizes.length - 1, Math.max(0, Math.floor(Math.log(Math.abs(value)) / Math.log(1024))))
  return `${parseFloat((value / Math.pow(1024, i)).toFixed(decimals))} ${sizes[i]}`
}

export const getFileName = (name: string) => {
  try {
    const splitedName = name.split("/")
    return splitedName[splitedName.length - 1]
  } catch (error) {
    console.log(error)
    return ""
  }
}

export const getIdFromLocation = (location: Location<unknown>, split: string) => {
  const splitedLocation = location.pathname.split(split)
  return splitedLocation[splitedLocation.length - 1]
}

export const formatTime = (seconds: number) => {
  if (seconds === Infinity) return "∞"
  // Guard against NaN / missing values / negative estimates so the UI never
  // renders "NaNh NaNm NaNs".
  if (!Number.isFinite(seconds) || seconds < 0) return "—"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return `${hours}h ${minutes}m ${secs}s`
}

export const searchInDownloadsRows = (data: TDownloads[], searchValue: string) => {
  if (searchValue === "") return data
  return data.filter((item) => item.FileName?.toLowerCase().includes(searchValue.toLowerCase()))
}

export const isMetadataPhase = (tellStatus: TtellRes): boolean => {
  return (
    tellStatus?.totalLength === "0" &&
    tellStatus.files?.length === 1 &&
    !!tellStatus.files[0]?.path?.startsWith("[METADATA]")
  )
}

export const isTorrentMode = (tellStatus: TtellRes) => {
  return "infoHash" in tellStatus
}
