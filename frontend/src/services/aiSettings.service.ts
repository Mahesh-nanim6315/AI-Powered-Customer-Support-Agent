import { apiClient } from '../lib/api-client';
import type { AiSettings } from '../types';

export const aiSettingsService = {
  async get(): Promise<AiSettings> {
    return apiClient.get<AiSettings>('/ai-settings');
  },

  async update(data: AiSettings): Promise<AiSettings> {
    return apiClient.patch<AiSettings>('/ai-settings', data);
  },
};
