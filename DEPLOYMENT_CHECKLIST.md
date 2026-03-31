# Deployment Checklist — Quick Start

Complete these steps in order. Takes ~45 minutes total.

---

## ✅ Phase 1: Preparation (5 mins)

- [ ] Get Groq API Key from https://console.groq.com (free)
- [ ] Have your GitHub username ready
- [ ] Have this repo URL: `https://github.com/shantoshdurai/university-chatbot-langchain`

---

## ✅ Phase 2: Deploy Backend (15 mins)

**File**: `DEPLOY_RENDER.md`

- [ ] Create Render account at https://render.com
- [ ] Create Web Service (connect GitHub)
- [ ] Set Name: `university-chatbot-api`
- [ ] Set Build Command: `pip install -r requirements.txt`
- [ ] Set Start Command: `uvicorn api:app --host 0.0.0.0 --port 8000`
- [ ] Add Environment Variable: `GROQ_API_KEY` = your key
- [ ] Wait for deployment (3-5 mins)
- [ ] Test: Open `https://your-url.onrender.com/health`
- [ ] ✅ Save your backend URL

---

## ✅ Phase 3: Deploy Frontend (15 mins)

**File**: `DEPLOY_VERCEL.md`

- [ ] Create Vercel account at https://vercel.com
- [ ] Import GitHub repository
- [ ] Set Root Directory: `./chatbot-frontend`
- [ ] Add Environment Variable: `REACT_APP_API_URL` = your Render URL
- [ ] Click Deploy
- [ ] Wait for deployment (2-3 mins)
- [ ] ✅ Copy your Vercel URL

---

## ✅ Phase 4: Configure & Test (10 mins)

- [ ] Open your Vercel URL in browser
- [ ] Go to **Settings** tab
- [ ] Paste Groq API Key
- [ ] Click **"Apply to Server"**
- [ ] Go to **Dashboard** tab
- [ ] Send test message: "Hello"
- [ ] ✅ Should get response

---

## ✅ Phase 5: Share with Class (2 mins)

- [ ] Copy your Vercel URL
- [ ] Send to classmates: "Visit this URL and paste your Groq key in Settings"
- [ ] Done! 🚀

---

## Useful Links

| Task | Link |
|------|------|
| Get Groq API Key | https://console.groq.com |
| Deploy Backend | https://render.com |
| Deploy Frontend | https://vercel.com |
| Check Frontend Status | Your Vercel URL |
| Check Backend Status | Your Backend URL + `/health` |

---

## FAQ

**Q: How long does it take to deploy?**
- Render: 3-5 minutes
- Vercel: 2-3 minutes
- Total: ~10 minutes

**Q: Can I change the deployed code?**
- Yes! Push to GitHub → Both Render and Vercel auto-update

**Q: What if something breaks?**
- Check `DEPLOY_RENDER.md` or `DEPLOY_VERCEL.md` troubleshooting section
- Or check the Render/Vercel dashboards for error logs

**Q: How many students can use it?**
- With current setup: 5-10 concurrent users comfortably
- For 100+ users: Need database + scaling upgrades

---

## After Deployment

### Watch Your Backend Logs (Render)
- Go to Render dashboard
- Click your service
- View "Logs" tab to debug issues

### Watch Your Frontend Logs (Vercel)
- Go to Vercel dashboard
- Click "Logs" → "Runtime Logs" to see errors

### Monitor API Usage
- Groq charges per API call (very cheap for 5 users)
- Check https://console.groq.com for usage

---

**You're now live! 🎉**

Share the Vercel URL with your classmates and they can start using it.
