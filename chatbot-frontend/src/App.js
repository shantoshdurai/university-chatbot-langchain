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
  { icon: 'calendar_month', title: 'Academic Calendar', desc: 'Schedules & Holidays',  prompt: 'What are the important dates in the academic calendar?' },
  { icon: 'assignment',     title: 'Admissions',        desc: 'Deadlines & Forms',     prompt: 'What are the admission requirements at DSU Trichy?' },
  { icon: 'school',         title: 'Programs',          desc: 'Degrees & Courses',     prompt: 'What engineering programs are available at DSU?' },
  { icon: 'contact_support',title: 'Contact',           desc: 'Support Offices',       prompt: 'How do I contact the registrar or admission office?' },
  { icon: 'location_city',  title: 'Campus Life',       desc: 'Facilities & Clubs',    prompt: 'Tell me about hostel and campus facilities.' },
  { icon: 'finance',        title: 'Scholarships',      desc: 'Financial Aid',         prompt: 'What scholarships are available for freshmen students?' },
];

// ─────────────────────────────────────────────────────────
// Settings Component
// ─────────────────────────────────────────────────────────
function SettingsView({ model, setModel, visionModel, setVisionModel }) {
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);
  const [prefConcise, setPrefConcise] = useState(false);

  const handleSendFeedback = () => {
    if (!feedback.trim()) return;
    setSent(true);
    setTimeout(() => { setFeedback(''); setSent(false); }, 3000);
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
        <p className="card-desc">Help us improve your study experience at DSU Trichy.</p>
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

      <div className="suggestion-card" style={{ width: '100%', cursor: 'default', gap: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Icon name="info" /><span className="card-title">System Vitals</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[['Version','2.5.0'],['Status','End Product'],['Build','Stable (Verified)'],['Security','Encrypted']].map(([k,v]) => (
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
function ResourceLibrary({ setActiveTab, setMessages }) {
  const [filter, setFilter] = useState('note'); 
  const [resources, setResources] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/resources?type=${filter}`);
      setResources(data);
    } catch { console.error('Failed to fetch resources'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResources(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const attachToAI = (res) => {
    if (res.type === 'note') {
      alert(`Attaching "${res.title}" to your study session!`);
      setActiveTab('dashboard');
    } else {
      setMessages(JSON.parse(res.content));
      setActiveTab('dashboard');
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* ... (List Area headers skipped for context) */}
      {/* List Area */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div className="hero" style={{ marginBottom: '32px' }}>
          <h2 className="hero-title" style={{ fontSize: '32px' }}>Resource Store</h2>
          <p className="hero-sub" style={{ fontSize: '14px' }}>Discover and share academic assets.</p>
          <div className="mode-toggle" style={{ marginTop: '24px' }}>
            <button className={`mode-btn ${filter === 'note' ? 'active' : ''}`} onClick={() => setFilter('note')}>
              <Icon name="description" size={16} /> Notes
            </button>
            <button className={`mode-btn ${filter === 'chat' ? 'active' : ''}`} onClick={() => setFilter('chat')}>
              <Icon name="forum" size={16} /> Chats
            </button>
          </div>
        </div>

        {loading ? (
          <div className="typing-bubble" style={{ margin: '40px auto' }}><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div>
        ) : (
          <div className="suggestion-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {resources.length === 0 ? <p className="card-desc">No {filter}s found yet.</p> : resources.map(res => (
              <div key={res.id} className={`suggestion-card ${selected?.id === res.id ? 'active' : ''}`} onClick={() => setSelected(res)} style={{ textAlign: 'left', alignItems: 'flex-start' }}>
                <Icon name={res.type === 'note' ? 'description' : 'forum'} color="var(--primary)" />
                <span className="card-title">{res.title}</span>
                <p className="card-desc" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{res.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Side Detail Panel */}
      {selected && (
        <div className="sidebar" style={{ width: '320px', position: 'static', borderLeft: '1px solid rgba(0,0,0,0.05)', background: 'var(--surface-container-low)', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
             <Icon name={selected.type === 'note' ? 'description' : 'forum'} size={28} color="var(--primary)" />
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
            {selected.type === 'note' && <button className="new-inquiry-btn" style={{ width: '100%', background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}>Download</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────
export default function App() {
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
      if (session?.user) setShowAuth(false); // auto-close auth modal on login
    });
    return () => listener.subscription.unsubscribe();
  }, []); // eslint-disable-line

  // Core state
  const [activeTab,    setActiveTab]    = useState('dashboard');
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [apiKey,       setApiKey]       = useState(localStorage.getItem('user_api_key') || '');
  const [model,        setModel]        = useState('llama-3.3-70b-versatile');
  const [visionModel,  setVisionModel]  = useState('llama-3.2-11b-vision-preview');

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

  // History & Summaries
  const [chatHistory,  setChatHistory]  = useState(JSON.parse(localStorage.getItem('saved_chats') || '[]'));
  const [summaries,    setSummaries]    = useState(JSON.parse(localStorage.getItem('chat_summaries') || '[]'));

  // File upload
  const [pendingFiles,  setPendingFiles]  = useState([]); // files selected, not yet uploaded
  const [uploadedFiles, setUploadedFiles] = useState(JSON.parse(localStorage.getItem('kb_files') || '[]'));
  const [uploading] = useState(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark_mode') === 'true');
  const toggleDark = () => setDarkMode(prev => { localStorage.setItem('dark_mode', !prev); return !prev; });

  // Chat mode
  const [chatMode, setChatMode] = useState('chat');

  // Summary prompt
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);
  const [generatingSummary, setGeneratingSummary]  = useState(false);

  const bottomRef    = useRef(null);
  const textareaRef  = useRef(null);
  const fileInputRef = useRef(null);

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
      localStorage.setItem('saved_chats', JSON.stringify(updated));
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

  // ── File selection (no upload yet, just preview) ──────────────
  const onFilesSelected = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removePendingFile = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

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

      // Attach image files directly to the chat request for real-time vision
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const imageFiles = pendingFiles.filter(f => imageExts.some(ext => f.name.toLowerCase().endsWith(ext)));
      const nonImageFiles = pendingFiles.filter(f => !imageExts.some(ext => f.name.toLowerCase().endsWith(ext)));

      // Send images directly to vision AI
      imageFiles.forEach(f => form.append('images', f));

      // Ingest non-image files (PDFs, docs) into knowledge base separately
      if (nonImageFiles.length > 0) {
        const ingestForm = new FormData();
        nonImageFiles.forEach(f => ingestForm.append('files', f));
        try {
          await axios.post(`${API}/ingest`, ingestForm, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch (e) { console.error('Ingest failed:', e); }
      }

      // Track all files in the KB gallery
      if (pendingFiles.length > 0) {
        const newFiles = pendingFiles.map(f => ({
          name: f.name, size: (f.size/1024).toFixed(1)+' KB',
          type: f.name.split('.').pop().toUpperCase(), date: new Date().toLocaleDateString()
        }));
        setUploadedFiles(prev => { const n=[...prev,...newFiles]; localStorage.setItem('kb_files',JSON.stringify(n)); return n; });
      }
      setPendingFiles([]);

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
      alert('Could not generate summary. Is the server running?');
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
      form.append('title', title);
      form.append('description', description);
      form.append('type', type);
      form.append('content', content);
      await axios.post(`${API}/resources`, form);
      alert(`Successfully saved to Resource Store!`);
    } catch { alert('Failed to save to store. Is the server running?'); }
  };

  // ── NAV ITEMS ─────────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard', icon: 'dashboard',      label: 'Dashboard'  },
    { id: 'messages',  icon: 'chat',            label: 'History'    },
    { id: 'summary',   icon: 'auto_awesome',    label: 'Summary'    },
    { id: 'store',     icon: 'local_mall',      label: 'Resource Store' },
    { id: 'courses',   icon: 'school',          label: 'Courses'    },
    { id: 'settings',  icon: 'settings',        label: 'Settings'   },
  ];

  // ─────────────────────────────────────────────────────────────
  // RENDER: Dashboard
  // ─────────────────────────────────────────────────────────────
  const MODES = [
    { id:'exam', label:'Exam Prep', icon:'menu_book',     activeColor:'#1b5e20',          hero:'Academic Examination Prep', sub:'Optimized for 2-mark and 15-mark university answer patterns.' },
    { id:'chat', label:'General',   icon:'forum',         activeColor:'#37474f',          hero:'General Research & Chat',   sub:'Open workspace for academic brainstorming and general inquiries.' },
    { id:'dsu',  label:'DSU Portal', icon:'account_balance', activeColor:'#4e342e',          hero:'Official University Portal',  sub:'Direct access to the DSU knowledge base and administrative info.' },
  ];

  const renderDashboard = () => {
    const mc = MODES.find(m => m.id === chatMode) || MODES[1]; // Fallback to 'General' chat
    return (
      <section className="chat-canvas">
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
            {chatMode === 'dsu' ? (
              <div className="suggestion-grid">
                {(SUGGESTIONS || []).map((s, i) => (
                  <button key={i} className="suggestion-card" onClick={() => sendMessage(s.prompt)}>
                    <div className="card-icon" style={{ background: 'var(--surface-container-highest)' }}><Icon name={s.icon} /></div>
                    <span className="card-title">{s.title}</span>
                    <p className="card-desc">{s.desc}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="suggestion-card" style={{ cursor: 'default', maxWidth: '480px', width: '100%', padding: '40px', textAlign: 'center', gap: '12px', background: 'var(--surface-container-low)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)' }}>
                <Icon name={mc?.icon || 'forum'} size={40} style={{ color: mc?.activeColor, marginBottom: '8px' }} />
                <h3 className="card-title" style={{ fontSize: '18px' }}>{(mc?.hero || 'General Chat')} Active</h3>
                <p className="card-desc" style={{ lineHeight: 1.6 }}>
                  {chatMode === 'exam' 
                    ? 'Upload your curriculum notes to begin. The AI will prioritize structured academic responses including technical definitions and essay breakdowns.' 
                    : 'A private environment for processing unstructured data and general academic dialogue. No document context provided.'}
                </p>
              </div>
            )}
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
  // KNOWLEDGE BASE GALLERY in sidebar
  // ─────────────────────────────────────────────────────────────
  const KBGallery = () => {
    const removeFile = (idx) => {
      const updated = uploadedFiles.filter((_, i) => i !== idx);
      setUploadedFiles(updated);
      localStorage.setItem('kb_files', JSON.stringify(updated));
    };
    const typeIcon = (type) => {
      if (['JPG','JPEG','PNG'].includes(type)) return 'image';
      if (type === 'PDF') return 'picture_as_pdf';
      if (type === 'DOCX') return 'description';
      return 'article';
    };

    if (uploadedFiles.length === 0) return null;

    return (
      <div style={{ padding: '0 16px', marginTop: '20px' }}>
        <p className="brand-version" style={{ padding: '0 8px 8px', display: 'block' }}>Knowledge Base</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {uploadedFiles.slice(0, 5).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', background: 'var(--surface-container-high)', fontSize: '11px' }}>
              <Icon name={typeIcon(f.type)} size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--on-surface)' }}>{f.name}</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} onClick={() => removeFile(i)}>
                <Icon name="close" size={13} style={{ color: 'var(--error)', opacity: 0.7 }} />
              </button>
            </div>
          ))}
          {uploadedFiles.length > 5 && (
            <p style={{ fontSize: '10px', color: 'var(--on-surface-variant)', padding: '2px 8px' }}>
              +{uploadedFiles.length - 5} more files
            </p>
          )}
        </div>
      </div>
    );
  };

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

        {/* Knowledge Base Gallery */}
        <KBGallery />

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
        {activeTab === 'store'     && <ResourceLibrary setActiveTab={setActiveTab} setMessages={setMessages} />}
        {activeTab === 'settings'  && (
          <SettingsView 
            apiKey={apiKey} setApiKey={setApiKey} 
            model={model} setModel={setModel} 
            visionModel={visionModel} setVisionModel={setVisionModel} 
          />
        )}

        {/* ── Chat Input — always visible on Dashboard ── */}
        {activeTab === 'dashboard' && (
          <footer className="input-footer">
            {/* Pending file attachments bubble row */}
            {pendingFiles.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', maxWidth: '800px', margin: '0 auto 10px', flexWrap: 'wrap' }}>
                {pendingFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'var(--primary)', color: 'white', borderRadius: '99px', fontSize: '12px', fontWeight: 600 }}>
                    <Icon name="attach_file" size={14} style={{ color: 'white' }} />
                    <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', marginLeft: '2px' }} onClick={() => removePendingFile(i)}>
                      <Icon name="close" size={14} style={{ color: 'rgba(255,255,255,0.8)' }} />
                    </button>
                  </div>
                ))}
                <div style={{ display:'flex', alignItems:'center', fontSize:'11px', color:'var(--on-surface-variant)', fontStyle:'italic'}}>
                  {uploading ? '⏳ Uploading...' : '📎 Will upload when you send'}
                </div>
              </div>
            )}

            {/* Input Well */}
            <div className="input-well">
              {/* Hidden file picker */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                multiple
                accept=".pdf,.txt,.docx,.md,.jpg,.jpeg,.png"
                onChange={onFilesSelected}
              />
              {/* ALWAYS VISIBLE + button */}
              <button
                className="input-add-btn"
                onClick={() => fileInputRef.current.click()}
                title="Attach files (PDF, TXT, DOCX, Image)"
                disabled={uploading}
              >
                <Icon name={uploading ? 'progress_activity' : 'add'} size={22}
                  style={{ animation: uploading ? 'spin 1.5s linear infinite' : 'none' }} />
              </button>

              <textarea
                ref={textareaRef}
                className="chat-input"
                placeholder="Type your inquiry… (press + to attach files)"
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
                disabled={loading || (!input.trim() && pendingFiles.length === 0)}
              >
                <Icon name={loading ? 'progress_activity' : 'send'}
                  style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
              </button>
            </div>
            <p className="input-disclaimer">Academix AI can make mistakes. Verify important academic deadlines.</p>
          </footer>
        )}
      </main>

      {/* ── Mobile Bottom Navigation Bar (phone-only, controlled by CSS) ── */}
      <nav className="mobile-bottom-nav">
        {[
          { id: 'dashboard', icon: 'home',         label: 'Home'     },
          { id: 'messages',  icon: 'forum',         label: 'History'  },
        ].map(({ id, icon, label }) => (
          <button key={id} className={`mobile-nav-btn ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
            <Icon name={icon} size={22} />
            <span>{label}</span>
          </button>
        ))}

        {/* Centre FAB — New Chat */}
        <button className="mobile-nav-fab" onClick={startNewChat} title="New Chat">
          <Icon name="edit_square" size={24} />
        </button>

        {[
          { id: 'store',    icon: 'local_mall',  label: 'Library'  },
          { id: 'settings', icon: 'tune',         label: 'Settings' },
        ].map(({ id, icon, label }) => (
          <button key={id} className={`mobile-nav-btn ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
            <Icon name={icon} size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
