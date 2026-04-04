# Academix Chatbot — Handoff Document
> Start a new Claude Code session and paste this file as your first message.

---

## Project Overview
University AI chatbot for DSU (Dhanalakshmi Srinivasan University, Trichy).
- **Live URL:** `https://university-chatbot-langchain.vercel.app` (exact slug — check Vercel dashboard)
- **Repo:** GitHub → `shantoshdurai` account, repo `university-chatbot-langchain`, branch `main`
- **Stack:** React (frontend, `/chatbot-frontend/src/`), FastAPI (backend, `/api/`), Supabase (auth + DB), Vercel (deploy)
- **Key files:** `chatbot-frontend/src/App.js` (all UI), `chatbot-frontend/src/App.css` (all styles)

---

## Current Architecture (Mobile)
On phones (`≤640px`):
- Desktop sidebar is **hidden** (`display: none`)
- A **fixed bottom nav bar** is shown (64px tall, `z-index: 100`)  
- The **input footer** is `position: fixed; bottom: 0; z-index: 60`  
  → It has `padding-bottom: calc(68px + safe-area)` to sit above the nav bar  
  → Total visual height of input overlay: ~118px
- The `.dashboard-canvas` class (added to the home tab's `<section>`) has `padding-bottom: calc(155px + safe-area) !important` to push scroll content above both fixed overlays

Mobile nav tabs (in order): **Home | History | [FAB: New Chat] | Papers | Library**

---

## Supabase Tables
| Table | Purpose |
|---|---|
| `chat_history` | Per-user messages (user_id, session_id, role, content, mode) |
| `feedback` | User feedback from Settings tab |
| `resources` | Library/Store items (title, description, type, content, is_public) |
| `exam_papers` | Exam paper metadata (managed via backend, stored in Supabase Storage) |

---

## Known Issues — To Fix in Next Session

### 1. Remove the Papers Tab entirely
**User decision:** They will add exam papers directly from Supabase dashboard — not via the app. All users should NOT be able to upload papers.

**What to do:**
- In `App.js` around line 1203–1225 (mobile bottom nav), remove `{ id: 'exams', icon: 'assignment', label: 'Papers' }` from the nav array
- In `App.js` around line 785–793 (desktop `navItems` array), remove `{ id: 'exams', icon: 'assignment', label: 'Exam Papers' }`
- In `App.js` around line 1125, remove the line `{activeTab === 'exams' && <ExamPapersView toast={toast} />}`
- The `ExamPapersView` function (lines ~389–507) and `exam-meta-grid` CSS can stay or be deleted — your call
- Mobile nav will then have: **Home | History | [FAB] | Library** (4 items + FAB = fine)

### 2. Home screen scroll — bottom cards still cut off
**Symptom:** All 6 suggestion cards are visible in 3 rows of 2, but the bottom row (Campus Info, Write & Review) is cut off by the fixed input bar overlay. User cannot scroll to fully see them.

**Root cause:** The `.dashboard-canvas` `padding-bottom: 155px` is likely not enough. The input-footer overlays about 120px, plus the nav bar is 64px, so total overlay = ~184px. The fix is to increase padding.

**What to do:**
- In `App.css` inside `@media (max-width: 640px)`, find `.dashboard-canvas` and change:
  ```css
  .dashboard-canvas {
    padding-bottom: calc(200px + env(safe-area-inset-bottom, 0px)) !important;
  }
  ```
- Also verify `.chat-canvas` (non-dashboard) has enough bottom padding for the nav bar alone: `calc(80px + env(safe-area-inset-bottom, 0px))`

### 3. Resource Store (Library tab) — click does nothing on mobile
**Symptom:** Tapping a resource card on mobile appears to do nothing.

**Root cause:** When a card is clicked, a side detail panel opens (`<div className="sidebar" style={{ width: '320px', position: 'static' }}>`) — but on mobile the screen is too narrow for a 320px side panel alongside the list. The panel is rendered off-screen or behind the content.

**What to do:**
- In `ResourceLibrary` component (~line 352), the detail panel uses inline `style={{ width: '320px', position: 'static' }}`. On mobile, replace the side-panel with a **modal overlay** or a **bottom sheet**.
- Simplest fix: wrap the detail panel in a check: if screen is mobile, render it as `position: fixed; inset: 0; z-index: 150; overflow-y: auto` (full screen overlay). If desktop, keep the side panel.
- Add a CSS media query or use `window.innerWidth < 641` to detect mobile in JS.

---

## Already Fixed (Last Session)

| Issue | Fix Applied | Commit |
|---|---|---|
| Privacy bug: old Gmail account chat history visible to new user | `chatHistory` init changed from localStorage read to `[]`; auth listener clears history; localStorage not written for logged-in users | `fe01bcb` |
| Exam Papers 3-column input grid too narrow on mobile | Added `exam-meta-grid` class + CSS `grid-template-columns: 1fr !important` on mobile | `fe01bcb` |
| Input footer font causing iOS zoom | `.chat-input { font-size: 16px }` in mobile CSS | `fe01bcb` |
| Input disclaimer text visible on mobile (wasted space) | `.input-disclaimer { display: none !important }` in mobile CSS | `fe01bcb` |

---

## Pending Security Tasks (From Earlier)
1. **Rotate Supabase API keys** — the `anon` key was committed to git history. Go to Supabase Dashboard → Settings → API → rotate the `anon` key. Update `chatbot-frontend/src/supabaseClient.js` with the new key.
2. **Set Supabase Auth Site URL** — in Supabase Dashboard → Auth → URL Configuration → set Site URL to the live Vercel URL.

---

## How Deploy Works
Push to `main` → Vercel auto-deploys. No manual redeploy needed.
Check deployment status: Vercel MCP tools (`list_deployments`) or Vercel dashboard.

---

## Mobile CSS Quick Reference
```
Nav bar:       position: fixed; bottom: 0; height: 64px; z-index: 100
Input footer:  position: fixed; bottom: 0; z-index: 60; visual height ~118px
dashboard-canvas padding-bottom: calc(155px + safe-area) — NEEDS INCREASE TO ~200px
chat-canvas padding-bottom: calc(70px + safe-area) — covers nav bar only (non-dashboard tabs)
```

---

## File Map
```
chatbot-frontend/
  src/
    App.js          ← All React components + state + render logic (~1230 lines)
    App.css         ← All styles (~1100 lines). Mobile block starts at ~line 905
    supabaseClient.js ← Supabase URL + anon key
    AuthView.js     ← Login / signup form
api/
  main.py           ← FastAPI backend (chat, ingest, resources, exam-papers endpoints)
```
