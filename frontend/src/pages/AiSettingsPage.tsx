import { Alert, Card } from "../components";
import { Brain, MessageSquare, Settings, Shield, Zap } from "lucide-react";
import "../page.css";

const aiSettingsSections = [
  {
    icon: Brain,
    title: "AI Model Configuration",
    description: "Model selection, temperature, and confidence thresholds are not wired to a live backend endpoint yet.",
  },
  {
    icon: MessageSquare,
    title: "Response Templates",
    description: "Template and canned-reply management still needs a persisted API contract before this page can be interactive.",
  },
  {
    icon: Zap,
    title: "Automation Rules",
    description: "Routing, prioritization, and escalation rules are still controlled in backend code, not from an admin settings API.",
  },
  {
    icon: Shield,
    title: "Safety and Moderation",
    description: "Safety policies and moderation thresholds are not exposed through mounted admin routes in the current backend.",
  },
];

export function AiSettingsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Settings</h1>
          <p className="page-subtitle">Configuration surface for AI controls that still needs real backend support</p>
        </div>
      </div>

      <Alert type="warning" title="Settings API Not Live">
        This page is intentionally read-only for now. The current backend does not mount admin endpoints for saving AI settings.
      </Alert>

      <div className="settings-grid">
        {aiSettingsSections.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="setting-card">
            <div className="setting-header">
              <div className="setting-icon">
                <Icon size={24} />
              </div>
              <h2 className="setting-title">{title}</h2>
            </div>
            <div className="setting-content">
              <p className="setting-description">{description}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="setting-card setting-card--full">
        <div className="setting-header">
          <div className="setting-icon">
            <Settings size={24} />
          </div>
          <h2 className="setting-title">What Needs To Exist First</h2>
        </div>
        <div className="setting-content">
          <div className="setting-form">
            <div className="form-group">
              <label className="form-label">Required backend work</label>
              <div className="form-input" style={{ minHeight: "auto" }}>
                Persisted org-level AI configuration, validation rules, and authenticated admin endpoints.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Recommended next API contract</label>
              <div className="form-input" style={{ minHeight: "auto" }}>
                <code>GET /admin/ai-settings</code> and <code>PATCH /admin/ai-settings</code> with org-scoped settings and audit logging.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
