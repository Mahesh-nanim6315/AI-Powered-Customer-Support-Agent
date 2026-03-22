import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, MailOpen, MessageSquareText, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Card, Spinner } from "../components";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationStats,
} from "../hooks/useNotifications";
import { useRealtime } from "../context/RealtimeContext";
import type { CustomerNotification } from "../types";
import "../page.css";

function getNotificationVariant(type: CustomerNotification["type"]) {
  if (type === "MESSAGE_RECEIVED") return "info";
  if (type === "TICKET_RESOLVED") return "success";
  if (type === "TICKET_ESCALATED") return "warning";
  return "secondary";
}

function getNotificationLabel(type: CustomerNotification["type"]) {
  if (type === "MESSAGE_RECEIVED") return "Reply";
  if (type === "TICKET_ASSIGNED") return "Assigned";
  if (type === "TICKET_RESOLVED") return "Resolved";
  if (type === "TICKET_ESCALATED") return "Escalated";
  return "Update";
}

function getNotificationIcon(type: CustomerNotification["type"]) {
  if (type === "MESSAGE_RECEIVED") return MessageSquareText;
  if (type === "TICKET_ASSIGNED") return Sparkles;
  return Bell;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const notificationsQuery = useNotifications(true, false);
  const statsQuery = useNotificationStats(true);
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();
  const realtime = useRealtime();
  const [showLiveNotification, setShowLiveNotification] = useState(false);

  useEffect(() => {
    if (!realtime.ticketUpdated.id && !realtime.messageAdded.ticketId) {
      return;
    }

    const timer = setTimeout(() => {
      notificationsQuery.refetch();
      statsQuery.refetch();
      setShowLiveNotification(true);
      setTimeout(() => setShowLiveNotification(false), 4000);
    }, 500);

    return () => clearTimeout(timer);
  }, [realtime.ticketUpdated, realtime.messageAdded, notificationsQuery, statsQuery]);

  const notifications = notificationsQuery.data?.notifications || [];
  const stats = statsQuery.data?.stats;
  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.read), [notifications]);

  if (notificationsQuery.isLoading || statsQuery.isLoading) {
    return (
      <div className="page">
        <Spinner fullScreen />
      </div>
    );
  }

  const handleMarkRead = async (notificationId: string) => {
    await markReadMutation.mutateAsync(notificationId);
  };

  const handleDelete = async (notificationId: string) => {
    await deleteMutation.mutateAsync(notificationId);
  };

  const handleOpenTicket = async (notification: CustomerNotification) => {
    if (!notification.ticketId) {
      return;
    }

    if (!notification.read) {
      await markReadMutation.mutateAsync(notification.id);
    }

    navigate(`/tickets?ticketId=${encodeURIComponent(notification.ticketId)}`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Customer updates for ticket changes, assignments, and new responses</p>
        </div>
        <Button onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending || unreadNotifications.length === 0}>
          <CheckCheck size={18} />
          {markAllMutation.isPending ? "Marking..." : "Mark All Read"}
        </Button>
      </div>

      {showLiveNotification && (
        <Alert type="info" title="Live Update" onClose={() => setShowLiveNotification(false)}>
          Notifications refreshed from live ticket activity.
        </Alert>
      )}

      {(notificationsQuery.isError || statsQuery.isError) && (
        <Alert type="warning" title="Unable to load notifications">
          Some notification data may be unavailable until the next refresh.
        </Alert>
      )}

      <div className="stats-grid" style={{ marginBottom: "2rem" }}>
        <Card className="stat-card">
          <h3 className="stat-title">Total</h3>
          <p className="stat-value">{stats?.total ?? notifications.length}</p>
          <p className="stat-description">All notification entries</p>
        </Card>
        <Card className="stat-card">
          <h3 className="stat-title">Unread</h3>
          <p className="stat-value">{stats?.unread ?? unreadNotifications.length}</p>
          <p className="stat-description">Still need attention</p>
        </Card>
        <Card className="stat-card">
          <h3 className="stat-title">Read</h3>
          <p className="stat-value">{stats?.read ?? notifications.length - unreadNotifications.length}</p>
          <p className="stat-description">Already reviewed</p>
        </Card>
      </div>

      {notifications.length === 0 ? (
        <Card className="empty-card">
          <div className="empty-state">
            <Bell size={48} />
            <p>No notifications yet</p>
            <p className="text-muted">Ticket updates and new replies will appear here.</p>
          </div>
        </Card>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);

            return (
              <Card
                key={notification.id}
                className={`ticket-card notification-card ${notification.read ? "" : "notification-card--unread"}`}
              >
                <div className="notification-card__content">
                  <div className="notification-card__main">
                    <div className="notification-card__header">
                      <div className={`notification-card__icon notification-card__icon--${getNotificationVariant(notification.type)}`}>
                        <Icon size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                          <h3 className="ticket-title" style={{ margin: 0 }}>{notification.title}</h3>
                          <Badge variant={getNotificationVariant(notification.type) as any}>{getNotificationLabel(notification.type)}</Badge>
                          {!notification.read && <Badge variant="warning">Unread</Badge>}
                        </div>
                        <p className="notification-card__message">{notification.message}</p>
                      </div>
                    </div>
                    <div className="notification-card__meta">
                      <span>{new Date(notification.createdAt).toLocaleString()}</span>
                      {notification.ticketId && (
                        <>
                          <span>•</span>
                          <span>Ticket {notification.ticketId.slice(0, 8)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="notification-card__actions">
                    {!notification.read && (
                      <Button
                        variant="secondary"
                        onClick={() => handleMarkRead(notification.id)}
                        disabled={markReadMutation.isPending}
                      >
                        <MailOpen size={16} />
                        Mark Read
                      </Button>
                    )}
                    {notification.ticketId && (
                      <Button
                        onClick={() => handleOpenTicket(notification)}
                        disabled={markReadMutation.isPending}
                      >
                        Open Ticket
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(notification.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={16} />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
