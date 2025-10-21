import dotenv from "dotenv";
dotenv.config();

export  const ENV = {
  PORT: process.env.PORT || 4000,
  ELASTIC_URL: process.env.ELASTIC_URL || "http://localhost:9200",
  IMAP_HOST: process.env.IMAP_HOST || "",
  IMAP_USER: process.env.IMAP_USER || "",
  IMAP_PASS: process.env.IMAP_PASS || "",
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || "",
  WEBHOOK_SITE_URL: process.env.WEBHOOK_SITE_URL || "",
};
