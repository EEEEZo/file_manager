const { app, BrowserWindow, ipcMain, dialog } = require("electron")
const path = require("path")
const fs = require("fs").promises // Add file system module for reading files

let mainWindow

const getLogsPath = () => {
  const userDataPath = app.getPath("userData")
  return path.join(userDataPath, "logs.json")
}

const initializeLogs = async () => {
  const logsPath = getLogsPath()
  try {
    await fs.access(logsPath)
  } catch {
    await fs.writeFile(logsPath, JSON.stringify([]))
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    frame: false, // Remove default frame to use custom title bar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    backgroundColor: "#ffffff",
  })

  // In development, load from Next.js dev server
  // In production, load from built files
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000")
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, "../out/index.html")}`)
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// Window control handlers
ipcMain.on("window-minimize", () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.on("window-close", () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle("read-file", async (event, filePath) => {
  // Add handler to read file contents
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return { success: true, content }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle("list-files", async (event, directoryPath) => {
  // Add handler to list files in directory
  try {
    const files = await fs.readdir(directoryPath)
    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(directoryPath, file)
        const stats = await fs.stat(filePath)
        return {
          name: file,
          path: filePath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
        }
      }),
    )
    return { success: true, files: fileDetails.filter((f) => !f.isDirectory) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle("move-files", async (event, operations, logName) => {
  try {
    const results = []

    for (const op of operations) {
      const { sourcePath, destinationPath } = op
      const destDir = path.dirname(destinationPath)

      // Create destination directory if it doesn't exist
      await fs.mkdir(destDir, { recursive: true })

      // Move the file
      await fs.rename(sourcePath, destinationPath)

      results.push({
        fileName: path.basename(sourcePath),
        sourcePath,
        destinationPath,
        success: true,
      })
    }

    // Create log entry
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19)
    const logEntry = {
      id: `log_${Date.now()}`,
      name: logName || `File Organization ${timestamp}`,
      timestamp,
      action: "move",
      files: results.map((r, index) => ({
        number: index + 1,
        fileName: r.fileName,
        sourcePath: r.sourcePath,
        destinationPath: r.destinationPath,
        selected: true,
      })),
    }

    // Save log
    const logsPath = getLogsPath()
    const logs = JSON.parse(await fs.readFile(logsPath, "utf-8"))
    logs.unshift(logEntry) // Add to beginning
    await fs.writeFile(logsPath, JSON.stringify(logs, null, 2))

    return { success: true, results, logEntry }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle("delete-files", async (event, filePaths, logName) => {
  try {
    const results = []

    for (const filePath of filePaths) {
      await fs.unlink(filePath)
      results.push({
        fileName: path.basename(filePath),
        filePath,
        success: true,
      })
    }

    // Create log entry
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19)
    const logEntry = {
      id: `log_${Date.now()}`,
      name: logName || `File Deletion ${timestamp}`,
      timestamp,
      action: "delete",
      files: results.map((r, index) => ({
        number: index + 1,
        fileName: r.fileName,
        sourcePath: r.filePath,
        destinationPath: "Deleted",
        selected: true,
      })),
    }

    // Save log
    const logsPath = getLogsPath()
    const logs = JSON.parse(await fs.readFile(logsPath, "utf-8"))
    logs.unshift(logEntry)
    await fs.writeFile(logsPath, JSON.stringify(logs, null, 2))

    return { success: true, results, logEntry }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle("read-logs", async () => {
  try {
    const logsPath = getLogsPath()
    const logs = JSON.parse(await fs.readFile(logsPath, "utf-8"))
    return { success: true, logs }
  } catch (error) {
    return { success: false, error: error.message, logs: [] }
  }
})

ipcMain.handle("revert-operation", async (event, logId) => {
  try {
    const logsPath = getLogsPath()
    const logs = JSON.parse(await fs.readFile(logsPath, "utf-8"))
    const log = logs.find((l) => l.id === logId)

    if (!log) {
      return { success: false, error: "Log not found" }
    }

    if (log.action === "move") {
      // Move files back to original location
      for (const file of log.files) {
        await fs.rename(file.destinationPath, file.sourcePath)
      }
    } else if (log.action === "delete") {
      return { success: false, error: "Cannot revert deleted files" }
    }

    // Mark log as reverted
    log.reverted = true
    log.revertedAt = new Date().toISOString().replace("T", " ").substring(0, 19)
    await fs.writeFile(logsPath, JSON.stringify(logs, null, 2))

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

app.whenReady().then(async () => {
  await initializeLogs()
  createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
