/*
  This file builds the final prompt context
  used by Gemini before generating response.
*/

interface MemoryMessage {
    role: "USER" | "AI";
    content: string;
}

export function buildContext(
    systemPrompt: string,
    retrievedDocs: string[],
    memory: MemoryMessage[],
    userMessage: string
) {
    // 1️⃣ Build Knowledge Context (from Pinecone)
    const knowledgeSection = retrievedDocs.length
        ? `
KNOWLEDGE BASE:
${retrievedDocs.map((doc, i) => `Source ${i + 1}:\n${doc}`).join("\n\n")}
`
        : "";

    // 2️⃣ Build Conversation Memory
    const memorySection = memory.length
        ? `
CONVERSATION HISTORY:
${memory
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")}
`
        : "";

    // 3️⃣ Final Prompt Assembly
    const finalPrompt = `
${systemPrompt}

${knowledgeSection}

${memorySection}

USER QUESTION:
${userMessage}

INSTRUCTIONS:
- Answer clearly and professionally.
- If answer exists in knowledge base, prioritize it.
- If not found, respond politely and say human agent will assist.
- Keep response concise but helpful.
`;

    return finalPrompt;
}