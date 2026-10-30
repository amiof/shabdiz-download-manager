import CustomTitleBar from "@components/customTilebar/CustomTitleBar.tsx"
import LinkIcon from "@mui/icons-material/Link"
import { Alert, Button, Snackbar, Tab, Tabs, TextField } from "@mui/material"
import { useEffect, useState } from "react"
import DownloadOptionsGroup from "./DownloadOptionsGroup.tsx"
import { ALL_OPTIONS, getOverrides, OPTION_GROUPS } from "./editDownloadTypes.ts"
import { useLocation } from "react-router-dom"
import { getIdFromLocation } from "@src/utils.ts"
import clsx from "clsx"
import styles from "../../style.module.scss"

export default function EditDownloadPopup() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingUrl, setChangingUrl] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [gid, setGid] = useState("")
  const [downloadName, setDownloadName] = useState("")
  const [downloadUrl, setDownloadUrl] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [dbOverrides, setDbOverrides] = useState<Record<string, string>>({})
  const [globalDefaults, setGlobalDefaults] = useState<Record<string, string>>({})
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMsg, setSnackbarMsg] = useState("")
  const [statusDownloadRow, setStatusDownloadRow] = useState<string>("")
  const location = useLocation()
  const id = getIdFromLocation(location, ":")

  useEffect(() => {
    const load = async () => {
      try {
        const stored = (await window.electronAPI.getSelectedDownloadForEdit()) as {
          Gid?: string
          FileName?: string
          gid?: string
          name?: string
          Status?: string
        } | null

        setStatusDownloadRow(stored?.Status ?? "")

        if (!stored) {
          setLoading(false)
          return
        }

        const downloadGid = stored.Gid || stored.gid || ""
        if (!downloadGid) {
          setLoading(false)
          return
        }
        setGid(downloadGid)

        const [aria2Options, savedOverrides, rawDownloadInfo] = await Promise.all([
          window.electronAPI.getDownloadOptions(downloadGid),
          window.electronAPI.getDownloadOptionOverrides(downloadGid),
          window.electronAPI.getDownloadInfo(downloadGid)
        ])

        // options are null for rows aria2 does not know (yt-dlp downloads)
        const downloadFileName = stored.FileName || stored.name || aria2Options?.out || downloadGid
        setDownloadName(downloadFileName)

        setGlobalDefaults(aria2Options || {})
        setDbOverrides(savedOverrides || {})

        const downloadInfo = rawDownloadInfo as { files?: Array<{ uris?: Array<{ uri?: string }> }> } | null
        let url = ""
        if (downloadInfo?.files?.[0]?.uris?.[0]?.uri) {
          url = downloadInfo.files[0].uris[0].uri
        }
        setDownloadUrl(url)
        setNewUrl(url)

        const values: Record<string, string> = {}
        for (const def of ALL_OPTIONS) {
          const dbVal = savedOverrides[def.key]
          const aria2Val = aria2Options?.[def.key] ?? ""
          values[def.key] = dbVal !== undefined ? dbVal : aria2Val
        }
        setFormValues(values)
      } catch (err) {
        console.error("Failed to load download options:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetOption = (key: string) => {
    setFormValues((prev) => ({ ...prev, [key]: globalDefaults[key] ?? "" }))
  }

  const handleSave = async () => {
    if (!gid) return
    setSaving(true)
    try {
      const newOverrides = getOverrides(formValues, globalDefaults, dbOverrides)
      const success = await window.electronAPI.saveDownloadOptions(gid, newOverrides)
      if (success) {
        setDbOverrides(newOverrides)
        setSnackbarMsg("Options saved")
      } else {
        setSnackbarMsg("Failed to apply options — check if values are valid")
      }
      setSnackbarOpen(true)
    } catch (err) {
      console.error("Failed to save options:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleChangeUrl = async () => {
    if (!gid || !newUrl.trim() || newUrl === downloadUrl) return
    setChangingUrl(true)
    try {
      const newOverrides = getOverrides(formValues, globalDefaults, dbOverrides)
      await window.electronAPI.saveDownloadOptions(gid, newOverrides)

      const result = await window.electronAPI.changeDownloadUrl(gid, newUrl.trim())
      if (result?.newGid) {
        setGid(result.newGid)
        setDownloadUrl(newUrl.trim())
        setDbOverrides(newOverrides)
        setSnackbarMsg(`URL changed! New GID: ${result.newGid}`)
        setSnackbarOpen(true)
      }
    } catch (err) {
      console.error("Failed to change URL:", err)
      setSnackbarMsg("Failed to change URL")
      setSnackbarOpen(true)
    } finally {
      setChangingUrl(false)
    }
  }

  const isUrlChanged = newUrl.trim() !== "" && newUrl.trim() !== downloadUrl

  if (loading) {
    return (
      <div className="w-full h-full border-r border-l border-b border-[rgba(255,255,255,0.3)] flex items-center justify-center bg-[radial-gradient(circle_at_15%_10%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(34,197,94,0.10),transparent_32%),linear-gradient(145deg,#05080d_0%,#0a1019_45%,#0d1420_100%)]">
        <p className="text-neutral-400">Loading download options…</p>
      </div>
    )
  }

  if (!gid) {
    return (
      <div className="w-full h-full border-r border-l border-b border-[rgba(255,255,255,0.3)] flex items-center justify-center bg-[radial-gradient(circle_at_15%_10%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(34,197,94,0.10),transparent_32%),linear-gradient(145deg,#05080d_0%,#0a1019_45%,#0d1420_100%)]">
        <p className="text-neutral-400">No download selected for editing.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full">
      <CustomTitleBar id={id} widthTitleBar="43%">
        <div
          className={clsx(
            "w-30 bg-[#0d1420] mb-1 text-center rounded-xl font-bold border border-[rgba(255,255,255,0.3)] ",
            styles.slideUp
          )}
        >
          edit options
        </div>
      </CustomTitleBar>
      <div className="w-full h-full border-r border-l border-b border-[rgba(255,255,255,0.3)] rounded-xl flex flex-col p-5 overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(34,197,94,0.10),transparent_32%),linear-gradient(145deg,#05080d_0%,#0a1019_45%,#0d1420_100%)]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Edit Download Options</h2>
          <p className="text-sm text-neutral-400 mt-1">{downloadName}</p>
          <p className="text-xs text-neutral-500 mt-0.5">GID: {gid}</p>
        </div>

        <div className="flex items-center gap-2 mb-4 border border-white/10 bg-white/5 drop-shadow-2xl rounded-md p-3">
          <LinkIcon sx={{ color: "text.secondary", fontSize: 18 }} />
          <TextField
            size="small"
            fullWidth
            label="Download URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://example.com/file.zip"
            sx={{ "& .MuiOutlinedInput-root": { backgroundColor: isUrlChanged ? "action.hover" : "transparent" } }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleChangeUrl}
            disabled={!isUrlChanged || changingUrl}
            sx={{ minWidth: 100, whiteSpace: "nowrap" }}
          >
            {changingUrl ? "Changing…" : "Change URL"}
          </Button>
        </div>
        <div>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2, minHeight: 36 }}>
            {OPTION_GROUPS.map(({ label }) => (
              <Tab key={label} label={label} sx={{ minHeight: 36, textTransform: "none" }} />
            ))}
          </Tabs>
        </div>

        <div className="flex-1 overflow-auto px-3 py-4 border border-white/10 backdrop-blur-2xl bg-white/5 shadow-2xl rounded-md light-scrollbar">
          <DownloadOptionsGroup
            statusDownload={statusDownloadRow}
            options={OPTION_GROUPS[activeTab]?.options ?? []}
            values={formValues}
            defaults={globalDefaults}
            saved={dbOverrides}
            onChange={handleChange}
            onReset={handleResetOption}
          />
        </div>

        <div className="w-full flex justify-end gap-2 mt-auto pt-4">
          <Button
            variant="outlined"
            onClick={() => {
              const reset: Record<string, string> = {}
              for (const def of ALL_OPTIONS) reset[def.key] = globalDefaults[def.key] ?? ""
              setFormValues(reset)
            }}
          >
            Reset All
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={2000}
          onClose={() => setSnackbarOpen(false)}
          // message={snackbarMsg}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert sx={{ width: "50%", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(5px)" }}>
            {snackbarMsg}
          </Alert>
        </Snackbar>
      </div>
    </div>
  )
}
