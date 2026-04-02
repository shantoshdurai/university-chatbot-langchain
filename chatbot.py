import os
import re
import math
import base64
import logging
import json
import uvicorn
from typing import List, Dict, Optional
from io import BytesIO

# Third-party libraries
from dotenv import load_dotenv
from openai import OpenAI
from pypdf import PdfReader
from docx import Document
from PIL import Image

# Setup simple logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def load_system_message_from_json(file_path: str) -> str:
    """Helper to load a custom system prompt from a JSON file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("system_message", "")
    except Exception:
        return "You are a helpful university assistant."

class Chatbot:
    def __init__(self, model: str = "llama-3.3-70b-versatile", vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct", data_dir: str = "data"):
        load_dotenv()
        self.api_key = os.getenv("GROQ_API_KEY", "missing_key")
        if self.api_key == "missing_key":
            logger.warning("GROQ_API_KEY not found in .env file.")
        
        # We use a separate client/model for Vision specifically
        self.client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=self.api_key
        )
        self.model = model
        self.vision_model = vision_model
        self.store: List[Dict] = []
        self.data_dir = data_dir
        
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

    def load_documents(self):
        """Initial data ingestion from the data folder. 
        Differentiates between 'official' university files and 'user' study notes.
        """
        if not os.path.exists(self.data_dir):
            return
            
        self.store = []
        # Define which files are 'official' university admin files
        OFFICIAL_DOCS = ["about_university.txt", "academic_calendar.txt", "contact_info.txt", "system_message.json"]
        
        files = [f for f in os.listdir(self.data_dir) if os.path.isfile(os.path.join(self.data_dir, f))]
        
        for filename in files:
            file_path = os.path.join(self.data_dir, filename)
            is_official = filename in OFFICIAL_DOCS
            try:
                text = self._read_file(file_path)
                if text.strip():
                    self._chunk_and_store(text, filename, is_official=is_official)
                    type_str = "OFFICIAL" if is_official else "STUDY NOTE"
                    logger.info(f"Loaded {type_str}: {filename}")
            except Exception as e:
                logger.error(f"Error loading {filename}: {e}")
        
        logger.info(f"Knowledge Base Synced: {len(self.store)} chunks total.")

    def _read_file(self, file_path: str) -> str:
        """Reads multiple formats: TXT, MD, PDF, DOCX, and now JPG/PNG (OCR via Vision)."""
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        
        elif ext == ".pdf":
            reader = PdfReader(file_path)
            return "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
            
        elif ext == ".docx":
            doc = Document(file_path)
            return "\n".join([p.text for p in doc.paragraphs])
            
        elif ext in [".jpg", ".jpeg", ".png"]:
            return self._ocr_vision(file_path)
            
        return ""

    def _ocr_vision(self, file_path: str) -> str:
        """Uses Groq's Vision model to extract text from handwriting/photos."""
        logger.info(f"Performing Vision OCR on: {os.path.basename(file_path)}")
        try:
            # 1. Prepare Image (resizing slightly can help with token limits)
            with Image.open(file_path) as img:
                # Convert to RGB if needed (removes alpha channel)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                
                # Buffer for base64
                buffered = BytesIO()
                img.save(buffered, format="JPEG", quality=85)
                base64_image = base64.b64encode(buffered.getvalue()).decode('utf-8')

            # 2. Call Groq Vision API
            response = self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "EXTRACT all written text from this image exactly as it appears. If it's a student note, preserve the structure (bullets, headers). Output ONLY the transcribed text."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=1024,
            )
            transcription = response.choices[0].message.content
            logger.info(f"OCR Complete: Extracted {len(transcription)} chars.")
            return f"--- [OCR Content from {os.path.basename(file_path)}] ---\n{transcription}"
            
        except Exception as e:
            logger.error(f"Vision OCR failed: {e}")
            return f"[Error: Could not read image {os.path.basename(file_path)}]"

    def _chunk_and_store(self, text: str, source: str, is_official: bool = False, chunk_size: int = 800):
        """Simple overlap chunking with tags."""
        for i in range(0, len(text), chunk_size - 150):
            chunk = text[i : i + chunk_size]
            self.store.append({
                "content": chunk, 
                "source": source, 
                "is_official": is_official
            })

    def _retrieve_context(self, query: str, mode: str = "dsu", top_k: int = 4) -> List[Dict]:
        """Keyword-based ranking with strict mode filtering."""
        if not self.store: return []
        
        # Determine which "Vault" to search based on mode
        if mode == "exam" or mode == "chat":
            # EXAM/CHAT MODE: ONLY look at user-uploaded files (not official docs)
            docs_to_search = [d for d in self.store if not d.get("is_official", False)]
        elif mode == "dsu":
            # DSU MODE: Look at official university documents
            docs_to_search = [d for d in self.store if d.get("is_official", False)]
        else:
            return []

        if not docs_to_search: return []

        query_words = set(re.findall(r'\w+', query.lower()))
        scored = []
        for doc in docs_to_search:
            content_lower = doc["content"].lower()
            score = sum(1 for word in query_words if word in content_lower)
            if score > 0:
                scored.append((score, doc))
        
        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]

    def get_response(self, user_query: str, mode: str = "dsu"):
        """Main chat logic with hard data partitions and smart fallback."""
        context_docs = self._retrieve_context(user_query, mode=mode)
        
        # Smart Fallback for Exam Mode: If no match but user notes exist, pull recent ones
        user_notes_exist = any(not d.get("is_official", False) for d in self.store)
        if mode == "exam" and not context_docs and user_notes_exist:
            # Just pull the last 4 chunks added by the user
            context_docs = [d for d in self.store if not d.get("is_official", False)][-4:]

        context_str  = "\n---\n".join([f"Source: {d['source']}\n{d['content']}" for d in context_docs])
        sources       = list(set([d["source"] for d in context_docs]))

        if mode == "chat":
            system_msg = (
                "You are Academix Casual companion. You help students with general brainstorming and inquiries. "
                "If study notes context is provided below, use it to answer the user's questions accurately while remaining conversational.\n\n"
                f"STUDY NOTES CONTEXT:\n{context_str}"
            )

        elif mode == "exam":
            # Check if we actually have user notes in the system at all
            has_notes = user_notes_exist or bool(context_str.strip())
            EXAM_SYSTEM_PROMPT = """You are the 'Academix Exam Expert', specifically tuned for DSU Trichy's curriculum. 

Your goal is to help students prepare for their university assessments. You must always ask the student which exam they are preparing for if they haven't mentioned it:
1. **CAT 1 or CAT 2**: (50 Marks | 1:30 hrs). Pattern: 10 x 2-mark questions + 2 x 15-mark questions.
2. **Model Exam**: (100 Marks | 3:00 hrs). **CRITICAL**: Remind students that CAT 1 and CAT 2 questions are highly likely to repeat in the Model exam. Give those priority.
3. **End-Semester**: (100 Marks | 3:00 hrs). A comprehensive combination of all units.

- If they ask for a **2-mark answer**: Provide 2-3 precise bullet points or a single clear definition (approx 30-40 words).
- If they ask for a **15-mark answer**: Provide a structured essay with: Introduction, Detailed Sub-headings, Diagram description (if applicable), and a Conclusion.
- Use the student's uploaded notes as the primary source. If they ask about a topic NOT in their notes, explain it broadly but clearly."""
            system_msg = (
                EXAM_SYSTEM_PROMPT + "\n\n" + (f"STUDY NOTES CONTEXT:\n{context_str}" if has_notes else "IMPORTANT: No study notes have been uploaded yet. Tell the student to use the + button to upload notes first.")
            )

        else: # dsu
            system_msg = (
                "You are Academix DSU Assistant. You ONLY have access to official DSU university docs. "
                "You CANNOT see the student's study notes here. "
                "If asked about study notes, say: 'I don't see your study notes here. Please switch to **Exam Mode** to quiz on your uploads.'\n\n"
                "DSU UNIVERSITY CONTEXT:\n" + context_str
            )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user",   "content": user_query}
                ],
                temperature=0.4 if mode == "dsu" else 0.7
            )
            return {
                "answer":  response.choices[0].message.content,
                "sources": sources if mode != "chat" else []
            }
        except Exception as e:
            logger.error(f"Chat API Error: {e}")
            return {"answer": f"Error: {str(e)}", "sources": []}

    def vision_chat(self, user_query: str, image_bytes_list: list, mode: str = "chat"):
        """Send images directly to the vision model with the user's question.
        This gives the AI real eyes — it sees the image and answers about it.
        """
        # Build the user content array with text + images
        user_content = [{"type": "text", "text": user_query}]
        
        for img_bytes in image_bytes_list:
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
            })
        
        system_msg = (
            "You are Academix, a smart university assistant. The student has attached image(s) to their message. "
            "Analyze the image(s) carefully and respond to their question. "
            "If the image contains notes, diagrams, or text — read and explain it. "
            "If it's a screenshot of a problem — solve it. Be helpful, structured, and academic."
        )
        
        try:
            response = self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_content}
                ],
                max_tokens=2048,
                temperature=0.5
            )
            return {
                "answer": response.choices[0].message.content,
                "sources": ["📷 Attached Image(s)"]
            }
        except Exception as e:
            error_str = str(e)
            logger.error(f"Vision Chat Error: {error_str}")
            
            # If the vision model is blocked/unavailable, fall back to text-only with a helpful message
            if "permission" in error_str.lower() or "decommissioned" in error_str.lower() or "not found" in error_str.lower():
                # Fall back to text model acknowledging the image
                fallback_msg = (
                    f"The user attached {len(image_bytes_list)} image(s) with their message but the vision model is currently unavailable. "
                    f"Acknowledge that you received image attachments but explain you cannot view them right now. "
                    f"Still try to help with their text query. Suggest they describe the image content to you instead."
                )
                try:
                    response = self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": fallback_msg},
                            {"role": "user", "content": user_query}
                        ],
                        temperature=0.7
                    )
                    return {
                        "answer": response.choices[0].message.content + "\n\n> ⚙️ *Vision model is currently unavailable. To enable image analysis, go to [console.groq.com/settings/limits](https://console.groq.com/settings/limits) and enable the Llama 4 Scout model.*",
                        "sources": ["📷 Image received (vision offline)"]
                    }
                except:
                    pass
            
            return {"answer": f"Error processing image: {error_str}", "sources": []}

    def chat(self, query: str, mode: str = "dsu", image_bytes_list: list = None):
        """Main entry point. Routes to vision model if images are attached."""
        if image_bytes_list:
            return self.vision_chat(query, image_bytes_list, mode=mode)
        return self.get_response(query, mode=mode)
