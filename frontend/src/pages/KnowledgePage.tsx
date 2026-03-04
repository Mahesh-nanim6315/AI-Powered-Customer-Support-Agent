import "../page.css";

export function KnowledgePage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Knowledge base</h1>
          <p className="page-subtitle">
            Upload PDFs to power RAG answers for your AI agent.
          </p>
        </div>
      </div>

      <div className="card">
        <form className="kb-form">
          <label className="kb-label">
            PDF file
            <input type="file" accept="application/pdf" className="kb-input" />
          </label>
          <button className="btn-primary" type="button">
            Upload to knowledge index
          </button>
        </form>
        <p className="kb-hint">
          This will eventually call the `/knowledge/upload` endpoint and store
          chunked embeddings in Pinecone.
        </p>
      </div>
    </div>
  );
}

