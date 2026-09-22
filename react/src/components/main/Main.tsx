// import useDownloaderStore from "@src/store/downloaderStore"

import { DataGrid, GridColDef, GridRowSelectionModel } from "@mui/x-data-grid"
import useDownloaderStore from "@src/store/downloaderStore.ts"
import { TDownloads, TtellRes } from "@src/types.ts"
import { formatDateTime, searchInDownloadsRows } from "@src/utils.ts"
import clsx from "clsx"
import { MouseEvent, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ProgressBar } from "react-progressbar-fancy"
import EmptyDownloads from "./EmptyDownloads"
import styles from "./style.module.scss"

const Main = () => {
  const getAllDownloads = useDownloaderStore((state) => state.getAllDownloadsRow)
  const downloadsRow = useDownloaderStore((state) => state.allDownloadsRow)
  const tellActive = useDownloaderStore((state) => state.tellActive)
  const setSelectedRows = useDownloaderStore((state) => state.setSelectedRow)
  const selectedRows = useDownloaderStore((state) => state.selectedRows)
  const searchValue = useDownloaderStore((state) => state.searchValue)
  const sidebarSelectedLabel = useDownloaderStore((state) => state.sidebarSelectedLabel)
  const downloadsGroupingByLabel = useDownloaderStore((state) => state.downloadsGroupByLabel)
  const mainTableId = useDownloaderStore((state) => state.mainTableId)

  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([])
  const prevMainTableId = useRef(mainTableId)

  // for do not loop when switch between sidebar item when select item remove all item
  useLayoutEffect(() => {
    if (rowSelectionModel) {
      setRowSelectionModel([])
      setSelectedRows([])
    }
  }, [sidebarSelectedLabel])

  let dataGridRow: TDownloads[]

  if (sidebarSelectedLabel === "All Downloads" || sidebarSelectedLabel === "all" || sidebarSelectedLabel === "") {
    dataGridRow = downloadsRow
  } else if (sidebarSelectedLabel === "Finished") {
    dataGridRow = downloadsRow.filter((item) => item.Status === "complete")
  } else if (sidebarSelectedLabel === "UnFinished") {
    dataGridRow = downloadsRow.filter((item) => item.Status !== "complete")
  } else if (sidebarSelectedLabel === "Queue") {
    dataGridRow = downloadsRow.filter((item) => item.schedulerQueue)
  } else {
    dataGridRow = downloadsGroupingByLabel[sidebarSelectedLabel.toLowerCase()]
    if (!dataGridRow) dataGridRow = []
  }

  const [activeDownloads, setActiveDownloads] = useState<TtellRes | null>(null)

  window.electronAPI.onDataChange(async (data) => {
    const result = await data
    setActiveDownloads(result)
    setRowSelectionModel([])
    setSelectedRows([])
  })

  useEffect(() => {
    window.electronAPI.onContextMenuAction((payload) => {
      if (typeof payload === "string") {
        // simple actions
        switch (payload) {
          case "add-link":
            console.log(payload)
            setRowSelectionModel([])
            setSelectedRows([])
            break
          case "reload-app":
            window.location.reload()
            break
          case "delete-rows":
            console.log(payload)
            window.location.reload()
            break
          case "resume":
            console.log(payload)
            getAllDownloads()
            setRowSelectionModel([])
            setSelectedRows([])
            break
          case "stop-downloads":
            console.log(payload)
            window.location.reload()
            break
          case "open-folders":
            console.log(payload)
            setRowSelectionModel([])
            setSelectedRows([])
            break
          case "open-options":
            console.log("open options")
            break
          case "add-scheduler":
            console.log(payload)
            window.location.reload()
            break
          case "remove-scheduler":
            console.log(payload)
            window.location.reload()
            break
          default:
            return undefined
        }
      } else {
        // complex actions with data
        switch (payload.action) {
          case "delete-selected":
            console.log(payload)
            break
          case "stop-selected":
            console.log(payload)
            break
          case "resume-selected":
            console.log(payload)
            break
          case "open-folders":
            console.log(payload)
            break
        }
      }
    })
  }, [])

  //for refresh mainTable when i other component need refresh main table
  useLayoutEffect(() => {
    if (prevMainTableId.current !== mainTableId) {
      window.location.reload()
    }
  }, [mainTableId])

  useEffect(() => {
    //for get session data in start app
    setTimeout(async () => {
      await getAllDownloads()
    }, 1000)
  }, [])

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout> | null
    if (tellActive.length) {
      interval = setInterval(async () => {
        await getAllDownloads()
      }, 900)
    } else {
      getAllDownloads()
    }

    return () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }
  }, [tellActive.length, activeDownloads])

  const columns: GridColDef<(typeof rows)[number]>[] = [
    { field: "Id", headerName: "id", width: 50, sortable: true },
    {
      field: "Status",
      headerName: "Status",
      width: 100,
      sortable: false,
      editable: false
    },
    {
      field: "FileName",
      headerName: "File Name",
      width: 150,
      sortable: true,
      editable: false
    },
    {
      field: "Url",
      headerName: "Url",
      width: 150,
      sortable: false,
      editable: false
    },
    {
      field: "SavePath",
      headerName: "Save Path",
      type: "string",
      width: 110,
      sortable: true,
      editable: false
    },
    {
      field: "Percentage",
      headerName: "Percentage",
      width: 200,
      renderCell: (params) => {
        return (
          <div className={clsx("flex flex-col items-center", styles.progress)}>
            <div className="h-[75%]">{params.row.Percentage!}%</div>

            <ProgressBar
              label={""}
              hideText={true}
              className={styles.fixProgress}
              disableGlow={false}
              progressColor={"green"}
              darkTheme={true}
              score={+params.row.Percentage!}
            />
          </div>
        )
      },
      sortable: false,
      editable: false
    },
    {
      field: "CompletedSize",
      headerName: "Completed Size",
      sortable: true,
      width: 100
    },
    {
      field: "Size",
      headerName: "Total Size",
      sortable: true,
      width: 100
      // valueGetter: (_, row) => `${row.firstName || ''} ${row.lastName || ''}`,
    },
    {
      field: "NumberConnections",
      headerName: "Connection",
      width: 100,
      sortable: false,
      editable: false
    },
    {
      field: "CreatedAt",
      headerName: "Added At",
      width: 150,
      valueFormatter: (value) => formatDateTime(value),
      sortable: true,
      editable: false
    }
  ]

  const rows = searchInDownloadsRows(dataGridRow, searchValue)

  const rowSelectedHandler = (selectionModel: GridRowSelectionModel) => {
    setRowSelectionModel(selectionModel)
    const selectedDetails = rows.filter((row) => selectionModel.includes(row.Id!))
    setSelectedRows(selectedDetails)
  }

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    window.electronAPI.showContextMenu(selectedRows)
  }

  return (
    <div className={styles.container} onContextMenu={(e) => handleContextMenu(e)}>
      <DataGrid
        getRowId={(row) => row.Id!}
        // rows already arrive sorted newest first, this keeps the header
        // indicator in sync with what is rendered
        initialState={{
          sorting: {
            sortModel: [{ field: "CreatedAt", sort: "desc" }]
          }
        }}
        scrollbarSize={1}
        checkboxSelection
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={rowSelectedHandler}
        rows={rows}
        columns={columns}
        slots={{
          noRowsOverlay: EmptyDownloads
        }}
        hideFooterPagination={true}
        sx={{
          border: "none",
          "& .MuiDataGrid-container--top [role=row]": {
            //use this when dont want be transparent
            // backgroundColor: "var(--color-neutral-900)",
            backgroundColor: "transparent",
            backdropFilter: "blur(10px)",
            color: "white"
          },
          "& .MuiDataGrid-cell": {
            borderColor: "var(--color-neutral-800)",
            color: "white"
          },
          "& .MuiDataGrid-cell:focus": {
            outline: "none"
          },
          "& .MuiDataGrid-columnHeader:focus": {
            outline: "none"
          },
          "& .MuiDataGrid-columnSeparator": {
            color: "var(--color-neutral-600)"
          },
          "& .MuiDataGrid-selectedRowCount": {
            color: "white"
          },
          "& .MuiDataGrid-filler": {
            "--rowBorderColor": clsx(rows.length ? "var(--color-neutral-800) !important" : "none !important")
          },
          // "& .css-1tdeh38": {
          //   borderColor: "var(--color-neutral-800)"
          // },
          "& .MuiDataGrid-withBorderColor": {
            borderColor: "var(--color-neutral-800)"
          },
          "& .MuiDataGrid-row--borderBottom": {
            "& .MuiDataGrid-columnHeader": {
              borderColor: "var(--color-neutral-800)"
            }
          },
          "& .MuiDataGrid-row--borderBottom ": {
            "& .MuiDataGrid-filler ": {
              borderColor: "var(--color-neutral-800)"
            }
          },
          // scrollbar
          "& .MuiDataGrid-scrollbar": {
            transition: "all 0.3s ease",
            height: "4px !important",
            "&:hover": {
              height: "30% !important"
            }
          },
          ".MuiDataGrid-row.Mui-selected": {
            backgroundColor: "rgb(208 213 217 / 10% )"
          },
          "& .MuiCheckbox-root ": {
            color: "#ececec4a"
          },
          "& .MuiCheckbox-root.Mui-checked": {
            color: "#7ac279"
          },
          "& .MuiDataGrid-cell:focus-within": {
            outline: "none"
          }
        }}
      />
    </div>
  )
}

export default Main
