import { Request, Response } from "express";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { generateEmbedding } from "../ai/embedding.service";

type UploadRequest = Request & {
  file?: {
    path: string;
  };
};

const multer = require("multer") as {
  (options: { dest: string }): { single: (fieldName: string) => any };
};

const upload = multer({ dest: "uploads/" });
const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text: string }>;

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index("support-index");

export const uploadMiddleware = upload.single("file");

export const uploadKnowledge = async (req: UploadRequest, res: Response) => {
  let tempFilePath: string | undefined;

  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file?.path) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    tempFilePath = req.file.path;
    const fileBuffer = fs.readFileSync(tempFilePath);

    const parsed = await pdfParse(fileBuffer);
    const fullText = parsed.text ?? "";
    const chunks = chunkText(fullText, 500);

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);

      await index.upsert({
        records: [
          {
            id: uuidv4(),
            values: embedding,
            metadata: {
              text: chunk,
              orgId,
            },
          },
        ],
      });
    }

    return res.json({
      success: true,
      chunksStored: chunks.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Upload failed" });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};

function chunkText(text: string, size: number): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }

  return chunks;
}
