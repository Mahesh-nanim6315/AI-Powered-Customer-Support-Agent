import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

const embeddingProvider = (process.env.EMBEDDING_PROVIDER || "gemini").toLowerCase();
const openAIEmbeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const openAIEmbeddingsUrl = process.env.OPENAI_EMBEDDINGS_URL || "https://api.openai.com/v1/embeddings";
const geminiEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

export function getExpectedEmbeddingDimension() {
  const configured = Number(process.env.EMBEDDING_DIMENSION || process.env.PINECONE_DIMENSION || "");
  if (Number.isFinite(configured) && configured > 0) return configured;
  return embeddingProvider === "openai" ? 1536 : 768;
}

export function validateEmbeddingDimension(embedding: number[], context: string) {
  const expected = getExpectedEmbeddingDimension();
  if (embedding.length !== expected) {
    throw new Error(
      `[${context}] Embedding dimension mismatch. Expected ${expected}, got ${embedding.length}.`
    );
  }
}

async function generateOpenAIEmbedding(input: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Required when EMBEDDING_PROVIDER=openai.");
  }

  const response = await axios.post(
    openAIEmbeddingsUrl,
    {
      model: openAIEmbeddingModel,
      input,
      encoding_format: "float",
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );

  const embedding = response.data?.data?.[0]?.embedding as number[] | undefined;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("OpenAI embedding API returned an invalid embedding payload.");
  }

  return embedding;
}

async function generateGeminiEmbedding(input: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Required when EMBEDDING_PROVIDER=gemini.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: geminiEmbeddingModel });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text: input }] },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: getExpectedEmbeddingDimension(),
  } as any);
  const embedding = result.embedding.values;

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Gemini embedding API returned an invalid embedding payload.");
  }

  return embedding;
}

export async function generateEmbedding(text: string) {
  const input = String(text ?? "").trim();
  if (!input) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  const embedding =
    embeddingProvider === "openai"
      ? await generateOpenAIEmbedding(input)
      : await generateGeminiEmbedding(input);

  validateEmbeddingDimension(embedding, "generateEmbedding");
  return embedding;
}
