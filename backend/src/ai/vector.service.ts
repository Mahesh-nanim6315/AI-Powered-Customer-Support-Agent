import { Pinecone } from "@pinecone-database/pinecone";
import { validateEmbeddingDimension } from "./embedding.service";

export function buildOrgScopedQuery(embedding: number[], orgId: string) {
  validateEmbeddingDimension(embedding, "buildOrgScopedQuery");

  return {
    vector: embedding,
    topK: 5,
    includeMetadata: true,
    filter: {
      orgId: { $eq: orgId },
    },
  };
}

function getIndex() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const pineconeIndexName = process.env.PINECONE_INDEX || process.env.PINECONE_INDEX_NAME || "support-index";
  return pinecone.index(pineconeIndexName);
}

export async function searchSimilar(embedding: number[], orgId: string) {
  const index = getIndex();
  const result = await index.query(buildOrgScopedQuery(embedding, orgId));
  return result.matches;
}
