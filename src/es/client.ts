import { Client } from "@elastic/elasticsearch";
import { ES_URL } from "../config";

export const es = new Client({ node: ES_URL });

export const EMAIL_INDEX = "emails";

export async function ensureEmailIndex() {
  const exists = await es.indices.exists({ index: EMAIL_INDEX });
  if (!exists) {
    await es.indices.create({
      index: EMAIL_INDEX,
      mappings: {
        properties: {
          id: { type: "keyword" },
          accountId: { type: "keyword" },
          folder: { type: "keyword" },
          subject: { type: "text" },
          body: { type: "text" },
          from: { type: "text" },
          to: { type: "keyword" },
          date: { type: "date" },
          aiCategory: { type: "keyword" },
          indexedAt: { type: "date" },
          meta: { type: "object", enabled: false },
        },
      },
    });
    console.log("✅ Created index:", EMAIL_INDEX);
  } else {
    console.log("ℹ️ Index exists:", EMAIL_INDEX);
  }
}
