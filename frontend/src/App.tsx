import {
  ButtonHTMLAttributes,
  CSSProperties,
  FormEvent,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  useCallback,
  useState,
  useEffect,
  useRef,
} from 'react';

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');
const API_STATIC_BEARER = import.meta.env.VITE_API_STATIC_BEARER ?? '';
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const PERSONA_CACHE_KEY = 'rememory_persona_cache';

type View = 'home' | 'login' | 'signup' | 'persona' | 'dashboard' | 'chat' | 'voice' | 'closure';

type User = { id: string; email: string; name: string; };

type Persona = {
  id: string;
  name: string;
  relationship: string;
  userNickname: string;
  biography: string;
  speakingStyle: string;
  traits: string[];
  keyMemories: string[];
  commonPhrases: string[];
  voiceUrl?: string | null;
  createdAt: string;
  remainingDays: number;
  status: 'active' | 'expired' | 'deleted';
};

type Message = { sender: 'user' | 'ai'; text: string; timestamp: string; };
type PersonaApiResponse = { id: string; name: string; relationship: string; userNickname?: string; biography?: string; speakingStyle?: string; status: 'active' | 'expired' | 'deleted'; expiresAt: string | null; remainingMs?: number | null; traits?: string[]; keyMemories?: string[]; commonPhrases?: string[]; voiceSampleUrl?: string | null; };
type PersonaFormInput = { name: string; relationship: string; userNickname: string; biography: string; speakingStyle: string; voiceUrl?: string; traits: string[]; keyMemories: string[]; commonPhrases: string[]; };

// --- HELPERS ---

const buildAuthHeaders = (token?: string): Record<string, string> => {
  const finalToken = token || API_STATIC_BEARER;
  return finalToken ? { Authorization: `Bearer ${finalToken}` } : {};
};

const splitList = (input: string, fallback: string, limit = 10) => {
  const entries = input.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
  return entries.length === 0 ? [fallback] : Array.from(new Set(entries)).slice(0, limit);
};
const createRandomId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `persona-${Date.now().toString(36)}`;
const createClientMessageId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // RFC4122-ish fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/* --- UI ATOMS --- */
const Card = ({ children, style, onClick }: { children: React.ReactNode; style?: CSSProperties, onClick?: (e: React.MouseEvent) => void }) => (
  <div className="card" style={style} onClick={onClick}>{children}</div>
);

