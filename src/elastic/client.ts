import { Client } from "@elastic/elasticsearch";
import { ENV } from "../config/env";
import logger from "../utils/logger";

export const esClient = new Client({ node: ENV.ELASTIC_URL });

export async function initElastic() {
  try {
    const health = await esClient.cluster.health();
    logger.info(`✅ Elasticsearch connected: ${health.status}`);
  } catch (err: any) {
    logger.error("❌ Elasticsearch connection failed",  err);
  }
}
