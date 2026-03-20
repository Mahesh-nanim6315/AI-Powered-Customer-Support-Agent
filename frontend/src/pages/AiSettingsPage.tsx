import { Card } from '../components';
import { Settings, Zap, Brain, MessageSquare, Shield } from 'lucide-react';
import '../page.css';

export function AiSettingsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Settings</h1>
          <p className="page-subtitle">
            Configure your AI-powered support features
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <Card className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">
              <Brain size={24} />
            </div>
            <h2 className="setting-title">AI Model Configuration</h2>
          </div>
          <div className="setting-content">
            <p className="setting-description">
              Configure the AI model settings, temperature, and response parameters.
            </p>
            <div className="setting-actions">
              <button className="btn btn--primary">Configure</button>
            </div>
          </div>
        </Card>

        <Card className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">
              <MessageSquare size={24} />
            </div>
            <h2 className="setting-title">Response Templates</h2>
          </div>
          <div className="setting-content">
            <p className="setting-description">
              Manage AI response templates and canned responses for common queries.
            </p>
            <div className="setting-actions">
              <button className="btn btn--primary">Manage Templates</button>
            </div>
          </div>
        </Card>

        <Card className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">
              <Zap size={24} />
            </div>
            <h2 className="setting-title">Automation Rules</h2>
          </div>
          <div className="setting-content">
            <p className="setting-description">
              Set up automation rules for ticket routing, prioritization, and escalation.
            </p>
            <div className="setting-actions">
              <button className="btn btn--primary">Configure Rules</button>
            </div>
          </div>
        </Card>

        <Card className="setting-card">
          <div className="setting-header">
            <div className="setting-icon">
              <Shield size={24} />
            </div>
            <h2 className="setting-title">Safety & Moderation</h2>
          </div>
          <div className="setting-content">
            <p className="setting-description">
              Configure content filters, safety measures, and moderation policies.
            </p>
            <div className="setting-actions">
              <button className="btn btn--primary">Manage Safety</button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="setting-card setting-card--full">
        <div className="setting-header">
          <div className="setting-icon">
            <Settings size={24} />
          </div>
          <h2 className="setting-title">General Settings</h2>
        </div>
        <div className="setting-content">
          <div className="setting-form">
            <div className="form-group">
              <label className="form-label">AI Assistant Name</label>
              <input
                type="text"
                className="form-input"
                defaultValue="Chitti"
                placeholder="Enter AI assistant name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Response Language</label>
              <select className="form-select">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">AI Confidence Threshold</label>
              <input
                type="range"
                className="form-range"
                min="0"
                max="100"
                defaultValue="75"
              />
              <span className="form-range-value">75%</span>
            </div>
            <div className="form-actions">
              <button className="btn btn--primary">Save Settings</button>
              <button className="btn btn--secondary">Cancel</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
