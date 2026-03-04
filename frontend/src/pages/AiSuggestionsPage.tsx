import "../page.css";
import type { AiSuggestion } from "../types";

const dummySuggestions: AiSuggestion[] = [
  {
    id: "SUG-1",
    summary: "Close 5 resolved tickets older than 7 days.",
    actionType: "AUTO_CLOSE_TICKETS",
    status: "PENDING",
    createdAt: "2026-03-03T10:00:00Z",
  },
  {
    id: "SUG-2",
    summary: "Send apology email for yesterday&apos;s outage to 23 customers.",
    actionType: "SEND_EMAIL_CAMPAIGN",
    status: "APPROVED",
    createdAt: "2026-03-02T12:00:00Z",
  },
];

export function AiSuggestionsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI suggestions</h1>
          <p className="page-subtitle">
            Review and safely approve high-impact AI automation suggestions.
          </p>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Summary</th>
              <th>Action type</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {dummySuggestions.map((suggestion) => (
              <tr key={suggestion.id}>
                <td>{suggestion.summary}</td>
                <td>{suggestion.actionType}</td>
                <td>
                  <span
                    className={`badge badge-status-${suggestion.status.toLowerCase()}`}
                  >
                    {suggestion.status}
                  </span>
                </td>
                <td>{new Date(suggestion.createdAt).toLocaleString()}</td>
                <td className="table-actions">
                  {suggestion.status === "PENDING" && (
                    <>
                      <button className="btn-secondary" type="button">
                        Reject
                      </button>
                      <button className="btn-primary" type="button">
                        Approve &amp; execute
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

