import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import AddLinkPopup from "@components/addLinkPopup/AddLinkPopup.tsx"
import DownloadStart from "@components/startDownload/startDownload.tsx"
import EditDownloadPopup from "@components/toolbar/ToolbarPopups/editPopup/EditDownloadPopup.tsx"
import OptionsPopup from "@components/toolbar/ToolbarPopups/OptionsPopup.tsx"
import SchedulerPopup from "@components/toolbar/ToolbarPopups/SchedulerPopup.tsx"
import SharePopup from "@components/toolbar/ToolbarPopups/SharePopup.tsx"
import { createTheme, ThemeProvider } from "@mui/material"
import { HashRouter, Route, Routes } from "react-router-dom"
import App from "./App.tsx"

const darkTheme = createTheme({
  palette: {
    mode: "dark"
  }
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/popup/:id/:urlLink" element={<AddLinkPopup />} />
          <Route path="/downloadStart/:id/:fileName" element={<DownloadStart />} />
          <Route path="options/:id" element={<OptionsPopup />} />
          <Route path="scheduler/:id" element={<SchedulerPopup />} />
          <Route path="share/:id" element={<SharePopup />} />
          <Route path="edit-download/:id" element={<EditDownloadPopup />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  </StrictMode>
)
