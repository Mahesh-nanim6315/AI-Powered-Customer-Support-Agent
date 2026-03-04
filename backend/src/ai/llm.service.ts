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
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    this.model = "gemini-1.5-flash";
    this.baseURL =
      "https://generativelanguage.googleapis.com/v1beta/models";
  }

  /**
   * Basic text generation
   */
  async generate(messages: LLMMessage[]): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: messages.map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.content }],
          })),
        }
      );

      const text =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      return text || "No response generated.";
    } catch (error: any) {
      console.error("LLM Error:", error.response?.data || error.message);
      throw new Error("Failed to generate LLM response");
    }
  }

  /**
   * Tool calling simulation (Agent mode)
   */
  async generateWithTools(
    messages: LLMMessage[],
    tools: LLMTool[]
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: messages.map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.content }],
          })),
          tools: tools.map((tool) => ({
            functionDeclarations: [
              {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            ],
          })),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("LLM Tool Error:", error.response?.data || error.message);
      throw new Error("Failed to generate LLM response with tools");
    }
  }
}