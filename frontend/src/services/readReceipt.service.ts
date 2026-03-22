import { apiClient } from "../lib/api-client";

export const readReceiptService = {
  async markMultipleAsRead(messageIds: string[]): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>("/read-receipts/messages/read-multiple", {
      messageIds,
    });
  },

  async getTicketUnreadCount(ticketId: string): Promise<{ ticketId: string; unreadCount: number; userId: string }> {
    return apiClient.get<{ ticketId: string; unreadCount: number; userId: string }>(
      `/read-receipts/tickets/${ticketId}/unread-count`
    );
  },
};
