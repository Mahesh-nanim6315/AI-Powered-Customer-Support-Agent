import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { readReceiptService } from "../services/readReceipt.service";

export function useTicketUnreadCount(ticketId: string, enabled = true) {
  return useQuery({
    queryKey: ["read-receipts", "ticket", ticketId, "unread-count"],
    queryFn: () => readReceiptService.getTicketUnreadCount(ticketId),
    enabled: enabled && !!ticketId,
    staleTime: 1000 * 20,
  });
}

export function useMarkMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageIds: string[]) => readReceiptService.markMultipleAsRead(messageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["read-receipts"] });
    },
  });
}
