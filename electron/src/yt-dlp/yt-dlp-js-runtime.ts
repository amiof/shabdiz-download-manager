// yt-dlp solves the YouTube "n" challenge with an external JavaScript runtime.
// Only `deno` is enabled by default, and the app cannot expect a deno (or any
// other runtime) to be installed on the machine.
//
// Electron already carries a Node.js build, and its executable runs as plain
// node when ELECTRON_RUN_AS_NODE is set. That makes the executable of the app
// itself a JavaScript runtime yt-dlp can use, so nothing has to be downloaded.
//
// no relative runtime import here, so `node --test` can load this module

// the release that introduced --js-runtimes. A binary older than that rejects
// the argument, and the app may still be running one before the update tab
// installs a newer release
export const JS_RUNTIME_MIN_VERSION = "2025.11.12"

// set for the yt-dlp process only, the runtime it starts inherits it
export const ELECTRON_NODE_ENV = "ELECTRON_RUN_AS_NODE"

// yt-dlp versions are date based, so the parts are compared as numbers. A text
// comparison would put "2026.9.1" below "2025.11.12"
const versionParts = (version: string): number[] =>
  (version.trim().replace(/^v/i, "").match(/\d+/g) ?? []).map(Number)

// the app executable is handed over as the node runtime of yt-dlp, either as
// the binary itself or as the folder that holds it
export const buildJsRuntimeArgs = (execPath: string): string[] => ["--js-runtimes", `node:${execPath}`]

// a binary that predates the option would exit with an argument error on every
// link, so the runtime is only passed to a version that understands it
export const supportsJsRuntimeArgs = (version: string | undefined): boolean => {
  const installed = versionParts(version ?? "")
  if (!installed.length) return false

  const required = versionParts(JS_RUNTIME_MIN_VERSION)
  for (let index = 0; index < required.length; index++) {
    const difference = (installed[index] ?? 0) - required[index]
    if (difference !== 0) return difference > 0
  }

  return true
}
