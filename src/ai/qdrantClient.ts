// src/ai/qdrantClient.ts
import axios from "axios";
import pino from "pino";

const logger = pino({ name: "qdrant" });

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "product_faqs";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY; // optional

const http = axios.create({
  baseURL: QDRANT_URL,
  timeout: 10000,
  headers: QDRANT_API_KEY ? { "api-key": QDRANT_API_KEY } : undefined,
});

// create collection if not exists
export async function ensureCollection(dim: number) {
  try {
    // Check exists
    const res = await http.get(`/collections/${encodeURIComponent(QDRANT_COLLECTION)}`).catch(() => null);
    if (res && res.data) {
      logger.info(`Qdrant collection ${QDRANT_COLLECTION} exists`);
      return;
    }

    const body = {
      vectors: { size: dim, distance: "Cosine" }, // or "Dot" depending on embeddings
      // optionally enable payloads
    };
    await http.put(`/collections/${encodeURIComponent(QDRANT_COLLECTION)}`, body);
    logger.info(`Created Qdrant collection ${QDRANT_COLLECTION}`);
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "Failed to ensure Qdrant collection");
    throw err;
  }
}

export async function upsertPoints(points: Array<{ id: string | number; vector: number[]; payload?: any }>) {
  const body = { points };
  try {
    await http.put(`/collections/${encodeURIComponent(QDRANT_COLLECTION)}/points?wait=true`, body);
    logger.info(`Upserted ${points.length} points into ${QDRANT_COLLECTION}`);
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "Failed upserting points");
    throw err;
  }
}

export async function searchVectors(vector: number[], topK = 3) {
  try {
    const body = {
      vector,
      top: topK,
      // filter: { must: ... } // optional
    };
    const res = await http.post(`/collections/${encodeURIComponent(QDRANT_COLLECTION)}/points/search`, body);
    // res.data.result is typically array of matches
    return res.data.result ?? res.data ?? [];
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "Qdrant search failed");
    throw err;
  }
}
