import { es, EMAIL_INDEX } from "./client";
import { EmailDocument } from "../types/email";

export async function indexEmail(doc: EmailDocument) {
  await es.index({
    index: EMAIL_INDEX,
    id: doc.id,
    document: doc,
    refresh: true, // for demo, immediate searchability; remove in bulk production
  });
}

export async function updateEmailCategory(id: string, category: string) {
  await es.update({
    index: EMAIL_INDEX,
    id,
    doc: { aiCategory: category },
  });
}

export async function searchEmails(query: {
  q?: string;
  accountId?: string;
  folder?: string;
  from?: number;
  size?: number;
}) {
  const { q, accountId, folder, from = 0, size = 20 } = query;
  const must: any[] = [];
  if (q)
    must.push({
      multi_match: { query: q, fields: ["subject", "body", "from"] },
    });
  if (accountId) must.push({ term: { accountId } });
  if (folder) must.push({ term: { folder } });

  const body: Record<string, any> = must.length
    ? { query: { bool: { must } } }
    : { query: { match_all: {} } };

  const resp = await es.search({
    index: EMAIL_INDEX,
    from,
    size,
    // cast to any to satisfy the client's overloaded TypeScript signatures
    body: body as any,
  });
  return resp.hits.hits.map((h) => h._source as EmailDocument);
}
