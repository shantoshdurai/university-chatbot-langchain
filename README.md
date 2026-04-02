# Academix — AI University Portal

![Academix Portal Dashboard](images_readme/home.png)

### 🌍 **[Live Demo: Try Academix Portal](https://university-chatbot-langchain.vercel.app)**

---

### 📋 **Table of Contents**
1. [Overview](#overview)
2. [✨ Key Features](#✨-key-features)
3. [🛠️ Tech Stack](#🛠️-tech-stack)
4. [🚀 Quick Setup](#🚀-quick-setup)
5. [📬 Contact & Creator](#📬-contact--creator)

---

## Overview
A powerful, production-ready AI academic portal built for university environments. Academix helps students parse complex PDF documents, process handwritten notes via OCR, and receive intelligent, DSU-specific exam preparation guidance (CAT 1 / CAT 2 pattern recognition).

## ✨ Key Features
- 📚 **Multi-Format Document RAG**: Seamlessly upload and query PDFs, TXTs, and DOCX files.
- 👁️ **Vision OCR Module**: Instantly reads and extracts text from handwritten notes (JPG/PNG).
- 🧠 **Contextual AI Modes**: Switch between specialized modes:
  - **Exam Prep**: Optimized for 2-mark and 15-mark university answers.
  - **General Research**: Open workspace for academic brainstorming.
  - **DSU Portal**: Administrative-focused queries and knowledge base.
- 🎨 **Minimalist Premium UI**: Fluid animations, seamless dark/light modes, and robust mobile support.
- 🗄️ **Persistent Resource Library**: Automatically saves chats, extracts metadata, and securely stores academic resources.

## 🛠️ Tech Stack
- **Frontend**: React.js, Context API, CSS3 (Custom Design System)
- **Backend**: Python, FastAPI, SQLite
- **Intelligence**: LangChain, Groq API (Llama-3.3-70b/Llama-3.2-11b-vision-preview)
- **Deployment**: Vercel (Frontend) & Render (Backend Fast API)

---

## 🚀 Quick Setup

### 1. Backend (FastAPI)
```bash
# Clone the repository
git clone https://github.com/shantoshdurai/university-chatbot-langchain.git
cd university-chatbot-langchain

# Setup virtual environment and install dependencies
python -m venv venv
# On Windows: .\venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt

# Setup API Key
cp .env.example .env
# Edit .env and supply your GROQ_API_KEY from console.groq.com

# Start the local server
python main.py
```

### 2. Frontend (React)
```bash
# Navigate to the frontend directory
cd chatbot-frontend

# Install node modules
npm install

# Start the development server
npm start
```

## 📬 Contact & Creator
Built with ❤️ by **Shantosh Durai**
- GitHub: [@shantoshdurai](https://github.com/shantoshdurai)
- Portfolio: [shantoshdurai.github.io](https://shantoshdurai.github.io)
