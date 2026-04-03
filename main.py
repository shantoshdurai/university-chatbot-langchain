from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pathlib import Path
import shutil
import logging
import uvicorn
import os
import uuid
from datetime import datetime

from chatbot import Chatbot, load_system_message_from_json

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="University Chatbot API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase ──────────────────────────────────────────────────────────
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
BUCKET = "uploads"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Initialization ────────────────────────────────────────────────────
IS_VERCEL = os.environ.get("VERCEL") == "1"
DATA_DIR = Path("/tmp/data" if IS_VERCEL else "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_SUFFIXES = {".pdf", ".txt", ".md", ".docx", ".jpg", ".jpeg", ".png"}

bot = Chatbot(data_dir=str(DATA_DIR))

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing knowledge base...")
    bot.load_documents()  # Official docs bundled in repo

    # Load user-uploaded files from Supabase Storage
    try:
        files = supabase.storage.from_(BUCKET).list()
        for f in files:
            fname = f.get("name", "")
            if not fname or Path(fname).suffix.lower() not in ALLOWED_SUFFIXES:
                continue
            file_bytes = supabase.storage.from_(BUCKET).download(fname)
            bot.load_document_from_bytes(fname, file_bytes)
            logger.info(f"Loaded from Supabase Storage: {fname}")
    except Exception as e:
        logger.warning(f"Could not load files from Supabase Storage: {e}")

    logger.info(f"Total chunks in memory: {len(bot.store)}")

# ── Endpoints ─────────────────────────────────────────────────────────

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

        file_bytes = await f.read()

        # Save to Supabase Storage (persists across deploys & cold starts)
        try:
            supabase.storage.from_(BUCKET).upload(
                path=f.filename,
                file=file_bytes,
                file_options={"upsert": "true"}
            )
        except Exception as e:
            logger.warning(f"Storage upload issue for {f.filename}: {e}")

        # Load into in-memory RAG store for this session
        bot.load_document_from_bytes(f.filename, file_bytes)
        saved.append(f.filename)

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
    # Keep official docs, remove user study notes from memory
    bot.store = [d for d in bot.store if d.get("is_official", False)]
    return {"message": "Study notes cleared from memory (files remain in Supabase Storage)."}

@app.post("/settings")
async def update_settings(
    groq_api_key: Optional[str] = Form(default=None),
    model: Optional[str] = Form(default=None),
    vision_model: Optional[str] = Form(default=None),
):
    updated = []
    if groq_api_key and groq_api_key.strip():
        os.environ["GROQ_API_KEY"] = groq_api_key.strip()
        bot.api_key = groq_api_key.strip()
        from openai import OpenAI
        bot.client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=bot.api_key)
        updated.append("groq_api_key")
    if model and model.strip():
        bot.model = model.strip()
        updated.append("model")
    if vision_model and vision_model.strip():
        bot.vision_model = vision_model.strip()
        updated.append("vision_model")
    return {"updated_settings": updated, "current_model": bot.model}

# ── Resources (Supabase Postgres) ─────────────────────────────────────

@app.get("/resources")
async def list_resources(type: Optional[str] = None):
    try:
        query = supabase.table("resources").select("id,title,description,type,content,tags,date").order("created_at", desc=True)
        if type:
            query = query.eq("type", type)
        result = query.execute()
        rows = result.data or []
        for r in rows:
            raw_tags = r.get("tags") or ""
            r["tags"] = [t.strip() for t in raw_tags.split(",")] if raw_tags else []
        return rows
    except Exception as e:
        logger.error(f"Failed to list resources: {e}")
        return []

@app.post("/resources")
async def save_resource(
    title: str = Form(...),
    description: str = Form(...),
    type: str = Form(...),
    content: str = Form(...),
    tags: Optional[str] = Form(default="")
):
    try:
        result = supabase.table("resources").insert({
            "title": title,
            "description": description,
            "type": type,
            "content": content,
            "tags": tags or "",
            "date": datetime.now().strftime("%Y-%m-%d")
        }).execute()
        return {"message": "Resource saved to library", "id": result.data[0]["id"]}
    except Exception as e:
        logger.error(f"Failed to save resource: {e}")
        raise HTTPException(status_code=500, detail="Storage failed")

@app.post("/generate-metadata")
async def generate_metadata(text: str = Form(...)):
    prompt = (
        f"Based on this text, generate a JSON object with 'title' (3-5 words) and 'description' (1 concise sentence). "
        f"Focus on academic value.\n\nTEXT: {text[:2000]}"
    )
    result = bot.chat(prompt, mode="chat")
    return {"metadata": result["answer"]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