const Button = ({ children, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) => (
  <button className={`btn btn-${variant}`} {...props}>{children}</button>
);

const Input = ({ style, className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={`input ${className || ''}`} style={{ width: '100%', ...style }} {...props} />
);

const TextArea = ({ style, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className="textarea" style={{ width: '100%', resize: 'vertical', ...style }} {...props} />
);

/* --- SUB COMPONENTS --- */
const PersonaForm = ({ initialData, onSubmit, onDelete, isEditing, onCancel }: { initialData?: Partial<Persona>, onSubmit: (data: PersonaFormInput) => void, onDelete?: () => void, isEditing?: boolean, onCancel?: () => void }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '', relationship: initialData?.relationship || '', userNickname: initialData?.userNickname || '',
    biography: initialData?.biography || '', speakingStyle: initialData?.speakingStyle || '',
    traits: initialData?.traits?.join('\n') || '', keyMemories: initialData?.keyMemories?.join('\n') || '',
    commonPhrases: initialData?.commonPhrases?.join('\n') || '', voiceUrl: initialData?.voiceUrl || ''
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData, voiceUrl: formData.voiceUrl || undefined,
      traits: splitList(formData.traits, 'Kind', 8), keyMemories: splitList(formData.keyMemories, 'Memories', 10), commonPhrases: splitList(formData.commonPhrases, 'Phrases', 10),
    });
  };

  return (
    <Card>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 30}}>
        <h1 className="title" style={{margin:0}}>{isEditing ? 'Refine Memory' : 'Create Memory'}</h1>
        {isEditing && <button className="btn-close" onClick={onCancel}>✕</button>}
      </div>
      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <div className="form-section-title">Identity</div>
          <div className="grid-2">
            <label>Their Name <Input value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} disabled={isEditing} className={isEditing?'locked':''} required /></label>
            <label>Relationship <Input value={formData.relationship} onChange={e=>setFormData({...formData, relationship:e.target.value})} disabled={isEditing} className={isEditing?'locked':''} required /></label>
          </div>
        </div>
        <div>
          <div className="form-section-title">Voice</div>
          <div className="grid-2">
            <label>Nickname for You <Input value={formData.userNickname} onChange={e=>setFormData({...formData, userNickname:e.target.value})} required placeholder="e.g. Ah Boy" /></label>
            <label>Speaking Style <Input value={formData.speakingStyle} onChange={e=>setFormData({...formData, speakingStyle:e.target.value})} required placeholder="e.g. Manglish, Rude, uses 'sohai'" /></label>
          </div>
          <label style={{marginTop:12}}>Life Context <TextArea rows={2} value={formData.biography} onChange={e=>setFormData({...formData, biography:e.target.value})} placeholder="e.g. Lived in Ipoh, loved cooking..." /></label>
          
          <div className="form-section-title" style={{marginTop:20}}>Personality</div>
           <div className="grid-2">
             <label>Key Memories <TextArea rows={3} value={formData.keyMemories} onChange={e=>setFormData({...formData, keyMemories:e.target.value})} placeholder="Comma separated..." /></label>
             <label>Common Phrases <TextArea rows={3} value={formData.commonPhrases} onChange={e=>setFormData({...formData, commonPhrases:e.target.value})} placeholder="Phrases they use often..." /></label>
          </div>
          <label style={{marginTop:12}}>Traits <Input value={formData.traits} onChange={e=>setFormData({...formData, traits:e.target.value})} placeholder="Rude, Funny, Loving..." /></label>
        </div>
        <div style={{display:'flex', gap:12, justifyContent:'space-between', marginTop:20}}>
            {isEditing && onDelete ? (
                <Button type="button" variant="danger" onClick={() => {
                    if(confirm("Are you sure? This cannot be undone.")) onDelete();
                }}>Delete Memory</Button>
            ) : <div />}
            
            <div style={{display:'flex', gap:12}}>
                {isEditing && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
                <Button type="submit">{isEditing ? 'Update Memory' : 'Create Memory'}</Button>
            </div>
        </div>
      </form>
    </Card>
  );
};

