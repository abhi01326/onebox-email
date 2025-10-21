import "dotenv/config";
import { embedText } from "../src/ai/embeddings";
import { QdrantClient } from "@qdrant/js-client-rest";
import fs from "fs";
import path from "path";

const qdrant = new QdrantClient({ url: "http://localhost:6333" });

async function main() {
  // Load your data file
  const filePath = path.join(__dirname, "productData.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const docs: { id: string; text: string }[] = JSON.parse(raw);

  if (!docs || docs.length === 0) {
    console.error("❌ No documents found in productData.json");
    process.exit(1);
  }

  // ✅ Safe access — check first before using docs[0]
  const firstDoc = docs[0];
  if (!firstDoc?.text) {
    throw new Error("First document has no text field");
  }

  const firstVec = await embedText(firstDoc.text);
  console.log(`✅ First embedding generated: length ${firstVec.length}`);

  // ✅ Upsert all documents
  await qdrant.upsert("product_data", {
    points: await Promise.all(
      docs.map(async (doc) => ({
        id: doc.id,
        vector: await embedText(doc.text),
        payload: { text: doc.text },
      }))
    ),
  });

  console.log("✅ All documents embedded and uploaded to Qdrant");
}

main().catch((err) => {
  console.error("❌ Error during seeding:", err);
  process.exit(1);
});
