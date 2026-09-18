import { TTorrentTreeNode } from "@components/addLinkPopup/types.ts"
import FolderIcon from "@mui/icons-material/Folder"
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined"
import { Box, Checkbox, Paper, Typography } from "@mui/material"
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView"
import { TreeItem } from "@mui/x-tree-view/TreeItem"
import { formatBytes } from "@src/utils.ts"

type TorrentFileTreeProps = {
  nodes: TTorrentTreeNode[]
  fileName: string | null
  selectedIndexes: Set<number>
  totalCount: number
  onNodeSelection: (node: TTorrentTreeNode, checked: boolean) => void
}

const TorrentFileTree = (props: TorrentFileTreeProps) => {
  const { nodes, fileName, selectedIndexes, totalCount, onNodeSelection } = props

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
              onChange={(event) => onNodeSelection(node, event.target.checked)}
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

  return (
    <div className="w-full h-full px-8 py-5 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <Typography variant="subtitle1">Torrent contents</Typography>
          {fileName && <Typography color="text.secondary">{fileName}</Typography>}
        </div>
        <Typography variant="caption" color="text.secondary">
          {selectedIndexes.size} of {totalCount} selected
        </Typography>
      </div>
      <Paper
        variant="outlined"
        className="flex-1 overflow-auto max-h-[274px] p-1"
        sx={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        {nodes.length ? (
          <SimpleTreeView>{nodes.map(renderTreeNode)}</SimpleTreeView>
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

export default TorrentFileTree
