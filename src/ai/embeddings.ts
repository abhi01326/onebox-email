import { GoogleGenerativeAI } from "@google/generative-ai";
import pino from "pino";

const logger = pino({ name: "embeddings" });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_EMBED_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "embedding-001"; // valid Gemini embedding model

if (!GEMINI_API_KEY) {
  logger.warn("GEMINI_API_KEY not set; embeddings will fail");
}

// Initialize the Gemini client
const client = new GoogleGenerativeAI(GEMINI_API_KEY);

// Create the embedding model instance
const embedModel = client.getGenerativeModel({ model: GEMINI_EMBED_MODEL });

/**
 * Generate an embedding vector for a given text using Gemini API
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Cannot embed empty text");
    }

    // Generate embedding using Gemini API
    const result = await embedModel.embedContent(text);

    // Extract vector safely
    const vector = result?.embedding?.values;

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Empty embedding returned from Gemini API");
    }

    return vector;
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "Embedding generation failed");
    throw err;
  }
}
