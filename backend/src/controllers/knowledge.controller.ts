import { Request, Response } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import { generateEmbedding } from "../ai/embedding.service";
import { Pinecone } from "@pinecone-database/pinecone";
import fs from "fs";

const upload = multer({ dest: "uploads/" });

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index("support-index");

export const uploadMiddleware = upload.single("file");

export const uploadKnowledge = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = fs.readFileSync(req.file.path);

    // 1️⃣ Extract PDF text
    const data = await pdfParse(fileBuffer);
    const fullText = data.text;

    // 2️⃣ Chunking (simple version)
    const chunks = chunkText(fullText, 500);

    // 3️⃣ Embed + Store in Pinecone
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);

      await index.upsert([
        {
          id: uuidv4(),
          values: embedding,
          metadata: {
            text: chunk,
          },
        },
      ]);
    }

    fs.unlinkSync(req.file.path); // delete temp file

    return res.json({
      success: true,
      chunksStored: chunks.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Upload failed" });
  }
};

// 🔥 Basic chunking
function chunkText(text: string, size: number) {
  const words = text.split(" ");
  const chunks = [];

  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }

  return chunks;
}