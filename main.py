from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pathlib import Path
import shutil
import logging
import uvicorn
import os
import uuid
import json
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
KB_BUCKET = "knowledge-base"

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

    # Load official knowledge-base files (uploaded via Settings)
    try:
        kb_files = supabase.storage.from_(KB_BUCKET).list()
        for f in kb_files:
            fname = f.get("name", "")
            if not fname or Path(fname).suffix.lower() not in ALLOWED_SUFFIXES:
                continue
            file_bytes = supabase.storage.from_(KB_BUCKET).download(fname)
            text = bot._read_bytes(fname, file_bytes)
            if text.strip():
                bot._chunk_and_store(text, fname, is_official=True)
            logger.info(f"Loaded KB doc: {fname}")
    except Exception as e:
        logger.warning(f"Could not load knowledge-base files: {e}")

    # Load admin text knowledge entries from Supabase
    try:
        rows = supabase.table("ai_knowledge").select("id,title,content").eq("is_active", True).execute()
        for row in (rows.data or []):
            text = f"[Admin Knowledge: {row.get('title','Untitled')}]\n{row.get('content','')}"
            if text.strip():
                bot._chunk_and_store(text, f"admin_text:{row['id']}", is_official=True)
        logger.info(f"Loaded {len(rows.data or [])} admin text knowledge entries")
    except Exception as e:
        logger.warning(f"Could not load ai_knowledge table (run the SQL to create it): {e}")

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
    mode: str = Form(default="chat"),
    images: List[UploadFile] = File(default=[]),
    history: Optional[str] = Form(default="[]"),
):
    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        try:
            history_list = json.loads(history or "[]")
        except Exception:
            history_list = []

        image_bytes_list = []
        for img in images:
            if img.filename:
                raw = await img.read()
                if raw:
                    image_bytes_list.append(raw)

        result = bot.chat(
            message.strip(),
            mode=mode,
            image_bytes_list=image_bytes_list if image_bytes_list else None,
            history=history_list if history_list else None,
        )
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
    token: str = Form(...),
    groq_api_key: Optional[str] = Form(default=None),
    model: Optional[str] = Form(default=None),
    vision_model: Optional[str] = Form(default=None),
):
    check_admin(token)
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

# ── Admin Security ───────────────────────────────────────────────────
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "super-secret-academix-key")

def check_admin(key: str):
    if key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Admin access required")

# ── Resources (Supabase Postgres) ─────────────────────────────────────

@app.get("/resources")
async def list_resources(user_id: Optional[str] = None, type: Optional[str] = None, is_public: Optional[bool] = None):
    try:
        query = supabase.table("resources").select("*").order("created_at", desc=True)
        if is_public is True:
            # Community tab: shows all public resources
            query = query.eq("is_public", True)
        elif user_id:
            # My Resources tab: shows only current user's private/public resources
            query = query.eq("user_id", user_id)
        
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
    user_id: str = Form(...),
    shared_by: Optional[str] = Form(default=""),
    tags: Optional[str] = Form(default=""),
    is_public: bool = Form(default=False),
):
    try:
        row = {
            "title": title,
            "description": description,
            "type": type,
            "content": content,
            "user_id": user_id,
            "shared_by": shared_by or "",
            "tags": tags or "",
            "is_public": is_public,
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        result = supabase.table("resources").insert(row).execute()
        return {"message": "Resource saved to library", "id": result.data[0]["id"]}
    except Exception as e:
        logger.error(f"Failed to save resource: {e}")
        raise HTTPException(status_code=500, detail="Storage failed")

ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "super-secret-academix-key")

@app.delete("/resources/{resource_id}")
async def delete_resource(resource_id: str, user_id: Optional[str] = None, admin_token: Optional[str] = None):
    try:
        query = supabase.table("resources").delete().eq("id", resource_id)
        if admin_token == ADMIN_SECRET:
            pass  # admin bypass — no ownership filter
        elif user_id:
            query = query.eq("user_id", user_id)
        else:
            raise HTTPException(status_code=400, detail="user_id or admin_token required")
        query.execute()
        return {"message": "Resource successfully deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete resource: {e}")
        raise HTTPException(status_code=500, detail="Deletion failed")

@app.patch("/resources/{resource_id}/share")
async def share_resource(resource_id: str, user_id: str = Form(...), is_public: bool = Form(default=True)):
    try:
        supabase.table("resources").update({"is_public": is_public}).eq("id", resource_id).eq("user_id", user_id).execute()
        return {"message": "Resource visibility updated", "is_public": is_public}
    except Exception as e:
        logger.error(f"Failed to share resource: {e}")
        raise HTTPException(status_code=500, detail="Update failed")

@app.get("/kb/list")
async def kb_list():
    try:
        files = supabase.storage.from_(KB_BUCKET).list()
        return [{"name": f.get("name",""), "size": f.get("metadata",{}).get("size",0)} for f in files if f.get("name")]
    except Exception as e:
        logger.warning(f"Could not list KB files: {e}")
        return []

# ── Admin Text Knowledge (ai_knowledge table) ──────────────────────────

@app.get("/kb/texts")
async def kb_texts_list():
    """List all admin text knowledge entries."""
    try:
        result = supabase.table("ai_knowledge").select("id,title,content,is_active,created_at").order("created_at", desc=True).execute()
        return result.data or []
    except Exception as e:
        logger.warning(f"Could not list ai_knowledge: {e}")
        return []

