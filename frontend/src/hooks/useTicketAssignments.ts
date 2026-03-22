import { useQuery } from "@tanstack/react-query";
import { ticketsService } from "../services/ticket.service";

export function useTicketAssignmentHistory(ticketId: string, enabled = true) {
  return useQuery({
    queryKey: ["tickets", ticketId, "assignments"],
    queryFn: () => ticketsService.getAssignmentHistory(ticketId),
    enabled: enabled && !!ticketId,
  });
}
