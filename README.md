# File Management Electron App

A desktop file management application built with Next.js and Electron.

## Setup

1. Install dependencies:
\`\`\`bash
npm install
# or
pnpm install
\`\`\`

2. **Set up your OpenAI API key** (Required for AI file organization):
   - Create a `.env.local` file in the root directory
   - Add your OpenAI API key:
   \`\`\`
   OPENAI_API_KEY=your_openai_api_key_here
   \`\`\`
   - Get your API key from: https://platform.openai.com/api-keys

3. Run in development mode:
\`\`\`bash
npm run electron:dev
# or
pnpm electron:dev
\`\`\`

This will start the Next.js dev server and launch the Electron app.

## Building

To build the application for production:

\`\`\`bash
npm run electron:build
# or
pnpm electron:build
\`\`\`

This will create distributable packages in the `dist` folder.

## Features

- Custom frameless window with title bar controls
- **AI-powered file organization** using OpenAI GPT-4o-mini
- Customizable folder management
- File move/delete operations with persistent logging
- Operation history and revert functionality
- Cross-platform support (Windows, macOS, Linux)

## Architecture

- **Frontend**: Next.js 16 with React 19
- **Desktop**: Electron
- **UI**: Tailwind CSS with shadcn/ui components
- **File Operations**: Node.js fs module (via Electron main process)
- **AI**: Vercel AI SDK with OpenAI provider

## Environment Variables

- `OPENAI_API_KEY` - **Required** for AI file organization features. Get your key from [OpenAI Platform](https://platform.openai.com/api-keys)
