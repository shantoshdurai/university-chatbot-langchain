# Deploy Frontend to Vercel

## What You're Doing
Hosting the React frontend on Vercel.com (fast, automatic deployments).

## Prerequisites
- ✅ Backend URL from Render (looks like `https://university-chatbot-api.onrender.com`)

## Steps

### 1. Create Vercel Account
- Go to https://vercel.com
- Sign up with GitHub (recommended)
- Authorize Vercel to access your GitHub repositories

### 2. Import Repository
- Click **"Add New"** → **"Project"**
- Find and select `university-chatbot-langchain` repository
- Click **"Import"**

### 3. Configure Project
In the "Configure Project" screen:

| Field | Value |
|-------|-------|
| **Project Name** | `university-chatbot` |
| **Framework** | Create React App |
| **Root Directory** | `./chatbot-frontend` |

### 4. Add Environment Variables
Click **"Environment Variables"** and add:

- **Name**: `REACT_APP_API_URL`
- **Value**: `https://your-backend-url.onrender.com` (paste your Render URL here)
- Click **"Add"**

### 5. Deploy
- Click **"Deploy"**
- Wait 2-3 minutes
- You'll get a URL like: `https://university-chatbot.vercel.app`

**✅ Deployment complete!**

---

## What to Do Next

### 1. Open Your Frontend
Go to your Vercel URL in a browser (e.g., `https://university-chatbot.vercel.app`)

### 2. Set Up Groq API Key
1. Click **Settings** tab (bottom left)
2. Scroll to **"Groq API Key"** field
3. Paste your Groq key from https://console.groq.com
4. Click **"Apply to Server"**

### 3. Test It Works
1. Go to **Dashboard** tab
2. Type a test message: "Hello, how are you?"
3. You should get a response ✅

### 4. Upload Test File
1. Click **"+"** button in sidebar
2. Select a PDF or text file
3. Click **"Upload"**
4. Ask the chatbot about the uploaded file

---

## Share with Classmates
Send them your Vercel URL:
```
https://your-app.vercel.app
```

They can visit it and paste their own Groq API key in Settings.

---

## Auto-Updates
Every time you push to GitHub (`main` branch):
- Vercel automatically rebuilds and deploys
- Takes 1-2 minutes
- No manual deploy needed

---

## Troubleshooting

**Chat returns error "Could not reach the backend"?**
- Check that `REACT_APP_API_URL` env var is set correctly
- Redeploy: Click **"Redeploy"** in Vercel dashboard

**Settings page doesn't save API key?**
- Make sure Render backend is running (`/health` endpoint works)
- Check browser console (F12) for error messages

**Frontend loads slowly?**
- Vercel may still be building. Refresh after 30 seconds.

---

## Your Live App
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-backend-url.onrender.com`
