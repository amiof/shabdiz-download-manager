import { TAddTorrentTabProps, TTorrentTreeNode } from "@components/addLinkPopup/types.ts"
import { useEffect } from "react"
import TorrentFileTree from "./TorrentFileTree.tsx"
import TorrentSourceForm from "./TorrentSourceForm.tsx"
import { createTorrentTree } from "./torrentTabHelpers.ts"

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
    onSelectedTorrentIndexesChange
  } = props

  const torrentTree = createTorrentTree(metadata?.torrentFiles)
  const selectedIndexes = new Set(selectedTorrentIndexes)

  const handleNodeSelection = (node: TTorrentTreeNode, checked: boolean) => {
    const nextIndexes = new Set(selectedTorrentIndexes)
    node.fileIndexes.forEach((index) => {
      if (checked) nextIndexes.add(index)
      else nextIndexes.delete(index)
    })
    onSelectedTorrentIndexesChange([...nextIndexes].sort((first, second) => first - second))
  }

  // Apply clipboard-detected magnet/torrent link once, then consume the flag
  useEffect(() => {
    if (switchToTorrentLink.isMagnet || switchToTorrentLink.isTorrent) {
      onInputTypeChange(switchToTorrentLink.isMagnet ? "Magnet URL" : "Torrent Link")
      onInputValueChange(switchToTorrentLink.linkAddress)
      setSwitchToTorrentLink({ isTorrent: false, isMagnet: false, linkAddress: "" })
    }
  }, [switchToTorrentLink])

  if (step === "files") {
    return (
      <TorrentFileTree
        nodes={torrentTree}
        fileName={metadata?.fileName ?? null}
        selectedIndexes={selectedIndexes}
        totalCount={metadata?.torrentFiles?.length ?? 0}
        onNodeSelection={handleNodeSelection}
      />
    )
  }

  return (
    <TorrentSourceForm
      inputType={inputType}
      inputValue={inputValue}
      loading={loading}
      error={error}
      metadata={metadata}
      onInputTypeChange={onInputTypeChange}
      onInputValueChange={onInputValueChange}
      onSelectTorrentFile={onSelectTorrentFile}
      onSubmit={onSubmit}
    />
  )
}

export default AddTorrentTab
