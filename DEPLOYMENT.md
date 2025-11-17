# Electron Build & Deployment Checklist

## Pre-Build Requirements

- [x] Next.js configured with `output: 'export'` and `assetPrefix: './'`
- [x] AI organization logic moved to Electron main process
- [x] IPC bridge properly configured for all operations
- [x] Preload script exposes all necessary methods
- [x] Asset paths use relative paths via next.config.mjs

## Build Process

### 1. Install Dependencies
```bash
npm install
```

### 2. Build for Electron
```bash
npm run electron:build
```

This runs:
- `next build` → Generates static files in `/out` directory
- `electron-builder` → Packages with Electron

### 3. Output
- **Windows**: `release/File Management Setup X.X.X.exe` (NSIS installer)
- **macOS**: `release/File Management X.X.X.dmg`
- **Linux**: `release/File Management-X.X.X.AppImage`

## What Changed for Production

1. **AI Organization**
   - Moved from `/app/api/organize` (API route) to Electron main process
   - Uses `@ai-sdk/openai` directly in `electron/main.js`
   - Frontend calls via `window.electron.organizeFiles()` IPC

2. **Asset Paths**
   - Next.js exports with `assetPrefix: './'` for relative paths
   - Works with `file://` protocol in Electron

3. **File Loading**
   - Changed from `loadURL('file://...')` to `loadFile()`
   - Properly resolves paths in packaged app

## Runtime Configuration

### Settings Storage
- Settings stored in: `%APPDATA%/File Management/settings.json`
- Logs stored in: `%APPDATA%/File Management/logs.json`

### API Key
- Stored locally in settings.json during first use
- Never sent to external servers except OpenAI

## Development vs Production

| Aspect | Dev | Production |
|--------|-----|-----------|
| UI Source | http://localhost:3000 | /out/index.html (local) |
| AI Processing | Either API route or IPC | IPC only |
| DevTools | Auto-open | Disabled |
| Build Output | N/A | `/release/*.exe` |

## Troubleshooting

### Files not found after build
- Check that `/out` directory exists
- Verify `assetPrefix: './'` in next.config.mjs
- Check browser console for 404s (F12)

### API key not saving
- Verify `%APPDATA%/File Management/` has write permissions
- Check logs.json and settings.json exist

### Organize files fails
- Ensure API key is set in Settings
- Check that `ai` and `@ai-sdk/openai` are installed
- Verify available folders are correctly set

## Building for Different Platforms

### Windows (from Windows)
```bash
npm run electron:build
```

### macOS (requires macOS)
```bash
npm run electron:build
```

### Linux (requires Linux)
```bash
npm run electron:build
```

### Cross-platform builds
Use GitHub Actions or similar CI/CD for cross-compilation.

## Distribution

1. **Direct Download**: Share `.exe` from `/release`
2. **NSIS Installer**: Handles installation automatically
3. **Code Signing**: Add certificate in `package.json` under `build.win.certificateFile`

## Performance Notes

- First launch loads Next.js exports (~2-3 MB compressed)
- Subsequent launches are instant (local files)
- AI operations depend on OpenAI API latency (1-5 seconds typical)
