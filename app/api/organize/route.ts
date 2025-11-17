import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

export async function POST(request: Request) {
  try {
    const { files, prompt, folders, apiKey } = await request.json()
    
    if (!apiKey) {
      throw new Error("OpenAI API key not found. Please set your API key in Settings.")
    }

    const openai = createOpenAI({
      apiKey: apiKey,
    })

    const { text } = await generateText({
      model: openai.chat("gpt-4o-mini"),
      prompt: `You are a file organization assistant. Based on the user's request and file contents, determine which folder each file should be moved to.

User's organization request: "${prompt}"

Available folders:
${folders.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}

Files to organize:
${files
  .map(
    (f: any, i: number) => `
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

    return Response.json({ success: true, results })
  } catch (error: any) {
    console.error("Error in organize API:", error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
