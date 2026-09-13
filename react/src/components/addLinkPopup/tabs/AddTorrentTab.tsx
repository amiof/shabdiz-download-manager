import { TAddTorrentTabProps, TTorrentInputType, TTorrentTreeNode } from "@components/addLinkPopup/types.ts"
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined"
import FolderIcon from "@mui/icons-material/Folder"
import FolderOpenIcon from "@mui/icons-material/FolderOpen"
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined"
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView"
import { TreeItem } from "@mui/x-tree-view/TreeItem"
import { TTorrentFileInfo } from "@src/types.ts"
import { formatBytes } from "@src/utils.ts"
import { useEffect } from "react"

const createTorrentTree = (torrentFiles: TTorrentFileInfo[] | undefined) => {
  const root: TTorrentTreeNode = { id: "root", name: "root", children: [], fileIndexes: [] }

  torrentFiles?.forEach((file, index) => {
    const pathParts = file.path.split("\\").join("/").split("/").filter(Boolean)
    const parts = pathParts.length ? pathParts : [file.name || `File ${index + 1}`]
    let currentNode = root

    parts.forEach((part, partIndex) => {
      const isFile = partIndex === parts.length - 1
      if (isFile) {
        currentNode.children.push({
          id: `file-${index}`,
          name: file.name || part,
          children: [],
          fileIndexes: [index],
          fileIndex: index,
          length: file.length
        })
        currentNode.fileIndexes.push(index)
        return
      }

      let folder = currentNode.children.find((child) => child.fileIndex === undefined && child.name === part)
      if (!folder) {
        folder = {
          id: `${currentNode.id}/folder-${partIndex}-${part}`,
          name: part,
          children: [],
          fileIndexes: []
        }
        currentNode.children.push(folder)
      }
      folder.fileIndexes.push(index)
      currentNode = folder
    })
  })

  return root.children
}

const formatMetadataSize = (size: string) => {
  const bytes = Number(size)
  return Number.isFinite(bytes) ? formatBytes(bytes) : size
}

