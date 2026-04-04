# Academix — AI University Portal

<div align="center">

![Academix Portal](images_readme/home.png)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Academix%20Portal-4f46e5?style=for-the-badge&logo=vercel&logoColor=white)](https://university-chatbot-langchain.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-shantoshdurai-181717?style=for-the-badge&logo=github)](https://github.com/shantoshdurai/university-chatbot-langchain)
[![Python](https://img.shields.io/badge/Python-FastAPI-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)

*A production-ready AI academic portal built for DSU Trichy — chat with your notes, prep for exams, and share resources with your class.*

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Chat Modes](#chat-modes)
6. [Quick Setup](#quick-setup)
7. [Environment Variables](#environment-variables)
8. [Contact](#contact)

---

## Overview

Academix is a full-stack AI academic portal purpose-built for university students at **DSU Trichy**. Upload your study notes, ask questions against your material, get DSU-pattern exam answers (CAT 1 / CAT 2), and share resources with your classmates — all in one place.

- **Live URL:** https://university-chatbot-langchain.vercel.app
- **Auth:** Supabase (email/password, persistent sessions)
- **AI:** Groq API — Llama 3.3 70B (text) + Llama 4 Scout (vision)
- **Deployed on:** Vercel (serverless Python backend + React frontend)

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-format RAG** | Upload PDF, DOCX, or TXT files — ask questions against your own notes |
| **Vision / Image OCR** | Attach handwritten notes or diagrams directly in chat; Llama 4 Scout reads them |
| **DSU Exam Prep** | CAT 1 / CAT 2 pattern recognition — auto-generates 2-mark and 15-mark answers |
| **Persistent Chat History** | All sessions saved per-user in Supabase; resumable at any time |
| **Resource Library** | Save chats and notes; browse your personal collection with timestamps |
| **Community Sharing** | Share resources to the Community tab; classmates can find and save them |
| **Knowledge Base (Admin)** | Admin-only official DSU document uploads powering the DSU Portal mode |
| **Super Admin Panel** | Delete any resource, manage the knowledge base, oversee community content |
| **Dark / Light Mode** | Full theme toggle, persisted per session |
| **Mobile-First UI** | Responsive layout with fluid animations optimized for phones |

---

## Tech Stack

### Frontend
- **React.js** (Create React App)
- **CSS3** — custom design system with dark/light theme variables
- **Supabase JS SDK** — auth, database reads/writes, storage uploads

### Backend
- **Python 3** + **FastAPI** — REST API (`/api/chat`, `/api/ingest`, `/api/history`, etc.)
- **LangChain** — document loading, text splitting, retrieval chain
- **Supabase Python SDK** — server-side data access with service role key
- **Vercel Serverless** — `api/index.py` mounts the FastAPI app for edge deployment

### AI Models (via Groq API)
| Model | Use |
|-------|-----|
| `llama-3.3-70b-versatile` | All text chat modes |
| `meta-llama/llama-4-scout-17b-16e-instruct` | Vision — image & handwriting analysis |

### Database & Storage (Supabase)
| Table / Bucket | Purpose |
|----------------|---------|
| `chat_history` | Per-user chat sessions (RLS: own rows only) |
| `resources` | Shared resource library (read-all, authenticated insert) |
| `feedback` | User feedback submissions |
| `uploads` bucket | User study file uploads |
| `knowledge-base` bucket | Admin-only official DSU documents |

---

## Architecture

```
university-chatbot-langchain/
├── main.py                  # FastAPI app — all routes
├── chatbot.py               # AI core: RAG, Vision, chat modes
├── api/
│   └── index.py             # Vercel serverless entrypoint
├── chatbot-frontend/
│   ├── src/
│   │   ├── App.js           # Main UI + routing logic
│   │   ├── AuthView.js      # Login / signup flow
│   │   └── supabaseClient.js
│   └── build/               # Production build (generated)
├── data/                    # Official DSU knowledge base docs
├── vercel.json              # Build + rewrite config
├── requirements.txt
└── system_message.json      # Custom AI system prompt
```

**Key design:** Vercel builds the React frontend and serves it as static files, while `api/index.py` handles all `/api/*` requests as a Python serverless function — no separate backend host needed.

---

## Chat Modes

| Mode | Behavior |
|------|----------|
| **DSU Portal** | Searches official DSU documents only (`data/*.txt`) |
| **Exam Prep** | Searches your uploaded study notes; formats for CAT pattern answers |
| **General** | Access uploaded notes + open-ended conversation |

Switch modes anytime with the toggle in the chat header.

---

## Quick Setup

### 1. Clone & Backend

```bash
git clone https://github.com/shantoshdurai/university-chatbot-langchain.git
cd university-chatbot-langchain

python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env — add GROQ_API_KEY and Supabase credentials

python main.py
# Backend runs on http://localhost:8000
```

### 2. Frontend

```bash
cd chatbot-frontend
npm install
npm start
# Frontend runs on http://localhost:3000
```

Or run both at once on Windows:
```bash
start_locally.bat
```

---

## Environment Variables

### Backend `.env`
```env
GROQ_API_KEY=gsk_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

### Vercel Dashboard
Set the same three variables in **Project Settings → Environment Variables**.

> **Note:** The Llama 4 Scout vision model must be manually enabled in your Groq org:  
> console.groq.com → Settings → Limits → enable `meta-llama/llama-4-scout-17b-16e-instruct`

---

## Contact

Built by **Shantosh Durai** — DSU Trichy

- GitHub: [@shantoshdurai](https://github.com/shantoshdurai)
- Portfolio: [shantoshdurai.github.io](https://shantoshdurai.github.io)
- Email: santoshp123steam@gmail.com
