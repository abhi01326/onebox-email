import dotenv from "dotenv";
dotenv.config();

export type ImapAccountConfig = {
  id: string;
  host: string;
  port: number;
  user: string;
  pass: string;
};

export const PORT = Number(process.env.PORT || 4000);
export const ES_URL = process.env.ES_URL || "http://localhost:9200";

export const IMAP_ACCOUNTS: ImapAccountConfig[] = [
  {
    id: process.env.IMAP_1_ID || "acc1",
    host: process.env.IMAP_1_HOST || "",
    port: Number(process.env.IMAP_1_PORT || 993),
    user: process.env.IMAP_1_USER || "",
    pass: process.env.IMAP_1_PASS || "",
  },
  {
    id: process.env.IMAP_2_ID || "acc2",
    host: process.env.IMAP_2_HOST || "",
    port: Number(process.env.IMAP_2_PORT || 993),
    user: process.env.IMAP_2_USER || "",
    pass: process.env.IMAP_2_PASS || "",
  },
];
