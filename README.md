# File Management Electron App

A desktop file management application built with Next.js and Electron.

## Setup

1. Install dependencies:
```bash
npm install
```
or
```bash
pnpm install
```

2. Run in development mode:
```bash
npm run electron:dev
```
or
```bash
pnpm electron:dev
```

This will start the Next.js dev server and launch the Electron app.

3. **Set up your OpenAI API key** (Required for AI file organization):
   - Run the app and click the Settings icon (⚙️) in the top right
   - Enter your OpenAI API key in the Settings panel
   - Click "Save" to store it securely
   - Get your API key from: https://platform.openai.com/api-keys

## Building

To build the application for production:

```bash
npm run electron:build
```
or

```bash
pnpm electron:build
```

This will create distributable packages in the `dist` folder.

## Features

- Custom frameless window with title bar controls
- **AI-powered file organization** using OpenAI GPT-4o-mini
- Customizable folder management
- File move/delete operations with persistent logging
- Operation history and revert functionality
- **Keyboard shortcuts** for quick actions
- **Conflict handling** when moving files with duplicate names
- **Persistent settings** storage for API keys and managed folders
- Cross-platform support (Windows, macOS, Linux)

## Architecture

- **Frontend**: Next.js 16 with React 19
- **Desktop**: Electron
- **UI**: Tailwind CSS with shadcn/ui components
- **File Operations**: Node.js fs module (via Electron main process)
- **AI**: Vercel AI SDK with OpenAI provider

## Configuration

All settings are stored in `settings.json` located in the app's userData directory:
- Windows: `C:\Users\[username]\AppData\Roaming\file-management-app\settings.json`
- macOS: `~/Library/Application Support/file-management-app/settings.json`
- Linux: `~/.config/file-management-app/settings.json`

Settings include:
- OpenAI API key (stored securely locally)
- Managed destination folders

## Keyboard Shortcuts

- `Ctrl+A` - Select all files
- `Delete` - Delete selected files (in results view)
- `Enter` - Confirm action
- `Esc` - Cancel/Close modal
