# 📧 ReachInbox OneBox — AI Email Reply Suggestion System

> An intelligent email assistant that suggests professional, context-aware replies based on previous email threads and relevant documents using Google Gemini, Elasticsearch, and Qdrant.

---

## 🚀 Overview

**ReachInbox OneBox** is an AI-powered backend service that:
- Fetches email data from **Elasticsearch**.
- Generates semantic **embeddings** using **Google Gemini API**.
- Retrieves similar context using **Qdrant Vector Database**.
- Generates concise, polite, and professional **reply suggestions** using **Gemini LLM**.

---

## 🧠 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Language** | TypeScript (Node.js + Express) |
| **AI/Embeddings** | Google Gemini API (`@google/generative-ai`) |
| **Vector Search** | Qdrant |
| **Search Engine** | Elasticsearch |
| **Logger** | pino |
| **Database** | SQLite (optional seed data) |
| **Environment** | dotenv |

---

## 📁 Project Structure

```
reachinbox-onebox/
│
├── src/
│   ├── api/
│   │   └── suggestReplyRoute.ts      # Main route for AI reply suggestion
│   ├── ai/
│   │   ├── embeddings.ts             # Embedding generation using Gemini
│   │   └── qdrantClient.ts           # Qdrant vector search helper
│   ├── server.ts                     # Express app entry point
│   └── config.ts                     # Configuration setup (optional)
│
├── scripts/
│   └── seedProductData.ts            # Data seeding script for ES/Qdrant
│
├── .env                              # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚙️ Setup & Installation

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/abhi01326/reachinbox-onebox.git
cd reachinbox-onebox
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Configure Environment Variables

Create a `.env` file in the project root:
```bash
# Gemini API
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-1.5-pro

# Elasticsearch
ES_URL=http://localhost:9200

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=emails
QDRANT_TOP_K=3

# Server
PORT=4000
```

---

## 🧩 How It Works

### Step 1 — Fetch Email from Elasticsearch
The API fetches an email document by its ID.

```ts
const { _source } = await es.get({ index: "emails", id });
```

### Step 2 — Generate Embedding
The email text (subject + body) is embedded using Gemini Embedding API.

```ts
const queryVec = await embedText(email.body);
```

### Step 3 — Retrieve Context from Qdrant
The system retrieves semantically similar documents using vector search.

```ts
const hits = await searchVectors(queryVec, TOP_K);
```

### Step 4 — Generate Suggested Reply
Gemini generates a short, professional reply based on the email and context.

```ts
const gResponse = await genai.generateContent({
  model: GEMINI_MODEL,
  contents: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
});
```

---

## 🧾 API Reference

### `POST /api/emails/:id/suggest-reply`

Generates a professional, context-based reply suggestion for the given email ID.

#### 📤 Request
```bash
POST http://localhost:4000/api/emails/123/suggest-reply
Content-Type: application/json
```

#### 📥 Response
```json
{
  "suggestion": "Thank you for reaching out. Let's schedule a meeting to discuss this further.",
  "contexts": [
    "Previous email about scheduling a demo",
    "User requested feature overview"
  ]
}
```

#### 🧱 Errors
| Code | Message |
|------|----------|
| 404 | Email not found |
| 500 | Failed to generate suggestion |
| 403 | Missing or invalid GEMINI_API_KEY |
| 429 | Gemini quota exceeded |

---

## 🧪 Development Scripts

| Command | Description |
|----------|-------------|
| `npm run dev` | Start server in watch mode |
| `npm run build` | Compile TypeScript |
| `npm run start` | Start compiled app |
| `npm run seed` | Run seeding script to populate sample data |

---

## 🧰 Example Elasticsearch Document

```json
{
  "_index": "emails",
  "_id": "123",
  "_source": {
    "accountId": "ab123@example.com",
    "subject": "Schedule meeting for project update",
    "body": "Hey, can we connect tomorrow to discuss the latest project updates?",
    "date": "2025-10-21T12:00:00Z"
  }
}
```

---

## ⚡ Troubleshooting

| Problem | Possible Cause | Fix |
|----------|----------------|-----|
| ❌ `GEMINI_API_KEY not set` | Missing API key in `.env` | Add valid Gemini API key |
| 🧩 `403 Forbidden` | Invalid Gemini key or project not whitelisted | Enable Gemini API in Google Cloud Console |
| 🚫 `429 RESOURCE_EXHAUSTED` | Free-tier quota exceeded | Add billing or wait for daily reset |
| ⚙️ `Property 'body' does not exist on type` | Elasticsearch typings mismatch | Use `res as any` or update SDK |
| 🧠 Empty suggestions | Context not found or irrelevant | Check embeddings + Qdrant collection |

---

## 🧑‍💻 Authors

- **Abhishekh Muthyala** — Backend Developer, AI Engineer  
  [GitHub](https://github.com/abhishekhmuthyala)

---

## 📜 License

This project is licensed under the **MIT License** — feel free to use and modify.

---

## 💡 Future Enhancements

- Add conversation history memory
- Multi-language support
- Frontend dashboard for reviewing suggestions
- Rate-limit and logging improvements
- RAG pipeline optimization (context re-ranking)

---

> ⚙️ *“Smart communication starts with smarter context.”*
