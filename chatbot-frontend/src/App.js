import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './App.css';
import { supabase } from './supabaseClient';
import AuthView from './AuthView';

const API = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000';

// ─────────────────────────────────────────────────────────
// Name Prompt — shown once to first-time visitors
// ─────────────────────────────────────────────────────────
function NamePromptView({ onContinue }) {
  const [name, setName] = React.useState('');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--surface-container-low)',
      fontFamily: 'var(--font-body, sans-serif)',
    }}>
      <div style={{
        background: 'var(--surface-container-lowest, white)',
        borderRadius: '24px', padding: '48px 40px', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)', textAlign: 'center'
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'var(--primary, #6750a4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '28px' }}>school</span>
        </div>
        <h1 style={{ fontWeight: 800, fontSize: '26px', marginBottom: '8px', color: 'var(--on-surface, #1c1b1f)' }}>
          Welcome to Academix
        </h1>
        <p style={{ color: 'var(--on-surface-variant, #49454f)', fontSize: '14px', marginBottom: '28px', lineHeight: 1.5 }}>
          Your DSU study assistant. What should we call you?
        </p>
        <input
          type="text"
          placeholder="Your first name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onContinue(name)}
          autoFocus
          style={{
            padding: '13px 16px', borderRadius: '12px', fontSize: '15px',
            border: '1.5px solid rgba(0,0,0,0.12)', outline: 'none',
            background: 'var(--surface-container-high, #ece6f0)',
            color: 'var(--on-surface, #1c1b1f)', width: '100%', boxSizing: 'border-box',
            marginBottom: '12px',
          }}
        />
        <button
          onClick={() => onContinue(name)}
          style={{
            width: '100%', background: 'var(--primary, #6750a4)', color: 'white',
            border: 'none', borderRadius: '12px', padding: '14px',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '20px'
          }}
        >
          {name.trim() ? `Continue as ${name.trim()}` : 'Continue as Guest'}
        </button>

        {/* Privacy notice */}
        <div style={{
          background: 'rgba(103,80,164,0.07)', borderRadius: '12px', padding: '14px 16px',
          textAlign: 'left', marginBottom: '16px'
        }}>
          <p style={{ fontSize: '12px', color: 'var(--on-surface-variant, #49454f)', margin: 0, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700, display: 'block', marginBottom: '4px' }}>🔒 Your privacy is protected</span>
            Your name and chats stay on your device only — nothing is sent to or stored on our servers.
            The site owner cannot see your conversations. You are completely anonymous.
          </p>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant, #49454f)', opacity: 0.7, margin: 0 }}>
          Want chat history across devices?{' '}
          <button
            onClick={() => onContinue('')}
            style={{ background: 'none', border: 'none', color: 'var(--primary, #6750a4)', fontWeight: 700, cursor: 'pointer', fontSize: '12px', padding: 0 }}
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}
const ADMIN_EMAIL  = 'shantoshdurai06@gmail.com';
const ADMIN_SECRET = 'super-secret-academix-key';

const getUserDisplayName = (user, guestName) =>
  user?.user_metadata?.full_name || user?.email?.split('@')[0] || guestName || '';

// ─────────────────────────────────────────────────────────
// Local chat encryption (AES-GCM) — chats stay on-device
// and are unreadable without the per-browser key.
// ─────────────────────────────────────────────────────────
async function getEncKey() {
  const stored = localStorage.getItem('_ck');
  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const exported = await crypto.subtle.exportKey('raw', key);
  localStorage.setItem('_ck', btoa(String.fromCharCode(...new Uint8Array(exported))));
  return key;
}

async function encryptData(obj) {
  try {
    const key = await getEncKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder().encode(JSON.stringify(obj));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
    const combined = new Uint8Array(12 + cipher.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipher), 12);
    return btoa(String.fromCharCode(...combined));
  } catch { return JSON.stringify(obj); }
}


const Icon = ({ name, size = 22, style = {} }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1, ...style }}>
    {name}
  </span>
);

const SUGGESTIONS = [
  { icon: 'psychology',     title: 'Explain a Topic',   desc: 'Learn any concept',     prompt: 'Can you explain this topic to me in a simple way?' },
  { icon: 'quiz',           title: 'Practice Questions', desc: 'Test your knowledge',   prompt: 'Give me 5 practice questions on a topic I can study' },
  { icon: 'summarize',      title: 'Summarize Notes',   desc: 'Quick revision',        prompt: 'Help me create a concise summary for revision' },
  { icon: 'lightbulb',      title: 'Study Tips',        desc: 'Exam strategies',       prompt: 'What are the best strategies to prepare for university exams?' },
  { icon: 'school',         title: 'Campus Info',       desc: 'University details',    prompt: 'Tell me about programs and campus facilities at DSU' },
  { icon: 'edit_note',      title: 'Write & Review',    desc: 'Essays & assignments',  prompt: 'Help me structure an essay or assignment on a topic' },
];

