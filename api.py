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
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

# Load context from JSON for cleaner customization
SYSTEM_MESSAGE_FILE = Path("system_message.json")
system_prompt = load_system_message_from_json(str(SYSTEM_MESSAGE_FILE))

# Allow images in the ingest pipeline
ALLOWED_SUFFIXES = {".pdf", ".txt", ".md", ".docx", ".jpg", ".jpeg", ".png"}

# Global bot instance
bot = Chatbot()

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
):
    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        result = bot.chat(message.strip(), mode=mode)
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

# Resource DB initialization
RESOURCES_FILE = Path("resources.json")
if not RESOURCES_FILE.exists():
    RESOURCES_FILE.write_text(json.dumps([]))

@app.get("/resources")
async def list_resources(type: Optional[str] = None):
    try:
        data = json.loads(RESOURCES_FILE.read_text())
        if type:
            data = [r for r in data if r.get("type") == type]
        return data
    except Exception as e:
        logger.error(f"Failed to list resources: {e}")
        return []

@app.post("/resources")
async def save_resource(
    title: str = Form(...),
    description: str = Form(...),
    type: str = Form(...), # "note" or "chat"
    content: str = Form(...), # File filename or full chat JSON
    tags: Optional[str] = Form(default="")
):
    try:
        db = json.loads(RESOURCES_FILE.read_text())
        new_resource = {
            "id": len(db) + 1,
            "title": title,
            "description": description,
            "type": type,
            "content": content,
            "tags": tags.split(","),
            "date": "2026-03-31" # Automated date
        }
        db.append(new_resource)
        RESOURCES_FILE.write_text(json.dumps(db, indent=4))
        return {"message": "Resource saved to library", "resource": new_resource}
    except Exception as e:
        logger.error(f"Failed to save resource: {e}")
        raise HTTPException(status_code=500, detail="Storage failed")

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
