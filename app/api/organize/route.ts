import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { ollama } from "ollama-ai-provider"

export async function POST(request: Request) {
  try {
    const { files, prompt, folders, model, allowNewFolders } = await request.json()

    let aiModel

    if (model.provider === "openai") {
      if (!model.apiKey) {
        throw new Error("OpenAI API key not found. Please set your API key in Settings.")
      }
      const openai = createOpenAI({
        apiKey: model.apiKey,
      })
      aiModel = openai.chat(model.modelName || "gpt-4o-mini")
    } else if (model.provider === "gemini") {
      if (!model.apiKey) {
        throw new Error("Google Gemini API key not found. Please set your API key in Settings.")
      }
      const google = createGoogleGenerativeAI({
        apiKey: model.apiKey,
      })
      aiModel = google(model.modelName || "gemini-1.5-flash")
    } else if (model.provider === "ollama") {
      aiModel = ollama(model.modelName || "llama3", {
        baseURL: model.ollamaBaseUrl || "http://localhost:11434",
      })
    } else {
      throw new Error("Unsupported AI provider")
    }

    const folderCreationInstruction = allowNewFolders
      ? `\n\nIMPORTANT: If none of the available folders are suitable, you can suggest creating a NEW folder. 
To suggest a new folder, include a special object in your response with "newFolder" key containing:
- "path": full path of the new folder to create
- "files": array of filenames that should go there
- "reason": explanation of why this new folder is needed

Example with new folder:
{
  "results": [...other files...],
  "newFolder": {
    "path": "C:\\\\Users\\\\admin\\\\Documents\\\\NewCategory",
    "files": ["file1.pdf", "file2.pdf"],
    "reason": "These files are about a new topic that doesn't fit existing folders"
  }
}`
      : ""

    const { text } = await generateText({
      model: aiModel,
      prompt: `You are a file organization assistant. Based on the user's request and file contents, determine which folder each file should be moved to.

User's organization request: "${prompt}"

Available folders:
${folders.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}
${folderCreationInstruction}

Files to organize:
${files
  .map(
    (f: any, i: number) => `
File ${i + 1}: ${f.fileName}
Content preview: ${f.content.substring(0, 500)}...
`,
  )
  .join("\n")}

For each file, respond with a JSON object containing:
- "results": array of objects with "fileName" and "destination" (full folder path)
${allowNewFolders ? '- "newFolder": (optional) object with "path", "files", and "reason" if a new folder should be created' : ""}

Only respond with the JSON object, no additional text.

Example response format:
{
  "results": [
    {"fileName": "file1.pdf", "destination": "C:\\\\Users\\\\admin\\\\Documents\\\\CNU\\\\3_2\\\\컴파일러개론"},
    {"fileName": "file2.pdf", "destination": "C:\\\\Users\\\\admin\\\\Documents\\\\Reports"}
  ]
}`,
      temperature: 0.3,
    })

    // Parse AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response")
    }

    const response = JSON.parse(jsonMatch[0])

    if (response.newFolder) {
      return Response.json({
        success: true,
        newFolder: response.newFolder,
      })
    }

    return Response.json({ success: true, results: response.results })
  } catch (error: any) {
    console.error("Error in organize API:", error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
