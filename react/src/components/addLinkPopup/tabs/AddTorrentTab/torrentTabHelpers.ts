import { TTorrentTreeNode } from "@components/addLinkPopup/types.ts"
import { resMetadataUrls, TTorrentFileInfo } from "@src/types.ts"
import { formatBytes } from "@src/utils.ts"

export const createTorrentTree = (torrentFiles: TTorrentFileInfo[] | undefined): TTorrentTreeNode[] => {
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

export const formatMetadataSize = (size: string) => {
  const bytes = Number(size)
  return Number.isFinite(bytes) ? formatBytes(bytes) : size
}

export const buildMetadataRows = (metadata: resMetadataUrls): [string, string][] => {
  return [
    ["File name", metadata.fileName],
    ["Size", metadata.size ? formatMetadataSize(metadata.size) : null],
    // ["Type", metadata.typeUrl],
    ["Save path", metadata.savePath],
    // ["Resume", metadata.resume === null ? null : metadata.resume ? "Available" : "Unavailable"],
    ["Info hash", metadata.torrentInfoHash],
    ["Torrent files", metadata.torrentFiles?.length ? String(metadata.torrentFiles.length) : null]
  ].filter((row): row is [string, string] => Boolean(row[1]))
}
