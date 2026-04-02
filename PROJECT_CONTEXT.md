# Academix University Portal — Project Context

> **Last Updated:** April 2, 2026  
> **Purpose:** Handoff document for resuming work with any AI assistant (Claude, Gemini, etc.)

---

## 📋 Project Overview

**Academix** is a full-stack AI-powered university chatbot built for DSU Trichy. It features a React frontend and a Python FastAPI backend powered by Groq's LLM API.

- **Live URL:** https://university-chatbot-langchain.vercel.app
- **GitHub:** https://github.com/shantoshdurai/university-chatbot-langchain
- **Owner:** Shantosh Durai (@shantoshdurai)

---

## 🏗️ Architecture

```
university-chatbot-langchain/
├── main.py                  # FastAPI backend (renamed from api.py)
├── chatbot.py               # AI logic: RAG, Vision, Chat modes
├── chatbot-frontend/        # React app (Create React App)
│   ├── src/App.js           # Main UI component
│   ├── src/App.css          # All styles
│   └── build/               # Production build
├── api/
│   └── index.py             # Vercel serverless entrypoint (imports from main.py)
├── data/                    # Knowledge base files (official DSU docs)
├── vercel.json              # Vercel deployment config
├── requirements.txt         # Python dependencies
├── system_message.json      # Custom system prompt
└── .env                     # GROQ_API_KEY (not committed)
```

### Key Design Decisions
- **main.py** (not api.py) — renamed to avoid Python import collision with the `api/` directory on Vercel
- **api/index.py** — Vercel serverless entrypoint that imports and mounts the FastAPI app from `main.py` under `/api`
- Frontend uses `const API = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000'`

---

## 🤖 AI Models (Groq)

| Purpose | Model ID | Notes |
|---------|----------|-------|
| **Text Chat** | `llama-3.3-70b-versatile` | Production model, works great |
| **Vision/Images** | `meta-llama/llama-4-scout-17b-16e-instruct` | Only vision model on Groq as of April 2026 |
| **OLD Vision (DEAD)** | ~~`llama-3.2-11b-vision-preview`~~ | **Decommissioned** — do NOT use |

### ⚠️ Important: Model Permissions
The Llama 4 Scout model must be **manually enabled** in your Groq org settings:
→ https://console.groq.com/settings/limits → Check `meta-llama/llama-4-scout-17b-16e-instruct` → Save

---

## 🔑 Environment Variables

### Backend (.env at repo root)
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

### Vercel (set in dashboard)
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
VERCEL=1  (auto-set by Vercel)
```

---

## 💬 Chat Modes

The app has 3 chat modes toggled in the UI:

| Mode | ID | Behavior |
|------|----|----------|
| **DSU Portal** | `dsu` | Only searches official university docs (data/*.txt) |
| **Exam Prep** | `exam` | Only searches user-uploaded study notes |
| **General** | `chat` | Can access user-uploaded notes + general conversation |

---

## 📷 Vision Architecture (NEW — April 2, 2026)

### How Image Processing Works
1. User attaches image(s) via the `+` button in chat
2. Frontend sends images **directly with the chat message** as `images` FormData fields to `/api/chat`
3. Backend detects images → routes to `vision_chat()` method
4. `vision_chat()` sends base64 images + user query to **Llama 4 Scout** vision model
5. AI analyzes the image and responds with content about what it sees

### Fallback Behavior
If the vision model is unavailable (permissions error, decommissioned, etc.):
- Falls back to text-only model  
- Acknowledges image was received but can't be viewed
- Suggests user describe the image content instead
- Shows a tip to enable the model in Groq settings

### Non-Image Files (PDFs, DOCX, TXT)
- These are ingested via `/api/ingest` into the knowledge base
- Chunked and stored in `bot.store` (in-memory list)
- Retrieved via keyword matching during chat

---

## 🚀 Vercel Deployment — FINALIZED SETTINGS

The Vercel project is configured to handle the Python backend AND the React frontend via `vercel.json` directly.

### ⚙️ Dashboard Project Settings
1.  **Framework Preset:** Set to **"Other"**.
2.  **Root Directory:** Set to **Empty** or **`./`**.

### 🛠️ vercel.json (Final Working Config)
```json
{
  "buildCommand": "cd chatbot-frontend && npm install && npm run build",
  "outputDirectory": "chatbot-frontend/build",
  "rewrites": [
    { "source": "/api/((.*))", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 🔨 Build Process
- No custom root `package.json` scripts are needed anymore.
- Vercel reads the `buildCommand` and `outputDirectory` directly from `vercel.json`.
- This avoids Linux/Windows shell command conflicts (`rm`, `mv`, etc.).

---

## 🏃 Running Locally

```bash
# Terminal 1 — Backend
python main.py
# Runs on http://localhost:8000

# Terminal 2 — Frontend  
cd chatbot-frontend
npm start
# Runs on http://localhost:3000
```

Or use `start_locally.bat` which opens both in separate windows.

---

## 📂 Other Repositories

| Repo | Purpose |
|------|---------|
| `shantoshdurai/shantoshdurai` | GitHub profile README (skills grid, stats, activity graph) |
| `shantoshdurai/shantoshdurai.github.io` | Portfolio website (GitHub Pages) |
| `shantoshdurai/ClassNow-app` | Flutter university class management app |
| `shantoshdurai/flower-species-classifier` | ML image classifier (Streamlit + Hugging Face) |

---

## 🐛 Known Issues & History

### Ghost Data ("unit4 evs")
- Was a test file previously in `data/` that got cached in the in-memory store
- Fix: Delete file + restart server (kills the in-memory cache)
- The file is now removed from the repo

### GitHub Stats Card Broken
- `github-readme-stats.vercel.app` returns 503 intermittently
- Replaced with `github-readme-activity-graph` (contribution line graph)
- Streak card from `github-readme-streak-stats.herokuapp.com` still works

### Vision Model Decommissioned
- `llama-3.2-11b-vision-preview` was killed by Groq ~April 2026
- Replaced with `meta-llama/llama-4-scout-17b-16e-instruct`
- Must be enabled in Groq org settings

---

## 🔧 Quick Reference Commands

```bash
# Check Groq models available
python -c "import os; from dotenv import load_dotenv; load_dotenv(); from openai import OpenAI; c = OpenAI(base_url='https://api.groq.com/openai/v1', api_key=os.getenv('GROQ_API_KEY')); [print(m.id) for m in c.models.list().data]"

# Test backend health locally
python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read().decode())"

# Kill stuck process on port 8000
Get-NetTCPConnection -LocalPort 8000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Push to GitHub (triggers Vercel redeploy)
git add .; git commit -m "message"; git push
```
