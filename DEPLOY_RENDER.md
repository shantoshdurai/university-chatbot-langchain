# Deploy Backend to Render

## What You're Doing
Hosting the FastAPI backend server on Render.com (free tier available).

## Steps

### 1. Create Render Account
- Go to https://render.com
- Sign up with GitHub (recommended) or email
- Verify email if needed

### 2. Create Web Service
- Click **"New +"** button → Select **"Web Service"**
- Connect your GitHub repository (authorize Render to access GitHub)
- Select the `university-chatbot-langchain` repository

### 3. Configure Settings
Fill in these fields:

| Field | Value |
|-------|-------|
| **Name** | `university-chatbot-api` |
| **Environment** | Python 3 |
| **Region** | Choose closest to you (US or EU) |
| **Branch** | `main` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn api:app --host 0.0.0.0 --port 8000` |

### 4. Add Environment Variables
Click **"Advanced"** → **"Add Environment Variable"**

Add this variable:
- **Key**: `GROQ_API_KEY`
- **Value**: (Paste your Groq API key from https://console.groq.com)

⚠️ **Important**: This key is SECRET. Render keeps it private on the server.

### 5. Deploy
- Click **"Create Web Service"**
- Wait 3-5 minutes for deployment
- You'll see a URL like: `https://university-chatbot-api.onrender.com`

### 6. Test Backend
Open this in your browser:
```
https://your-url.onrender.com/health
```

You should see:
```json
{
  "status": "online",
  "rag_enabled": false,
  "chunks": 0,
  "vision_model": "llama-3.2-11b-vision-preview"
}
```

**✅ If you see this, backend is working!**

---

## Troubleshooting

**Status: Building for 10+ minutes?**
- Render is installing dependencies. This is normal.

**Get 404 error?**
- Wait 1-2 more minutes for the service to fully initialize.

**Get 500 error?**
- Check that GROQ_API_KEY environment variable is set correctly.

---

## Save This URL
Copy your backend URL: `https://your-url.onrender.com`

You'll need it for Vercel deployment in the next step.
