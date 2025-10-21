import express from "express";
import { PORT } from "../config";
import { ensureEmailIndex } from "../es/client";
import { searchEmails } from "../es/indexer";
import { ImapManager } from "../imap/imapManager";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// health
app.get("/", (_, res) => res.send("ReachInbox Onebox - Phase1 OK"));

// search endpoint
app.get("/api/emails/search", async (req, res) => {
  try {
    const q = req.query.q as string | undefined;
    const accountId = req.query.account as string | undefined;
    const folder = req.query.folder as string | undefined;
    const from = Number(req.query.from || 0);
    const size = Number(req.query.size || 20);
    const params: {
      q?: string;
      accountId?: string;
      folder?: string;
      from?: number;
      size?: number;
    } = {};
    if (q !== undefined) params.q = q;
    if (accountId !== undefined) params.accountId = accountId;
    if (folder !== undefined) params.folder = folder;
    if (!Number.isNaN(from) && from > 0) params.from = from;
    if (!Number.isNaN(size) && size > 0) params.size = size;
    const hits = await searchEmails(params);
    res.json({ count: hits.length, hits });
  } catch (err) {
    console.error("Search error", err);
    res.status(500).json({ error: "search failed" });
  }
});

// start
(async function main() {
  try {
    await ensureEmailIndex();
    const im = new ImapManager();
    await im.start();

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup error", err);
    process.exit(1);
  }
})();
