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

export interface AiRuntimeConfig {
  chatProvider: string;
  chatModelDefault: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimension: number;
}

export interface AiSettingsView extends AiSettingsPayload {
  id: string | null;
  orgId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  runtimeConfig: AiRuntimeConfig;
}

const DEFAULT_AI_MODEL = process.env.OLLAMA_MODEL || "llama3";
const DEFAULT_EMBEDDING_PROVIDER = (process.env.EMBEDDING_PROVIDER || "gemini").toLowerCase();
const DEFAULT_OPENAI_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const DEFAULT_GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

const DEFAULTS: AiSettingsPayload = {
  aiEnabled: true,
  model: DEFAULT_AI_MODEL,
  temperature: 0.4,
  confidenceThreshold: 0.75,
  autoExecuteSuggestions: false,
  kbFallbackEnabled: true,
  safeFallbackEnabled: true,
  escalationEnabled: true,
  replyTone: "professional",
  systemPrompt: null,
};

function getRuntimeConfig(): AiRuntimeConfig {
  const embeddingDimension = Number(process.env.EMBEDDING_DIMENSION || process.env.PINECONE_DIMENSION || "768");

  return {
    chatProvider: "ollama",
    chatModelDefault: DEFAULT_AI_MODEL,
    embeddingProvider: DEFAULT_EMBEDDING_PROVIDER,
    embeddingModel:
      DEFAULT_EMBEDDING_PROVIDER === "openai"
        ? DEFAULT_OPENAI_EMBEDDING_MODEL
        : DEFAULT_GEMINI_EMBEDDING_MODEL,
    embeddingDimension: Number.isFinite(embeddingDimension) && embeddingDimension > 0 ? embeddingDimension : 768,
  };
}

export class AiSettingsService {
  static async getByOrgId(orgId: string): Promise<AiSettingsView> {
    const settings = await prisma.aiSettings.findUnique({
      where: { orgId },
    });

    if (settings) {
      return {
        ...settings,
        runtimeConfig: getRuntimeConfig(),
      };
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
      runtimeConfig: getRuntimeConfig(),
    };
  }

  static async update(orgId: string, data: AiSettingsPayload): Promise<AiSettingsView> {
    await prisma.organization.update({
      where: { id: orgId },
      data: { aiEnabled: data.aiEnabled },
    });

    const settings = await prisma.aiSettings.upsert({
      where: { orgId },
      update: data,
      create: {
        orgId,
        ...data,
      },
    });

    return {
      ...settings,
      runtimeConfig: getRuntimeConfig(),
    };
  }
}
