import express from "express";
import cors from "cors";
import { ENV } from "./config/env";
import { initElastic } from "./elastic/client";
import logger from "./utils/logger";
import router from "./api/routes";
import { ImapService } from "./imap/imapService";

const app = express();

// Enable CORS for the frontend dev server (override via ENV.FRONTEND_ORIGIN if needed)
// Enable CORS using a small whitelist. This allows the webhook.site URL to be
// used for webhook testing while also permitting your frontend (e.g. Vite at
// http://localhost:5173). FRONTEND_ORIGIN may be a comma-separated list.
const allowedOrigins = new Set<string>();
if (ENV.WEBHOOK_SITE_URL) allowedOrigins.add(ENV.WEBHOOK_SITE_URL);
if (process.env.FRONTEND_ORIGIN) {
  for (const p of process.env.FRONTEND_ORIGIN.split(",")) {
    const v = p.trim();
    if (v) allowedOrigins.add(v);
  }
}
// default local dev origin
allowedOrigins.add("http://localhost:5173");

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser tools (curl, server-to-server) which have no origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      // allow any localhost origin (different ports) for dev convenience
      try {
        const url = new URL(origin);
        if (url.hostname === "localhost") return callback(null, true);
      } catch (e) {
        // ignore parse errors
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/api", router);

app.listen(ENV.PORT, async () => {
  logger.info(`✅ Server running at http://localhost:${ENV.PORT}`);
  await initElastic();
  const imapService = new ImapService();
  imapService.connect();
});
