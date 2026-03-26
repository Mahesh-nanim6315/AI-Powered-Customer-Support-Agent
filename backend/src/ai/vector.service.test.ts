import assert from "node:assert/strict";
import test from "node:test";
import { getExpectedEmbeddingDimension } from "./embedding.service";
import { buildOrgScopedQuery } from "./vector.service";

test("buildOrgScopedQuery includes org metadata filter", () => {
  const embedding = Array.from(
    { length: getExpectedEmbeddingDimension() },
    (_, index) => index / 1000
  );
  const orgId = "org_123";

  const query = buildOrgScopedQuery(embedding, orgId);

  assert.equal(query.topK, 5);
  assert.equal(query.includeMetadata, true);
  assert.deepEqual(query.vector, embedding);
  assert.deepEqual(query.filter, {
    orgId: { $eq: orgId },
  });
});
