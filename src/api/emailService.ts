import axios from "axios";

export interface Email {
  id: string;
  accountId: string;
  folder: string;
  subject: string;
  body: string;
  from: string;
  to: string[];
  date: string;
  aiCategory: string;
}

// Fetch accounts
export const fetchAccounts = async (): Promise<string[]> => {
  const res = await axios.get("/api/accounts");
  return res.data.accounts;
};

// Fetch all emails
export const fetchEmails = async (): Promise<Email[]> => {
  const res = await axios.get("/api/emails");
  return res.data.emails;
};

// Search/filter emails
export const searchEmails = async (
  query: string,
  account?: string,
  folder?: string
): Promise<Email[]> => {
  const res = await axios.get("/api/emails/search", {
    params: { q: query, account, folder },
  });
  return res.data.hits;
};
