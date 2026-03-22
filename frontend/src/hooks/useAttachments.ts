import { useMutation } from "@tanstack/react-query";
import { attachmentService } from "../services/attachment.service";

export function useUploadAttachments() {
  return useMutation({
    mutationFn: ({ messageId, files }: { messageId: string; files: File[] }) =>
      attachmentService.uploadFiles(messageId, files),
  });
}
