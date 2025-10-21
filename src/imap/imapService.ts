import Imap from "node-imap";
import { ENV } from "../config/env";
import logger from "../utils/logger";

function mask(s: string | undefined) {
  if (!s) return "";
  if (s.length <= 4) return "****";
  return s.slice(0, 2) + "****" + s.slice(-2);
}

export class ImapService {
  private imap: Imap;

  constructor() {
    this.imap = new Imap({
      user: ENV.IMAP_USER,
      password: ENV.IMAP_PASS,
      host: ENV.IMAP_HOST,
      port: 993,
      tls: true,
    });
  }

  private makeImap() {
    return new Imap({
      user: ENV.IMAP_USER,
      password: ENV.IMAP_PASS,
      host: ENV.IMAP_HOST,
      port: 993,
      tls: true,
    });
  }

  public async connect() {
    // Validate config first
    if (!ENV.IMAP_HOST || !ENV.IMAP_USER || !ENV.IMAP_PASS) {
      logger.error(
        { host: ENV.IMAP_HOST, user: mask(ENV.IMAP_USER) },
        "IMAP config missing (IMAP_HOST/IMAP_USER/IMAP_PASS). Skipping IMAP connect."
      );
      return;
    }

    logger.info(
      { host: ENV.IMAP_HOST, user: mask(ENV.IMAP_USER) },
      "Attempting IMAP connect"
    );

    // derive a stable id for this IMAP account for status tracking
    const imapId = ENV.IMAP_USER || ENV.IMAP_HOST || "imap-default";

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.imap = this.makeImap();

      try {
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onError = (err: any) => {
            cleanup();
            reject(err);
          };
          const cleanup = () => {
            this.imap?.removeListener("ready", onReady);
            this.imap?.removeListener("error", onError);
          };

          this.imap?.once("ready", onReady);
          this.imap?.once("error", onError);
          try {
            this.imap?.connect();
          } catch (err) {
            cleanup();
            reject(err);
          }
        });

        logger.info("\ud83d\udcec IMAP connection ready");
        // update status
        setImapStatus(imapId, {
          connected: true,
          host: ENV.IMAP_HOST,
          user: mask(ENV.IMAP_USER),
        });
        this.openInbox();
        return;
      } catch (err: any) {
        const msg = err?.message || String(err);
        logger.error({ attempt, message: msg }, "IMAP connection error");
        setImapStatus(imapId, {
          connected: false,
          lastError: msg,
          host: ENV.IMAP_HOST,
          user: mask(ENV.IMAP_USER),
        });

        // Detect authentication failures and bail with a helpful hint
        if (
          /auth/i.test(msg) ||
          /invalid credentials/i.test(msg) ||
          err?.source === "authentication"
        ) {
          logger.error(
            "IMAP authentication failed. If using Gmail with 2FA, generate an App Password or configure OAuth2. Check environment variables for IMAP credentials."
          );
          break; // don't retry on auth failures
        }

        if (attempt < maxAttempts) {
          const backoff = attempt * 2000;
          logger.info(
            { attempt, backoff },
            `Retrying IMAP connect in ${backoff}ms...`
          );
          // dispose previous imap object listeners and state before retry
          try {
            this.imap?.removeAllListeners();
            // node-imap has an end() method; call to be safe
            try {
              // @ts-ignore
              this.imap?.end();
            } catch {}
          } catch {}
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
      }
    }

    logger.error("IMAP failed to connect after retries");
    setImapStatus(imapId, {
      connected: false,
      lastError: "failed after retries",
    });
  }

  private openInbox() {
    this.imap.openBox("INBOX", true, (err: any, box: any) => {
      if (err) {
        logger.error({ err }, "Failed to open INBOX");
        const imapId = ENV.IMAP_USER || ENV.IMAP_HOST || "imap-default";
        setImapStatus(imapId, { connected: false, lastError: String(err) });
        return;
      }
      logger.info(`Opened mailbox: ${box.name}`);
      const imapId = ENV.IMAP_USER || ENV.IMAP_HOST || "imap-default";
      setImapStatus(imapId, (s) => ({
        ...(s ?? { connected: false }),
        mailbox: box.name,
      }));

      // Listen for new mail in real-time
      this.imap.on("mail", (numNewMsgs: number) => {
        logger.info(`📨 ${numNewMsgs} new email(s) detected`);
        // TODO: fetch and process new emails here
      });
    });
  }
}

// Lightweight status store for external checks
export type ImapStatus = {
  connected: boolean;
  host?: string;
  user?: string;
  mailbox?: string;
  lastError?: string;
};

// Track statuses per account id
const _statuses: Record<string, ImapStatus> = {};

/**
 * Set status for a specific account id. If the status arg is a function it will be
 * invoked with the current status (or undefined) and should return the new status.
 */
export function setImapStatus(
  id: string,
  s: ImapStatus | ((cur?: ImapStatus) => ImapStatus)
) {
  if (typeof s === "function") {
    const cur = _statuses[id];
    _statuses[id] = (s as any)(cur);
  } else {
    _statuses[id] = s;
  }
}

/**
 * Get status for a specific account id, or all statuses when no id is provided.
 */
export function getImapStatus(): Record<string, ImapStatus>;
export function getImapStatus(id: string): ImapStatus;
export function getImapStatus(id?: string) {
  if (typeof id === "string") {
    return _statuses[id] ?? { connected: false };
  }
  return _statuses;
}

