"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Folder, Minus, Square, X, Plus, Trash2, Loader2, Settings } from 'lucide-react'

type FileResult = {
  number: number
  fileName: string
  destinationPath: string
  selected: boolean
}

type LogEntry = {
  id: string
  name: string
  timestamp: string
  files: FileResult[]
}

type FileWithPath = {
  name: string
  path: string
}

const handleMinimize = () => {
  if (typeof window !== "undefined" && (window as any).electron) {
    ;(window as any).electron.minimize()
  }
}

const handleMaximize = () => {
  if (typeof window !== "undefined" && (window as any).electron) {
    ;(window as any).electron.maximize()
  }
}

const handleClose = () => {
  if (typeof window !== "undefined" && (window as any).electron) {
    ;(window as any).electron.close()
  }
}

export default function FileManager() {
  const [files, setFiles] = useState<FileWithPath[]>([])
  const [logHistory, setLogHistory] = useState<LogEntry[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState("files")
  const [inputValue, setInputValue] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [fileResults, setFileResults] = useState<FileResult[]>([])
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [currentDirectory, setCurrentDirectory] = useState("C:\\Users\\admin\\Downloads")
  const [availableFolders, setAvailableFolders] = useState<string[]>([])
  const [showManageFolders, setShowManageFolders] = useState(false)
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [tempApiKey, setTempApiKey] = useState("")

  useEffect(() => {
    const loadFiles = async () => {
      if (typeof window !== "undefined" && (window as any).electron) {
        const result = await (window as any).electron.listFiles(currentDirectory)
        if (result.success) {
          setFiles(result.files)
          setSelectedFiles(new Set())
        }
      }
    }
    loadFiles()
  }, [currentDirectory])

  useEffect(() => {
    const loadLogs = async () => {
      if (typeof window !== "undefined" && (window as any).electron) {
        const result = await (window as any).electron.readLogs()
        if (result.success) {
          setLogHistory(result.logs)
        }
      }
    }
    if (activeTab === "log") {
      loadLogs()
    }
  }, [activeTab])

  useEffect(() => {
    const loadSettings = async () => {
      if (typeof window !== "undefined" && (window as any).electron) {
        const result = await (window as any).electron.loadSettings()
        if (result.success) {
          if (result.folders) {
            setAvailableFolders(result.folders)
          }
          if (result.apiKey) {
            setApiKey(result.apiKey)
          }
        }
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    const saveSettings = async () => {
      if (typeof window !== "undefined" && (window as any).electron) {
        await (window as any).electron.saveSettings({ folders: availableFolders })
      }
    }
    if (availableFolders.length > 0) {
      saveSettings()
    }
  }, [availableFolders])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && activeTab === "files") {
        e.preventDefault()
        setSelectedFiles(new Set(files.map((f) => f.name)))
      }

      if (e.key === "Delete" && showResults && fileResults.length > 0) {
        e.preventDefault()
        handleDelete()
      }

      if (e.key === "Enter") {
        if (showResults && fileResults.length > 0) {
          e.preventDefault()
          handleMove()
        } else if (selectedLog) {
          e.preventDefault()
          handleConfirm()
        }
      }

      if (e.key === "Escape") {
        if (showManageFolders) {
          setShowManageFolders(false)
        } else if (showSettings) {
          setShowSettings(false)
        } else if (showResults) {
          setShowResults(false)
          setFileResults([])
        } else if (selectedLog) {
          setSelectedLog(null)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeTab, files, showResults, fileResults, selectedLog, showManageFolders, showSettings])

  const toggleFile = (fileName: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileName)) {
      newSelected.delete(fileName)
    } else {
      newSelected.add(fileName)
    }
    setSelectedFiles(newSelected)
  }

  const toggleSelectAllFiles = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map((f) => f.name)))
    }
  }

  const handleOrganize = async () => {
    if (selectedFiles.size === 0) {
      alert("Please select at least one file to organize")
      return
    }

    if (!apiKey) {
      alert("Please set your OpenAI API key in Settings")
      setShowSettings(true)
      return
    }

    setIsOrganizing(true)

    const fileContents: { fileName: string; content: string; path: string }[] = []

    for (const fileName of Array.from(selectedFiles)) {
      const file = files.find((f) => f.name === fileName)
      if (file && typeof window !== "undefined" && (window as any).electron) {
        const result = await (window as any).electron.readFile(file.path)
        if (result.success) {
          fileContents.push({
            fileName,
            content: result.content.substring(0, 5000),
            path: file.path,
          })
        }
      }
    }

    try {
      // In production, use Electron IPC. In dev, use API endpoint
      const isDev = typeof window !== "undefined" && window.location.hostname === "localhost"
      
      let data

      if (isDev && typeof window !== "undefined" && !(window as any).electron) {
        // Dev without Electron (browser mode)
        const response = await fetch("/api/organize", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: fileContents,
            prompt: inputValue || "Organize these files based on their content",
            folders: availableFolders,
            apiKey: apiKey,
          }),
        })
        data = await response.json()
      } else if (typeof window !== "undefined" && (window as any).electron) {
        // Production with Electron
        data = await (window as any).electron.organizeFiles(
          fileContents,
          inputValue || "Organize these files based on their content",
          availableFolders,
          apiKey
        )
      } else {
        throw new Error("Cannot organize files - Electron bridge not available")
      }

      if (data.success) {
        const results: FileResult[] = data.results.map((r: any, index: number) => ({
          number: index + 1,
          fileName: r.fileName,
          destinationPath: `${currentDirectory} → ${r.destination}`,
          selected: true,
        }))
        setFileResults(results)
        setShowResults(true)
      } else {
        alert("Failed to organize files: " + data.error)
      }
    } catch (error) {
      console.error("[v0] Error organizing files:", error)
      alert("Failed to organize files. Please try again.")
    } finally {
      setIsOrganizing(false)
    }
  }

  const toggleResultSelection = (index: number) => {
    const newResults = [...fileResults]
    newResults[index].selected = !newResults[index].selected
    setFileResults(newResults)
  }

  const toggleAllResults = () => {
    const allSelected = fileResults.every((r) => r.selected)
    const newResults = fileResults.map((r) => ({ ...r, selected: !allSelected }))
    setFileResults(newResults)
  }

  const handleLogClick = (log: LogEntry) => {
    setSelectedLog(log)
  }

  const handleRevert = async () => {
    if (!selectedLog) return

    if (typeof window !== "undefined" && (window as any).electron) {
      const result = await (window as any).electron.revertOperation(selectedLog.id)
      if (result.success) {
        alert(`Successfully reverted: ${selectedLog.name}`)
        const logsResult = await (window as any).electron.readLogs()
        if (logsResult.success) {
          setLogHistory(logsResult.logs)
        }
        setSelectedLog(null)
        setActiveTab("files")
      } else {
        alert(`Failed to revert: ${result.error}`)
      }
    }
  }

  const handleConfirm = () => {
    setSelectedLog(null)
    setActiveTab("files")
  }

  const toggleLogResultSelection = (index: number) => {
    if (!selectedLog) return
    const newFiles = [...selectedLog.files]
    newFiles[index].selected = !newFiles[index].selected
    setSelectedLog({ ...selectedLog, files: newFiles })
  }

  const toggleAllLogResults = () => {
    if (!selectedLog) return
    const allSelected = selectedLog.files.every((f) => f.selected)
    const newFiles = selectedLog.files.map((f) => ({ ...f, selected: !allSelected }))
    setSelectedLog({ ...selectedLog, files: newFiles })
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === "log") {
      setShowResults(false)
    } else if (tab === "files") {
      setSelectedLog(null)
    }
  }

  const handleSelectDirectory = async () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      const directory = await (window as any).electron.selectDirectory()
      if (directory) {
        setCurrentDirectory(directory)
      }
    }
  }

  const handleAddFolder = async () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      const directory = await (window as any).electron.selectDirectory()
      if (directory && !availableFolders.includes(directory)) {
        setAvailableFolders([...availableFolders, directory])
      }
    }
  }

  const handleDeleteFolder = (folderPath: string) => {
    setAvailableFolders(availableFolders.filter((f) => f !== folderPath))
  }

  const handleMove = async () => {
    const selectedResults = fileResults.filter((r) => r.selected)
    if (selectedResults.length === 0) {
      alert("Please select at least one file to move")
      return
    }

    if (typeof window !== "undefined" && (window as any).electron) {
      const operations = selectedResults.map((result) => {
        const sourcePath = files.find((f) => f.name === result.fileName)?.path
        const destPath = result.destinationPath.split(" → ")[1]
        const destinationPath = `${destPath}\\${result.fileName}`
        return { sourcePath, destinationPath }
      })

      const conflictOption = await (window as any).electron.checkConflicts(operations)
      
      if (conflictOption === "cancel") {
        return
      }

      const logName = inputValue || `File Organization ${new Date().toLocaleString()}`
      const result = await (window as any).electron.moveFiles(operations, logName, conflictOption)

      if (result.success) {
        alert(`Successfully moved ${selectedResults.length} file(s)`)
        const remainingResults = fileResults.filter((r) => !r.selected)
        setFileResults(remainingResults)
        
        if (remainingResults.length === 0) {
          setShowResults(false)
          setInputValue("")
        }
        
        const filesResult = await (window as any).electron.listFiles(currentDirectory)
        if (filesResult.success) {
          setFiles(filesResult.files)
        }
      } else {
        alert(`Failed to move files: ${result.error}`)
      }
    }
  }

  const handleDelete = async () => {
    const selectedResults = fileResults.filter((r) => r.selected)
    if (selectedResults.length === 0) {
      alert("Please select at least one file to delete")
      return
    }

    const confirmed = confirm(`Are you sure you want to delete ${selectedResults.length} file(s)?`)
    if (!confirmed) return

    if (typeof window !== "undefined" && (window as any).electron) {
      const filePaths = selectedResults
        .map((result) => files.find((f) => f.name === result.fileName)?.path)
        .filter(Boolean)

      const logName = `File Deletion ${new Date().toLocaleString()}`
      const result = await (window as any).electron.deleteFiles(filePaths, logName)

      if (result.success) {
        alert(`Successfully deleted ${selectedResults.length} file(s)`)
        const remainingResults = fileResults.filter((r) => !r.selected)
        setFileResults(remainingResults)
        
        if (remainingResults.length === 0) {
          setShowResults(false)
          setInputValue("")
        }
        
        const filesResult = await (window as any).electron.listFiles(currentDirectory)
        if (filesResult.success) {
          setFiles(filesResult.files)
        }
      } else {
        alert(`Failed to delete files: ${result.error}`)
      }
    }
  }

  const handleSaveApiKey = async () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      const result = await (window as any).electron.saveSettings({ apiKey: tempApiKey })
      if (result.success) {
        setApiKey(tempApiKey)
        setShowSettings(false)
        alert("API key saved successfully!")
      }
    }
  }

  const allFilesSelected = selectedFiles.size === files.length
  const isLogTabActive = activeTab === "log"

  return (
    <div className="flex h-screen flex-col">
      <div className="drag-region flex items-center justify-end bg-[#24292e] px-2 py-1 text-white">
        <div className="no-drag flex items-center">
          <button
            onClick={handleMinimize}
            className="flex h-8 w-12 items-center justify-center text-lg hover:bg-[#2f363d]"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            onClick={handleMaximize}
            className="flex h-8 w-12 items-center justify-center text-sm hover:bg-[#2f363d]"
          >
            <Square className="h-3 w-3" />
          </button>
          <button onClick={handleClose} className="flex h-8 w-12 items-center justify-center text-lg hover:bg-red-600">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="drag-region flex items-center gap-4 border-b border-[#cccccc] bg-[#24292e] px-4 py-2 text-white">
        <button
          onClick={handleSelectDirectory}
          className="no-drag flex items-center gap-2 rounded px-3 py-1.5 hover:bg-[#2f363d]"
        >
          <Folder className="h-5 w-5" />
          <div className="flex flex-col items-start">
            <span className="text-xs text-[#cccccc]">Current Directory</span>
            <span className="text-sm font-medium">{currentDirectory}</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </button>

        <button
          onClick={() => setShowManageFolders(!showManageFolders)}
          className="no-drag flex items-center gap-2 rounded px-3 py-1.5 hover:bg-[#2f363d]"
        >
          <Folder className="h-5 w-5" />
          <span className="text-sm font-medium">Manage Folders</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        <button
          onClick={() => {
            setTempApiKey(apiKey)
            setShowSettings(true)
          }}
          className="no-drag ml-auto flex items-center gap-2 rounded-lg bg-[#0366d6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0256c7]"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {showManageFolders && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[600px] rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#cccccc] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#000000]">Manage Destination Folders</h2>
              <button onClick={() => setShowManageFolders(false)} className="text-[#586069] hover:text-[#000000]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-6">
              <div className="space-y-2">
                {availableFolders.map((folder, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded border border-[#cccccc] bg-[#f6f8fa] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="h-5 w-5 text-[#586069]" />
                      <span className="text-sm text-[#000000]">{folder}</span>
                    </div>
                    <button onClick={() => handleDeleteFolder(folder)} className="text-[#d73a49] hover:text-[#cb2431]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {availableFolders.length === 0 && (
                <div className="py-8 text-center text-sm text-[#586069]">
                  No destination folders added yet. Click "Add Folder" to get started.
                </div>
              )}
            </div>

            <div className="flex justify-between border-t border-[#cccccc] px-6 py-4">
              <button
                onClick={handleAddFolder}
                className="flex items-center gap-2 rounded-lg bg-[#0366d6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0256c7]"
              >
                <Plus className="h-4 w-4" />
                Add Folder
              </button>
              <button
                onClick={() => setShowManageFolders(false)}
                className="rounded-lg bg-[#6a737d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#586069]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[500px] rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#cccccc] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#000000]">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-[#586069] hover:text-[#000000]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-[#000000]">OpenAI API Key</label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-[#cccccc] bg-white px-3 py-2 text-sm text-[#000000] focus:border-[#0366d6] focus:outline-none focus:ring-1 focus:ring-[#0366d6]"
                />
                <p className="mt-2 text-xs text-[#586069]">
                  Get your API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0366d6] hover:underline"
                  >
                    platform.openai.com/api-keys
                  </a>
                </p>
              </div>

              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-[#000000]">Keyboard Shortcuts</h3>
                <div className="space-y-1 text-xs text-[#586069]">
                  <div className="flex justify-between">
                    <span>Select all files:</span>
                    <kbd className="rounded bg-[#f6f8fa] px-2 py-1 font-mono">Ctrl+A</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Delete selected:</span>
                    <kbd className="rounded bg-[#f6f8fa] px-2 py-1 font-mono">Delete</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Confirm action:</span>
                    <kbd className="rounded bg-[#f6f8fa] px-2 py-1 font-mono">Enter</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancel/Close:</span>
                    <kbd className="rounded bg-[#f6f8fa] px-2 py-1 font-mono">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#cccccc] px-6 py-4">
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg bg-[#6a737d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#586069]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="rounded-lg bg-[#0366d6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0256c7]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-96 flex-col border-r border-[#cccccc] bg-[#f6f8fa]">
          <div className="flex border-b border-[#cccccc]">
            <button
              onClick={() => handleTabChange("files")}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === "files"
                  ? "border-b-2 border-[#0366d6] text-[#000000]"
                  : "text-[#586069] hover:text-[#000000]"
              }`}
            >
              files
            </button>
            <button
              onClick={() => handleTabChange("log")}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === "log"
                  ? "border-b-2 border-[#0366d6] text-[#000000]"
                  : "text-[#586069] hover:text-[#000000]"
              }`}
            >
              log
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === "files" ? (
              <>
                <div className="flex items-center gap-3 border-b border-[#cccccc] px-4 py-3">
                  <button
                    onClick={toggleSelectAllFiles}
                    className={`flex h-6 w-6 items-center justify-center rounded ${
                      allFilesSelected ? "bg-[#0366d6]" : "border-2 border-[#cccccc] bg-white"
                    }`}
                  >
                    {allFilesSelected && (
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={toggleSelectAllFiles}
                    className="text-sm font-medium text-[#000000] hover:text-[#0366d6]"
                  >
                    {files.length} files
                  </button>
                </div>

                {files.map((file) => (
                  <div key={file.name} className="flex items-center gap-3 border-b border-[#cccccc] px-4 py-3">
                    <button
                      onClick={() => toggleFile(file.name)}
                      className={`flex h-6 w-6 items-center justify-center rounded ${
                        selectedFiles.has(file.name) ? "bg-[#0366d6]" : "border-2 border-[#cccccc] bg-white"
                      }`}
                    >
                      {selectedFiles.has(file.name) && (
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm text-[#000000]">{file.name}</span>
                  </div>
                ))}
              </>
            ) : (
              <>
                {logHistory.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => handleLogClick(log)}
                    className={`flex w-full items-center gap-3 border-b border-[#cccccc] px-4 py-3 text-left hover:bg-[#e1e4e8] ${
                      selectedLog?.id === log.id ? "bg-[#e1e4e8]" : ""
                    }`}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded border-2 border-[#d1d5da] bg-[#fafbfc]"></div>
                    <div className="flex-1">
                      <div className="text-sm text-[#000000]">{log.name}</div>
                      <div className="text-xs text-[#586069]">{log.timestamp}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="border-t border-[#cccccc] p-4">
            <h3 className={`mb-3 text-lg font-semibold ${isLogTabActive ? "text-[#6a737d]" : "text-[#000000]"}`}>
              Ask anything...
            </h3>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLogTabActive}
              placeholder="Organization Prompt"
              className={`mb-3 h-40 w-full resize-none rounded-lg border px-3 py-2 text-sm placeholder:text-[#6a737d] ${
                isLogTabActive
                  ? "cursor-not-allowed border-[#d1d5da] bg-[#f6f8fa] text-[#6a737d]"
                  : "border-[#cccccc] bg-white text-[#000000] focus:border-[#0366d6] focus:outline-none focus:ring-1 focus:ring-[#0366d6]"
              }`}
            />
            <button
              onClick={handleOrganize}
              disabled={isLogTabActive || isOrganizing}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white ${
                isLogTabActive || isOrganizing ? "cursor-not-allowed bg-[#94a3b8]" : "bg-[#0366d6] hover:bg-[#0256c7]"
              }`}
            >
              {isOrganizing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isOrganizing ? "정리 중..." : "정리"}
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col bg-[#ffffff]">
          {selectedLog ? (
            <>
              <div className="border-b border-[#cccccc] bg-[#dbedff] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#000000]">Log "{selectedLog.name}"</h2>
                  <span className="text-sm text-[#586069]">{selectedLog.timestamp}</span>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <div className="overflow-hidden rounded-lg border border-[#cccccc]">
                  <table className="w-full">
                    <thead className="bg-[#f6f8fa]">
                      <tr>
                        <th className="border-b border-r border-[#cccccc] px-4 py-3 text-center text-sm font-semibold text-[#000000]">
                          번호
                        </th>
                        <th className="border-b border-r border-[#cccccc] px-4 py-3 text-center">
                          <button
                            onClick={toggleAllLogResults}
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                              selectedLog.files.every((f) => f.selected)
                                ? "border-[#0366d6] bg-[#0366d6]"
                                : "border-[#cccccc] bg-white"
                            }`}
                          >
                            {selectedLog.files.every((f) => f.selected) && (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </th>
                        <th className="border-b border-r border-[#cccccc] px-4 py-3 text-left text-sm font-semibold text-[#000000]">
                          File Name
                        </th>
                        <th className="border-b border-[#cccccc] px-4 py-3 text-left text-sm font-semibold text-[#000000]">
                          Destination
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLog.files.map((file, index) => (
                        <tr key={index} className="hover:bg-[#f6f8fa]">
                          <td className="border-b border-r border-[#cccccc] px-4 py-3 text-center text-sm text-[#000000]">
                            {file.number}
                          </td>
                          <td className="border-b border-r border-[#cccccc] px-4 py-3 text-center">
                            <button
                              onClick={() => toggleLogResultSelection(index)}
                              className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                                file.selected ? "border-[#0366d6] bg-[#0366d6]" : "border-[#cccccc] bg-white"
                              }`}
                            >
                              {file.selected && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </td>
                          <td className="border-b border-r border-[#cccccc] px-4 py-3 text-sm text-[#000000]">
                            {file.fileName}
                          </td>
                          <td className="border-b border-[#cccccc] px-4 py-3 text-sm text-[#000000]">
                            {file.destinationPath}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#cccccc] p-6">
                <button
                  onClick={handleConfirm}
                  className="rounded-lg bg-[#0366d6] px-8 py-3 text-sm font-semibold text-white hover:bg-[#0256c7]"
                >
                  확인
                </button>
                <button
                  onClick={handleRevert}
                  className="rounded-lg bg-[#0366d6] px-8 py-3 text-sm font-semibold text-white hover:bg-[#0256c7]"
                >
                  Revert
                </button>
              </div>
            </>
          ) : showResults && fileResults.length > 0 ? (
            <>
              <div className="flex-1 overflow-auto p-6">
                <div className="overflow-hidden rounded-lg border border-[#cccccc]">
                  <table className="w-full">
                    <thead className="bg-[#f6f8fa]">
                      <tr>
                        <th className="border-b border-r border-[#cccccc] px-4 py-3 text-center text-sm font-semibold text-[#000000]">
                          번호
                        </th>
                        <th className="border-b border-r border-[#cccccc] px-4 py-3 text-center">
                          <button
                            onClick={toggleAllResults}
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                              fileResults.every((r) => r.selected)
                                ? "border-[#0366d6] bg-[#0366d6]"
                                : "border-[#cccccc] bg-white"
                            }`}
                          >
                            {fileResults.every((r) => r.selected) && (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </th>
                        <th className="border-b border-r border-[#cccccc] px-4 py-3 text-left text-sm font-semibold text-[#000000]">
                          File Name
                        </th>
                        <th className="border-b border-[#cccccc] px-4 py-3 text-left text-sm font-semibold text-[#000000]">
                          Destination
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileResults.map((result, index) => (
                        <tr key={index} className="hover:bg-[#f6f8fa]">
                          <td className="border-b border-r border-[#cccccc] px-4 py-3 text-center text-sm text-[#000000]">
                            {result.number}
                          </td>
                          <td className="border-b border-r border-[#cccccc] px-4 py-3 text-center">
                            <button
                              onClick={() => toggleResultSelection(index)}
                              className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                                result.selected ? "border-[#0366d6] bg-[#0366d6]" : "border-[#cccccc] bg-white"
                              }`}
                            >
                              {result.selected && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </td>
                          <td className="border-b border-r border-[#cccccc] px-4 py-3 text-sm text-[#000000]">
                            {result.fileName}
                          </td>
                          <td className="border-b border-[#cccccc] px-4 py-3 text-sm text-[#000000]">
                            {result.destinationPath}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#cccccc] p-6">
                <button
                  onClick={handleDelete}
                  className="rounded-lg bg-[#0366d6] px-8 py-3 text-sm font-semibold text-white hover:bg-[#0256c7]"
                >
                  삭제
                </button>
                <button
                  onClick={handleMove}
                  className="rounded-lg bg-[#0366d6] px-8 py-3 text-sm font-semibold text-white hover:bg-[#0256c7]"
                >
                  이동
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
