import http from "node:http"
import { createPopupWindow } from "../ipc/utils"
import { generateId } from "../utils"


export const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === "POST" && req.url === "/download") {
    let body = ""

    req.on("data", (chunk) => {
      body += chunk
    })

    req.on("end", () => {
      try {
        const data = JSON.parse(body)

        const id = generateId()
        createPopupWindow({
          windowTitle: "addLink",
          height: 600,
          width: 650,
          hashRoute: `popup/${id}/${encodeURIComponent(data.url)}`,
          windowId: id
        })
        console.log("Download request:", data)

        // Add download to your Shabdiz queue here
        // scheduler.add(data)

        res.writeHead(200, {
          "Content-Type": "application/json"
        })

        res.end(
          JSON.stringify({
            success: true
          })
        )
      }
      catch {
        res.writeHead(400, {
          "Content-Type": "application/json"
        })

        res.end(
          JSON.stringify({
            success: false,
            error: "Invalid JSON"
          })
        )
      }
    })

    return
  }

  res.writeHead(404)
  res.end("Not Found")
})
