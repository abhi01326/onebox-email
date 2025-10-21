require("dotenv").config();
const { ImapFlow } = require("imapflow");

(async () => {
  const user = process.env.IMAP_1_USER;
  const pass = process.env.IMAP_1_PASS;
  if (!user || !pass) {
    console.error("IMAP_1_USER or IMAP_1_PASS not found in .env");
    process.exit(2);
  }

  const client = new ImapFlow({
    host: process.env.IMAP_1_HOST || "imap.gmail.com",
    port: Number(process.env.IMAP_1_PORT || 993),
    secure: true,
    auth: { user, pass },
    // debug: console.log
  });

  try {
    await client.connect();
    console.log("IMAP connect OK");
    await client.logout();
    process.exit(0);
  } catch (err) {
    console.error("IMAP connect FAILED:", err?.message || err);
    process.exit(1);
  }
})();
