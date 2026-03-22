import { useQuery } from "@tanstack/react-query";
import { ticketsService } from "../services/ticket.service";

export function useTicketActivity(ticketId: string, enabled = true) {
  return useQuery({
    queryKey: ["tickets", ticketId, "activity"],
    queryFn: () => ticketsService.getActivity(ticketId),
    enabled: enabled && !!ticketId,
  });
}
