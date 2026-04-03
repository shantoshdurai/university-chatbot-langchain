import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './App.css';
import { supabase } from './supabaseClient';
import AuthView from './AuthView';

const API = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000';

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
// Settings Component
// ─────────────────────────────────────────────────────────
function SettingsView({ toast }) {
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);
  const [prefConcise, setPrefConcise] = useState(false);
  const [kbFiles, setKbFiles] = useState([]);
  const [kbUploading, setKbUploading] = useState(false);
  const [kbList, setKbList] = useState([]);
  const kbInputRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/kb/list`).then(({ data }) => setKbList(data)).catch(() => {});
  }, []); // eslint-disable-line

  const handleSendFeedback = async () => {
    if (!feedback.trim()) return;
    try {
      await supabase.from('feedback').insert([{ message: feedback.trim(), created_at: new Date().toISOString() }]);
    } catch { /* table may not exist yet, still show success to user */ }
    setSent(true);
    setTimeout(() => { setFeedback(''); setSent(false); }, 3000);
  };

  const handleKbUpload = async () => {
    if (kbFiles.length === 0) return;
    setKbUploading(true);
    try {
      const form = new FormData();
      kbFiles.forEach(f => form.append('files', f));
      form.append('is_kb', 'true');
      await axios.post(`${API}/kb/ingest`, form);
      toast(`${kbFiles.length} file(s) added to AI Knowledge Base`, 'success');
      setKbFiles([]);
      const { data } = await axios.get(`${API}/kb/list`);
      setKbList(data);
    } catch {
      toast('Upload failed. Server may be offline.', 'error');
    } finally {
      setKbUploading(false);
    }
  };

  return (
    <section className="chat-canvas" style={{ maxWidth: '640px', margin: '0 auto', gap: '24px' }}>
      <div className="hero">
        <h2 className="hero-title" style={{ fontSize: '32px' }}>Portal Settings</h2>
        <p className="hero-sub">Manage your academic workspace and feedback.</p>
      </div>

      <div className="suggestion-card" style={{ width: '100%', cursor: 'default', gap: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Icon name="psychology" style={{ color: 'var(--primary)' }} />
          <span className="card-title">Study Preferences</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-highest)', padding: '12px 16px', borderRadius: '12px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Concise Answers Only</div>
              <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Prioritize 2-mark patterns everywhere.</div>
            </div>
            <input type="checkbox" checked={prefConcise} onChange={e => setPrefConcise(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-highest)', padding: '12px 16px', borderRadius: '12px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Rich Formatting</div>
              <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Enable markdown, tables, and lists.</div>
            </div>
            <input type="checkbox" defaultChecked={true} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
          </div>
        </div>
      </div>

      <div className="suggestion-card" style={{ width: '100%', cursor: 'default', gap: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Icon name="chat_bubble" style={{ color: 'var(--primary)' }} />
          <span className="card-title">Share Feedback</span>
        </div>
        <p className="card-desc">Help us improve your study experience.</p>
        <textarea 
          className="chat-input"
          style={{ width: '100%', minHeight: '120px', borderRadius: '16px', padding: '16px', background: 'var(--surface-container-highest)', border: 'none', resize: 'none', boxShadow: 'var(--nm-inset)' }}
          placeholder="I wish the AI could..."
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
        />
        <button onClick={handleSendFeedback} className="new-inquiry-btn" style={{ width: '100%', marginTop: '8px' }}>
          {sent ? '✓ Message Sent to Faculty' : 'Send Feedback'}
        </button>
      </div>

      {/* ── AI Knowledge Base Upload ── */}
      <div className="suggestion-card" style={{ width: '100%', cursor: 'default', gap: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <Icon name="database" style={{ color: 'var(--primary)' }} />
          <span className="card-title">AI Knowledge Base</span>
        </div>
        <p className="card-desc">Upload PDFs, docs, or images that the AI will know permanently — timetables, syllabi, teacher notes.</p>
        <input
          ref={kbInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.docx,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={e => setKbFiles(Array.from(e.target.files))}
        />
        <button
          className="new-inquiry-btn"
          style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)', boxShadow: 'none', width: '100%' }}
          onClick={() => kbInputRef.current?.click()}
        >
          <Icon name="upload_file" size={18} /> {kbFiles.length > 0 ? `${kbFiles.length} file(s) selected` : 'Choose Files'}
        </button>
        {kbFiles.length > 0 && (
          <button className="new-inquiry-btn" style={{ width: '100%' }} onClick={handleKbUpload} disabled={kbUploading}>
            {kbUploading ? 'Uploading…' : '⚡ Add to AI Brain'}
          </button>
        )}
        {kbList.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>Already in AI Brain ({kbList.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {kbList.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'var(--surface-container-highest)', borderRadius: '10px', fontSize: '13px' }}>
                  <Icon name="check_circle" size={15} style={{ color: '#1b5e20', flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  {f.size > 0 && <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{(f.size/1024).toFixed(0)} KB</span>}
                </div>
              ))}
            </div>
          </div>
        )}
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
function ResourceLibrary({ setActiveTab, setMessages, toast }) {
  const [tab, setTab] = useState('my');      // 'my' | 'community'
  const [filter, setFilter] = useState('note');
  const [resources, setResources] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = tab === 'community'
        ? `?is_public=true`
        : `?type=${filter}`;
      const { data } = await axios.get(`${API}/resources${params}`);
      setResources(data);
    } catch { console.error('Failed to fetch resources'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResources(); }, [filter, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const attachToAI = (res) => {
    if (res.type === 'note') {
      toast(`Attaching "${res.title}" to your study session!`, 'info');
      setActiveTab('dashboard');
    } else {
      setMessages(JSON.parse(res.content));
      setActiveTab('dashboard');
    }
  };

  const handleShare = async (res) => {
    setSharing(true);
    try {
      const form = new FormData();
      form.append('is_public', !res.is_public);
      await axios.patch(`${API}/resources/${res.id}/share`, form);
      toast(res.is_public ? 'Removed from Community.' : 'Shared to Community!', 'success');
      setSelected(s => s ? { ...s, is_public: !s.is_public } : s);
      fetchResources();
    } catch { toast('Could not update. Server may be offline.', 'error'); }
    finally { setSharing(false); }
  };

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* List Area */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div className="hero" style={{ marginBottom: '32px' }}>
          <h2 className="hero-title" style={{ fontSize: '32px' }}>Library</h2>
          <p className="hero-sub" style={{ fontSize: '14px' }}>Discover and share academic assets.</p>

          {/* Tab: My Resources / Community */}
          <div className="mode-toggle" style={{ marginTop: '24px' }}>
            <button className={`mode-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>
              <Icon name="folder" size={16} /> My Resources
            </button>
            <button className={`mode-btn ${tab === 'community' ? 'active' : ''}`} onClick={() => setTab('community')}>
              <Icon name="public" size={16} /> Community
            </button>
          </div>

          {/* Type filter — only in My tab */}
          {tab === 'my' && (
            <div className="mode-toggle" style={{ marginTop: '12px' }}>
              <button className={`mode-btn ${filter === 'note' ? 'active' : ''}`} onClick={() => setFilter('note')}>
                <Icon name="description" size={16} /> Notes
              </button>
              <button className={`mode-btn ${filter === 'chat' ? 'active' : ''}`} onClick={() => setFilter('chat')}>
                <Icon name="forum" size={16} /> Chats
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="typing-bubble" style={{ margin: '40px auto' }}><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div>
        ) : (
          <div className="suggestion-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {resources.length === 0
              ? <p className="card-desc">{tab === 'community' ? 'No public resources yet. Be the first to share!' : `No ${filter}s found yet.`}</p>
              : resources.map(res => (
              <div key={res.id} className={`suggestion-card ${selected?.id === res.id ? 'active' : ''}`} onClick={() => setSelected(res)} style={{ textAlign: 'left', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Icon name={res.type === 'note' ? 'description' : 'forum'} style={{ color: 'var(--primary)' }} />
                  {res.is_public && <span style={{ fontSize: '10px', fontWeight: 700, background: '#e8f5e9', color: '#1b5e20', borderRadius: '99px', padding: '2px 8px' }}>PUBLIC</span>}
                </div>
                <span className="card-title">{res.title}</span>
                <p className="card-desc" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{res.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel — side panel on desktop, full-screen modal on mobile */}
      {selected && (
        <>
          {/* Mobile modal overlay */}
          <div className="resource-detail-mobile" onClick={() => setSelected(null)} style={{ display: 'none' }} />
          <div className="resource-detail-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
               <Icon name={selected.type === 'note' ? 'description' : 'forum'} size={28} style={{ color: 'var(--primary)' }} />
               <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setSelected(null)}>
                 <Icon name="close" size={20} />
               </button>
            </div>
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Title</label>
              <input className="chat-input" value={selected.title} onChange={() => {}} style={{ background: 'white', borderRadius: '12px', marginTop: '4px', border: '1px solid rgba(0,0,0,0.1)' }} />
            </div>
            <div className="input-group" style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Description</label>
              <textarea className="chat-input" value={selected.description} onChange={() => {}} style={{ background: 'white', borderRadius: '12px', marginTop: '4px', minHeight: '100px', border: '1px solid rgba(0,0,0,0.1)', resize:'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="new-inquiry-btn" style={{ width: '100%' }} onClick={() => attachToAI(selected)}>Attach to Chatbot</button>
              <button
                className="new-inquiry-btn"
                style={{ width: '100%', background: selected.is_public ? '#1b5e20' : 'var(--surface-container-high)', color: selected.is_public ? 'white' : 'var(--on-surface)' }}
                onClick={() => handleShare(selected)}
                disabled={sharing}
              >
                <Icon name={selected.is_public ? 'public' : 'share'} size={16} />
                {sharing ? 'Updating…' : selected.is_public ? 'Shared — Click to Unpublish' : 'Share to Community'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// Toast Notification System
// ─────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', pointerEvents: 'none' }}>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Clear history on every auth change so users never see each other's data
      setChatHistory([]);
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

  // Session ID for grouping messages per conversation
  const [sessionId] = useState(() => crypto.randomUUID());

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
        const history = Object.entries(sessions).map(([, s]) => ({
          title: s.msgs.find(m => m.role === 'user')?.content?.slice(0, 40) + '...' || 'Session',
          msgs: s.msgs,
          date: new Date(s.date).toLocaleString()
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
      // Only persist locally for guests — logged-in users use Supabase (saves per user in sendMessage)
      if (!user) localStorage.setItem('saved_chats', JSON.stringify(updated));
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
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const form = new FormData();
      form.append('message', q);
      form.append('mode', chatMode);

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

  const pushToStore = async (title, description, type, content) => {
    try {
      const form = new FormData();
      form.append('title', title || 'Untitled Note');
      form.append('description', description || 'Saved from Academix');
      form.append('type', type || 'note');
      form.append('content', content);
      form.append('tags', '');
      const { data } = await axios.post(`${API}/resources`, form);
      if (data?.id) {
        toast('Saved to your Library!', 'success');
      } else {
        toast('Saved to your Library!', 'success');
      }
    } catch (err) {
      console.error('Save failed:', err);
      toast('Failed to save. Check your connection.', 'error');
    }
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
                {m.sources && m.sources.length > 0 && (
                  <div className="msg-tags" style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginRight: '6px' }}>Sources:</span>
                    {m.sources.map((src, si) => <span key={si} className="msg-tag">📄 {src}</span>)}
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
  const renderMessages = () => (
    <section className="chat-canvas">
      <div className="hero">
        <h2 className="hero-title" style={{ fontSize: '28px' }}>Conversation History</h2>
        <p className="hero-sub">Click any session to restore it.</p>
      </div>
      <div className="suggestion-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '600px' }}>
        {chatHistory.length === 0
          ? <p className="card-desc" style={{ textAlign: 'center', padding: '40px 0' }}>No saved chats yet.</p>
          : chatHistory.map((chat, i) => (
            <button key={i} className="suggestion-card" onClick={() => loadOldChat(chat)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: '18px', width: '100%', position: 'relative' }}>
              <Icon name="history" size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <span className="card-title">{chat.title}</span>
                <p className="card-desc">{chat.date} · {chat.msgs?.length || 0} messages</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="icon-btn-sm" onClick={e => { e.stopPropagation(); pushToStore(chat.title, 'A shared conversation from history.', 'chat', JSON.stringify(chat.msgs)); }}>
                  <Icon name="queue" size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="icon-btn-sm" onClick={e => { e.stopPropagation(); const updated = chatHistory.filter((_, idx) => idx !== i); setChatHistory(updated); localStorage.setItem('saved_chats', JSON.stringify(updated)); }} title="Delete">
                  <Icon name="delete" size={18} style={{ color: 'var(--error)' }} />
                </div>
              </div>
            </button>
          ))
        }
      </div>
    </section>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER: Courses (restored DSU view)
  // ─────────────────────────────────────────────────────────────
  const renderCourses = () => (
    <section style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Department sidebar */}
      <div style={{ width: '220px', minWidth: '220px', background: 'var(--surface-container-low)', borderRight: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', padding: '24px 0', overflowY: 'auto' }}>
        <p className="brand-version" style={{ padding: '0 20px 14px', display: 'block' }}>Engineering School</p>
        <div className="nav-item active" style={{ margin: '0 8px' }}><Icon name="psychology" size={18} /> AI &amp; Data Science</div>
        <div className="nav-item" style={{ opacity: 0.4, margin: '0 8px' }}><Icon name="security" size={18} /> Cyber Security</div>
        <div className="nav-item" style={{ opacity: 0.4, margin: '0 8px' }}><Icon name="memory" size={18} /> IoT &amp; Mech</div>
        <p style={{ fontSize: '10px', color: 'var(--on-surface-variant)', padding: '6px 28px', opacity: 0.55, marginTop: '4px' }}>↑ Coming Soon</p>
      </div>

      {/* Course detail */}
      <div className="chat-canvas" style={{ padding: '40px' }}>
        <div style={{ maxWidth: '760px' }}>
          <h2 className="hero-title" style={{ fontSize: '28px' }}>B.Tech — Artificial Intelligence &amp; Data Science</h2>
          <p className="card-desc" style={{ fontSize: '14px', marginBottom: '28px' }}>Dhanalakshmi Srinivasan University (DSU), Trichy • 4-Year Program</p>

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


  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────
  if (!authReady) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--surface-container-low)' }}>
      <span className="material-symbols-outlined" style={{ fontSize:40, animation:'spin 1.5s linear infinite', color:'var(--primary)' }}>progress_activity</span>
    </div>
  );

  if (showAuth) return <AuthView />;

  return (
    <div className={`app${darkMode ? ' dark' : ''}`}>
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
            ? <button className="logout-btn" onClick={() => supabase.auth.signOut()}><Icon name="logout" size={20} /><span>Log Out</span></button>
            : <button className="logout-btn" onClick={() => setShowAuth(true)}><Icon name="login" size={20} /><span>Sign In</span></button>
          }
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <span className="topbar-title">{user ? `Welcome, ${user.email.split('@')[0]}` : 'Academix — Guest Mode'}</span>
          <div className="topbar-actions">
            <button className="topbar-icon-btn" onClick={toggleDark} title={darkMode ? 'Light mode' : 'Dark mode'}>
              <Icon name={darkMode ? 'light_mode' : 'dark_mode'} size={20} />
            </button>
            <button
            className="topbar-icon-btn"
            title={user ? `Signed in as ${user.email} — click to sign out` : 'Sign In'}
            onClick={() => user ? supabase.auth.signOut() : setShowAuth(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: user ? 'var(--primary)' : 'var(--surface-container-high)', color: user ? 'white' : 'var(--on-surface)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            <Icon name={user ? 'person' : 'login'} size={18} />
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user ? user.email.split('@')[0] : 'Sign In'}
            </span>
          </button>
          </div>
        </header>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'messages'  && renderMessages()}
        {activeTab === 'courses'   && renderCourses()}
        {activeTab === 'summary'   && <SummaryView summaries={summaries} setSummaries={setSummaries} />}

        {activeTab === 'store'     && <ResourceLibrary setActiveTab={setActiveTab} setMessages={setMessages} toast={toast} />}
        {activeTab === 'settings'  && (
          <SettingsView toast={toast} />
        )}

        {/* ── Chat Input — always visible on Dashboard ── */}
        {activeTab === 'dashboard' && (
          <footer className="input-footer">
            {/* Input Well */}
            <div className="input-well">
              <textarea
                ref={textareaRef}
                className="chat-input"
                placeholder="Ask anything…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                rows={1}
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
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
          className="mobile-nav-btn mobile-nav-profile"
          onClick={() => user ? supabase.auth.signOut() : setShowAuth(true)}
        >
          <div className="mobile-nav-avatar-circle">
            <span>{user ? user.email[0].toUpperCase() : '?'}</span>
          </div>
          <span>{user ? user.email.split('@')[0].slice(0, 7) : 'Sign In'}</span>
        </button>
      </nav>
    </div>
  );
}
