import express from "express";
import { esClient } from "../elastic/client";
import { getImapStatus } from "../imap/imapService";
import { IMAP_ACCOUNTS } from "../config";
import { searchEmails } from "../es/indexer";
const router = express.Router();

// Health check
router.get("/", (_, res) => res.send("ReachInbox Onebox API running 🚀"));

// Simple search route
router.get("/emails/search", async (req, res) => {
  console.log("🔍 Search endpoint hit:", req.query);
  try {
    const qRaw = req.query.q;
    const accountIdRaw = req.query.accountId;
    const folderRaw = req.query.folder;

    const q = typeof qRaw === "string" ? qRaw : "";
    const accountId =
      typeof accountIdRaw === "string" ? accountIdRaw : undefined;
    const folder = typeof folderRaw === "string" ? folderRaw : undefined;

    const result = await esClient.search({
      index: "emails",
      query: {
        bool: {
          must: q
            ? [
                {
                  multi_match: {
                    query: q,
                    fields: ["subject", "from", "body"], // search across multiple fields
                    fuzziness: "AUTO", // handles typos
                  },
                },
              ]
            : [{ match_all: {} }],
          filter: [
            ...(accountId ? [{ term: { accountId } }] : []),
            ...(folder ? [{ term: { folder } }] : []),
          ],
        },
      },
    });
    res.json(result.hits.hits.map((hit) => hit._source));
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;

// IMAP status endpoint
router.get("/imap/status", (req, res) => {
  try {
    const s = getImapStatus();
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: "failed to get imap status" });
  }
});

// Per-account IMAP statuses
router.get("/imap/accounts", (req, res) => {
  try {
    const all = getImapStatus();
    res.json({ accounts: all });
  } catch (err) {
    res.status(500).json({ error: "failed to get imap accounts status" });
  }
});

// Return configured accounts merged with runtime status (mask sensitive fields)
router.get("/accounts", (req, res) => {
  try {
    const statuses = getImapStatus();
    const accounts = IMAP_ACCOUNTS.map((a) => ({
      id: a.id,
      host: a.host,
      port: a.port,
      user: a.user ? `${a.user.slice(0, 2)}****${a.user.slice(-2)}` : "",
      status: statuses[a.id] || { connected: false },
    }));
    console.log("Returning accounts:", accounts);
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: "failed to get accounts" });
  }
});

// Paginated listing of emails
router.get("/emails", async (req, res) => {
  try {
    const fromRaw = req.query.from;
    const sizeRaw = req.query.size;
    const from = typeof fromRaw === "string" ? Number(fromRaw) : 0;
    const size = typeof sizeRaw === "string" ? Number(sizeRaw) : 20;
    if (Number.isNaN(from) || Number.isNaN(size) || from < 0 || size <= 0) {
      return res.status(400).json({ error: "invalid pagination parameters" });
    }

    const hits = await searchEmails({ from, size });
    res.json({ count: hits.length, hits });
  } catch (err) {
    console.error("List emails error", err);
    res.status(500).json({ error: "failed to list emails" });
  }
});
