const { app, BrowserWindow, ipcMain, dialog } = require("electron")
const path = require("path")
const fs = require("fs").promises // Add file system module for reading files
const { generateText } = require("ai")
const { createOpenAI } = require("@ai-sdk/openai")

let mainWindow

const getLogsPath = () => {
  const userDataPath = app.getPath("userData")
  return path.join(userDataPath, "logs.json")
}

const getSettingsPath = () => {
  const userDataPath = app.getPath("userData")
  return path.join(userDataPath, "settings.json")
}

const initializeLogs = async () => {
  const logsPath = getLogsPath()
  try {
    await fs.access(logsPath)
  } catch {
    await fs.writeFile(logsPath, JSON.stringify([]))
  }
}

const initializeSettings = async () => {
  const settingsPath = getSettingsPath()
  try {
    await fs.access(settingsPath)
  } catch {
    await fs.writeFile(settingsPath, JSON.stringify({ folders: [], apiKey: "" }))
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
    const indexPath = path.join(__dirname, "../out/index.html")
    mainWindow.loadFile(indexPath)
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

ipcMain.handle("move-files", async (event, operations, logName, conflictOption = "rename") => {
  try {
    const results = []

    for (const op of operations) {
      const { sourcePath, destinationPath } = op
      const destDir = path.dirname(destinationPath)

      // Create destination directory if it doesn't exist
      await fs.mkdir(destDir, { recursive: true })

      let finalDestPath = destinationPath

      // Check if file exists and handle conflict
      try {
        await fs.access(destinationPath)
        
        if (conflictOption === "skip") {
          results.push({
            fileName: path.basename(sourcePath),
            sourcePath,
            destinationPath: "Skipped - file exists",
            success: false,
          })
          continue
        } else if (conflictOption === "rename") {
          // Add number suffix to filename
          const ext = path.extname(destinationPath)
          const base = path.basename(destinationPath, ext)
          const dir = path.dirname(destinationPath)
          let counter = 1
          while (true) {
            finalDestPath = path.join(dir, `${base} (${counter})${ext}`)
            try {
              await fs.access(finalDestPath)
              counter++
            } catch {
              break
            }
          }
        }
        // If "overwrite", just use the original path
      } catch {
        // File doesn't exist, proceed normally
      }

      // Move the file
      await fs.rename(sourcePath, finalDestPath)

      results.push({
        fileName: path.basename(sourcePath),
        sourcePath,
        destinationPath: finalDestPath,
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
    logs.unshift(logEntry)
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

ipcMain.handle("load-settings", async () => {
  try {
    const settingsPath = getSettingsPath()
    const settings = JSON.parse(await fs.readFile(settingsPath, "utf-8"))
    return { success: true, ...settings }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle("save-settings", async (event, newSettings) => {
  try {
    const settingsPath = getSettingsPath()
    let settings = {}
    try {
      settings = JSON.parse(await fs.readFile(settingsPath, "utf-8"))
    } catch {
      settings = { folders: [], apiKey: "" }
    }
    
    // Merge new settings
    settings = { ...settings, ...newSettings }
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2))
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle("check-conflicts", async (event, operations) => {
  try {
    const conflicts = []
    
    for (const op of operations) {
      try {
        await fs.access(op.destinationPath)
        conflicts.push(path.basename(op.destinationPath))
      } catch {
        // File doesn't exist, no conflict
      }
    }

    if (conflicts.length === 0) {
      return "proceed"
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Rename", "Overwrite", "Skip", "Cancel"],
      defaultId: 0,
      title: "File Conflict",
      message: `${conflicts.length} file(s) already exist in destination:`,
      detail: conflicts.join("\n") + "\n\nHow would you like to proceed?",
    })

    return ["rename", "overwrite", "skip", "cancel"][response]
  } catch (error) {
    return "cancel"
  }
})

ipcMain.handle("organize-files", async (event, { files, prompt, folders, apiKey }) => {
  try {
    if (!apiKey) {
      throw new Error("OpenAI API key not found. Please set your API key in Settings.")
    }

    const openai = createOpenAI({
      apiKey: apiKey,
    })

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `You are a file organization assistant. Based on the user's request and file contents, determine which folder each file should be moved to.

User's organization request: "${prompt}"

Available folders:
${folders.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Files to organize:
${files
  .map(
    (f, i) => `
File ${i + 1}: ${f.fileName}
Content preview: ${f.content.substring(0, 500)}...
`,
  )
  .join("\n")}

For each file, respond with a JSON array containing objects with "fileName" and "destination" (full folder path from the available folders list).
Only respond with the JSON array, no additional text.

Example response format:
[
  {"fileName": "file1.pdf", "destination": "C:\\\\Users\\\\admin\\\\Documents\\\\CNU\\\\3_2\\\\컴파일러개론"},
  {"fileName": "file2.pdf", "destination": "C:\\\\Users\\\\admin\\\\Documents\\\\Reports"}
]`,
      temperature: 0.3,
    })

    // Parse AI response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response")
    }

    const results = JSON.parse(jsonMatch[0])
    return { success: true, results }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

app.whenReady().then(async () => {
  await initializeLogs()
  await initializeSettings() // Initialize settings
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
