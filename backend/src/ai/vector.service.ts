import { Pinecone } from "@pinecone-database/pinecone";

export function buildOrgScopedQuery(embedding: number[], orgId: string) {
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

  return pinecone.index("support-index");
}

export async function searchSimilar(embedding: number[], orgId: string) {
  const index = getIndex();
  const result = await index.query(buildOrgScopedQuery(embedding, orgId));
  return result.matches;
}
