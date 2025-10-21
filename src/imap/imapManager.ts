import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { IMAP_ACCOUNTS } from "../config";
import { indexEmail } from "../es/indexer";
import type { EmailDocument } from "../types/email";
import { categorizeEmail } from "../ai/emailCategorizer";
import { setImapStatus } from "./imapService";

function since30Days() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

export class ImapManager {
  private clients = new Map<string, ImapFlow>();

  public async start() {
    for (const acc of IMAP_ACCOUNTS) {
      // validate
      if (!acc.user || !acc.pass || !acc.host) {
        console.warn(`[IMAP ${acc.id}] Skipping - missing config`);
        continue;
      }
      this.initAccount(acc).catch((err) => {
        console.error(`[IMAP ${acc.id}] init error`, err);
      });
    }
  }

  private async initAccount(acc: {
    id: string;
    host: string;
    port: number;
    user: string;
    pass: string;
  }) {
    const client = new ImapFlow({
      host: acc.host,
      port: acc.port,
      secure: true,
      auth: {
        user: acc.user,
        pass: acc.pass,
      },
      // debug: console.log // uncomment to see low-level logs
    });

    client.on("error", (err) => {
      console.error(`[IMAP ${acc.id}] connection error`, err);
      setImapStatus(acc.id, {
        connected: false,
        lastError: String(err),
        host: acc.host,
        user: acc.user,
      });
    });

    client.on("close", () => {
      console.warn(`[IMAP ${acc.id}] connection closed`);
      setImapStatus(acc.id, {
        connected: false,
        host: acc.host,
        user: acc.user,
      });
      // imapflow automatically reconnects on next connect invocation; here you can add reconnection logic if needed
    });

    // Attempt connect with a small retry/backoff to handle transient network/auth issues
    const maxAttempts = 3;
    let attempt = 0;
    let connected = false;
    while (attempt < maxAttempts && !connected) {
      attempt += 1;
      try {
        await client.connect();
        connected = true;
        console.log(`[IMAP ${acc.id}] connected (attempt ${attempt})`);
        setImapStatus(acc.id, {
          connected: true,
          host: acc.host,
          user: acc.user,
        });
      } catch (err: any) {
        console.error(
          `[IMAP ${acc.id}] connect attempt ${attempt} failed:`,
          err?.message || err
        );
        // If authentication failed, give a helpful hint to the operator
        if (err?.authenticationFailed) {
          console.error(
            `[IMAP ${acc.id}] authentication failed. If you're using Gmail with 2FA, use an App Password or configure OAuth2. Check IMAP user/pass in environment variables.`
          );
          break; // don't retry when auth fails
        }
        if (attempt < maxAttempts) {
          const backoffMs = attempt * 2000;
          console.log(`[IMAP ${acc.id}] retrying connect in ${backoffMs}ms...`);
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    }
    if (!connected) {
      throw new Error(
        `IMAP ${acc.id} failed to connect after ${attempt} attempts`
      );
    }

    // Save client
    this.clients.set(acc.id, client);

    // List mailboxes (optional)
    // for await (const m of client.list()) console.log(`[IMAP ${acc.id}] mailbox`, m.path);

    // Initial sync: fetch mailbox list and then INBOX since 30 days
    await client.mailboxOpen("INBOX", { readOnly: true });

    const since = since30Days();
    const uids = (await client.search({ since })) || [];
    console.log(
      `[IMAP ${acc.id}] found ${
        uids.length
      } messages since ${since.toISOString()}`
    );

    // Fetch envelope & bodyStructure only for historical messages
    if (uids.length > 0) {
      for await (const msg of client.fetch(uids, {
        envelope: true,
        bodyStructure: true,
        internalDate: true,
        uid: true,
      })) {
        const messageId = msg.envelope?.messageId || `uid-${msg.uid}`;
        const doc: EmailDocument = {
          id: messageId,
          accountId: acc.id,
          folder: "INBOX",
          subject: msg.envelope?.subject || "",
          body: "", // intentionally empty for history (we only index metadata); can fetch snippet if needed
          from: msg.envelope?.from?.map((f: any) => f.address).join(", ") || "",
          to: msg.envelope?.to?.map((t: any) => t.address) || [],
          date: new Date(msg.internalDate || new Date()).toISOString(),
          aiCategory: "Uncategorized",
          indexedAt: new Date().toISOString(),
          meta: { envelope: msg.envelope, bodyStructure: msg.bodyStructure },
        };
        try {
          await indexEmail(doc);
        } catch (err) {
          console.error(
            `[IMAP ${acc.id}] index historical error for ${doc.id}`,
            err
          );
        }
      }
    }

    // After initial sync: open mailbox in writable mode so we can detect new arrivals
    await client.mailboxOpen("INBOX", { readOnly: false });

    // Listen for new messages. imapflow emits 'exists' when mailbox message count changes.
    client.on("exists", async (count) => {
      console.log(
        `[IMAP ${acc.id}] exists event: mailbox has ${count} messages`
      );
      try {
        // search for unseen messages and process them
        const unseen = (await client.search({ seen: false })) || [];
        if (unseen.length === 0) return;
        // fetch their full source to parse and index body
        for await (const m of client.fetch(unseen, {
          source: true,
          envelope: true,
          internalDate: true,
          uid: true,
        })) {
          try {
            // parse full raw source to get plaintext via mailparser
            if (!m.source) {
              console.warn(
                `[IMAP ${acc.id}] message ${m.uid} missing source, skipping`
              );
              continue;
            }
            const source = Buffer.isBuffer(m.source)
              ? m.source
              : Buffer.from(String(m.source));
            const parsed = await simpleParser(source);
            const messageId = parsed.messageId || `uid-${m.uid}`;
            // deduplicate: if exists in ES with same id, skip — ES indexing call will overwrite but it's okay
            const toAddresses: string[] = (() => {
              const t = parsed.to as any;
              if (!t) return [];
              if (Array.isArray(t)) {
                return t.flatMap((part: any) =>
                  (part?.value ?? []).map((v: any) => v.address)
                );
              }
              return (t.value ?? []).map((v: any) => v.address);
            })();

            const doc: EmailDocument = {
              id: messageId,
              accountId: acc.id,
              folder: "INBOX",
              subject: parsed.subject || "",
              body: parsed.text || parsed.html || "",
              from: parsed.from?.text || "",
              to: toAddresses || [],
              date: (parsed.date || new Date()).toISOString(),
              aiCategory: "Uncategorized",
              indexedAt: new Date().toISOString(),
              meta: { envelope: m.envelope },
            };
            await indexEmail(doc);
            // placeholder: call classifier or webhook after indexing in later phases
            console.log(`[IMAP ${acc.id}] indexed new email: ${doc.subject}`);
          } catch (err) {
            console.error(
              `[IMAP ${acc.id}] failed to parse/index new message`,
              err
            );
          }
        }
      } catch (err) {
        console.error(`[IMAP ${acc.id}] error fetching unseen`, err);
      }
    });

    // Keepalive/watchdog: periodically NOOP to detect dead connection and keep IDLE alive
    const watchdogMs = 29 * 60 * 1000; // 29 minutes
    setInterval(async () => {
      try {
        await client.noop();
      } catch (err) {
        console.warn(
          `[IMAP ${acc.id}] watchdog noop failed, trying reconnect`,
          err
        );
        try {
          await client.connect();
        } catch (reErr) {
          console.error(`[IMAP ${acc.id}] reconnect failed`, reErr);
        }
      }
    }, watchdogMs);
  }

  // stop all clients gracefully
  public async stop() {
    for (const [id, c] of this.clients) {
      try {
        await c.logout();
        console.log(`[IMAP ${id}] logged out`);
      } catch (err) {
        console.warn(`[IMAP ${id}] logout error`, err);
      }
    }
    this.clients.clear();
  }
}
async function onNewEmail(email: any) {
  const doc: EmailDocument = {
    id: email.messageId,
    accountId: email.accountId || "",
    folder: email.folder || "INBOX",
    subject: email.subject || "",
    body: email.text || email.html || "",
    from: email.from || "",
    to: Array.isArray(email.to) ? email.to : email.to ? [email.to] : [],
    date: new Date(email.date || Date.now()).toISOString(),
    aiCategory: "Uncategorized",
    indexedAt: new Date().toISOString(),
    meta: email.meta,
  };

  // 1️⃣ Index in Elasticsearch
  await indexEmail(doc);

  // 2️⃣ Run AI categorization asynchronously (fire-and-forget)
  void categorizeEmail(doc.id, `${doc.subject}\n${doc.body}`).catch((err) =>
    console.error("[AI] categorizeEmail failed", err)
  );
}
