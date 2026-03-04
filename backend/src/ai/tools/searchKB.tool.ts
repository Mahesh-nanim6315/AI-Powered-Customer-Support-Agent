import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

/*
  Tool: Search Knowledge Base (Pinecone)

  Used when:
  - AI needs factual info from PDF knowledge
  - Answer must come from documentation
*/

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY!
);

interface SearchKBInput {
    query: string;
    topK?: number;
}

export async function searchKBTool({
    query,
    topK = 5,
}: SearchKBInput) {
    try {
        // 1️⃣ Generate embedding using Gemini
        const embeddingModel = genAI.getGenerativeModel({
            model: "text-embedding-004",
        });

        const embeddingResponse =
            await embeddingModel.embedContent(query);

        const embedding = embeddingResponse.embedding.values;

        // 2️⃣ Query Pinecone
        const index = pinecone.index(
            process.env.PINECONE_INDEX_NAME!
        );

        const searchResponse = await index.query({
            vector: embedding,
            topK,
            includeMetadata: true,
        });

        const matches = searchResponse.matches || [];

        if (!matches.length) {
            return {
                success: true,
                message: "No relevant knowledge found.",
                data: [],
            };
        }

        // 3️⃣ Extract chunk text
        const results = matches.map((match) => ({
            score: match.score,
            content: match.metadata?.text || "",
            source: match.metadata?.source || "Unknown",
        }));

        return {
            success: true,
            message: "Knowledge retrieved successfully.",
            data: results,
        };
    } catch (error) {
        console.error("Search KB Tool Error:", error);

        return {
            success: false,
            message: "Failed to search knowledge base.",
            data: [],
        };
    }
}