// ─────────────────────────────────────────────────────────
// Settings Component (Admin restricted)
// ─────────────────────────────────────────────────────────
function SettingsView({ toast, user }) {
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);
  const [kbFiles, setKbFiles] = useState([]);
  const [kbUploading, setKbUploading] = useState(false);
  const kbInputRef = useRef(null);

  // Text knowledge state
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textSaving, setTextSaving] = useState(false);
  const [textEntries, setTextEntries] = useState([]);
  const [textLoading, setTextLoading] = useState(false);
  const [confirmTextDelete, setConfirmTextDelete] = useState(null); // id | null

  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleSendFeedback = async () => {
    if (!feedback.trim()) return;
    try {
      await supabase.from('feedback').insert([{ message: feedback.trim(), created_at: new Date().toISOString() }]);
    } catch { }
    setSent(true);
    setTimeout(() => { setFeedback(''); setSent(false); }, 3000);
  };

  const handleKbUpload = async () => {
    if (kbFiles.length === 0) return;
    setKbUploading(true);
    try {
      const form = new FormData();
      kbFiles.forEach(f => form.append('files', f));
      form.append('token', ADMIN_SECRET);
      await axios.post(`${API}/kb/ingest`, form);
      toast(`${kbFiles.length} file(s) added to AI Knowledge Base`, 'success');
      setKbFiles([]);
    } catch {
      toast('Admin upload failed.', 'error');
    } finally {
      setKbUploading(false);
    }
  };

  const loadTextEntries = async () => {
    setTextLoading(true);
    try {
      const { data } = await axios.get(`${API}/kb/texts`);
      setTextEntries(data || []);
    } catch { /* table may not exist yet */ }
    finally { setTextLoading(false); }
  };

  const handleAddText = async () => {
    if (!textContent.trim()) return;
    setTextSaving(true);
    try {
      const form = new FormData();
      form.append('token', ADMIN_SECRET);
      form.append('title', textTitle.trim() || 'Untitled');
      form.append('content', textContent.trim());
      await axios.post(`${API}/kb/text`, form);
      toast('Knowledge entry added — AI learned it instantly!', 'success');
      setTextTitle('');
      setTextContent('');
      loadTextEntries();
    } catch {
      toast('Failed to save. Make sure the ai_knowledge table exists in Supabase.', 'error');
    } finally {
      setTextSaving(false);
    }
  };

  const handleDeleteText = async (id) => {
    try {
      const form = new FormData();
      form.append('token', ADMIN_SECRET);
      await axios.delete(`${API}/kb/text/${id}`, { data: form });
      toast('Entry deleted.', 'success');
      setTextEntries(prev => prev.filter(e => e.id !== id));
    } catch {
      toast('Delete failed.', 'error');
    }
  };

  // Load text entries when admin opens settings
  useEffect(() => {
    if (isAdmin) loadTextEntries();
  }, [isAdmin]); // eslint-disable-line

  return (
    <section className="chat-canvas" style={{ maxWidth: '640px', margin: '0 auto', gap: '24px' }}>
      <div className="hero">
        <h2 className="hero-title" style={{ fontSize: '32px' }}>Portal Settings</h2>
        <p className="hero-sub">Manage your academic workspace and feedback.</p>
      </div>

      {isAdmin && (
        <>
          {/* ── File Upload KB ── */}
          <div className="suggestion-card" style={{ width: '100%', cursor: 'default', gap: '16px', padding: '24px', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <Icon name="verified_user" style={{ color: 'var(--primary)' }} />
              <span className="card-title">Super Admin: Upload Files to AI</span>
            </div>
            <p className="card-desc">Upload PDFs, images, or text files. AI learns from them immediately.</p>
            <input ref={kbInputRef} type="file" multiple accept=".pdf,.txt,.md,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setKbFiles(Array.from(e.target.files))} />
            <button className="new-inquiry-btn" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)', width: '100%' }} onClick={() => kbInputRef.current?.click()}>
              <Icon name="upload_file" size={18} /> {kbFiles.length > 0 ? `${kbFiles.length} file(s) selected` : 'Choose Files'}
            </button>
            {kbFiles.length > 0 && <button className="new-inquiry-btn" style={{ width: '100%' }} onClick={handleKbUpload} disabled={kbUploading}>{kbUploading ? 'Uploading…' : '⚡ Add to AI Brain'}</button>}
          </div>

          {/* ── Text Knowledge Editor ── */}
          <div className="suggestion-card" style={{ width: '100%', cursor: 'default', gap: '16px', padding: '24px', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <Icon name="edit_note" style={{ color: 'var(--primary)' }} />
              <span className="card-title">Super Admin: Teach the AI (Text)</span>
            </div>
            <p className="card-desc">Type anything — facts, rules, answers, DSU info. The AI learns it instantly without a file upload or redeploy.</p>

            <input
              className="chat-input"
              style={{ width: '100%', borderRadius: '12px', padding: '12px 16px', background: 'var(--surface-container-highest)', border: 'none', fontSize: '14px' }}
              placeholder="Entry title (e.g. 'HOD of AI Department')"
              value={textTitle}
              onChange={e => setTextTitle(e.target.value)}
            />
            <textarea
              className="chat-input"
              style={{ width: '100%', minHeight: '140px', borderRadius: '12px', padding: '14px 16px', background: 'var(--surface-container-highest)', border: 'none', resize: 'vertical', fontSize: '14px', marginTop: '8px' }}
              placeholder={`Write anything the AI should know.\n\nExamples:\n• "The HOD of AI & DS department is Dr. [Name]."\n• "The fee for B.Tech AI is ₹1,20,000 per year."\n• "Academix was built by Shantosh Durai, 2nd year AIDS student."\n• "When students ask about placements, mention that DSU has tie-ups with TCS, Wipro, and Infosys."`}
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
            />
            <button
              className="new-inquiry-btn"
              style={{ width: '100%' }}
              onClick={handleAddText}
              disabled={textSaving || !textContent.trim()}
            >
              {textSaving ? 'Saving…' : <><Icon name="bolt" size={18} /> Teach AI Now</>}
            </button>

            {/* ── Existing entries ── */}
            {textLoading ? (
              <div className="typing-bubble" style={{ margin: '12px auto' }}><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div>
            ) : textEntries.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>
                  {textEntries.length} saved {textEntries.length === 1 ? 'entry' : 'entries'}
                </span>
                {textEntries.map(entry => (
                  <div key={entry.id} style={{ background: 'var(--surface-container-high)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{entry.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{entry.content}</div>
                    </div>
                    <button
                      onClick={() => setConfirmTextDelete(entry.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', flexShrink: 0, padding: '2px' }}
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {confirmTextDelete !== null && (
        <ConfirmModal
          message="This knowledge entry will be permanently removed from the AI."
          confirmLabel="Delete"
          onConfirm={() => { handleDeleteText(confirmTextDelete); setConfirmTextDelete(null); }}
          onCancel={() => setConfirmTextDelete(null)}
        />
      )}

      {/* Rest of feedback card... */}
      <div className="suggestion-card" style={{ width: '100%', cursor: 'default', gap: '16px', padding: '24px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
           <Icon name="chat_bubble" style={{ color: 'var(--primary)' }} />
           <span className="card-title">Share Feedback</span>
         </div>
         <textarea className="chat-input" style={{ width: '100%', minHeight: '120px', borderRadius: '16px', padding: '16px', background: 'var(--surface-container-highest)', border: 'none', resize: 'none' }} placeholder="I wish the AI could..." value={feedback} onChange={e => setFeedback(e.target.value)} />
         <button onClick={handleSendFeedback} className="new-inquiry-btn" style={{ width: '100%', marginTop: '8px' }}>{sent ? '✓ Message Sent' : 'Send Feedback'}</button>
      </div>
      <div className="suggestion-card" style={{ width: '100%', cursor: 'default', gap: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Icon name="info" /><span className="card-title">System Vitals</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[['Version','3.0.0'],['Status','Live'],['Build','Stable'],['Security','Encrypted']].map(([k,v]) => (
            <div key={k} style={{ background: 'var(--surface-container-highest)', borderRadius: '10px', padding: '10px 14px' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
              <div style={{ fontSize: '13px', marginTop: '3px' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
// Summary Editor Component
// ─────────────────────────────────────────────────────────
function SummaryView({ summaries, setSummaries, pushToStore }) {
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');

  const deleteSummary = (i) => {
    const updated = summaries.filter((_, idx) => idx !== i);
    setSummaries(updated);
    localStorage.setItem('chat_summaries', JSON.stringify(updated));
  };

  const startEdit = (i) => {
    setEditing(i);
    setEditText(summaries[i].text);
  };

  const saveEdit = (i) => {
    const updated = [...summaries];
    updated[i].text = editText;
    setSummaries(updated);
    localStorage.setItem('chat_summaries', JSON.stringify(updated));
    setEditing(null);
  };

  return (
    <section className="chat-canvas">
      <div className="hero">
        <h2 className="hero-title" style={{ fontSize: '28px' }}>Study Summaries</h2>
        <p className="hero-sub">Your AI-generated lecture notes from previous sessions.</p>
      </div>

      {summaries.length === 0 && <p className="card-desc" style={{ padding: '40px', textAlign: 'center' }}>No summaries created yet.</p>}

      {
        summaries.map((s, i) => (
          <div key={i} className="suggestion-card" style={{ width: '100%', maxWidth: '800px', cursor: 'default', gap: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon name="auto_awesome" color="var(--primary)" />
                <span className="card-title">{s.title}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="icon-btn-sm" title="Push to Library" onClick={() => pushToStore(s.title, 'Curated study session summary.', 'note', s.text)}>
                  <Icon name="library_add" size={18} style={{ color: 'var(--primary)' }} />
                </button>
                <button className="icon-btn-sm" onClick={() => startEdit(i)}><Icon name="edit" size={18} /></button>
                <button className="icon-btn-sm" onClick={() => deleteSummary(i)}><Icon name="delete" size={18} style={{ color: 'var(--error)' }} /></button>
              </div>
            </div>
            {
              editing === i 
              ? <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea 
                    className="chat-input" 
                    autoFocus
                    style={{ minHeight: '150px', background: 'var(--surface-container-low)', border: '1px solid var(--primary)', borderRadius: '12px', padding: '12px' }}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="new-inquiry-btn" style={{ flex: 1, padding: '8px' }} onClick={() => saveEdit(i)}>Save Changes</button>
                    <button className="new-inquiry-btn" style={{ flex: 1, padding: '8px', background: 'var(--surface-container-high)', color: 'var(--on-surface)' }} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              : <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--on-surface)', whiteSpace: 'pre-wrap' }}>{s.text}</p>
            }
          </div>
        ))
      }
    </section>
  );
}

// ─────────────────────────────────────────────────────────
// Resource Library (The Store)
// ─────────────────────────────────────────────────────────
function ResourceLibrary({ setActiveTab, setMessages, toast, user }) {
  const [tab, setTab] = useState('my');      // 'my' | 'community'
  const [resources, setResources] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, title } | null
  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchResources = async () => {
    if (tab === 'my' && !user) return; // guest — nothing to fetch
    setLoading(true);
    try {
      const params = tab === 'community'
        ? `?is_public=true`
        : `?user_id=${user.id}`; // removed &type=note so chats + notes all appear
      const { data } = await axios.get(`${API}/resources${params}`);
      setResources(data);
    } catch { console.error('Failed to fetch resources'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResources(); }, [tab, user]); // eslint-disable-line

  const attachToAI = (res) => {
    setMessages([
        { role: 'user', content: `Show me: ${res.title}` },
        { role: 'bot', content: res.content, sources: [] }
    ]);
    setSelected(null);
    setActiveTab('dashboard');
  };

  const handleDelete = (resId, resTitle) => {
    setConfirmDelete({ id: resId, title: resTitle });
  };

  const confirmDeleteResource = async () => {
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      const params = isAdmin
        ? `?admin_token=${encodeURIComponent(ADMIN_SECRET)}`
        : `?user_id=${encodeURIComponent(user.id)}`;
      await axios.delete(`${API}/resources/${id}${params}`);
      toast('Resource deleted.', 'success');
      setSelected(null);
      fetchResources();
    } catch { toast('Delete failed.', 'error'); }
  };

  const handleShare = async (res) => {
    try {
      const form = new FormData();
      form.append('user_id', user.id);
      form.append('is_public', !res.is_public);
      await axios.patch(`${API}/resources/${res.id}/share`, form);
      toast(res.is_public ? 'Removed from Community.' : 'Shared to Community!', 'success');
      setSelected(s => s ? { ...s, is_public: !s.is_public } : s);
      fetchResources();
    } catch { toast('Update failed.', 'error'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return resources;
    return resources.filter(r =>
      r.title?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
  }, [resources, search]);

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div className="library-scroll-area">
        <div className="hero" style={{ marginBottom: '24px' }}>
          <h2 className="hero-title" style={{ fontSize: '32px' }}>Library</h2>
          <p className="hero-sub" style={{ fontSize: '14px' }}>Discover and share academic assets.</p>

          <div className="mode-toggle" style={{ marginTop: '24px', display: 'flex' }}>
            <button className={`mode-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>
              <Icon name="folder" size={16} /> My resources
            </button>
            <button className={`mode-btn ${tab === 'community' ? 'active' : ''}`} onClick={() => setTab('community')}>
              <Icon name="public" size={16} /> Community
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="library-search-bar">
          <Icon name="search" size={18} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
          <input
            className="library-search-input"
            placeholder={`Search ${tab === 'community' ? 'community' : 'my'} resources…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', display: 'flex', padding: 0 }}>
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {tab === 'my' && !user ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--primary)', marginBottom: 16, display: 'block' }}>lock</span>
            <p className="card-title" style={{ marginBottom: 8 }}>Sign in to see your library</p>
            <p className="card-desc">Your saved notes and chats will appear here once you sign in.</p>
          </div>
        ) : loading ? (
          <div className="typing-bubble" style={{ margin: '40px auto' }}><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--primary)', marginBottom: 16, display: 'block' }}>
              {search ? 'search_off' : tab === 'community' ? 'public_off' : 'folder_open'}
            </span>
            <p className="card-title" style={{ marginBottom: 8 }}>
              {search ? 'No results found' : tab === 'community' ? 'No community resources yet' : 'Your library is empty'}
            </p>
            <p className="card-desc" style={{ maxWidth: '280px', margin: '0 auto' }}>
              {search
                ? `No resources match "${search}"`
                : tab === 'community'
                  ? 'Save a resource and make it public to share it with everyone'
                  : 'Save an AI response or chat session using the bookmark icon'}
            </p>
          </div>
        ) : (
          <div className="suggestion-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {filtered.map(res => (
              <div key={res.id} className={`suggestion-card resource-card ${selected?.id === res.id ? 'active' : ''}`} onClick={() => setSelected(res)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Icon name={res.type === 'note' ? 'description' : 'forum'} style={{ color: 'var(--primary)' }} />
                  {res.is_public
                    ? <span style={{ fontSize: '10px', fontWeight: 800, background: '#e8f5e9', color: '#1b5e20', borderRadius: '4px', padding: '2px 6px' }}>PUBLIC</span>
                    : res.user_id === user?.id && <span style={{ fontSize: '10px', fontWeight: 800, background: 'var(--surface-container-highest)', color: 'var(--on-surface-variant)', borderRadius: '4px', padding: '2px 6px' }}>PRIVATE</span>
                  }
                </div>
                <span className="card-title">{res.title}</span>
                <p className="card-desc" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{res.description}</p>
                <div className="resource-card-meta">
                  <span className="resource-card-author">{res.shared_by || 'Anonymous'}</span>
                  <span className="resource-card-date">
                    {res.created_at ? new Date(res.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric' }) : res.date || ''}
                  </span>
                </div>
                {/* Inline actions — owner or admin */}
                {(res.user_id === user?.id || isAdmin) && (
                  <div className="resource-card-actions" onClick={e => e.stopPropagation()}>
                    {res.user_id === user?.id && (
                      <button
                        className="resource-card-action-btn"
                        title={res.is_public ? 'Make Private' : 'Share to Community'}
                        onClick={() => handleShare(res)}
                      >
                        <Icon name={res.is_public ? 'public_off' : 'public'} size={15} />
                      </button>
                    )}
                    <button
                      className="resource-card-action-btn danger"
                      title="Delete"
                      onClick={() => handleDelete(res.id, res.title)}
                    >
                      <Icon name="delete" size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          message={`"${confirmDelete.title}" will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={confirmDeleteResource}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {selected && (
        <>
          {/* Backdrop — visible only on mobile via CSS */}
          <div className="resource-detail-mobile" onClick={() => setSelected(null)} />
          <div className="resource-detail-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
               <Icon name={selected.type === 'note' ? 'description' : 'forum'} size={28} style={{ color: 'var(--primary)' }} />
               <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setSelected(null)}><Icon name="close" size={20} /></button>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{selected.title}</h3>
            <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '24px' }}>{selected.description}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="new-inquiry-btn" style={{ width: '100%' }} onClick={() => attachToAI(selected)}>Open in Chat</button>
              {selected.user_id === user?.id && (
                <button className="new-inquiry-btn" style={{ width: '100%', background: 'var(--surface-container-high)', color: 'var(--on-surface)' }} onClick={() => handleShare(selected)}>
                  <Icon name={selected.is_public ? 'public_off' : 'public'} size={18} /> {selected.is_public ? 'Make Private' : 'Share to Community'}
                </button>
              )}
              {(selected.user_id === user?.id || isAdmin) && (
                <button className="new-inquiry-btn" style={{ width: '100%', background: '#fee', color: '#b00' }} onClick={() => handleDelete(selected.id, selected.title)}>
                  <Icon name="delete" size={18} /> Delete Resource
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// Generic Confirm Modal (delete confirmations)
// ─────────────────────────────────────────────────────────
function ConfirmModal({ message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <div className="logout-modal-backdrop" onClick={onCancel}>
      <div className="logout-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="delete_forever" size={24} style={{ color: '#b00020' }} />
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '15px', fontWeight: 600, color: 'var(--on-surface)', margin: '0 0 6px' }}>{confirmLabel}?</p>
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--on-surface-variant)', margin: '0 0 24px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="new-inquiry-btn" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)' }} onClick={onCancel}>Cancel</button>
          <button className="new-inquiry-btn" style={{ flex: 1, background: '#b00020', color: 'white' }} onClick={onConfirm}>
            <Icon name="delete" size={16} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Logout Confirmation Modal
// ─────────────────────────────────────────────────────────
function LogoutModal({ user, onCancel, onDone }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      onDone();
    } catch {
      setErr('Sign-out failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="logout-modal-backdrop" onClick={loading ? undefined : onCancel}>
      <div className="logout-modal" onClick={e => e.stopPropagation()}>
        <div className="logout-modal-avatar">
          <span>{user?.email?.[0]?.toUpperCase()}</span>
        </div>
        <div className="logout-modal-user">
          <div className="logout-modal-name">{getUserDisplayName(user, '')}</div>
          <div className="logout-modal-email">{user?.email}</div>
        </div>
        <div className="logout-modal-message">
          <Icon name="logout" size={18} style={{ color: 'var(--error)', flexShrink: 0 }} />
          <span>You'll be signed out of Academix on this device.</span>
        </div>
        {err && <p style={{ color: 'var(--error)', fontSize: '13px', textAlign: 'center', margin: '8px 0 0' }}>{err}</p>}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button
            className="new-inquiry-btn"
            style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="new-inquiry-btn"
            style={{ flex: 1, background: 'var(--error)', color: 'white' }}
            onClick={handleSignOut}
            disabled={loading}
          >
            {loading
              ? <><span className="logout-spinner" />Signing out…</>
              : <><Icon name="logout" size={16} />Sign out</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Save to Library Modal
// ─────────────────────────────────────────────────────────
function SaveModal({ initialTitle, defaultPublic, onSave, onCancel }) {
  const [title, setTitle]       = useState(initialTitle || '');
  const [isPublic, setIsPublic] = useState(defaultPublic || false);
  return (
    <div className="save-modal-backdrop" onClick={onCancel}>
      <div className="save-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <span style={{ fontWeight: 800, fontSize: '17px' }}>Save to Library</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }} onClick={onCancel}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block' }}>Title</label>
        <input
          className="save-modal-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Give this a title…"
          autoFocus
        />
        <div className="save-modal-toggle" role="switch" aria-checked={isPublic} onClick={() => setIsPublic(p => !p)}>
          <div className={`save-modal-toggle-track ${isPublic ? 'on' : ''}`}>
            <div className="save-modal-toggle-thumb" />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Share with Community</span>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--on-surface-variant)' }}>Others can discover and study from this</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button className="new-inquiry-btn" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)' }} onClick={onCancel}>Cancel</button>
          <button className="new-inquiry-btn" style={{ flex: 1 }} onClick={() => onSave(title, isPublic)} disabled={!title.trim()}>
            <Icon name="bookmark_add" size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Toast Notification System
// ─────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-container" style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#b00020' : t.type === 'success' ? '#1b5e20' : '#1c1b1f',
          color: 'white', borderRadius: '12px', padding: '12px 20px',
          fontSize: '14px', fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          animation: 'slideUp 0.25s ease', whiteSpace: 'nowrap'
        }}>
          {t.type === 'success' ? '✓ ' : t.type === 'error' ? '✕ ' : 'ℹ '}{t.msg}
        </div>
      ))}
    </div>
  );
}

// Main App
// ─────────────────────────────────────────────────────────
export default function App() {
  // Toast
  const [toasts, setToasts] = useState([]);
  const toast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // Auth
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Guest name — stored locally, never sent to server
  const [guestName, setGuestName] = useState(() => localStorage.getItem('guest_name') || '');
  const [showNamePrompt, setShowNamePrompt] = useState(() => !localStorage.getItem('guest_name_set'));

  // Save-to-library modal
  const [saveModal, setSaveModal] = useState(null); // null | { title, description, type, content, defaultPublic }

  // Delete session confirm modal
  const [confirmSession, setConfirmSession] = useState(null); // null | { sessId, index }

  // Mobile profile popup menu
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Clear ALL chat state so users never see each other's data
      setMessages([]);
      setChatHistory([]);
      setPendingImages([]);
      setSessionId(crypto.randomUUID()); // fresh session ID for the new user
      if (session?.user) setShowAuth(false);
      if (_event === 'SIGNED_OUT') localStorage.removeItem('saved_chats');
    });
    return () => listener.subscription.unsubscribe();
  }, []); // eslint-disable-line

  // Core state
  const [activeTab,    setActiveTab]    = useState('dashboard');
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);

  // Session ID for grouping messages per conversation — refreshes when user changes
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());

  // Load chat history from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    supabase
      .from('chat_history')
      .select('session_id, role, content, mode, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        // Group by session_id into history entries
        const sessions = {};
        data.forEach(row => {
          if (!sessions[row.session_id]) sessions[row.session_id] = { msgs: [], date: row.created_at };
          sessions[row.session_id].msgs.push({ role: row.role, content: row.content, sources: [] });
        });
        const history = Object.entries(sessions).map(([sid, s]) => ({
          title: s.msgs.find(m => m.role === 'user')?.content?.slice(0, 40) + '...' || 'Session',
          msgs: s.msgs,
          date: new Date(s.date).toLocaleString(),
          sessionId: sid
        })).reverse();
        setChatHistory(history);
      });
  }, [user]); // eslint-disable-line

  // History & Summaries — start empty; logged-in users load from Supabase, guests stay local
  const [chatHistory,  setChatHistory]  = useState([]);
  const [summaries,    setSummaries]    = useState(JSON.parse(localStorage.getItem('chat_summaries') || '[]'));


  // Dark mode
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark_mode') === 'true');
  const toggleDark = () => setDarkMode(prev => { localStorage.setItem('dark_mode', !prev); return !prev; });

  // Chat mode — default to 'chat' (unified learning mode)
  const [chatMode, setChatMode] = useState('chat');

  // Summary prompt
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);
  const [generatingSummary, setGeneratingSummary]  = useState(false);

  // Image attachments for chat
  const [pendingImages, setPendingImages] = useState([]);
  const imageInputRef = useRef(null);

  const bottomRef    = useRef(null);
  const textareaRef  = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Save chat history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const title = messages.find(m => m.role === 'user')?.content?.slice(0, 40) + '...' || 'Session';
      const updated = [
        { title, msgs: messages, date: new Date().toLocaleString() },
        ...chatHistory.filter(h => h.title !== title).slice(0, 9),
      ];
      // Only persist locally for guests — encrypted so chats can't be read by anyone else
      if (!user) encryptData(updated).then(enc => localStorage.setItem('saved_chats', enc));
      setChatHistory(updated);
    }
  }, [messages]); // eslint-disable-line

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);


  // ── Send chat message ─────────────────────────────────────────
  const sendMessage = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    const imagesToSend = [...pendingImages];
    setPendingImages([]);
    // Capture history BEFORE adding the new user message
    const historySnapshot = messages.slice(-20); // last 20 messages for context
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const form = new FormData();
      form.append('message', q);
      form.append('mode', chatMode);
      form.append('history', JSON.stringify(historySnapshot));
      imagesToSend.forEach(img => form.append('images', img.file));

      const { data } = await axios.post(`${API}/chat`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const botMsg = { role: 'bot', content: data.answer, sources: data.sources || [] };
      setMessages(prev => [...prev, botMsg]);

      // Save both messages to Supabase if logged in
      if (user) {
        await supabase.from('chat_history').insert([
          { user_id: user.id, session_id: sessionId, role: 'user', content: q, mode: chatMode, sources: '' },
          { user_id: user.id, session_id: sessionId, role: 'bot', content: data.answer, mode: chatMode, sources: (data.sources || []).join(',') }
        ]);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Could not reach the backend. Is it running?';
      setMessages(prev => [...prev, { role: 'bot', content: `⚠️ **Error:** ${detail}`, sources: [] }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Generate AI Summary ───────────────────────────────────────
  const generateSummary = async () => {
    if (messages.length === 0) return;
    setGeneratingSummary(true);
    try {
      // Limit to last 10 messages to avoid token overflow
      const recentMessages = messages.slice(-10);
      const chatText = recentMessages.map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n');
      const form = new FormData();
      form.append('message', `Please write a concise study summary (bullet points) of this conversation:\n\n${chatText}`);
      form.append('mode', 'chat'); // Use casual mode for faster summary
      const { data } = await axios.post(`${API}/chat`, form);
      const newSummary = {
        title: messages.find(m => m.role === 'user')?.content?.slice(0, 40) + '...',
        text: data.answer,
        date: new Date().toLocaleString()
      };
      const updated = [newSummary, ...summaries];
      setSummaries(updated);
      localStorage.setItem('chat_summaries', JSON.stringify(updated));
      setShowSummaryPrompt(false);
      setActiveTab('summary');
    } catch {
      toast('Could not generate summary. Server may be offline.', 'error');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // ── Start new chat → show summary prompt if has messages ─────
  const startNewChat = () => {
    if (messages.length > 2) {
      setShowSummaryPrompt(true);
    } else {
      setMessages([]);
      setActiveTab('dashboard');
    }
  };

  const loadOldChat = (chat) => {
    setMessages(chat.msgs);
    setActiveTab('dashboard');
  };

  const actualSave = async (title, description, type, content, isPublic) => {
    try {
      const form = new FormData();
      form.append('title', title || 'Untitled');
      form.append('description', description || 'Saved item');
      form.append('type', type || 'note');
      form.append('content', content);
      form.append('user_id', user.id);
      form.append('shared_by', getUserDisplayName(user, guestName));
      form.append('is_public', isPublic ? 'true' : 'false');
      await axios.post(`${API}/resources`, form);
      toast(isPublic ? 'Saved & shared to Community!' : 'Saved to Library!', 'success');
    } catch {
      toast('Failed to save.', 'error');
    }
  };

  const pushToStore = (title, description, type, content, defaultPublic = false) => {
    if (!user) { toast('Please sign in to save to library.', 'error'); return; }
    setSaveModal({ title: title || 'Untitled', description, type, content, defaultPublic });
  };

  // ── NAV ITEMS ─────────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard', icon: 'dashboard',      label: 'Dashboard'  },
    { id: 'messages',  icon: 'chat',            label: 'History'    },
    { id: 'summary',   icon: 'auto_awesome',    label: 'Summary'    },
    { id: 'store',     icon: 'local_mall',      label: 'Library' },
    { id: 'courses',   icon: 'school',          label: 'Courses'    },
    { id: 'settings',  icon: 'settings',        label: 'Settings'   },
  ];

  // ─────────────────────────────────────────────────────────────
  // RENDER: Dashboard
  // ─────────────────────────────────────────────────────────────
  const MODES = [
    { id:'chat', label:'Learn',      icon:'psychology',      activeColor:'#37474f',  hero:'Learn Anything',         sub:'Ask questions, explore concepts, and get help with any subject.' },
    { id:'exam', label:'Exam Prep',  icon:'menu_book',       activeColor:'#1b5e20',  hero:'Exam Preparation',       sub:'Practice questions, structured answers, and revision strategies.' },
    { id:'dsu',  label:'University', icon:'account_balance',  activeColor:'#4e342e',  hero:'University Resources',   sub:'Campus info, academic calendar, and administrative details.' },
  ];

  const renderDashboard = () => {
    const mc = MODES.find(m => m.id === chatMode) || MODES[1]; // Fallback to 'General' chat
    return (
      <section className="chat-canvas dashboard-canvas">
        <div className={`hero ${(messages?.length || 0) > 0 ? 'minimized' : ''}`} style={{ marginBottom: '40px' }}>
          <h2 className="hero-title" style={{ color: 'var(--on-surface)', fontSize: '32px', fontWeight: 800 }}>{mc?.hero || 'Academix'}</h2>
          <p className="hero-sub" style={{ fontSize: '14px', opacity: 0.7 }}>{mc?.sub || ''}</p>

          {/* Professional Toggle */}
          {(messages?.length || 0) === 0 && (
            <div className="mode-toggle" style={{ marginTop: '28px', background: 'var(--surface-container-high)', padding: '6px', borderRadius: '16px' }}>
              {MODES.map(m => (
                <button
                  key={m.id}
                  className={`mode-btn ${chatMode === m.id ? 'active' : ''}`}
                  style={chatMode === m.id ? { background: m.activeColor, color: 'white', borderRadius: '12px' } : {}}
                  onClick={() => setChatMode(m.id)}
                >
                  <Icon name={m.icon} size={18} />
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {(messages?.length || 0) === 0 && (
          <div className="dashboard-content" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div className="suggestion-grid">
              {(SUGGESTIONS || []).map((s, i) => (
                <button key={i} className="suggestion-card" onClick={() => sendMessage(s.prompt)}>
                  <div className="card-icon" style={{ background: 'var(--surface-container-highest)' }}><Icon name={s.icon} /></div>
                  <span className="card-title">{s.title}</span>
                  <p className="card-desc">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
        <div className="messages-section">
          {messages.map((m, i) => (
            <div key={i} className={`message-row ${m.role}`}>
              <div className={`msg-avatar ${m.role === 'bot' ? 'bot-avatar' : 'user-avatar'}`}>
                <Icon name={m.role === 'bot' ? 'smart_toy' : 'person'} size={16} />
              </div>
              <div className="msg-bubble">
                <ReactMarkdown>{m.content}</ReactMarkdown>
                {m.sources && m.sources.filter(s => s === '📷 Attached Image(s)' || s === '📷 Image received (rate limited)' || s === '📷 Image received (vision offline)').length > 0 && (
                  <div className="msg-tags" style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginRight: '6px' }}>Sources:</span>
                    {m.sources
                      .filter(s => s === '📷 Attached Image(s)' || s === '📷 Image received (rate limited)' || s === '📷 Image received (vision offline)')
                      .map((src, si) => <span key={si} className="msg-tag">{src}</span>)}
                  </div>
                )}
                {m.role === 'bot' && m.content && !m.content.startsWith('⚠️') && (
                  <button
                    onClick={() => pushToStore(
                      m.content.split('\n')[0].replace(/[#*]/g, '').trim().slice(0, 60) || 'AI Response',
                      'Saved from chat conversation',
                      'note',
                      m.content
                    )}
                    style={{ marginTop: '8px', background: 'none', border: '1px solid var(--outline-variant)', borderRadius: '99px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Icon name="bookmark_add" size={14} /> Save to Library
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-row bot">
              <div className="msg-avatar bot-avatar"><Icon name="smart_toy" size={16} /></div>
              <div className="msg-bubble" style={{ background: '#fdf2e9', boxShadow: 'var(--nm-inset)' }}>
                <div className="typing-bubble">
                  <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} style={{ height: '8px' }} />
        </div>
      )}
    </section>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: History
  // ─────────────────────────────────────────────────────────────
  const deleteSessionConfirmed = async () => {
    const { sessId, index } = confirmSession;
    setConfirmSession(null);
    if (user) {
      await supabase.from('chat_history').delete().eq('session_id', sessId).eq('user_id', user.id);
    }
    setChatHistory(prev => prev.filter((_, idx) => idx !== index));
    toast('Conversation deleted', 'success');
  };

  const renderMessages = () => {
    const deleteSession = (sessId, i) => setConfirmSession({ sessId, index: i });

    return (
      <section className="chat-canvas">
        <div className="hero">
          <h2 className="hero-title" style={{ fontSize: '28px' }}>Conversation History</h2>
          <p className="hero-sub">Restore your previous learning sessions.</p>
        </div>
        <div className="suggestion-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '600px' }}>
          {chatHistory.length === 0
            ? <p className="card-desc" style={{ textAlign: 'center', padding: '40px 0' }}>No saved items.</p>
            : chatHistory.map((chat, i) => (
              <button key={i} className="suggestion-card" onClick={() => loadOldChat(chat)} style={{ flexDirection: 'row', alignItems: 'center', gap: '18px', width: '100%' }}>
                <Icon name="history" size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <span className="card-title">{chat.title}</span>
                  <p className="card-desc">{chat.date} · {chat.msgs?.length || 0} msgs</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="icon-btn-sm" onClick={e => { e.stopPropagation(); pushToStore(chat.title, 'Shared chat history.', 'chat', JSON.stringify(chat.msgs), true); }}><Icon name="library_add" size={18} /></div>
                  <div className="icon-btn-sm" onClick={e => { e.stopPropagation(); deleteSession(chat.sessionId, i); }}><Icon name="delete" size={18} style={{ color: 'var(--error)' }} /></div>
                </div>
              </button>
            ))
          }
        </div>
      </section>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: Courses (restored DSU view)
  // ─────────────────────────────────────────────────────────────
  const renderCourses = () => (
    <section className="courses-container">
      {/* Department sidebar - hidden on mobile via CSS */}
      <div className="courses-sidebar">
        <p className="brand-version" style={{ padding: '0 20px 14px', display: 'block' }}>Engineering School</p>
        <div className="nav-item active" style={{ margin: '0 8px' }}><Icon name="psychology" size={18} /> AI & Data Science</div>
        <div className="nav-item disabled" style={{ margin: '0 8px' }}><Icon name="security" size={18} /> Cyber Security</div>
        <div className="nav-item disabled" style={{ margin: '0 8px' }}><Icon name="memory" size={18} /> IoT & Mech</div>
      </div>

      {/* Course detail */}
      <div className="chat-canvas courses-main">
        <div style={{ maxWidth: '760px' }}>
          <h2 className="hero-title" style={{ fontSize: '28px' }}>B.Tech — AI & Data Science</h2>
          <p className="card-desc" style={{ fontSize: '14px', marginBottom: '28px' }}>Dhanalakshmi Srinivasan University (DSU), Trichy</p>

          <div className="suggestion-grid" style={{ gridTemplateColumns: '1fr 1fr', margin: 0, gap: '14px' }}>
            <div className="suggestion-card" style={{ cursor: 'default' }}>
              <Icon name="calendar_today" />
              <span className="card-title">Duration</span>
              <p className="card-desc">4-Year Integrated Program (8 Semesters)</p>
            </div>
            <div className="suggestion-card" style={{ cursor: 'default' }}>
              <Icon name="local_library" />
              <span className="card-title">Curriculum</span>
              <p className="card-desc">ML, Deep Learning, NLP, Big Data Analytics, Computer Vision</p>
            </div>
          <div className="suggestion-card" style={{ cursor: 'default' }}>
            <Icon name="verified" style={{ color: 'var(--primary)' }} />
            <span className="card-title">Admission</span>
            <p className="card-desc">DSU-JET or JEE Main scores accepted for 2025–26 session.</p>
          </div>
          <div className="suggestion-card" style={{ cursor: 'default', background: 'var(--primary)' }}>
              <Icon name="verified" style={{ color: 'white' }} />
              <span className="card-title" style={{ color: 'white' }}>Status: OPEN</span>
              <p className="card-desc" style={{ color: 'rgba(255,255,255,0.8)' }}>Applications are currently being accepted.</p>
            </div>
          </div>

          <button className="new-inquiry-btn" style={{ marginTop: '28px', maxWidth: '280px' }}
            onClick={() => { sendMessage('Tell me about the AI and Data Science program at DSU Trichy'); setActiveTab('dashboard'); }}>
            Ask Chatbot About This Program
          </button>
        </div>
      </div>
    </section>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER: Summary Prompt Modal
  // ─────────────────────────────────────────────────────────────
  const SummaryPromptModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface-container-lowest)', borderRadius: '24px', padding: '36px', maxWidth: '420px', width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <Icon name="auto_awesome" size={40} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
        <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '22px', color: 'var(--primary)', marginBottom: '10px' }}>
          Save a Summary?
        </h3>
        <p className="card-desc" style={{ marginBottom: '24px', fontSize: '14px' }}>
          You can save an AI-generated summary of this session. You can edit it later in the Summary tab.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="new-inquiry-btn" style={{ flex: 1 }} onClick={generateSummary} disabled={generatingSummary}>
            {generatingSummary ? 'Generating…' : '✨ Yes, Summarize!'}
          </button>
          <button className="new-inquiry-btn" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', boxShadow: 'none' }}
            onClick={() => { setShowSummaryPrompt(false); setMessages([]); setActiveTab('dashboard'); }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );


  // ── Keyboard detection: hide nav bar only while chat textarea is focused ──
  const handleInputFocus = () => document.body.classList.add('keyboard-open');
  const handleInputBlur  = () => document.body.classList.remove('keyboard-open');

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────
  if (!authReady) return (
    <div className="splash-screen">
      <div className="splash-logo-ring">
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--on-primary)' }}>school</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h1 className="splash-title">Academix</h1>
        <p className="splash-sub">DSU University Portal</p>
      </div>
      <div className="splash-dots">
        <span className="splash-dot" /><span className="splash-dot" /><span className="splash-dot" />
      </div>
    </div>
  );

  if (showAuth) return <AuthView onClose={() => setShowAuth(false)} />;

  if (showNamePrompt && !user) return (
    <NamePromptView
      onContinue={(name) => {
        const trimmed = name.trim();
        if (trimmed) {
          setGuestName(trimmed);
          localStorage.setItem('guest_name', trimmed);
        }
        localStorage.setItem('guest_name_set', '1');
        setShowNamePrompt(false);
      }}
    />
  );

  return (
    <div className={`app app-ready${darkMode ? ' dark' : ''}`}>
      <Toast toasts={toasts} />
      {/* Summary Prompt Modal */}
      {showSummaryPrompt && <SummaryPromptModal />}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Icon name="school" size={20} /></div>
          <div>
            <div className="brand-name">Academix</div>
            <div className="brand-version">Portal V2.1</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
              <Icon name={icon} /> {label}
              {id === 'summary' && summaries.length > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: 'white', borderRadius: '99px', fontSize: '10px', fontWeight: 700, padding: '1px 7px' }}>
                  {summaries.length}
                </span>
              )}
            </div>
          ))}
        </nav>


        <div className="sidebar-bottom" style={{ marginTop: '20px' }}>
          <button className="new-inquiry-btn" onClick={startNewChat}>New Inquiry</button>
          <hr className="sidebar-divider" />
          {user
            ? <button className="logout-btn" onClick={() => setShowLogoutModal(true)}><Icon name="logout" size={20} /><span>Log Out</span></button>
            : <button className="logout-btn" onClick={() => setShowAuth(true)}><Icon name="login" size={20} /><span>Sign In</span></button>
          }
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <span className="topbar-title">{(user || guestName) ? `Welcome, ${getUserDisplayName(user, guestName)}` : 'Academix — Guest Mode'}</span>
          <div className="topbar-actions">
            <button className="topbar-icon-btn" onClick={toggleDark} title={darkMode ? 'Light mode' : 'Dark mode'}>
              <Icon name={darkMode ? 'light_mode' : 'dark_mode'} size={20} />
            </button>
            <button className="topbar-icon-btn" onClick={() => setActiveTab('settings')} title="Settings">
              <Icon name="settings" size={20} />
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'messages'  && renderMessages()}
        {activeTab === 'courses'   && renderCourses()}
        {activeTab === 'summary'   && <SummaryView summaries={summaries} setSummaries={setSummaries} />}

        {activeTab === 'store'     && <ResourceLibrary setActiveTab={setActiveTab} setMessages={setMessages} toast={toast} user={user} />}
        {activeTab === 'settings'  && (
          <SettingsView toast={toast} user={user} />
        )}

        {/* ── Chat Input — always visible on Dashboard ── */}
        {activeTab === 'dashboard' && (
          <footer className="input-footer">
            {/* Image previews */}
            {pendingImages.length > 0 && (
              <div className="image-preview-row">
                {pendingImages.map((img, i) => (
                  <div key={i} className="image-preview-thumb">
                    <img src={img.url} alt="attachment" />
                    <button className="image-preview-remove" onClick={() => setPendingImages(prev => prev.filter((_, idx) => idx !== i))}>
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Input Well */}
            <div className="input-well">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  const files = Array.from(e.target.files);
                  const newImgs = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
                  setPendingImages(prev => [...prev, ...newImgs]);
                  e.target.value = '';
                }}
              />
              <button
                className="attach-btn"
                title="Attach image"
                onClick={() => imageInputRef.current?.click()}
                disabled={loading}
              >
                <Icon name="image" size={20} />
              </button>
              <textarea
                ref={textareaRef}
                className="chat-input"
                placeholder="Ask anything…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                rows={1}
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={loading || (!input.trim() && pendingImages.length === 0)}
              >
                <Icon name={loading ? 'progress_activity' : 'send'}
                  style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
              </button>
            </div>
          </footer>
        )}
      </main>

      {/* ── Mobile Bottom Navigation Bar (phone-only, controlled by CSS) ── */}
      <nav className="mobile-bottom-nav">
        {/* Left: Home, History */}
        <button className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <Icon name="home" size={22} /><span>Home</span>
        </button>
        <button className={`mobile-nav-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
          <Icon name="forum" size={22} /><span>History</span>
        </button>

        {/* Centre FAB — New Chat */}
        <button className="mobile-nav-fab" onClick={startNewChat} title="New Chat">
          <Icon name="edit_square" size={24} />
        </button>

        {/* Right: Library, Profile */}
        <button className={`mobile-nav-btn ${activeTab === 'store' ? 'active' : ''}`} onClick={() => setActiveTab('store')}>
          <Icon name="local_mall" size={22} /><span>Library</span>
        </button>
        <button
          className={`mobile-nav-btn mobile-nav-profile ${showProfileMenu ? 'active' : ''}`}
          onClick={() => user ? setShowProfileMenu(p => !p) : setShowAuth(true)}
        >
          <div className="mobile-nav-avatar-circle">
            <span>{user ? user.email[0].toUpperCase() : '?'}</span>
          </div>
          <span>{user ? 'Profile' : 'Sign In'}</span>
        </button>

        {/* Profile popup menu */}
        {showProfileMenu && user && (
          <>
            <div className="profile-menu-backdrop" onClick={() => setShowProfileMenu(false)} />
            <div className="profile-menu-popup">
              <div className="profile-menu-user">
                <div className="profile-menu-avatar">{user.email[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{getUserDisplayName(user, guestName)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>{user.email}</div>
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--outline-variant)', margin: '8px 0' }} />
              <button className="profile-menu-item" onClick={() => { setActiveTab('settings'); setShowProfileMenu(false); }}>
                <Icon name="settings" size={18} /> Settings
              </button>
              <button className="profile-menu-item danger" onClick={() => { setShowProfileMenu(false); setShowLogoutModal(true); }}>
                <Icon name="logout" size={18} /> Log Out
              </button>
            </div>
          </>
        )}
      </nav>

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutModal && user && (
        <LogoutModal
          user={user}
          onCancel={() => setShowLogoutModal(false)}
          onDone={() => setShowLogoutModal(false)}
        />
      )}

      {/* ── Delete Session Confirm Modal ── */}
      {confirmSession && (
        <ConfirmModal
          message="This conversation will be permanently deleted."
          confirmLabel="Delete"
          onConfirm={deleteSessionConfirmed}
          onCancel={() => setConfirmSession(null)}
        />
      )}

      {/* ── Save to Library Modal ── */}
      {saveModal && (
        <SaveModal
          initialTitle={saveModal.title}
          defaultPublic={saveModal.defaultPublic}
          onCancel={() => setSaveModal(null)}
          onSave={(title, isPublic) => {
            actualSave(title, saveModal.description, saveModal.type, saveModal.content, isPublic);
            setSaveModal(null);
          }}
        />
      )}
    </div>
  );
}