/* --- MAIN APP --- */
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('home');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({});
  const [isSending, setIsSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const selectedPersona = personas.find(p => p.id === selectedPersonaId) || null;

  useEffect(() => { if(view==='chat') chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, view]);

  // Load user from session on mount
  useEffect(() => {
    const stored = localStorage.getItem('rememory_user');
    if (stored) {
        setUser(JSON.parse(stored));
        setView('dashboard');
    }
  }, []);

  // Fetch Persona Data
  const normalizePersona = useCallback((data: PersonaApiResponse): Persona => ({
    id: data.id, name: data.name, relationship: data.relationship, userNickname: data.userNickname || '',
    biography: data.biography || '', speakingStyle: data.speakingStyle || '', voiceUrl: data.voiceSampleUrl ?? null,
    createdAt: data.expiresAt ?? new Date().toISOString(), remainingDays: typeof data.remainingMs==='number'?Math.max(0,Math.ceil(data.remainingMs/MS_IN_DAY)):30,
    status: data.status, traits: data.traits||[], keyMemories: data.keyMemories||[], commonPhrases: data.commonPhrases||[]
  }), []);

  const loadPersona = useCallback(async (currentUser: User) => {
    try {
      const res = await fetch(`${API_BASE_URL}/persona`, { headers: buildAuthHeaders() });
      if (!res.ok) {
        const cached = localStorage.getItem(PERSONA_CACHE_KEY);
        if (cached) {
          const cachedPersona: Persona = JSON.parse(cached);
          setPersonas([cachedPersona]);
          setSelectedPersonaId(cachedPersona.id);
        } else {
          setPersonas([]);
        }
        return null;
      }
      
      const data = await res.json();
      if (!data) {
        setPersonas([]);
        localStorage.removeItem(PERSONA_CACHE_KEY);
        return null;
      }
      
      const p = normalizePersona(data);
      setPersonas([p]);
      setSelectedPersonaId(p.id);
      localStorage.setItem(PERSONA_CACHE_KEY, JSON.stringify(p));
      
      if (p.id) {
         const msgRes = await fetch(`${API_BASE_URL}/persona/${p.id}/chat`, { headers: buildAuthHeaders() });
         const msgData = await msgRes.json();
         const history = (msgData.messages || []).map((m: any) => ({
           sender: m.sender, text: m.text, timestamp: m.timestamp
         })).filter((m: any) => !m.text.startsWith('[HIDDEN_INSTRUCTION]'));
         
         setChatMessages(prev => ({ ...prev, [p.id]: history }));
      }
      return p;
    } catch (e) { console.error(e); return null; }
  }, [normalizePersona]);

  useEffect(() => {
      if (user && (view === 'dashboard' || view === 'chat')) {
          loadPersona(user);
      }
  }, [user, view, loadPersona]);


  // --- AUTH ACTIONS (MOCKED) ---
  const handleAuth = (type: 'login' | 'signup') => {
      setAuthError('');
      if(!authEmail || !authPass) return setAuthError('Please fill in all fields');
      
      const dbUsers = JSON.parse(localStorage.getItem('rememory_db_users') || '{}');
      
      if (type === 'signup') {
          if (dbUsers[authEmail]) return setAuthError('User already exists');
          const newUser = { id: createRandomId(), email: authEmail, name: authEmail.split('@')[0] };
          dbUsers[authEmail] = newUser;
          localStorage.setItem('rememory_db_users', JSON.stringify(dbUsers));
          localStorage.setItem('rememory_user', JSON.stringify(newUser));
          setUser(newUser);
          setView('dashboard');
      } else {
          const found = dbUsers[authEmail];
          if (!found) return setAuthError('User not found');
          localStorage.setItem('rememory_user', JSON.stringify(found));
          setUser(found);
          setView('dashboard');
      }
  };

  const logout = () => {
      localStorage.removeItem('rememory_user');
      localStorage.removeItem(PERSONA_CACHE_KEY);
      setUser(null);
      setPersonas([]);
      setChatMessages({});
      setAuthEmail('');
      setAuthPass('');
      setView('home');
  };

  // --- PERSONA ACTIONS ---

  const handleCreate = async (input: PersonaFormInput) => {
    if (!user) return;
    const payload = { 
      ...input, 
      voiceSampleUrl: input.voiceUrl || undefined,
      // ensure fields exist even if empty to help backend prompt fidelity
      userNickname: input.userNickname || '',
      biography: input.biography || '',
      speakingStyle: input.speakingStyle || '',
      traits: input.traits,
      keyMemories: input.keyMemories,
      commonPhrases: input.commonPhrases
    };
    const res = await fetch(`${API_BASE_URL}/persona`, { 
        method: 'POST', 
        headers: {'Content-Type':'application/json', ...buildAuthHeaders()}, 
        body: JSON.stringify(payload) 
    });
    if (!res.ok) {
      const text = await res.text();
      alert(`Create failed: ${res.status} ${text || ''}`);
      return;
    }
    const created = await loadPersona(user); 
    if (created) {
      localStorage.setItem(PERSONA_CACHE_KEY, JSON.stringify(created));
    }
    setView('dashboard');
  };

  const handleUpdate = async (input: PersonaFormInput) => {
    if (!selectedPersona || !user) return;
    const { name, relationship, ...allowedUpdates } = input;
    const payload = { ...allowedUpdates, voiceSampleUrl: allowedUpdates.voiceUrl || undefined };
    delete (payload as any).voiceUrl;
    const res = await fetch(`${API_BASE_URL}/persona/${selectedPersona.id}`, { 
        method: 'PUT',
        headers: {'Content-Type':'application/json', ...buildAuthHeaders()}, 
        body: JSON.stringify(payload) 
    });
    if (res.ok) {
        const updated = await loadPersona(user); 
        if (updated) {
          localStorage.setItem(PERSONA_CACHE_KEY, JSON.stringify(updated));
        }
        setIsEditing(false);
    } else {
        alert('Failed to update. Note: You cannot change Name or Relationship.');
    }
  };

  const handleDelete = async (personaId?: string) => {
      if (!user) return;
      const targetId = personaId || selectedPersona?.id;
      if (!targetId) return;
      const CONFIRMATION_SENTENCE = 'I understand this will permanently delete my persona and messages.';
      const res = await fetch(`${API_BASE_URL}/persona/${targetId}`, {
          method: 'DELETE',
          headers: {'Content-Type':'application/json', ...buildAuthHeaders()},
          body: JSON.stringify({ confirmation: CONFIRMATION_SENTENCE })
      });
      if (res.ok) {
          setPersonas([]);
          setSelectedPersonaId(null);
          setIsEditing(false);
          localStorage.removeItem(PERSONA_CACHE_KEY);
          setView('dashboard');
      } else {
          alert('Delete failed.');
      }
  };

  const sendMessage = async (text: string, isHiddenInstruction = false) => {
    if (!selectedPersona || !user) return;
    const pid = selectedPersona.id;
    
    if (!isHiddenInstruction) {
        setChatMessages(prev => ({ ...prev, [pid]: [...(prev[pid]||[]), { sender: 'user', text, timestamp: new Date().toISOString() }] }));
    }
    
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/persona/${pid}/chat`, { 
          method: 'POST', 
          headers: {'Content-Type':'application/json', ...buildAuthHeaders()}, 
          body: JSON.stringify({ text, clientMessageId: createClientMessageId() }) 
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Chat failed (${res.status}): ${body || res.statusText}`);
      }
      const data = await res.json();
      const aiText = data.messages.find((m:any) => m.sender === 'ai')?.text || "...";
      setChatMessages(prev => ({ ...prev, [pid]: [...(prev[pid]||[]).filter(m => m.timestamp !== 'pending'), { sender: 'ai', text: aiText, timestamp: new Date().toISOString() }] }));
    } catch (e) {
      console.error(e);
      if (!isHiddenInstruction) {
        setChatMessages(prev => ({ ...prev, [pid]: [...(prev[pid]||[]), { sender: 'ai', text: 'Unable to send message. Please try again.', timestamp: new Date().toISOString() }] }));
      }
      alert(`Chat request failed. ${e instanceof Error ? e.message : ''}`);
    } finally { setIsSending(false); }
  };

  useEffect(() => {
    if (view === 'chat' && selectedPersona) {
        const msgs = chatMessages[selectedPersona.id] || [];
        if (msgs.length === 0 && !isSending) {
            const nick = selectedPersona.userNickname || 'friend';
            sendMessage(`[HIDDEN_INSTRUCTION] The user has entered the room. Start the conversation now. Greet them by their nickname "${nick}" in a short, human, casual way. Do not add scenery or poetic language. Do not bring up any location (including China) unless they ask. Keep it 1-2 sentences.`, true);
        }
    }
  }, [view, selectedPersonaId]);

  return (
    <div className="app">
      <header className="header">
        <div className="logo" onClick={() => setView('home')} style={{cursor:'pointer'}}>Rememory</div>
        <div className="header-right">
          {selectedPersona && view !== 'home' && <div className="timer-pill">{selectedPersona.remainingDays} Days Left</div>}
          {user && <Button variant="ghost" onClick={logout}>Logout</Button>}
        </div>
      </header>

      <main className="main">
        {!user && (
          <div className="auth-box">
            <h1 className="title" style={{fontSize:'3.5rem', marginBottom:10}}>Rememory</h1>
            <p className="subtitle">A space to hold on, before letting go.</p>
            
            {view === 'home' && (
                <div style={{display:'flex', gap:10, justifyContent:'center', marginTop:20}}>
                    <Button onClick={() => setView('login')}>Login</Button>
                    <Button variant="ghost" onClick={() => setView('signup')}>Sign Up</Button>
                </div>
            )}

            {(view === 'login' || view === 'signup') && (
                <div style={{marginTop:20, textAlign:'left', maxWidth:300, marginInline:'auto'}}>
                    <div style={{marginBottom:10}}>
                        <label style={{display:'block', marginBottom: 5, fontSize: '0.9rem', color: '#666'}}>Email</label>
                        <Input 
                            type="email"
                            autoComplete="off"
                            placeholder="Your email"
                            value={authEmail} 
                            onChange={e=>setAuthEmail(e.target.value)} 
                        />
                    </div>
                    <div style={{marginBottom:10}}>
                        <label style={{display:'block', marginBottom: 5, fontSize: '0.9rem', color: '#666'}}>Password</label>
                        <Input 
                            type="password"
                            autoComplete="off"
                            placeholder="Create a password"
                            value={authPass} 
                            onChange={e=>setAuthPass(e.target.value)} 
                        />
                    </div>
                    {authError && <div style={{color:'red', marginBottom:10}}>{authError}</div>}
                    <Button style={{width:'100%'}} onClick={() => handleAuth(view)}>{view === 'login' ? 'Enter Space' : 'Create Account'}</Button>
                    <div style={{marginTop:10, textAlign:'center', fontSize:'0.9rem', cursor:'pointer', color:'#888'}} onClick={() => setView(view==='login'?'signup':'login')}>
                        {view === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
                    </div>
                </div>
            )}
          </div>
        )}

        {/* ... Rest of app ... */}
        {user && view === 'dashboard' && (
          personas.length > 0 ? (
            <div className="dashboard-grid">
              {personas.map(p => (
                <div key={p.id} className="memory-tile" onClick={() => { setSelectedPersonaId(p.id); setView('chat'); }}>
                  <h2 className="memory-name">{p.name}</h2>
                  <div className="memory-rel">{p.relationship}</div>
                  <div className="tile-actions">
                    <button className="action-btn" onClick={(e) => { e.stopPropagation(); setSelectedPersonaId(p.id); setView('chat'); }}>Message</button>
                    <button className="action-btn" onClick={(e) => { e.stopPropagation(); alert('Voice coming soon'); }}>Voice</button>
                    <button className="action-btn" onClick={(e) => { e.stopPropagation(); setSelectedPersonaId(p.id); setIsEditing(true); }}>Details</button>
                    <button className="action-btn" onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedPersonaId(p.id);
                      if (confirm('Delete this persona and all chat history?')) { handleDelete(p.id); }
                    }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{textAlign:'center'}}>
              <p className="subtitle">No memories found.</p>
              <Button onClick={() => setView('persona')}>Create Memory</Button>
            </div>
          )
        )}

        {user && view === 'persona' && <PersonaForm onSubmit={handleCreate} onCancel={() => setView('dashboard')} />}
        
        {user && isEditing && selectedPersona && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100}}>
            <PersonaForm 
                initialData={selectedPersona} 
                onSubmit={handleUpdate} 
                onDelete={handleDelete}
                isEditing={true} 
                onCancel={() => setIsEditing(false)} 
            />
          </div>
        )}

        {user && view === 'chat' && selectedPersona && (
          <div className="chat-wrapper">
            <div className="chat-top" style={{gap:12}}>
              <button className="back-arrow" onClick={() => setView('dashboard')}>&lt;</button>
              <div style={{fontWeight:600, fontSize:'1.1rem'}}>{selectedPersona.name}</div>
              <div style={{marginLeft:'auto', display:'flex', gap:8}}>
                <button className="action-btn" onClick={() => setIsEditing(true)}>Edit</button>
                <button className="action-btn" onClick={() => { if (confirm('Delete this persona and all chat history?')) handleDelete(selectedPersona.id); }}>Delete</button>
              </div>
            </div>
            <div className="chat-scroll">
              {(chatMessages[selectedPersona.id] || []).map((m, i) => (
                <div key={i} className={`msg-group ${m.sender === 'user' ? 'msg-user' : 'msg-ai'}`}>
                  <div className="bubble">{m.text}</div>
                  <div className="timestamp">{new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
              ))}
              {isSending && <div style={{paddingLeft:32, color:'#aaa', fontStyle:'italic'}}>{selectedPersona.name} is typing...</div>}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={e => { e.preventDefault(); const el = (e.target as any).elements.text; if(el.value.trim()) { sendMessage(el.value); el.value=''; } }} className="chat-bottom">
              <input name="text" className="chat-input" placeholder="Type a message..." disabled={isSending} autoFocus />
              <button type="submit" className="send-circle" disabled={isSending}>↑</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
