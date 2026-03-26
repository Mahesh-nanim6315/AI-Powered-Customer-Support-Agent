import { useEffect, useState } from "react";
import { Alert, Button, Card, Input, Select, Spinner, TextArea } from "../components";
import { Brain, MessageSquare, Settings, Shield, Zap } from "lucide-react";
import { aiSettingsService } from "../services/aiSettings.service";
import type { AiSettings } from "../types";
import "../page.css";

const defaultSettings: AiSettings = {
  orgId: "",
  aiEnabled: true,
  model: "llama3",
  temperature: 0.4,
  confidenceThreshold: 0.75,
  autoExecuteSuggestions: false,
  kbFallbackEnabled: true,
  safeFallbackEnabled: true,
  escalationEnabled: true,
  replyTone: "professional",
  systemPrompt: "",
  runtimeConfig: {
    chatProvider: "ollama",
    chatModelDefault: "llama3",
    embeddingProvider: "gemini",
    embeddingModel: "gemini-embedding-001",
    embeddingDimension: 768,
  },
};

function ToggleField({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="toggle-field">
      <div>
        <div className="toggle-field__label">{label}</div>
        <div className="toggle-field__hint">{hint}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  );
}

export function AiSettingsPage() {
  const [settings, setSettings] = useState<AiSettings>(defaultSettings);
  const [savedSnapshot, setSavedSnapshot] = useState<AiSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await aiSettingsService.get();
        const normalized = {
          ...data,
          systemPrompt: data.systemPrompt || "",
        };
        setSettings(normalized);
        setSavedSnapshot(normalized);
      } catch (loadError) {
        console.error("Failed to load AI settings:", loadError);
        setError("Failed to load AI settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSnapshot);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      const saved = await aiSettingsService.update({
        ...settings,
        systemPrompt: settings.systemPrompt?.trim() || null,
      });
      const normalized = {
        ...saved,
        systemPrompt: saved.systemPrompt || "",
      };
      setSettings(normalized);
      setSavedSnapshot(normalized);
      setSuccess("AI settings saved successfully.");
    } catch (saveError) {
      console.error("Failed to save AI settings:", saveError);
      setError("Failed to save AI settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(savedSnapshot);
    setSuccess(null);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Settings</h1>
          <p className="page-subtitle">Manage org-level chat settings for Ollama, while embeddings stay on the configured Gemini vector pipeline.</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={handleReset} disabled={!isDirty || isSaving}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {success && (
        <Alert type="success" title="Saved" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert type="error" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="settings-grid">
        <Card className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">
              <Brain size={24} />
            </div>
            <h2 className="setting-title">AI Model Configuration</h2>
          </div>
          <div className="setting-content setting-form">
            <ToggleField
              label="Enable AI responses"
              hint="Master switch for AI-assisted handling in this organization."
              checked={settings.aiEnabled}
              onChange={(checked) => setSettings((prev) => ({ ...prev, aiEnabled: checked }))}
              disabled={isSaving}
            />
            <Input
              label="Chat model (Ollama)"
              placeholder="llama3"
              value={settings.model}
              onChange={(e) => setSettings((prev) => ({ ...prev, model: e.target.value }))}
              disabled={isSaving}
            />
            <Input
              label="Temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings((prev) => ({ ...prev, temperature: Number(e.target.value) }))}
              disabled={isSaving}
            />
            <Input
              label="Confidence threshold"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={settings.confidenceThreshold}
              onChange={(e) => setSettings((prev) => ({ ...prev, confidenceThreshold: Number(e.target.value) }))}
              disabled={isSaving}
            />
          </div>
        </Card>

        <Card className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">
              <MessageSquare size={24} />
            </div>
            <h2 className="setting-title">Response Controls</h2>
          </div>
          <div className="setting-content setting-form">
            <Select
              label="Reply tone"
              options={[
                { value: "professional", label: "Professional" },
                { value: "friendly", label: "Friendly" },
                { value: "concise", label: "Concise" },
              ]}
              value={settings.replyTone}
              onChange={(e) => setSettings((prev) => ({ ...prev, replyTone: e.target.value }))}
              disabled={isSaving}
            />
            <TextArea
              label="System prompt"
              placeholder="Optional org-specific guidance for the assistant..."
              value={settings.systemPrompt || ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, systemPrompt: e.target.value }))}
              disabled={isSaving}
            />
          </div>
        </Card>

        <Card className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">
              <Zap size={24} />
            </div>
            <h2 className="setting-title">Automation Rules</h2>
          </div>
          <div className="setting-content setting-form">
            <ToggleField
              label="Auto-execute approved suggestions"
              hint="When enabled, approved AI suggestions execute immediately in supported flows."
              checked={settings.autoExecuteSuggestions}
              onChange={(checked) => setSettings((prev) => ({ ...prev, autoExecuteSuggestions: checked }))}
              disabled={isSaving}
            />
            <ToggleField
              label="Escalation enabled"
              hint="Allow AI to escalate tickets to human handling when confidence is low."
              checked={settings.escalationEnabled}
              onChange={(checked) => setSettings((prev) => ({ ...prev, escalationEnabled: checked }))}
              disabled={isSaving}
            />
          </div>
        </Card>

        <Card className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">
              <Shield size={24} />
            </div>
            <h2 className="setting-title">Fallback & Safety</h2>
          </div>
          <div className="setting-content setting-form">
            <ToggleField
              label="Knowledge-base fallback"
              hint="Let the assistant fall back to indexed knowledge when direct answer generation is weak."
              checked={settings.kbFallbackEnabled}
              onChange={(checked) => setSettings((prev) => ({ ...prev, kbFallbackEnabled: checked }))}
              disabled={isSaving}
            />
            <ToggleField
              label="Safe fallback mode"
              hint="Use a safer fallback response when the assistant cannot answer confidently."
              checked={settings.safeFallbackEnabled}
              onChange={(checked) => setSettings((prev) => ({ ...prev, safeFallbackEnabled: checked }))}
              disabled={isSaving}
            />
          </div>
        </Card>

        <Card className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">
              <Brain size={24} />
            </div>
            <h2 className="setting-title">Embedding Runtime</h2>
          </div>
          <div className="setting-content">
            <div className="insight-list">
              <div className="insight-row"><span>Embedding provider</span><strong>{settings.runtimeConfig?.embeddingProvider || "gemini"}</strong></div>
              <div className="insight-row"><span>Embedding model</span><strong>{settings.runtimeConfig?.embeddingModel || "gemini-embedding-001"}</strong></div>
              <div className="insight-row"><span>Vector dimension</span><strong>{settings.runtimeConfig?.embeddingDimension || 768}</strong></div>
            </div>
            <p className="page-subtitle">Embeddings are runtime-configured from the backend environment and are not changed by org chat settings.</p>
          </div>
        </Card>
      </div>

      <Card className="setting-card setting-card--full">
        <div className="setting-header">
          <div className="setting-icon">
            <Settings size={24} />
          </div>
          <h2 className="setting-title">Current Org AI Policy</h2>
        </div>
        <div className="setting-content">
          <div className="insight-list">
            <div className="insight-row"><span>AI enabled</span><strong>{settings.aiEnabled ? "Yes" : "No"}</strong></div>
            <div className="insight-row"><span>Chat provider</span><strong>{settings.runtimeConfig?.chatProvider || "ollama"}</strong></div>
            <div className="insight-row"><span>Chat model</span><strong>{settings.model}</strong></div>
            <div className="insight-row"><span>Embedding provider</span><strong>{settings.runtimeConfig?.embeddingProvider || "gemini"}</strong></div>
            <div className="insight-row"><span>Embedding model</span><strong>{settings.runtimeConfig?.embeddingModel || "gemini-embedding-001"}</strong></div>
            <div className="insight-row"><span>Confidence threshold</span><strong>{Math.round(settings.confidenceThreshold * 100)}%</strong></div>
            <div className="insight-row"><span>Reply tone</span><strong>{settings.replyTone}</strong></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
