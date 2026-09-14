import { resMetadataUrls } from "@src/types.ts"

export type TAddLinkTabs = "Options" | "Proxy" | "Link" | "Torrent"

export type TTorrentInputType = "Magnet URL" | "Torrent Link" | "Torrent File"

export type TTorrentStep = "metadata" | "files"

export type TAddTorrentTabProps = {
  inputType: TTorrentInputType
  inputValue: string
  metadata: resMetadataUrls | null
  selectedTorrentIndexes: number[]
  step: TTorrentStep
  loading: boolean
  error: string
  onInputTypeChange: (inputType: TTorrentInputType) => void
  onInputValueChange: (value: string) => void
  onSelectTorrentFile: () => void
  onSubmit: () => void
  onSelectedTorrentIndexesChange: (indexes: number[]) => void
  setSwitchToTorrentLink: React.Dispatch<React.SetStateAction<{
    isMagnet: boolean,
    isTorrent: boolean,
    linkAddress: string
  }>>
  switchToTorrentLink: {
    isMagnet: boolean,
    isTorrent: boolean,
    linkAddress: string
  }
}

export type TTorrentTreeNode = {
  id: string
  name: string
  children: TTorrentTreeNode[]
  fileIndexes: number[]
  fileIndex?: number
  length?: number
}

