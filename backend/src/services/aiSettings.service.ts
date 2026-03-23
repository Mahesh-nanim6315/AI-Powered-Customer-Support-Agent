import prisma from "../config/database";

export interface AiSettingsPayload {
  aiEnabled: boolean;
  model: string;
  temperature: number;
  confidenceThreshold: number;
  autoExecuteSuggestions: boolean;
  kbFallbackEnabled: boolean;
  safeFallbackEnabled: boolean;
  escalationEnabled: boolean;
  replyTone: string;
  systemPrompt: string | null;
}

const DEFAULTS: AiSettingsPayload = {
  aiEnabled: true,
  model: "gpt-4.1-mini",
  temperature: 0.4,
  confidenceThreshold: 0.75,
  autoExecuteSuggestions: false,
  kbFallbackEnabled: true,
  safeFallbackEnabled: true,
  escalationEnabled: true,
  replyTone: "professional",
  systemPrompt: null,
};

export class AiSettingsService {
  static async getByOrgId(orgId: string) {
    const settings = await prisma.aiSettings.findUnique({
      where: { orgId },
    });

    if (settings) {
      return settings;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { aiEnabled: true },
    });

    return {
      id: null,
      orgId,
      ...DEFAULTS,
      aiEnabled: organization?.aiEnabled ?? DEFAULTS.aiEnabled,
      createdAt: null,
      updatedAt: null,
    };
  }

  static async update(orgId: string, data: AiSettingsPayload) {
    await prisma.organization.update({
      where: { id: orgId },
      data: { aiEnabled: data.aiEnabled },
    });

    return prisma.aiSettings.upsert({
      where: { orgId },
      update: data,
      create: {
        orgId,
        ...data,
      },
    });
  }
}
