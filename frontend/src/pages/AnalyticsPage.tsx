import { useState } from 'react';
import { useAdminAnalytics, useTicketTrends, useAgentPerformance } from '../hooks/useAnalytics';
import { Card, Spinner, Alert } from '../components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Users, Zap, MessageSquare } from 'lucide-react';
import type { TicketTrends, AgentPerformance } from '../types';
import '../page.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  
  const analyticsQuery = useAdminAnalytics(true);
  const trendsQuery = useTicketTrends(selectedPeriod, true);
  const agentPerformanceQuery = useAgentPerformance(true);

  if (analyticsQuery.isLoading || trendsQuery.isLoading || agentPerformanceQuery.isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  const analytics = analyticsQuery.data;
  const trends = trendsQuery.data || {};
  const agentPerformance = agentPerformanceQuery.data || [];

  // Prepare data for line chart
  const trendsData = Object.entries(trends).map(([date, data]) => ({
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
      trend: null,
    },
    {
      icon: TrendingUp,
      label: 'Active Tickets',
      value: analytics?.activeTickets || 0,
      color: 'orange',
      trend: null,
    },
    {
      icon: Zap,
      label: 'AI Resolution Rate',
      value: `${Math.round((analytics?.aiResolutionRate || 0) * 100)}%`,
      color: 'green',
      trend: analytics?.aiResolutionRate ? 'up' : 'down',
    },
    {
      icon: Users,
      label: 'Agent Resolution Rate',
      value: `${Math.round((analytics?.agentResolutionRate || 0) * 100)}%`,
      color: 'purple',
      trend: analytics?.agentResolutionRate ? 'up' : 'down',
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Detailed insights into your support operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {(analyticsQuery.isError || trendsQuery.isError || agentPerformanceQuery.isError) && (
        <Alert type="warning" title="Unable to load analytics">
          Some analytics data may not be available. Please try again later.
        </Alert>
      )}

      {/* Metrics Cards */}
      <div className="metrics-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
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
                {metric.trend && (
                  <div className={`metric-trend ${metric.trend === 'up' ? 'positive' : 'negative'}`}>
                    <TrendIcon size={16} />
                    {metric.trend === 'up' ? 'Improving' : 'Declining'}
                  </div>
                )}
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
