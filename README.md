<div align="center">
  <img src="./assets/icons/shabdiz.png" alt="icon" style="width:400px;"/>
</div>

## 📥 Shabdiz Download Manager


A modern, cross-platform download manager built with Electron, React, and aria2c. This application provides a powerful and user-friendly interface for managing your downloads with advanced features powered by aria2c.

---

## 🎬 Demo


![demo](https://raw.githubusercontent.com/amiof/images/main/download-manager-1.3.3.gif)


---



## 🚀 Features

- **High-Speed Downloads**: Leverages aria2c for fast, multi-threaded downloading
- **BitTorrent & Magnet Support**: Download via Magnet links, `.torrent` files, and HTTP/HTTPS torrent links
- **Selective Torrent Downloading**: Interactive directory and file tree view to preview and select specific files
  before downloading
- **Real-time Progress Tracking**: WebSocket integration with aria2c for live download statistics
- **Modern UI**: Built with React and Material-UI for a clean, responsive interface
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Download Management**: Pause, resume, and cancel downloads with ease
- **Persistent Storage**: SQLite database with TypeORM for storing download history
- **State Management**: Efficient state handling with Zustand
- **Multiple Downloads**: Handle multiple simultaneous downloads
- **Download Queue**: Organize and prioritize your downloads
- **Scheduler**: Schedule downloads to start and stop at specific times
- **Share**: Copy download info to clipboard for easy sharing
- **Proxy Support**: Configure HTTP/HTTPS proxy settings
- **Torrent Configuration**: Fine-tune DHT, peer exchange, seed ratio, and live seeder indicators
- **Storage Management**: Select and manage download storage directories
- **Browser Extension Support**: Send download links directly from Chrome or Firefox to Shabdiz via the [Shabdiz Browser Extension](https://github.com/amiof/shabdiz-browser-extension)

## 🧩 Browser Extension

Shabdiz ships with a companion browser extension for **Chrome** and **Firefox**. Once installed, you can send download links from your browser straight to the download manager — Shabdiz runs a local server on port `3325` that receives links from the extension and starts downloading instantly.

**Download / install:** [shabdiz-browser-extension](https://github.com/amiof/shabdiz-browser-extension)

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Material-UI (MUI)** - Component library
- **MUI X DataGrid** - Data grid for download list
- **MUI X TreeView** - Sidebar tree navigation
- **Vite** - Fast build tool and dev server
- **Zustand** - Lightweight state management
- **React Router** - Navigation
- **Tailwind CSS** - Utility-first styling
- **SCSS Modules** - Component-scoped styles

### Backend (Electron)
- **Electron** - Cross-platform desktop framework
- **aria2c** - High-performance download engine
- **parse-torrent** - Parsing and inspecting torrent files and magnet URIs
- **WebSocket (ws)** - Real-time communication with aria2c
- **TypeORM** - Database ORM
- **SQLite3** - Local database
- **electron-store** - Electron app configuration storage

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm**
- **Git**

## 🐛 Known Issues

- aria2c binaries are included for Windows and macOS. Linux users need to install aria2c separately.


## 🛠️ Installation
- in windows may be install Microsoft Visual C++ Redistributable
1. **Clone the repository**
   ```bash
   git clone https://github.com/amiof/shabdiz-download-manager.git
   cd shabdiz-download-manager
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install Electron dependencies**
   ```bash
   cd electron
   npm install
   cd ..
   ```

4. **Install React dependencies**
   ```bash
   cd react
   npm install
   cd ..
   ```

## 🚀 Development

### Run the application in development mode

```bash
npm start
```

This command will:
- Start the React development server (Vite)
- Start the Electron app in development mode
- Enable hot-reload for both frontend and backend

### Run React only
```bash
npm run start:react
```

### Run Electron only
```bash
npm run start:electron
```

## 🔨 Build

### Build for production

```bash
npm run build
```

This will build both the React app and Electron backend.

### Build React only
```bash
npm run build:react
```

### Build Electron only
```bash
npm run build:electron
```

## 📦 Package

Create distributable packages for different platforms:

### Package for all platforms
```bash
npm run package
```

### Package for Linux
```bash
npm run package:linux
```

### Package for Linux (RPM)
```bash
npm run package:linux:rpm
```

### Package for Windows
```bash
npm run package:win
```

The packaged applications will be in the `release` folder.

## 📁 Project Structure

```
shabdiz-download-manager/
├── assets/                    # Application icons and images
├── electron/                  # Electron main process
│   ├── src/
│   │   ├── main.ts            # Electron main entry point
│   │   ├── aria2c.ts          # aria2c process management
│   │   ├── aria2Config.ts     # aria2c configuration
│   │   ├── types.ts           # Shared TypeScript types
│   │   ├── utils.ts           # Utility functions
│   │   ├── database/          # TypeORM database setup
│   │   │   ├── database.ts    # Database connection
│   │   │   └── entities/      # Database entities
│   │   ├── ipc/               # IPC handlers
│   │   │   ├── channels.ts    # IPC channel definitions
│   │   │   ├── utils.ts       # IPC utility functions
│   │   │   ├── actions/       # Download actions (stop, resume, etc.)
│   │   │   ├── config/        # App config handlers (proxy, aria2, torrent)
│   │   │   ├── download/      # Download management
│   │   │   ├── getData/       # Data retrieval handlers
│   │   │   ├── openPopup/     # Popup window handlers
│   │   │   ├── scheduler/     # Scheduler IPC handler
│   │   │   ├── share/         # Share download info handler
│   │   │   └── utils/         # IPC utilities
│   │   ├── preload/           # Preload scripts
│   │   │   └── preload.ts     # Context bridge API
│   │   ├── release-aria2/     # aria2c binaries
│   │   │   └── bin/
│   │   │       ├── macOS/     # macOS aria2c binary
│   │   │       └── win/       # Windows aria2c binary
│   │   ├── schedulerProcess/  # Scheduler process logic
│   │   │   └── schedulerProcess.ts
│   │   └── store/             # Electron store
│   │       └── electronStore.ts
│   └── package.json
├── react/                     # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── loading/       # Loading & shutdown spinners
│   │   │   ├── addLinkPopup/  # Add download link popup
│   │   │   ├── buttonAction/  # Toolbar button action component
│   │   │   ├── header/        # App header with speed display & search
│   │   │   ├── main/          # Main download list (DataGrid)
│   │   │   ├── sidebar/       # Sidebar navigation tree
│   │   │   ├── startDownload/ # Download start dialog
│   │   │   └── toolbar/       # Toolbar with action buttons
│   │   │       └── ToolbarPopups/
│   │   │           ├── OptionsPopup.tsx    # Options/settings panel
│   │   │           ├── SchedulerPopup.tsx  # Download scheduler
│   │   │           ├── SharePopup.tsx      # Share download info
│   │   │           ├── ProxyConfig.tsx     # Proxy settings
│   │   │           ├── Aria2Conf.tsx       # aria2c configuration
│   │   │           ├── StorageConf.tsx     # Storage directory settings
│   │   │           └── torrentConf.tsx     # Torrent settings
│   │   ├── hooks/             # Custom React hooks
│   │   ├── store/             # Zustand stores
│   │   │   ├── downloaderStore.ts    # Download state store
│   │   │   ├── downloaderAction.ts   # Download actions
│   │   │   └── storeType.ts          # Store type definitions
│   │   ├── assets/            # Images and icons
│   │   ├── types.ts           # Frontend type definitions
│   │   ├── renderer.ts        # Electron API type definitions
│   │   ├── utils.ts           # Utility functions
│   │   ├── App.tsx            # Main App component
│   │   └── main.tsx           # React entry point
│   ├── index.html
│   ├── vite.config.ts         # Vite configuration
│   └── package.json
├── package.json               # Root package.json
├── biome.json                 # Biome linter/formatter config
└── README.md
```

## 🔧 Configuration

### aria2c Configuration
The application uses aria2c for download management. Configuration can be found in:
- `electron/src/aria2Config.ts` - aria2c settings
- `electron/src/aria2c.ts` - aria2c process management
- `react/src/components/toolbar/ToolbarPopups/Aria2Conf.tsx` - UI configuration panel

### Database
The application uses SQLite with TypeORM. Database entities are located in:
- `electron/src/database/entities/`
- `electron/src/database/database.ts` - Database connection setup

## 🌐 How It Works

1. **Electron Main Process**: Manages the application lifecycle and spawns the aria2c process
2. **aria2c**: Handles the actual downloading with support for multiple protocols (HTTP, HTTPS,FTP, etc.)
3. **WebSocket Connection**: Establishes a WebSocket connection to aria2c's JSON-RPC interface for real-time communication
4. **IPC Communication**: Electron's IPC handles communication between the main process and React renderer
5. **React Frontend**: Displays the UI and allows users to interact with downloads
6. **Database**: Stores download history and metadata persistently
7. **Scheduler**: Runs a separate process to manage timed download start/stop and optional system shutdown


## 🙏 Acknowledgments

- [aria2](https://aria2.github.io/) - The powerful download utility
- [Electron](https://www.electronjs.org/) - Build cross-platform desktop apps
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- [Material-UI](https://mui.com/) - React component library


## 📝 License

This project is licensed under the GPL v2 License.