const AddTorrentTab = (props: TAddTorrentTabProps) => {
  const {
    inputType,
    inputValue,
    metadata,
    selectedTorrentIndexes,
    step,
    loading,
    error,
    switchToTorrentLink,
    setSwitchToTorrentLink,
    onInputTypeChange,
    onInputValueChange,
    onSelectTorrentFile,
    onSubmit,
    onSelectedTorrentIndexesChange,
  } = props

  const torrentTree = createTorrentTree(metadata?.torrentFiles)
  const selectedIndexes = new Set(selectedTorrentIndexes)

  const handleInputTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onInputTypeChange(event.target.value as TTorrentInputType)
  }
  const handleNodeSelection = (node: TTorrentTreeNode, checked: boolean) => {
    const nextIndexes = new Set(selectedTorrentIndexes)
    node.fileIndexes.forEach((index) => {
      if (checked) nextIndexes.add(index)
      else nextIndexes.delete(index)
    })
    onSelectedTorrentIndexesChange([...nextIndexes].sort((first, second) => first - second))
  }

  useEffect(() => {
    if (switchToTorrentLink.isMagnet || switchToTorrentLink.isTorrent) {
      onInputTypeChange(switchToTorrentLink.isMagnet ? "Magnet URL" : "Torrent Link")
      onInputValueChange(switchToTorrentLink.linkAddress)
      setSwitchToTorrentLink({isTorrent:false,isMagnet:false,linkAddress:""})
    }
  }, [switchToTorrentLink])

  const renderTreeNode = (node: TTorrentTreeNode) => {
    const selectedChildren = node.fileIndexes.filter((index) => selectedIndexes.has(index)).length
    const checked = node.fileIndexes.length > 0 && selectedChildren === node.fileIndexes.length
    const indeterminate = selectedChildren > 0 && selectedChildren < node.fileIndexes.length
    const isFile = node.fileIndex !== undefined


    return (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={
          <Box className="flex items-center w-full pr-2" onClick={(event) => event.stopPropagation()}>
            <Checkbox
              size="small"
              checked={checked}
              indeterminate={indeterminate}
              onChange={(event) => handleNodeSelection(node, event.target.checked)}
              disabled={!node.fileIndexes.length}
            />
            {isFile ? (
              <InsertDriveFileOutlinedIcon sx={{ mr: 1, fontSize: 18, color: "text.secondary" }} />
            ) : (
              <FolderIcon sx={{ mr: 1, fontSize: 19, color: "warning.main" }} />
            )}
            <Typography variant="body2" className="truncate">
              {node.name}
            </Typography>
            {isFile && node.length !== undefined && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", pl: 2, whiteSpace: "nowrap" }}>
                {formatBytes(node.length)}
              </Typography>
            )}
          </Box>
        }
      >
        {node.children.map(renderTreeNode)}
      </TreeItem>
    )
  }

  if (step === "files") {
    return (
      <div className="w-full h-full px-8 py-5 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Typography variant="subtitle1">Torrent contents</Typography>
            {metadata?.fileName && <Typography color="text.secondary">{metadata.fileName}</Typography>}
          </div>
          <Typography variant="caption" color="text.secondary">
            {selectedTorrentIndexes.length} of {metadata?.torrentFiles?.length ?? 0} selected
          </Typography>
        </div>
        <Paper variant="outlined" className="flex-1 overflow-auto max-h-[274px] p-1"
               sx={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
          {torrentTree.length ? (
            <SimpleTreeView>{torrentTree.map(renderTreeNode)}</SimpleTreeView>
          ) : (
            <div className="h-full flex items-center justify-center">
              <Typography variant="body2" color="text.secondary">
                No torrent files were returned in the metadata.
              </Typography>
            </div>
          )}
        </Paper>
      </div>
    )
  }

  const metadataRows = metadata
    ? [
      ["File name", metadata.fileName],
      ["Size", metadata.size ? formatMetadataSize(metadata.size) : null],
      // ["Type", metadata.typeUrl],
      ["Save path", metadata.savePath],
      // ["Resume", metadata.resume === null ? null : metadata.resume ? "Available" : "Unavailable"],
      ["Info hash", metadata.torrentInfoHash],
      ["Torrent files", metadata.torrentFiles?.length ? String(metadata.torrentFiles.length) : null]
    ].filter((row): row is [string, string] => Boolean(row[1]))
    : []

  return (
    <div className="w-full h-full px-10 py-5 flex flex-col gap-4 overflow-auto">
      <FormControl>
        <FormLabel>Source</FormLabel>
        <RadioGroup row value={inputType} onChange={handleInputTypeChange}>
          <FormControlLabel value="Magnet URL" control={<Radio size="small" />} label="Magnet URL" />
          <FormControlLabel value="Torrent Link" control={<Radio size="small" />} label="Torrent Link" />
          <FormControlLabel value="Torrent File" control={<Radio size="small" />} label="Torrent File" />
        </RadioGroup>
      </FormControl>

      <div className="flex items-center gap-2">
        <TextField
          color="success"
          size="small"
          fullWidth
          value={inputValue}
          label={inputType}
          placeholder={inputType === "Magnet URL" ? "magnet:?xt=urn:btih:..." : "https://example.com/file.torrent"}
          onChange={(event) => onInputValueChange(event.target.value)}
          InputProps={
            inputType === "Torrent File"
              ? {
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={onSelectTorrentFile} edge="end" size="small">
                      <FolderOpenIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }
              : undefined
          }
        />
        {(
          <Tooltip title="Fetch metadata">
            <span>
              <IconButton color="success" onClick={onSubmit} disabled={!inputValue.trim() || loading}>
                {loading ? <CircularProgress size={22} color="inherit" /> : <DownloadOutlinedIcon />}
              </IconButton>
            </span>
          </Tooltip>
        )}
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {metadata && (
        <Paper variant="outlined" className="px-4 py-2" sx={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Metadata
          </Typography>
          <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
            {metadataRows.map(([label, value]) => (
              <div className="contents truncate" key={label}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" className="break-all truncate">
                  {value}
                </Typography>
              </div>
            ))}
          </div>
        </Paper>
      )}
    </div>
  )
}

export default AddTorrentTab