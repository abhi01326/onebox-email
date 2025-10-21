export type AICategory =
  | "Interested"
  | "Meeting Booked"
  | "Not Interested"
  | "Spam"
  | "Out of Office"
  | "Uncategorized";

export interface EmailDocument {
  id: string; // message-id or generated fallback
  accountId: string;
  folder: string;
  subject: string;
  body: string; // plaintext
  from: string;
  to: string[];
  date: string; // ISO
  aiCategory: AICategory;
  indexedAt: string; // ISO
  // metadata (ENVELOPE/BODYSTRUCTURE) optionally included
  meta?: any;
}
