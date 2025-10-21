// src/api/suggestReplyRoute.ts
import express from "express";
import pino from "pino";
import { embedText } from "../ai/embeddings";
import { searchVectors } from "../ai/qdrantClient";
import { Client as ESClient } from "@elastic/elasticsearch";
import { GoogleGenerativeAI, GenerateContentRequest } from "@google/generative-ai";
import type { GenerateContentResponse } from "@google/generative-ai";
import {} from "@google/genai"

const logger = pino({ name: "suggest-reply" });
const router = express.Router();

const es = new ESClient({ node: process.env.ES_URL || "http://localhost:9200" });

// Initialize Gemini client
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-pro";
const TOP_K = Number(process.env.QDRANT_TOP_K || 3);

// Type for email document in ES
interface EmailDocument {
  subject?: string;
  body?: string;
  accountId: string;
  folder?: string;
  date?: string;
}

// Helper to fetch email content from ES
async function fetchEmailFromES(id: string): Promise<EmailDocument | null> {
  try {
    const { _source } = await es.get({ index: "emails", id }).then(res => res.body as any);
    return _source ?? null;
  } catch (err) {
    return null;
  }
}

router.post("/api/emails/:id/suggest-reply", async (req, res) => {
  const emailId = req.params.id;

  try {
    // 1. fetch email
    const email = await fetchEmailFromES(emailId);
    if (!email) return res.status(404).json({ error: "Email not found" });

    // 2. embed email text
    const textToEmbed = `${email.subject || ""}\n\n${email.body || ""}`.slice(0, 2000);
    const queryVec = await embedText(textToEmbed);

    // 3. retrieve top-K contexts from Qdrant
    const hits = await searchVectors(queryVec, TOP_K);
    const contexts = (hits || [])
      .map((h: any) => h.payload?.text)
      .filter(Boolean);

    logger.info({ emailId, contexts }, "Retrieved contexts");

    // 4. assemble prompt
    const systemInstruction = `You are a professional assistant that writes concise, polite email replies based only on the provided context and the original email. Do NOT invent facts beyond the context.`;

    const retrievedText = contexts.map((c: string, i: number) => `Context ${i + 1}:\n${c}`).join("\n\n");

    const userPrompt = `
Original email:
${email.body || email.subject || ""}

Retrieved context:
${retrievedText}

Instruction:
Based ONLY on the retrieved context and the original email, draft a professional, concise reply (2-4 sentences) and include any meeting booking link if the context suggests one.
    `.trim();

    // 5. generate suggested reply using Gemini API
    const request: GenerateContentRequest = {
      model: GEMINI_MODEL,
      prompt: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      maxOutputTokens: 256,
    };

    const gResponse = await genai.generateContent(request);

    // 6. extract generated text
    let generatedText = "";
    if (gResponse.output?.length) {
      // Most SDKs put the text in output[0].content[0].text
      const firstOutput = gResponse.output[0];
      if (firstOutput?.content?.length && firstOutput.content[0].text) {
        generatedText = firstOutput.content[0].text;
      }
    }

    // fallback
    if (!generatedText) generatedText = "No suggestion could be generated.";

    return res.json({ suggestion: generatedText, contexts });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "Suggest reply failed");
    return res.status(500).json({ error: err?.message || "failed" });
  }
});

export default router;
