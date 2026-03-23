import { useState } from 'react';
import { useAdminAnalytics, useTicketTrends, useAgentPerformance, useOperationalInsights } from '../hooks/useAnalytics';
import { Card, Spinner, Alert } from '../components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { TrendingUp, Users, Zap, MessageSquare, ShieldCheck, Gauge, Bot } from 'lucide-react';
import '../page.css';
import '../dashboard.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  
  const analyticsQuery = useAdminAnalytics(true);
  const trendsQuery = useTicketTrends(selectedPeriod, true);
  const agentPerformanceQuery = useAgentPerformance(true);
  const insightsQuery = useOperationalInsights(true);

  if (analyticsQuery.isLoading || trendsQuery.isLoading || agentPerformanceQuery.isLoading || insightsQuery.isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  const analytics = analyticsQuery.data;
  const trends = trendsQuery.data || {};
  const agentPerformance = agentPerformanceQuery.data || [];
  const insights = insightsQuery.data;
  const periodLabel = selectedPeriod === 7 ? '7 days' : selectedPeriod === 30 ? '30 days' : '90 days';

  // Prepare data for line chart
  const trendsData = Object.entries(trends).sort(([left], [right]) => left.localeCompare(right)).map(([date, data]) => ({
    date: new Date(date).toLocaleDateString(),
    created: data.created,
    resolved: data.resolved,
  }));

  // Prepare data for pie chart
  const resolutionData = [
    { name: 'AI Resolved', value: Math.round((analytics?.aiResolutionRate || 0) * (analytics?.totalTickets || 0)) },
    { name: 'Agent Resolved', value: Math.round((analytics?.agentResolutionRate || 0) * (analytics?.totalTickets || 0)) },
  ].filter(item => item.value > 0);

  // Prepare data for bar chart
  const performanceData = agentPerformance.map(agent => ({
    name: agent.email.split('@')[0],
    resolved: agent.resolvedTickets,
    total: agent.totalTickets,
    resolutionRate: Math.round(agent.resolutionRate * 100),
  }));

  const metrics = [
    {
      icon: MessageSquare,
      label: 'Total Tickets',
      value: analytics?.totalTickets || 0,
      color: 'blue',
    },
    {
      icon: TrendingUp,
      label: 'Active Tickets',
      value: analytics?.activeTickets || 0,
      color: 'orange',
    },
    {
      icon: Zap,
      label: 'AI Resolution Rate',
      value: `${Math.round((analytics?.aiResolutionRate || 0) * 100)}%`,
      color: 'green',
    },
    {
      icon: Users,
      label: 'Agent Resolution Rate',
      value: `${Math.round((analytics?.agentResolutionRate || 0) * 100)}%`,
      color: 'purple',
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Summary analytics from the currently mounted admin endpoints
          </p>
        </div>
        <div className="analytics-toolbar">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="analytics-select"
            aria-label="Select analytics period"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {(analyticsQuery.isError || trendsQuery.isError || agentPerformanceQuery.isError || insightsQuery.isError) && (
        <Alert type="warning" title="Unable to load analytics">
          Some analytics data may not be available. Please try again later.
        </Alert>
      )}

      <Card className="dashboard-highlight">
        <div className="dashboard-highlight__label">Analytics Snapshot</div>
        <div className="dashboard-highlight__title">
          {analytics?.activeTickets || 0} active tickets across the last {periodLabel}, with {Math.round((analytics?.aiResolutionRate || 0) * 100)}% handled by AI and {analytics?.activeAgents || 0} agents currently available.
        </div>
        <div className="dashboard-highlight__detail">
          Use this page to spot volume changes, resolution mix, and which agents are carrying the most ticket volume right now.
        </div>
      </Card>

      {insights && (
        <div className="insights-grid">
          <Card className="insight-card">
            <div className="insight-card__header">
              <div className="metric-icon metric-icon--orange">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="section-title" style={{ marginBottom: '0.35rem' }}>Queue & SLA Signals</h2>
                <p className="section-subtitle" style={{ margin: 0 }}>Live indicators for wait time and first-response pressure</p>
              </div>
            </div>
            <div className="insight-list">
              <div className="insight-row"><span>Unassigned tickets</span><strong>{insights.queue.unassignedTickets}</strong></div>
              <div className="insight-row"><span>Open high-priority tickets</span><strong>{insights.queue.openHighPriorityTickets}</strong></div>
              <div className="insight-row"><span>Oldest open ticket</span><strong>{insights.queue.oldestOpenTicketHours}h</strong></div>
              <div className="insight-row"><span>Average first reply</span><strong>{insights.queue.avgFirstReplyMinutes}m</strong></div>
            </div>
          </Card>

          <Card className="insight-card">
            <div className="insight-card__header">
              <div className="metric-icon metric-icon--purple">
                <Gauge size={22} />
              </div>
              <div>
                <h2 className="section-title" style={{ marginBottom: '0.35rem' }}>Workload Balance</h2>
                <p className="section-subtitle" style={{ margin: 0 }}>Current team capacity and active-load spread</p>
              </div>
            </div>
            <div className="insight-list">
              <div className="insight-row"><span>Total agents</span><strong>{insights.workload.totalAgents}</strong></div>
              <div className="insight-row"><span>Available agents</span><strong>{insights.workload.availableAgents}</strong></div>
              <div className="insight-row"><span>Average active load</span><strong>{insights.workload.averageActiveLoad}</strong></div>
              <div className="insight-row"><span>Busiest agent</span><strong>{insights.workload.busiestAgent ? `${insights.workload.busiestAgent.email} (${insights.workload.busiestAgent.activeTickets})` : 'N/A'}</strong></div>
            </div>
          </Card>

          <Card className="insight-card">
            <div className="insight-card__header">
              <div className="metric-icon metric-icon--green">
                <Bot size={22} />
              </div>
              <div>
                <h2 className="section-title" style={{ marginBottom: '0.35rem' }}>AI Review Quality</h2>
                <p className="section-subtitle" style={{ margin: 0 }}>Suggestion review throughput and confidence coverage</p>
              </div>
            </div>
            <div className="insight-list">
              <div className="insight-row"><span>Total suggestions</span><strong>{insights.aiQuality.totalSuggestions}</strong></div>
              <div className="insight-row"><span>Pending review</span><strong>{insights.aiQuality.pendingSuggestions}</strong></div>
              <div className="insight-row"><span>Executed suggestions</span><strong>{insights.aiQuality.executedSuggestions}</strong></div>
              <div className="insight-row"><span>Average confidence</span><strong>{insights.aiQuality.averageConfidence !== null ? `${insights.aiQuality.averageConfidence}%` : 'No scored suggestions yet'}</strong></div>
            </div>
          </Card>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="metrics-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="metric-card">
              <div className="metric-header">
                <div className={`metric-icon metric-icon--${metric.color}`}>
                  <Icon size={24} />
                </div>
                <h3 className="metric-label">{metric.label}</h3>
              </div>
              <div className="metric-body">
                <div className="metric-value">{metric.value}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Ticket Trends Line Chart */}
        <Card className="chart-card">
          <h2 className="section-title">Ticket Trends</h2>
          <p className="section-subtitle">Tickets created vs resolved over time</p>
          {trendsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Created"
                />
                <Line 
                  type="monotone" 
                  dataKey="resolved" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <p>No trend data available for the selected period</p>
            </div>
          )}
        </Card>

        {/* Resolution Distribution Pie Chart */}
        <Card className="chart-card">
          <h2 className="section-title">Resolution Distribution</h2>
          <p className="section-subtitle">AI vs Agent resolution split</p>
          {resolutionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resolutionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: PieLabelRenderProps) => {
                    if (props.name && props.percent) {
                      return `${props.name}: ${(props.percent * 100).toFixed(0)}%`;
                    }
                    return '';
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resolutionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || '#000000'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <p>No resolution data available</p>
            </div>
          )}
        </Card>

        {/* Agent Performance Bar Chart */}
        <Card className="chart-card chart-card--full">
          <h2 className="section-title">Agent Performance</h2>
          <p className="section-subtitle">Tickets resolved by each agent</p>
          {performanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
                <Bar dataKey="total" fill="#3b82f6" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <p>No agent performance data available</p>
            </div>
          )}
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="stats-grid">
        <Card className="stat-card">
          <h3 className="stat-title">Average Response Time</h3>
          <p className="stat-value">{Math.round(analytics?.avgResponseTime || 0)} minutes</p>
          <p className="stat-description">Time to first response</p>
        </Card>

        <Card className="stat-card">
          <h3 className="stat-title">Customer Satisfaction</h3>
          <p className="stat-value">{Math.round((analytics?.csat || 0) * 100)}%</p>
          <p className="stat-description">CSAT score</p>
        </Card>

        <Card className="stat-card">
          <h3 className="stat-title">Escalation Rate</h3>
          <p className="stat-value">{Math.round((analytics?.escalationRate || 0) * 100)}%</p>
          <p className="stat-description">Tickets escalated</p>
        </Card>

        <Card className="stat-card">
          <h3 className="stat-title">Active Agents</h3>
          <p className="stat-value">{analytics?.activeAgents || 0}</p>
          <p className="stat-description">Available now</p>
        </Card>
      </div>
    </div>
  );
}
