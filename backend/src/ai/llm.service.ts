import axios from "axios";

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMTool {
  name: string;
  description: string;
  parameters: any;
}

export class LLMService {
  private baseURL: string;
  private model: string;
  private apiKey?: string;

  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "llama3";
    this.apiKey = process.env.OLLAMA_API_KEY;
  }

  async generate(messages: LLMMessage[]): Promise<string> {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await axios.post(
      `${this.baseURL}/api/chat`,
      {
        model: this.model,
        messages,
        stream: false,
      },
      { headers }
    );

    return response.data?.message?.content || "No response generated.";
  }

  async generateWithTools(messages: LLMMessage[], tools: LLMTool[]) {
    const toolDescriptions = tools
      .map(
        (tool) =>
          `Tool: ${tool.name}\nDescription: ${tool.description}\nParameters: ${JSON.stringify(
            tool.parameters
          )}`
      )
      .join("\n\n");

    const systemPrompt = {
      role: "system",
      content: `You are an AI agent. You can use the following tools:\n\n${toolDescriptions}`,
    };

    const response = await axios.post(`${this.baseURL}/api/chat`, {
      model: this.model,
      messages: [systemPrompt, ...messages],
      stream: false,
    });

    return response.data?.message?.content;
  }
}