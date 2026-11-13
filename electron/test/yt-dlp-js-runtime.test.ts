import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildJsRuntimeArgs,
  ELECTRON_NODE_ENV,
  JS_RUNTIME_MIN_VERSION,
  supportsJsRuntimeArgs
} from "../src/yt-dlp/yt-dlp-js-runtime.ts"

test("the app executable is handed to yt-dlp as the node runtime", () => {
  const args = buildJsRuntimeArgs("/opt/Shabdiz/shabdiz")

  // yt-dlp only enables deno by default, node has to be named explicitly
  assert.deepEqual(args, ["--js-runtimes", "node:/opt/Shabdiz/shabdiz"])
})

test("the runtime is passed only to a yt-dlp that knows the option", () => {
  assert.equal(supportsJsRuntimeArgs(JS_RUNTIME_MIN_VERSION), true)
  assert.equal(supportsJsRuntimeArgs("2026.10.26"), true)
  // nightlies carry the same date plus a build number
  assert.equal(supportsJsRuntimeArgs("2026.10.26.123456"), true)
  // a v prefix and spacing are tolerated
  assert.equal(supportsJsRuntimeArgs(" v2026.10.26 "), true)
})

test("an older yt-dlp never sees an argument it would reject", () => {
  // these releases fail the whole run on an unknown argument, so the runtime
  // must not be added before the binary was updated
  assert.equal(supportsJsRuntimeArgs("2025.10.22"), false)
  assert.equal(supportsJsRuntimeArgs("2024.12.13"), false)
  assert.equal(supportsJsRuntimeArgs(undefined), false)
  assert.equal(supportsJsRuntimeArgs(""), false)
  assert.equal(supportsJsRuntimeArgs("nightly"), false)
})

test("the environment of the runtime names the electron switch", () => {
  // without it the app executable starts the desktop app instead of node
  assert.equal(ELECTRON_NODE_ENV, "ELECTRON_RUN_AS_NODE")
})
