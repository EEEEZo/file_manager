const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electron", {
  // Window controls
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),

  // File system operations
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  listFiles: (directoryPath) => ipcRenderer.invoke("list-files", directoryPath),

  moveFiles: (operations, logName, conflictOption) => ipcRenderer.invoke("move-files", operations, logName, conflictOption),
  deleteFiles: (filePaths, logName) => ipcRenderer.invoke("delete-files", filePaths, logName),

  readLogs: () => ipcRenderer.invoke("read-logs"),
  revertOperation: (logId) => ipcRenderer.invoke("revert-operation", logId),

  // Settings methods
  loadSettings: () => ipcRenderer.invoke("load-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  checkConflicts: (operations) => ipcRenderer.invoke("check-conflicts", operations),

  // AI organization
  organizeFiles: (files, prompt, folders, apiKey) => ipcRenderer.invoke("organize-files", { files, prompt, folders, apiKey }),
})
