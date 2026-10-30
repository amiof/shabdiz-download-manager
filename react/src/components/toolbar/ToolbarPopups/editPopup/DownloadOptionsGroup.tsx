import DownloadOptionRow from "./DownloadOptionRow.tsx"
import type { DownloadOption } from "./editDownloadTypes.ts"

type Props = {
  options: DownloadOption[]
  values: Record<string, string>
  defaults: Record<string, string>
  saved: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: (key: string) => void
  statusDownload: string
}

export default function DownloadOptionsGroup({
  options,
  values,
  defaults,
  saved,
  onChange,
  onReset,
  statusDownload
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((definition) => (
        <DownloadOptionRow
          statusDownload={statusDownload}
          key={definition.key}
          definition={definition}
          value={values[definition.key] ?? ""}
          globalValue={defaults[definition.key] ?? ""}
          saved={saved[definition.key] !== undefined}
          onChange={(value) => onChange(definition.key, value)}
          onReset={() => onReset(definition.key)}
        />
      ))}
    </div>
  )
}