@app.post("/kb/text")
async def kb_text_add(token: str = Form(...), title: str = Form(...), content: str = Form(...)):
    """Add a text knowledge entry. Immediately loads it into the bot's memory."""
    check_admin(token)
    if not content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty.")
    try:
        result = supabase.table("ai_knowledge").insert({
            "title": title.strip() or "Untitled",
            "content": content.strip(),
            "is_active": True
        }).execute()
        row = result.data[0]
        # Load into live memory immediately — no restart needed
        text = f"[Admin Knowledge: {row['title']}]\n{row['content']}"
        bot._chunk_and_store(text, f"admin_text:{row['id']}", is_official=True)
        return {"message": "Knowledge entry added and loaded into AI.", "id": row["id"]}
    except Exception as e:
        logger.error(f"Failed to add text knowledge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/kb/text/{entry_id}")
async def kb_text_delete(entry_id: int, token: str = Form(...)):
    """Delete a text knowledge entry and remove it from live memory."""
    check_admin(token)
    try:
        supabase.table("ai_knowledge").delete().eq("id", entry_id).execute()
        # Remove from bot's in-memory store
        source_key = f"admin_text:{entry_id}"
        bot.store = [d for d in bot.store if d.get("source") != source_key]
        return {"message": "Knowledge entry deleted."}
    except Exception as e:
        logger.error(f"Failed to delete text knowledge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-metadata")
async def generate_metadata(text: str = Form(...)):
    prompt = (
        f"Based on this text, generate a JSON object with 'title' (3-5 words) and 'description' (1 concise sentence). "
        f"Focus on academic value.\n\nTEXT: {text[:2000]}"
    )
    result = bot.chat(prompt, mode="chat")
    return {"metadata": result["answer"]}

@app.post("/kb/ingest")
async def kb_ingest(token: str = Form(...), files: List[UploadFile] = File(default=[])):
    """Upload files to the permanent AI knowledge base (is_official=True, DSU mode)."""
    check_admin(token)
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    saved = []
    for f in files:
        suffix = Path(f.filename).suffix.lower()
        if suffix not in ALLOWED_SUFFIXES:
            continue
        file_bytes = await f.read()
        try:
            supabase.storage.from_(KB_BUCKET).upload(
                path=f.filename, file=file_bytes, file_options={"upsert": "true"}
            )
        except Exception as e:
            logger.warning(f"KB storage upload issue for {f.filename}: {e}")
        text = bot._read_bytes(f.filename, file_bytes)
        if text.strip():
            bot._chunk_and_store(text, f.filename, is_official=True)
        saved.append(f.filename)
    return {"message": f"Added {len(saved)} file(s) to AI Knowledge Base.", "files": saved}

# ── Exam Papers ───────────────────────────────────────────────────────

@app.post("/exam-papers")
async def upload_exam_paper(
    files: List[UploadFile] = File(default=[]),
    subject: str = Form(default=""),
    semester: str = Form(default=""),
    year: str = Form(default=""),
):
    """Upload exam question papers. OCR + store in KB so AI learns, save as browsable resource."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    results = []
    for f in files:
        suffix = Path(f.filename).suffix.lower()
        if suffix not in ALLOWED_SUFFIXES:
            continue
        file_bytes = await f.read()

        # 1. Upload to KB bucket so AI learns permanently
        storage_name = f"exam_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{f.filename}"
        try:
            supabase.storage.from_(KB_BUCKET).upload(
                path=storage_name, file=file_bytes, file_options={"upsert": "true"}
            )
        except Exception as e:
            logger.warning(f"Exam paper storage upload issue: {e}")

        # 2. Extract text (OCR for images, parse for PDFs)
        text = bot._read_bytes(f.filename, file_bytes)
        if text.strip():
            bot._chunk_and_store(text, storage_name, is_official=True)

        # 3. Save as a browsable resource (auto-public)
        title = subject or f.filename.rsplit('.', 1)[0]
        desc_parts = []
        if subject: desc_parts.append(subject)
        if semester: desc_parts.append(f"Sem {semester}")
        if year: desc_parts.append(year)
        description = " | ".join(desc_parts) if desc_parts else "Exam question paper"

        row = {
            "title": title,
            "description": description,
            "type": "exam_paper",
            "content": text[:10000],  # Store extracted text (truncate if huge)
            "tags": ",".join(filter(None, [subject, semester, year])),
            "date": datetime.now().strftime("%Y-%m-%d"),
        }
        try:
            row["is_public"] = True
            supabase.table("resources").insert(row).execute()
        except Exception:
            row.pop("is_public", None)
            supabase.table("resources").insert(row).execute()

        results.append({"filename": f.filename, "extracted_chars": len(text), "title": title})

    return {"message": f"Uploaded {len(results)} exam paper(s). AI is now learning from them.", "papers": results}

@app.get("/exam-papers")
async def list_exam_papers():
    """List all exam papers from resources table."""
    try:
        try:
            result = supabase.table("resources").select("id,title,description,type,content,tags,date,is_public").eq("type", "exam_paper").order("created_at", desc=True).execute()
        except Exception:
            result = supabase.table("resources").select("id,title,description,type,content,tags,date").eq("type", "exam_paper").order("created_at", desc=True).execute()
        rows = result.data or []
        for r in rows:
            raw_tags = r.get("tags") or ""
            r["tags"] = [t.strip() for t in raw_tags.split(",")] if raw_tags else []
        return rows
    except Exception as e:
        logger.error(f"Failed to list exam papers: {e}")
        return []

@app.post("/feedback")
async def save_feedback(message: str = Form(...)):
    try:
        supabase.table("feedback").insert({"message": message}).execute()
    except Exception as e:
        logger.warning(f"Feedback save failed: {e}")
    return {"message": "Feedback received."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
