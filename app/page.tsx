"use client"

import { useState, useEffect, useRef } from "react"
import {
  ChevronDown,
  Folder,
  CircleMinus,
  Square,
  X,
  Plus,
  Loader2,
  Settings,
  Brain,
  ArrowUpDown,
  Eye,
  FileText,
  ImageIcon,
  File,
} from "lucide-react"

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
  size?: number // Added for sorting by size
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
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [geminiApiKey, setGeminiApiKey] = useState("")
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434")
  const [ollamaModel, setOllamaModel] = useState("llama3")
  const [selectedModel, setSelectedModel] = useState("openai")
  const [selectedModelName, setSelectedModelName] = useState("gpt-4o-mini")
  const [tempSettings, setTempSettings] = useState({
    openaiKey: "",
    geminiKey: "",
    ollamaBaseUrl: "http://localhost:11434",
    ollamaModel: "llama3",
    selectedModel: "openai",
    selectedModelName: "gpt-4o-mini",
  })

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [previewFile, setPreviewFile] = useState<FileWithPath | null>(null)
  const [previewContent, setPreviewContent] = useState<string>("")
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [allowAIFolderCreation, setAllowAIFolderCreation] = useState(false)
  const [pendingFolderCreation, setPendingFolderCreation] = useState<{
    folderPath: string
    files: string[]
    reason: string
  } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
          if (result.openaiKey) {
            setApiKey(result.openaiKey)
          }
          if (result.geminiKey) {
            setGeminiApiKey(result.geminiKey)
          }
          if (result.ollamaBaseUrl) {
            setOllamaBaseUrl(result.ollamaBaseUrl)
          }
          if (result.ollamaModel) {
            setOllamaModel(result.ollamaModel)
          }
          if (result.selectedModel) {
            setSelectedModel(result.selectedModel)
          }
          if (result.selectedModelName) {
            setSelectedModelName(result.selectedModelName)
          }
          setTempSettings({
            openaiKey: result.openaiKey || "",
            geminiKey: result.geminiKey || "",
            ollamaBaseUrl: result.ollamaBaseUrl || "http://localhost:11434",
            ollamaModel: result.ollamaModel || "llama3",
            selectedModel: result.selectedModel || "openai",
            selectedModelName: result.selectedModelName || "gpt-4o-mini",
          })
          setAllowAIFolderCreation(result.allowAIFolderCreation || false)

          // Check if user has seen onboarding
          if (!result.hasSeenOnboarding) {
            setShowOnboarding(true)
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
    const checkFirstTime = async () => {
      if (typeof window !== "undefined" && (window as any).electron) {
        const result = await (window as any).electron.loadSettings()
        if (result.success && !result.hasSeenOnboarding) {
          setShowOnboarding(true)
        }
      }
    }
    checkFirstTime()
  }, [])

  useEffect(() => {
    const loadPreview = async () => {
      if (previewFile && typeof window !== "undefined" && (window as any).electron) {
        const result = await (window as any).electron.readFile(previewFile.path)
        if (result.success) {
          setPreviewContent(result.content.substring(0, 1000))
        }
      }
    }
    if (previewFile) {
      loadPreview()
    } else {
      setPreviewContent("")
    }
  }, [previewFile])

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
        } else if (pendingFolderCreation) {
          // Handle Enter key for folder creation
          e.preventDefault()
          handleCreateFolder()
        }
      }

      if (e.key === "Escape") {
        if (showManageFolders) {
          setShowManageFolders(false)
        } else if (showSettings) {
          setShowSettings(false)
        } else if (showModelSelector) {
          setShowModelSelector(false)
        } else if (showResults) {
          setShowResults(false)
          setFileResults([])
        } else if (selectedLog) {
          setSelectedLog(null)
        } else if (previewFile) {
          // Close preview on Escape
          setPreviewFile(null)
        } else if (showSortMenu) {
          // Close sort menu on Escape
          setShowSortMenu(false)
        } else if (pendingFolderCreation) {
          // Close folder creation popup on Escape
          setPendingFolderCreation(null)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    activeTab,
    files,
    showResults,
    fileResults,
    selectedLog,
    showManageFolders,
    showSettings,
    showModelSelector,
    previewFile,
    showSortMenu,
    pendingFolderCreation,
  ])

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
    const selectedFilesForOrganize = files.filter((f) => selectedFiles.has(f.name))
    if (selectedFilesForOrganize.length === 0) {
      alert("Please select at least one file to organize")
      return
    }

    if (availableFolders.length === 0) {
      alert("Please add at least one destination folder in Manage Folders")
      return
    }

    if (selectedModel === "openai" && !apiKey) {
      alert("Please set your OpenAI API key in Settings")
      setShowSettings(true)
      return
    }

    if (selectedModel === "gemini" && !geminiApiKey) {
      alert("Please set your Google Gemini API key in Settings")
      setShowSettings(true)
      return
    }

    setIsOrganizing(true)

    // Read file contents
    const fileContents: { fileName: string; content: string; path: string }[] = []
    for (const file of selectedFilesForOrganize) {
      if (typeof window !== "undefined" && (window as any).electron) {
        const result = await (window as any).electron.readFile(file.path)
        if (result.success) {
          fileContents.push({
            fileName: file.name,
            content: result.content.substring(0, 5000),
            path: file.path,
          })
        } else {
          alert(`Failed to read file: ${file.name}`)
          setIsOrganizing(false)
          return
        }
      }
    }

    try {
      const modelConfig: any = {
        provider: selectedModel,
        modelName: selectedModelName,
      }

      if (selectedModel === "openai") {
        modelConfig.apiKey = apiKey
      } else if (selectedModel === "gemini") {
        modelConfig.apiKey = geminiApiKey
      } else if (selectedModel === "ollama") {
        modelConfig.ollamaBaseUrl = ollamaBaseUrl
        modelConfig.modelName = ollamaModel
      }

      const response = await fetch("/api/organize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: fileContents,
          prompt: inputValue,
          folders: availableFolders,
          model: modelConfig,
          allowNewFolders: allowAIFolderCreation,
        }),
      })

      const data = await response.json()

      if (data.success === false) {
        throw new Error(data.error || "Unknown error during organization.")
      }

      if (data.newFolder) {
        setPendingFolderCreation({
          folderPath: data.newFolder.path,
          files: data.newFolder.files,
          reason: data.newFolder.reason,
        })
        setIsOrganizing(false)
        return
      }

      // Convert results to match expected format
      const results: FileResult[] = data.results.map((r: any, index: number) => ({
        number: index + 1,
        fileName: r.fileName,
        destinationPath: `${currentDirectory} → ${r.destination}`, // Assuming r.destination is the folder name
        selected: true,
      }))

      setFileResults(results)
      setShowResults(true)
      setPreviewFile(null) // Clear preview when new results are shown
    } catch (error: any) {
      console.error("[v0] Error organizing files:", error)
      alert(`Failed to organize files: ${error.message}`)
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
    setActiveTab("log") // Ensure log tab is active when clicking a log
    setPreviewFile(null) // Clear file preview when switching to log
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
      setSelectedLog(null) // Clear selected log when switching to log tab
    } else if (tab === "files") {
      // Don't clear selectedLog here, it might be desired to keep it open
    }
    setPreviewFile(null) // Clear file preview when changing tabs
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
        await (window as any).electron.saveSettings({ folders: [...availableFolders, directory] })
      }
    }
  }

  const handleDeleteFolder = async (folder: string) => {
    const updatedFolders = availableFolders.filter((f) => f !== folder)
    setAvailableFolders(updatedFolders)
    if (typeof window !== "undefined" && (window as any).electron) {
      await (window as any).electron.saveSettings({ folders: updatedFolders })
    }
  }

  const handleToggleAIFolderCreation = async (enabled: boolean) => {
    setAllowAIFolderCreation(enabled)
    if (typeof window !== "undefined" && (window as any).electron) {
      await (window as any).electron.saveSettings({ allowAIFolderCreation: enabled })
    }
  }

  const handleCreateFolder = async () => {
    if (!pendingFolderCreation || typeof window === "undefined" || !(window as any).electron) return

    try {
      // Create the folder
      await (window as any).electron.createFolder(pendingFolderCreation.folderPath)

      // Add to available folders
      const updatedFolders = [...availableFolders, pendingFolderCreation.folderPath]
      setAvailableFolders(updatedFolders)
      await (window as any).electron.saveSettings({ folders: updatedFolders })

      setPendingFolderCreation(null)
      // Re-run organize after folder creation
      setTimeout(() => {
        handleOrganize()
      }, 100)
    } catch (error) {
      alert(`Failed to create folder: ${error}`)
    }
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

  const handleSaveSettings = async () => {
    // Update state with temp settings values
    setApiKey(tempSettings.openaiKey)
    setGeminiApiKey(tempSettings.geminiKey)
    setOllamaBaseUrl(tempSettings.ollamaBaseUrl)
    setOllamaModel(tempSettings.ollamaModel)
    setSelectedModel(tempSettings.selectedModel)
    setSelectedModelName(tempSettings.selectedModelName)

    if (typeof window !== "undefined" && (window as any).electron) {
      await (window as any).electron.saveSettings({
        openaiKey: tempSettings.openaiKey,
        geminiKey: tempSettings.geminiKey,
        ollamaBaseUrl: tempSettings.ollamaBaseUrl,
        ollamaModel: tempSettings.ollamaModel,
        selectedModel: tempSettings.selectedModel,
        selectedModelName: tempSettings.selectedModelName,
        folders: availableFolders,
      })
      setShowSettings(false)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }

  const getModelDisplayName = () => {
    if (selectedModel === "openai") return `OpenAI ${selectedModelName}`
    if (selectedModel === "gemini") return `Gemini ${selectedModelName}`
    if (selectedModel === "ollama") return `Ollama ${ollamaModel}`
    return "Select Model"
  }

  const allFilesSelected = selectedFiles.size === files.length
  const isLogTabActive = activeTab === "log"

  const sortedFiles = [...files].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "date":
        // For now, using file name as proxy. In real implementation, would use file stats
        comparison = a.name.localeCompare(b.name)
        break
      case "size":
        comparison = (a.size || 0) - (b.size || 0)
        break
      case "type":
        const extA = a.name.split(".").pop() || ""
        const extB = b.name.split(".").pop() || ""
        comparison = extA.localeCompare(extB)
        break
    }

    return sortOrder === "asc" ? comparison : -comparison
  })

  const handleCompleteOnboarding = async () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      await (window as any).electron.saveSettings({ hasSeenOnboarding: true })
    }
    setShowOnboarding(false)
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  const handleFileClick = (file: FileWithPath) => {
    if (previewFile?.path === file.path) {
      setPreviewFile(null)
    } else {
      setPreviewFile(file)
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext || "")) {
      return <ImageIcon className="h-4 w-4" />
    }
    if (["txt", "md", "log"].includes(ext || "")) {
      return <FileText className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="drag-region flex items-center justify-end bg-[#24292e] px-2 py-1 text-white">
        <div className="no-drag flex items-center">
          <button
            onClick={handleMinimize}
            className="flex h-8 w-12 items-center justify-center text-lg hover:bg-[#2f363d]"
          >
            <CircleMinus className="h-3 w-3" />
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
          onClick={() => setShowModelSelector(!showModelSelector)}
          className="no-drag flex items-center gap-2 rounded px-3 py-1.5 hover:bg-[#2f363d]"
        >
          <Brain className="h-5 w-5" />
          <span className="text-sm font-medium">{getModelDisplayName()}</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        <button
          onClick={() => {
            setTempSettings({
              openaiKey: apiKey,
              geminiKey: geminiApiKey,
              ollamaBaseUrl,
              ollamaModel,
              selectedModel,
              selectedModelName,
            })
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
              <div className="mb-4 flex items-center justify-between rounded-lg border border-[#cccccc] bg-[#f6f8fa] px-4 py-3">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-[#000000]">AI 폴더 생성 허용</label>
                  <p className="text-xs text-[#586069] mt-1">
                    AI가 등록된 폴더 외에 새로운 폴더를 제안하고 생성할 수 있습니다
                  </p>
                </div>
                <button
                  onClick={() => handleToggleAIFolderCreation(!allowAIFolderCreation)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    allowAIFolderCreation ? "bg-[#0366d6]" : "bg-[#d1d5da]"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      allowAIFolderCreation ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

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
                      <CircleMinus className="h-5 w-5" />
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

      {showModelSelector && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[500px] rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#cccccc] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#000000]">Select AI Model</h2>
              <button onClick={() => setShowModelSelector(false)} className="text-[#586069] hover:text-[#000000]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {/* OpenAI Models */}
                <div className="rounded-lg border-2 border-[#cccccc] bg-[#f6f8fa] p-4">
                  <h3 className="mb-2 font-semibold text-[#000000]">OpenAI</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedModel("openai")
                        setSelectedModelName("gpt-4o-mini")
                        setShowModelSelector(false)
                      }}
                      className={`w-full rounded px-4 py-2 text-left text-sm ${
                        selectedModel === "openai" && selectedModelName === "gpt-4o-mini"
                          ? "bg-[#0366d6] text-white"
                          : "bg-white text-[#000000] hover:bg-[#e1e4e8]"
                      }`}
                    >
                      GPT-4o Mini (Fast & Affordable)
                    </button>
                    <button
                      onClick={() => {
                        setSelectedModel("openai")
                        setSelectedModelName("gpt-4o")
                        setShowModelSelector(false)
                      }}
                      className={`w-full rounded px-4 py-2 text-left text-sm ${
                        selectedModel === "openai" && selectedModelName === "gpt-4o"
                          ? "bg-[#0366d6] text-white"
                          : "bg-white text-[#000000] hover:bg-[#e1e4e8]"
                      }`}
                    >
                      GPT-4o (Most Capable)
                    </button>
                  </div>
                </div>

                {/* Google Gemini Models */}
                <div className="rounded-lg border-2 border-[#cccccc] bg-[#f6f8fa] p-4">
                  <h3 className="mb-2 font-semibold text-[#000000]">Google Gemini</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedModel("gemini")
                        setSelectedModelName("gemini-1.5-flash")
                        setShowModelSelector(false)
                      }}
                      className={`w-full rounded px-4 py-2 text-left text-sm ${
                        selectedModel === "gemini" && selectedModelName === "gemini-1.5-flash"
                          ? "bg-[#0366d6] text-white"
                          : "bg-white text-[#000000] hover:bg-[#e1e4e8]"
                      }`}
                    >
                      Gemini 1.5 Flash (Fast)
                    </button>
                    <button
                      onClick={() => {
                        setSelectedModel("gemini")
                        setSelectedModelName("gemini-1.5-pro")
                        setShowModelSelector(false)
                      }}
                      className={`w-full rounded px-4 py-2 text-left text-sm ${
                        selectedModel === "gemini" && selectedModelName === "gemini-1.5-pro"
                          ? "bg-[#0366d6] text-white"
                          : "bg-white text-[#000000] hover:bg-[#e1e4e8]"
                      }`}
                    >
                      Gemini 1.5 Pro (Most Capable)
                    </button>
                  </div>
                </div>

                {/* Ollama Models */}
                <div className="rounded-lg border-2 border-[#cccccc] bg-[#f6f8fa] p-4">
                  <h3 className="mb-2 font-semibold text-[#000000]">Ollama (Local)</h3>
                  <button
                    onClick={() => {
                      setSelectedModel("ollama")
                      setShowModelSelector(false)
                    }}
                    className={`w-full rounded px-4 py-2 text-left text-sm ${
                      selectedModel === "ollama"
                        ? "bg-[#0366d6] text-white"
                        : "bg-white text-[#000000] hover:bg-[#e1e4e8]"
                    }`}
                  >
                    {ollamaModel} (Free, runs locally)
                  </button>
                  <p className="mt-2 text-xs text-[#586069]">Configure Ollama settings in Settings panel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[80vh] w-[600px] overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#cccccc] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#000000]">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-[#586069] hover:text-[#000000]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* OpenAI Settings */}
              <div className="border-b border-[#cccccc] pb-6">
                <h3 className="mb-3 text-base font-semibold text-[#000000]">OpenAI</h3>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#000000]">API Key</label>
                  <input
                    type="password"
                    value={tempSettings.openaiKey}
                    onChange={(e) => setTempSettings({ ...tempSettings, openaiKey: e.target.value })}
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
              </div>

              {/* Google Gemini Settings */}
              <div className="border-b border-[#cccccc] pb-6">
                <h3 className="mb-3 text-base font-semibold text-[#000000]">Google Gemini</h3>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#000000]">API Key</label>
                  <input
                    type="password"
                    value={tempSettings.geminiKey}
                    onChange={(e) => setTempSettings({ ...tempSettings, geminiKey: e.target.value })}
                    placeholder="AIza..."
                    className="w-full rounded-lg border border-[#cccccc] bg-white px-3 py-2 text-sm text-[#000000] focus:border-[#0366d6] focus:outline-none focus:ring-1 focus:ring-[#0366d6]"
                  />
                  <p className="mt-2 text-xs text-[#586069]">
                    Get your API key from{" "}
                    <a
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0366d6] hover:underline"
                    >
                      makersuite.google.com/app/apikey
                    </a>
                  </p>
                </div>
              </div>

              {/* Ollama Settings */}
              <div className="border-b border-[#cccccc] pb-6">
                <h3 className="mb-3 text-base font-semibold text-[#000000]">Ollama (Local)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#000000]">Base URL</label>
                    <input
                      type="text"
                      value={tempSettings.ollamaBaseUrl}
                      onChange={(e) => setTempSettings({ ...tempSettings, ollamaBaseUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full rounded-lg border border-[#cccccc] bg-white px-3 py-2 text-sm text-[#000000] focus:border-[#0366d6] focus:outline-none focus:ring-1 focus:ring-[#0366d6]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#000000]">Model Name</label>
                    <input
                      type="text"
                      value={tempSettings.ollamaModel}
                      onChange={(e) => setTempSettings({ ...tempSettings, ollamaModel: e.target.value })}
                      placeholder="llama3, mistral, etc."
                      className="w-full rounded-lg border border-[#cccccc] bg-white px-3 py-2 text-sm text-[#000000] focus:border-[#0366d6] focus:outline-none focus:ring-1 focus:ring-[#0366d6]"
                    />
                    <p className="mt-2 text-xs text-[#586069]">
                      Install Ollama from{" "}
                      <a
                        href="https://ollama.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0366d6] hover:underline"
                      >
                        ollama.ai
                      </a>{" "}
                      and pull models with <code className="rounded bg-[#f6f8fa] px-1">ollama pull llama3</code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div>
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
                onClick={handleSaveSettings}
                className="rounded-lg bg-[#0366d6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0256c7]"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="flex w-[380px] flex-col border-r border-[#cccccc] bg-white">
          <div className="flex border-b border-[#cccccc]">
            <button
              onClick={() => handleTabChange("files")}
              className={`flex-1 border-b-2 px-6 py-3 text-sm font-medium ${
                activeTab === "files"
                  ? "border-[#0366d6] text-[#0366d6]"
                  : "border-transparent text-[#586069] hover:text-[#000000]"
              }`}
            >
              files
            </button>
            <button
              onClick={() => handleTabChange("log")}
              className={`flex-1 border-b-2 px-6 py-3 text-sm font-medium ${
                activeTab === "log"
                  ? "border-[#0366d6] text-[#0366d6]"
                  : "border-transparent text-[#586069] hover:text-[#000000]"
              }`}
            >
              log
            </button>
            {activeTab === "files" && (
              <div className="relative flex items-center px-2">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-sm text-[#586069] hover:bg-[#f6f8fa]"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-[#cccccc] bg-white shadow-lg">
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setSortBy("name")
                          setShowSortMenu(false)
                        }}
                        className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f6f8fa] ${
                          sortBy === "name" ? "bg-[#f6f8fa] font-medium" : ""
                        }`}
                      >
                        Name
                      </button>
                      <button
                        onClick={() => {
                          setSortBy("date")
                          setShowSortMenu(false)
                        }}
                        className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f6f8fa] ${
                          sortBy === "date" ? "bg-[#f6f8fa] font-medium" : ""
                        }`}
                      >
                        Date
                      </button>
                      <button
                        onClick={() => {
                          setSortBy("size")
                          setShowSortMenu(false)
                        }}
                        className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f6f8fa] ${
                          sortBy === "size" ? "bg-[#f6f8fa] font-medium" : ""
                        }`}
                      >
                        Size
                      </button>
                      <button
                        onClick={() => {
                          setSortBy("type")
                          setShowSortMenu(false)
                        }}
                        className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f6f8fa] ${
                          sortBy === "type" ? "bg-[#f6f8fa] font-medium" : ""
                        }`}
                      >
                        Type
                      </button>
                      <div className="my-1 border-t border-[#cccccc]"></div>
                      <button
                        onClick={() => {
                          toggleSortOrder()
                          setShowSortMenu(false)
                        }}
                        className="w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f6f8fa]"
                      >
                        {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File/Log list content */}
          {activeTab === "files" && !selectedLog && !pendingFolderCreation ? (
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#cccccc] px-4 py-2">
                <button
                  onClick={toggleSelectAllFiles}
                  className="text-sm font-medium text-[#0366d6] hover:text-[#0256c7]"
                >
                  {allFilesSelected ? "Deselect All" : "Select All"} ({files.length} files)
                </button>
              </div>
              {sortedFiles.map((file) => (
                <div
                  key={file.name}
                  onClick={() => handleFileClick(file)}
                  className={`flex items-center gap-3 border-b border-[#cccccc] px-4 py-3 hover:bg-[#f6f8fa] ${
                    previewFile?.path === file.path ? "bg-[#e1f0ff]" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.name)}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleFile(file.name)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5 rounded border-[#0366d6] text-[#0366d6] focus:ring-[#0366d6]"
                  />
                  <div className="flex flex-1 items-center gap-2">
                    {getFileIcon(file.name)}
                    <div className="flex-1">
                      <div className="text-sm text-[#000000]">{file.name}</div>
                      <div className="text-xs text-[#586069]">{formatFileSize(file.size || 0)}</div>
                    </div>
                    {previewFile?.path === file.path && <Eye className="h-4 w-4 text-[#0366d6]" />}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "log" ? (
            <div className="flex-1 overflow-y-auto">
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
            </div>
          ) : null}

          {/* Bottom Input Section */}
          <div className="border-t border-[#cccccc] p-4">
            <h3 className={`mb-3 text-lg font-semibold ${isLogTabActive ? "text-[#6a737d]" : "text-[#000000]"}`}>
              Ask anything...
            </h3>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLogTabActive || !!pendingFolderCreation}
              placeholder="Organization Prompt"
              className={`mb-3 h-40 w-full resize-none rounded-lg border px-3 py-2 text-sm placeholder:text-[#6a737d] ${
                isLogTabActive || !!pendingFolderCreation
                  ? "cursor-not-allowed border-[#d1d5da] bg-[#f6f8fa] text-[#6a737d]"
                  : "border-[#cccccc] bg-white text-[#000000] focus:border-[#0366d6] focus:outline-none focus:ring-1 focus:ring-[#0366d6]"
              }`}
            />
            <button
              onClick={handleOrganize}
              disabled={isLogTabActive || isOrganizing || !!pendingFolderCreation}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white ${
                isLogTabActive || isOrganizing || !!pendingFolderCreation
                  ? "cursor-not-allowed bg-[#94a3b8]"
                  : "bg-[#0366d6] hover:bg-[#0256c7]"
              }`}
            >
              {isOrganizing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isOrganizing ? "정리 중..." : "정리"}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-[#f6f8fa]">
          {previewFile && !showResults && !selectedLog && !pendingFolderCreation && (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-[#cccccc] bg-white px-6 py-4">
                <div className="flex items-center gap-3">
                  {getFileIcon(previewFile.name)}
                  <div>
                    <h2 className="text-lg font-semibold text-[#000000]">{previewFile.name}</h2>
                    <p className="text-sm text-[#586069]">{previewFile.path}</p>
                  </div>
                </div>
                <button onClick={() => setPreviewFile(null)} className="text-[#586069] hover:text-[#000000]">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="rounded-lg border border-[#cccccc] bg-white p-4">
                  <pre className="whitespace-pre-wrap text-sm text-[#000000]">{previewContent}</pre>
                  {previewContent && (
                    <p className="mt-4 text-xs text-[#586069]">
                      Showing first 1000 characters. Total size: {formatFileSize(previewFile.size || 0)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

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
                    <thead className="bg-[#f6f8fa] sticky top-0">
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
                                <svg
                                  className="h-3 w-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
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
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-auto p-6">
                <div className="overflow-hidden rounded-lg border border-[#cccccc]">
                  <table className="w-full">
                    <thead className="bg-[#f6f8fa] sticky top-0">
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
                                <svg
                                  className="h-3 w-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
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
            </div>
          ) : null}
        </div>
      </div>

      {showOnboarding && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[600px] rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#cccccc] px-6 py-4">
              <h2 className="text-xl font-bold text-[#000000]">Welcome to File Manager! 👋</h2>
              <button onClick={handleCompleteOnboarding} className="text-[#586069] hover:text-[#000000]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-[#000000]">
                    <Folder className="h-5 w-5 text-[#0366d6]" />
                    1. Select Your Directory
                  </h3>
                  <p className="text-sm text-[#586069]">
                    Click "Current Directory" at the top to choose which folder you want to organize.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-[#000000]">
                    <Folder className="h-5 w-5 text-[#0366d6]" />
                    2. Set Up Destination Folders
                  </h3>
                  <p className="text-sm text-[#586069]">
                    Click "Manage Folders" to add destination folders where your files can be moved to.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-[#000000]">
                    <Brain className="h-5 w-5 text-[#0366d6]" />
                    3. Choose Your AI Model
                  </h3>
                  <p className="text-sm text-[#586069]">
                    Select which AI model to use (OpenAI, Gemini, or Ollama) and configure your API keys in Settings.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-[#000000]">
                    <Settings className="h-5 w-5 text-[#0366d6]" />
                    4. Organize Your Files
                  </h3>
                  <p className="text-sm text-[#586069]">
                    Select files, write an organization prompt (optional), and click "정리" to let AI organize your
                    files intelligently!
                  </p>
                </div>

                <div className="rounded-lg bg-[#e1f0ff] p-4">
                  <h4 className="mb-2 font-semibold text-[#000000]">Keyboard Shortcuts:</h4>
                  <ul className="space-y-1 text-sm text-[#586069]">
                    <li>
                      <strong>Ctrl+A</strong> - Select/Deselect all files
                    </li>
                    <li>
                      <strong>Delete</strong> - Delete selected files in results
                    </li>
                    <li>
                      <strong>Enter</strong> - Confirm action
                    </li>
                    <li>
                      <strong>Esc</strong> - Close dialog/panel
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-[#cccccc] px-6 py-4">
              <button
                onClick={handleCompleteOnboarding}
                className="rounded-lg bg-[#0366d6] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0256c7]"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingFolderCreation && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[500px] rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#cccccc] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#000000]">새 폴더 생성</h2>
              <button onClick={() => setPendingFolderCreation(null)} className="text-[#586069] hover:text-[#000000]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-[#000000] mb-2">
                  <strong>생성할 폴더:</strong>
                </p>
                <div className="rounded bg-[#f6f8fa] px-3 py-2 text-sm font-mono text-[#000000]">
                  {pendingFolderCreation.folderPath}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-[#000000] mb-2">
                  <strong>이유:</strong>
                </p>
                <p className="text-sm text-[#586069]">{pendingFolderCreation.reason}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-[#000000] mb-2">
                  <strong>이동할 파일 ({pendingFolderCreation.files.length}개):</strong>
                </p>
                <div className="max-h-[150px] overflow-y-auto rounded border border-[#cccccc] bg-white">
                  {pendingFolderCreation.files.map((file, index) => (
                    <div
                      key={index}
                      className="border-b border-[#e1e4e8] px-3 py-2 text-sm text-[#586069] last:border-b-0"
                    >
                      {file}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-[#586069] mb-4">이 폴더를 생성하고 파일들을 이동하시겠습니까?</p>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#cccccc] px-6 py-4">
              <button
                onClick={() => setPendingFolderCreation(null)}
                className="rounded-lg bg-[#6a737d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#586069]"
              >
                취소
              </button>
              <button
                onClick={handleCreateFolder}
                className="rounded-lg bg-[#0366d6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0256c7]"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
