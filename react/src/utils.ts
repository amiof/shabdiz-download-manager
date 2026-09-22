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

// ---------------------------------------------------------------------------
// "Added at" registry
//
// aria2 does not report when a download was added, and the createdAt column of
// the DB is reset by the delete-then-insert done in update-downloadRow-status.
// So the renderer stamps every gid the first time it sees it and persists that
// map, which gives the data grid a stable timestamp to sort by (newest first).
// ---------------------------------------------------------------------------
const ADDED_AT_STORAGE_KEY = "shabdiz-download-added-at"
const ADDED_AT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

let addedAtRegistry: Record<string, number> | null = null
let addedAtRegistryDirty = false

const readAddedAtRegistry = (): Record<string, number> => {
  if (addedAtRegistry) return addedAtRegistry

  let registry: Record<string, number> = {}

  try {
    const stored = window.localStorage.getItem(ADDED_AT_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : null

    registry = parsed && typeof parsed === "object" ? { ...parsed } : {}
  } catch (error) {
    // storage unavailable or corrupt: keep working in memory only
    console.log(error)
  }

  addedAtRegistry = registry

  return registry
}

// returns the stored "added at" for a gid and stamps it on first sight
export const getAddedAt = (gid: string | undefined, seedTimestamp: number): number => {
  if (!gid) return seedTimestamp

  const registry = readAddedAtRegistry()
  const known = registry[gid]

  if (Number.isFinite(known)) return known

  registry[gid] = seedTimestamp
  addedAtRegistryDirty = true

  return seedTimestamp
}

// persisted only when a new gid was stamped, so the 900ms poll stays cheap
export const saveAddedAtRegistry = () => {
  if (!addedAtRegistryDirty || !addedAtRegistry) return

  // keep the map bounded: old entries are only needed while the row can still
  // be listed. Never prune by gid presence, a transient aria2 failure empties
  // tellActive/tellStopped and would re-stamp (and so re-order) every row.
  const oldestKept = Date.now() - ADDED_AT_MAX_AGE_MS

  for (const gid of Object.keys(addedAtRegistry)) {
    if (!(addedAtRegistry[gid] > oldestKept)) {
      delete addedAtRegistry[gid]
    }
  }

  addedAtRegistryDirty = false

  try {
    window.localStorage.setItem(ADDED_AT_STORAGE_KEY, JSON.stringify(addedAtRegistry))
  } catch (error) {
    console.log(error)
  }
}

export const formatDateTime = (value?: Date | number | string | null): string => {
  if (value === undefined || value === null) return "—"

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString()
}
