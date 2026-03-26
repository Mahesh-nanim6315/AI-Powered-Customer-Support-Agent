import axios from "axios";

const BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3";
const API_KEY = process.env.OLLAMA_API_KEY;

export async function generateOllamaResponse(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
  }
) {
  try {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (API_KEY) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    const response = await axios.post(
      `${BASE_URL}/api/generate`,
      {
        model: options?.model || MODEL,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature,
        },
      },
      { headers }
    );

    return response.data.response;
  } catch (err: any) {
    console.error("Ollama Error:", err?.message || err);
    return "I’m having trouble accessing our AI assistant right now. A human agent will help you shortly.";
  }
}
