// src/ai/emailCategorizer.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { GenerationConfig, ResponseSchema } from "@google/generative-ai";
import { updateEmailCategory } from "../es/indexer";
import pino from "pino";

// Initialize logger
const logger = pino({ name: "ai-categorizer", level: "info" });

// Initialize Gemini client
if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// System instruction for classification
const systemInstruction =
  "You are an expert email classifier. Analyze the email text and categorize it into one of the following labels: Interested, Meeting Booked, Not Interested, Spam, or Out of Office.";

// Schema enforcement
const generationConfig: GenerationConfig = {
  responseMimeType: "application/json",
  responseSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [
          "Interested",
          "Meeting Booked",
          "Not Interested",
          "Spam",
          "Out of Office",
        ],
      },
    },
    required: ["category"],
  } as unknown as ResponseSchema,
};

// Function to classify email
export async function categorizeEmail(emailId: string, text: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const maxRetries = 3;
  let delay = 1000; // base 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text }] }],
        systemInstruction,
        generationConfig,
      });

      // Parse Gemini response safely
      const rawText = result.response.text();
      const jsonMatch = rawText.match(/{[\s\S]*}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      const allowed = [
        "Interested",
        "Meeting Booked",
        "Not Interested",
        "Spam",
        "Out of Office",
      ];
      const category = allowed.includes(parsed.category)
        ? parsed.category
        : "Uncategorized";

      // ✅ Use logger here
      logger.info({ emailId, category }, "Categorized email");

      // Update Elasticsearch
      try {
        await updateEmailCategory(emailId, category);
      } catch (esErr: any) {
        logger.error({ err: esErr, emailId }, "Failed to update ES category");
      }

      return category;
    } catch (err: any) {
      logger.error({ err, emailId, attempt }, "Categorization failed");
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2; // exponential backoff
      } else {
        logger.error(
          { emailId },
          "❌ Max retries reached — skipping classification."
        );
      }
    }
  }
}
