import { Request, Response } from "express";
import { Pinecone } from "@pinecone-database/pinecone";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { generateEmbedding } from "../ai/embedding.service";
import prisma from "../config/database";

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

const pineconeIndexName = process.env.PINECONE_INDEX || process.env.PINECONE_INDEX_NAME || "support-index";
const index = pinecone.index(pineconeIndexName);

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

export const createKnowledgeArticle = async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const title = String(req.body?.title ?? "").trim();
    const content = String(req.body?.content ?? "").trim();

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const article = await prisma.knowledgeBase.create({
      data: {
        orgId,
        title,
        content,
      },
    });

    const chunks = chunkText(content, 500).filter((chunk) => chunk.trim().length > 0);

    let indexed = true;
    try {
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
                title,
                knowledgeId: article.id,
              },
            },
          ],
        });
      }
    } catch (indexError) {
      indexed = false;
      console.error("Knowledge indexing failed:", indexError);
    }

    return res.status(201).json({
      ...article,
      indexed,
      chunksStored: chunks.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Create knowledge article failed" });
  }
};

export const listKnowledgeArticles = async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const articles = await prisma.knowledgeBase.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    return res.json(articles);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch knowledge articles" });
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
