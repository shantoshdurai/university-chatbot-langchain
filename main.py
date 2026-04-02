from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pathlib import Path
import shutil
import logging
import uvicorn
import os

from chatbot import Chatbot, load_system_message_from_json

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="University Chatbot API", version="2.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Initialization ───────────────────────────────────────────────
IS_VERCEL = os.environ.get("VERCEL") == "1"
DATA_DIR = Path("/tmp/data" if IS_VERCEL else "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

# If on Vercel, copy official documents into the ephemeral writable directory
if IS_VERCEL:
    for doc in ["about_university.txt", "academic_calendar.txt", "contact_info.txt", "system_message.json"]:
        src = Path("data") / doc
        dest = DATA_DIR / doc
        if src.exists() and not dest.exists():
            shutil.copy(src, dest)

# Load context from JSON for cleaner customization
SYSTEM_MESSAGE_FILE = Path("system_message.json") if not IS_VERCEL else DATA_DIR / "system_message.json"
system_prompt = load_system_message_from_json(str(Path("system_message.json")))

# Allow images in the ingest pipeline
ALLOWED_SUFFIXES = {".pdf", ".txt", ".md", ".docx", ".jpg", ".jpeg", ".png"}

# Global bot instance dynamically tracking ephemeral or static dir
bot = Chatbot(data_dir=str(DATA_DIR))

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing knowledge base...")
    bot.load_documents()
    logger.info(f"Loaded {len(bot.store)} documents chunks from {DATA_DIR}")

# ── Endpoints ───────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "online",
        "rag_enabled": len(bot.store) > 0,
        "chunks": len(bot.store),
        "vision_model": bot.vision_model
    }

@app.post("/ingest")
async def ingest(files: List[UploadFile] = File(default=[])):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    saved = []
    skipped = []
    for f in files:
        suffix = Path(f.filename).suffix.lower()
        if suffix not in ALLOWED_SUFFIXES:
            skipped.append(f.filename)
            continue
            
        dest = DATA_DIR / f.filename
        with dest.open("wb") as out:
            shutil.copyfileobj(f.file, out)
        saved.append(f.filename)

    # Refresh the vector store after ingestion
    if saved:
        bot.load_documents()

    return {
        "message": f"Successfully ingested {len(saved)} file(s).",
        "ingested": saved,
        "skipped": skipped,
        "total_chunks": len(bot.store)
    }

@app.post("/chat")
async def chat(
    message: str = Form(...),
    mode: str = Form(default="dsu"),
    images: List[UploadFile] = File(default=[]),
):
    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        # If images are attached, read their bytes for direct vision processing
        image_bytes_list = []
        for img in images:
            if img.filename:
                raw = await img.read()
                if raw:
                    image_bytes_list.append(raw)
        
        result = bot.chat(message.strip(), mode=mode, image_bytes_list=image_bytes_list if image_bytes_list else None)
        return {
            "answer": result["answer"],
            "sources": result.get("sources", []),
            "rag_used": len(bot.store) > 0
        }
    except Exception as e:
        logger.error(f"Chat execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear")
async def clear():
    bot.store = []
    return {"message": "Memory cleared for this session (files remain in data/ folder)."}

@app.post("/settings")
async def update_settings(
    groq_api_key: Optional[str] = Form(default=None),
    model: Optional[str] = Form(default=None),
    vision_model: Optional[str] = Form(default=None),
):
    """Update configurations at runtime via frontend."""
    updated = []
    if groq_api_key and groq_api_key.strip():
        os.environ["GROQ_API_KEY"] = groq_api_key.strip()
        bot.api_key = groq_api_key.strip()
        # Re-init OpenAI client with new key
        from openai import OpenAI
        bot.client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=bot.api_key
        )
        updated.append("groq_api_key")
        
    if model and model.strip():
        bot.model = model.strip()
        updated.append("model")
        
    if vision_model and vision_model.strip():
        bot.vision_model = vision_model.strip()
        updated.append("vision_model")
        
    return {"updated_settings": updated, "current_model": bot.model}

import json
import sqlite3
import uuid
from datetime import datetime

# ── Persistent Database Initialization ──────────────────────────
DB_PATH = Path("/tmp/resources.db" if IS_VERCEL else "resources.db")

def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS resources (
                id TEXT PRIMARY KEY,
                title TEXT,
                description TEXT,
                type TEXT,
                content TEXT,
                tags TEXT,
                date TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
    except Exception as e:
        logger.error(f"DB Initialization failed: {e}")
    finally:
        if conn: conn.close()

init_db()

@app.get("/resources")
async def list_resources(type: Optional[str] = None):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        if type:
            cursor.execute("SELECT id, title, description, type, content, tags, date FROM resources WHERE type = ? ORDER BY created_at DESC", (type,))
        else:
            cursor.execute("SELECT id, title, description, type, content, tags, date FROM resources ORDER BY created_at DESC")
        
        rows = cursor.fetchall()
        return [
            {"id": r[0], "title": r[1], "description": r[2], "type": r[3], "content": r[4], "tags": (r[5] or "").split(","), "date": r[6]}
            for r in rows
        ]
    except Exception as e:
        logger.error(f"Failed to list resources: {e}")
        return []
    finally:
        if conn: conn.close()

@app.post("/resources")
async def save_resource(
    title: str = Form(...),
    description: str = Form(...),
    type: str = Form(...), 
    content: str = Form(...), 
    tags: Optional[str] = Form(default="")
):
    try:
        res_id = str(uuid.uuid4())
        date_str = datetime.now().strftime("%Y-%m-%d")
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO resources (id, title, description, type, content, tags, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (res_id, title, description, type, content, tags, date_str)
        )
        conn.commit()
        return {"message": "Resource saved to library", "id": res_id}
    except Exception as e:
        logger.error(f"Failed to save resource: {e}")
        raise HTTPException(status_code=500, detail="Storage failed")
    finally:
        if conn: conn.close()

@app.post("/generate-metadata")
async def generate_metadata(text: str = Form(...)):
    """AI utility to generate a title and description for a resource."""
    prompt = (
        f"Based on this text, generate a JSON object with 'title' (3-5 words) and 'description' (1 concise sentence). "
        f"Focus on academic value.\n\nTEXT: {text[:2000]}"
    )
    result = bot.chat(prompt, mode="chat")
    # Simple extraction (assuming LLM returns JSON or clean text)
    return {"metadata": result["answer"]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
