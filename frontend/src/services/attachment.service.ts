import { apiClient } from "../lib/api-client";
import type { FileAttachment } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const attachmentService = {
  async getMessageAttachments(messageId: string): Promise<{ success: boolean; attachments: FileAttachment[]; count: number }> {
    return apiClient.get<{ success: boolean; attachments: FileAttachment[]; count: number }>(
      `/attachments/messages/${messageId}/files`
    );
  },

  async uploadFiles(messageId: string, files: File[]): Promise<{
    success: boolean;
    uploaded: number;
    failed: number;
    files: FileAttachment[];
    errors: string[];
    message: string;
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(files.length > 1 ? "files" : "file", file);
    });

    const raw = window.localStorage.getItem('chitti_auth_user');
    const token = raw ? JSON.parse(raw)?.token : null;

    const endpoint = files.length > 1
      ? `${API_BASE_URL}/attachments/messages/${messageId}/files/multiple`
      : `${API_BASE_URL}/attachments/messages/${messageId}/files`;

    const requestInit: RequestInit = {
      method: "POST",
      body: formData,
    };

    if (token) {
      requestInit.headers = { Authorization: `Bearer ${token}` };
    }

    const response = await fetch(endpoint, requestInit);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to upload attachment");
    }

    return response.json();
  },

  async downloadFile(fileId: string, filename: string): Promise<void> {
    const raw = window.localStorage.getItem('chitti_auth_user');
    const token = raw ? JSON.parse(raw)?.token : null;

    const requestInit: RequestInit = {
      method: 'GET',
    };

    if (token) {
      requestInit.headers = { Authorization: `Bearer ${token}` };
    }

    const response = await fetch(`${API_BASE_URL}/attachments/files/${fileId}/download`, requestInit);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to download attachment');
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  },
};
