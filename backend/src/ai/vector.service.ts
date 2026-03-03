// src/ai/vector.service.ts

import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index("support-index");

export async function searchSimilar(embedding: number[]) {
  const result = await index.query({
    vector: embedding,
    topK: 5,
    includeMetadata: true,
  });

  return result.matches;
}