export const DOWNLOAD_CHANNELS = {
  ADD_DOWNLOAD_LINK: "add-download-dir"
}
export const GET_DATA_CHANNELS = {
  GET_DOWNLOADS: "get-downloads",
  GET_TELL_STATUS: "get-tell-status",
  GET_GLOBAL_STATE: "get-global-state",
  SET_DOWNLOAD_DATA_ACTIVE: "set-download-data-active",
  DATA_CHANGE: "data-change",
  GET_DOWNLOAD_DATA_ACTIVE: "get-download-data-active",
  CHECK_DOWNLOADED_FILES_DETAILS: "get-downloaded-files-details",
  ADD_LINK_TO_DB: "add-link-to-db",
  UPDATE_DOWNLOAD_ROW_STATUS: "update-downloadRow-status",
  GET_COMPLETED_ROW_FROM_DB: "get-completed-row-from-db"
}

export const POPUP_CHANNELS = {
  ADD_LINK_POPUP: "add-link-popup",
  CLOSE_POPUP_WINDOW: "close-popup",
  WINDOW_POPUP_MAXIMIZE: "window-maximize",
  WINDOW_POPUP_MINIMIZE: "window-minimize",
  CLOSE_MAIN_POPUP: "window-close",
  POPUP_START_DOWNLOAD: "popup-start-download",
  POPUP_OPEN_OPTIONS: "open-options-popup",
  POPUP_OPEN_SCHEDULER: "open-scheduler-popup",
  POPUP_OPEN_SHARE: "open-share-popup",
  POPUP_OPEN_EDIT_DOWNLOAD: "open-edit-download-popup"
}
export const SHARE_CHANNELS = {
  SET_SELECTED_ROWS_FOR_SHARE: "set-selected-rows-for-share",
  GET_SELECTED_ROWS_FOR_SHARE: "get-selected-rows-for-share"
}

export const EDIT_DOWNLOAD_CHANNELS = {
  SET_SELECTED_DOWNLOAD_FOR_EDIT: "set-selected-download-for-edit",
  GET_SELECTED_DOWNLOAD_FOR_EDIT: "get-selected-download-for-edit",
  GET_DOWNLOAD_OPTIONS: "get-download-options",
  GET_DOWNLOAD_INFO: "get-download-info",
  CHANGE_DOWNLOAD_OPTIONS: "change-download-options",
  GET_OPTION_OVERRIDES: "get-option-overrides",
  SAVE_OPTION_OVERRIDES: "save-option-overrides",
  RESET_DOWNLOAD_OPTION: "reset-download-option",
  CHANGE_DOWNLOAD_URL: "change-download-url"
}

export const ACTIONS_CHANNELS = {
  STOP_DOWNLOAD_BY_GID: "stop-download-by-gid",
  UNPAUSE_ALL: "unpause-all",
  UNPAUSE_BY_GID: "unpause-By-gid",
  STOP_ALL_DOWNLOADS: "stop-allDownloads",
  REMOVE_DOWNLOAD_BY_GID: "remove-download-by-gid",
  REMOVE_SELECTED_DOWNLOADS: "remove-selected-downloads",
  OPEN_FOLDER: "open-folder"
}
export const CONFIG_CHANNELS = {
  SET_PROXY_CONFIG: "set-proxy-config",
  GET_PROXY_CONFIG: "get-proxy-config",
  GET_ARIA2_CONFIG: "get-aria2-config",
  SET_ARIA2_CONFIG: "set-aria2-config",
  SELECT_STORAGE_DIR: "select-storage-dir",
  GET_SELECTED_STORAGE_CONF_DIR: "get-selected-storage-config-dir",
  SET_SELECTED_STORAGE_DIR: "set-selected-storage-directory",
  GET_TORRENTS_CONF: "get-torrents-config",
  SET_TORRENTS_CONF: "set-torrents-config",
  SELECT_COOKIE_FILE: "select-cookie-file"
}

export const UTILS_CHANNELS = {
  SHOW_NOTIFICATION: "show-notification",
  GET_METADATA_URLS: "get-metadata-urls",
  GET_TORRENT_METADATA_URLS: "get-torrent-metadata-urls",
  GET_TORRENT_METADATA_FILE: "get-torrent-metadata-file",
  GET_MAGNET_METADATA_URLS: "get-magnet-metadata-urls",
  ADD_TORRENT_URL: "add-torrent-url",
  SHOW_CONTEXT_MENU: "show-context-menu",
  CONTEXT_MENU_ACTION: "context-menu-action",
  READ_CLIPBOARD: "read-clipboard"
}
export const YT_DLP_CHANNELS = {
  GET_STATUS: "get-yt-dlp-status",
  GET_UPDATE_STATUS: "get-yt-dlp-update-status",
  CHECK_UPDATE: "check-yt-dlp-update",
  START_UPDATE: "start-yt-dlp-update",
  CLEAR_UPDATE_RESULT: "clear-yt-dlp-update-result",
  DOWNLOAD: "download-yt-dlp",
  GET_MEDIA_INFO: "get-yt-dlp-media-info",
  START_DOWNLOAD: "start-yt-dlp-download",
  GET_DOWNLOAD_STATUS: "get-yt-dlp-download-status",
  CANCEL_DOWNLOAD: "cancel-yt-dlp-download"
}

export const SCHEDULE_CHANNELS = {
  GET_SCHEDULER_DOWNLOAD_ROWS: "get-scheduler-download-rows",
  ADD_ROWS_TO_SCHEDULER_QUEUE: "add-rows-to-scheduler-queue",
  Remove_Rows_From_SCHEDULE_QUEUE: "remove-rows-From-scheduler-queue",
  ADD_SCHEDULER_TIME: "add-scheduler-time",
  GET_SCHEDULER_CONFIG: "get-scheduler-config",
  SCHEDULER_CONFIG_UPDATED: "scheduler-config-updated"
}
