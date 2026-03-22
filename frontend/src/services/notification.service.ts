import { apiClient } from "../lib/api-client";
import type { NotificationStatsResponse, NotificationsResponse } from "../types";

export const notificationService = {
  async getNotifications(unreadOnly = false): Promise<NotificationsResponse> {
    const query = unreadOnly ? "?unreadOnly=true" : "";
    return apiClient.get<NotificationsResponse>(`/notifications${query}`);
  },

  async getUnreadCount(): Promise<{ success: boolean; unreadCount: number }> {
    return apiClient.get<{ success: boolean; unreadCount: number }>("/notifications/unread-count");
  },

  async getStats(): Promise<NotificationStatsResponse> {
    return apiClient.get<NotificationStatsResponse>("/notifications/stats");
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.patch<{ success: boolean; message: string }>(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<{ success: boolean; message: string; count: number }> {
    return apiClient.post<{ success: boolean; message: string; count: number }>("/notifications/read-all");
  },

  async deleteNotification(notificationId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/notifications/${notificationId}`);
  },
};
