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
type GuidedClosureAnswers = { gratitude: string; regret: string; memory: string; future: string; };
type ChatApiMessage = { id: string; sender: 'user' | 'ai' | 'system'; text: string; timestamp: string; };
type ChatApiResponse = { personaStatus: 'active' | 'expired'; remainingMs?: number; messages?: ChatApiMessage[]; };
type PersonaApiResponse = { id: string; name: string; relationship: string; userNickname?: string; biography?: string; speakingStyle?: string; status: 'active' | 'expired' | 'deleted'; expiresAt: string | null; remainingMs?: number | null; traits?: string[]; keyMemories?: string[]; commonPhrases?: string[]; voiceSampleUrl?: string | null; };
type PersonaFormInput = { name: string; relationship: string; userNickname: string; biography: string; speakingStyle: string; voiceUrl?: string; traits: string[]; keyMemories: string[]; commonPhrases: string[]; };

const buildAuthHeaders = (): Record<string, string> => API_STATIC_BEARER ? { Authorization: `Bearer ${API_STATIC_BEARER}` } : {};
const splitList = (input: string, fallback: string, limit = 10) => {
  const entries = input.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
  return entries.length === 0 ? [fallback] : Array.from(new Set(entries)).slice(0, limit);
};
const createRandomId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `persona-${Date.now().toString(36)}`;

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

/* --- SMART GREETING GENERATOR --- */
const getDynamicGreeting = (p: Persona) => {
  const style = p.speakingStyle.toLowerCase();
  const nick = p.userNickname || 'my dear';
  
  if (style.includes('manglish') || style.includes('singlish')) return `Eh ${nick}, you eat full already?`;
  if (style.includes('formal') || style.includes('poetic')) return `My dearest ${nick}, I am listening.`;
  if (style.includes('grumpy') || style.includes('stern')) return `Hmph. What do you want, ${nick}?`;
  if (style.includes('cheerful') || style.includes('happy')) return `Hello ${nick}! So good to see you!`;
  
  return `Hello ${nick}, how are you doing today?`;
};

/* --- SUB COMPONENTS --- */
const PersonaForm = ({ initialData, onSubmit, isEditing, onCancel }: { initialData?: Partial<Persona>, onSubmit: (data: PersonaFormInput) => void, isEditing?: boolean, onCancel?: () => void }) => {
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
            <label>Speaking Style <Input value={formData.speakingStyle} onChange={e=>setFormData({...formData, speakingStyle:e.target.value})} required placeholder="e.g. Manglish, Formal" /></label>
          </div>
          <label style={{marginTop:12}}>Life Context <TextArea rows={2} value={formData.biography} onChange={e=>setFormData({...formData, biography:e.target.value})} placeholder="e.g. Lived in Ipoh, loved cooking..." /></label>
        </div>
        <div style={{display:'flex', gap:12, justifyContent:'flex-end', marginTop:20}}>
          {isEditing && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button type="submit">{isEditing ? 'Update Memory' : 'Create Memory'}</Button>
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
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const selectedPersona = personas.find(p => p.id === selectedPersonaId) || null;

  useEffect(() => { if(view==='chat') chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, view]);

  const normalizePersona = useCallback((data: PersonaApiResponse): Persona => ({
    id: data.id, name: data.name, relationship: data.relationship, userNickname: data.userNickname || '',
    biography: data.biography || '', speakingStyle: data.speakingStyle || '', voiceUrl: data.voiceSampleUrl ?? null,
    createdAt: data.expiresAt ?? new Date().toISOString(), remainingDays: typeof data.remainingMs==='number'?Math.max(0,Math.ceil(data.remainingMs/MS_IN_DAY)):30,
    status: data.status, traits: data.traits||[], keyMemories: data.keyMemories||[], commonPhrases: data.commonPhrases||[]
  }), []);

  const loadPersona = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/persona`, { headers: buildAuthHeaders() });
      if (!res.ok) { setPersonas([]); return null; }
      const data = await res.json();
      const p = normalizePersona(data);
      setPersonas([p]);
      setSelectedPersonaId(p.id);
      
      // INJECT SMART GREETING LOCALLY
      setChatMessages(prev => {
        if (prev[p.id]) return prev;
        return { [p.id]: [{ sender: 'ai', text: getDynamicGreeting(p), timestamp: new Date().toISOString() }] };
      });
      return p;
    } catch (e) { return null; }
  }, [normalizePersona]);

  const handleCreate = async (input: PersonaFormInput) => {
    await fetch(`${API_BASE_URL}/persona`, { method: 'POST', headers: {'Content-Type':'application/json', ...buildAuthHeaders()}, body: JSON.stringify(input) });
    await loadPersona(); setView('dashboard');
  };

  const handleUpdate = async (input: PersonaFormInput) => {
    if (!selectedPersona) return;
    await fetch(`${API_BASE_URL}/persona/${selectedPersona.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json', ...buildAuthHeaders()}, body: JSON.stringify(input) });
    await loadPersona(); setIsEditing(false);
  };

  const handleSend = async (text: string) => {
    if (!selectedPersona) return;
    const pid = selectedPersona.id;
    setChatMessages(prev => ({ ...prev, [pid]: [...(prev[pid]||[]), { sender: 'user', text, timestamp: new Date().toISOString() }] }));
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/persona/${pid}/chat`, { method: 'POST', headers: {'Content-Type':'application/json', ...buildAuthHeaders()}, body: JSON.stringify({ text, clientMessageId: createRandomId() }) });
      const data = await res.json();
      const aiText = data.aiMessage || "...";
      setChatMessages(prev => ({ ...prev, [pid]: [...(prev[pid]||[]), { sender: 'ai', text: aiText, timestamp: new Date().toISOString() }] }));
    } catch (e) { /* handle error */ } finally { setIsSending(false); }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">Rememory</div>
        <div className="header-right">
          {selectedPersona && <div className="timer-pill">{selectedPersona.remainingDays} Days Left</div>}
          {user && <Button variant="ghost" onClick={() => { setUser(null); setPersonas([]); setView('home'); }}>Logout</Button>}
        </div>
      </header>

      <main className="main">
        {!user && (
          <div className="auth-box">
            <h1 className="title" style={{fontSize:'3.5rem', marginBottom:10}}>Rememory</h1>
            <p className="subtitle">A space to hold on, before letting go.</p>
            <Button onClick={() => setUser({id:'u1', email:'test', name:'User'})}>Enter Space</Button>
          </div>
        )}

        {user && view === 'dashboard' && (
          personas.length > 0 ? (
            <div className="dashboard-grid">
              {personas.map(p => (
                <div key={p.id} className="memory-tile" onClick={() => { setSelectedPersonaId(p.id); setView('chat'); }}>
                  <h2 className="memory-name">{p.name}</h2>
                  <div className="memory-rel">{p.relationship}</div>
                  <div className="tile-actions">
                    <button className="action-btn" onClick={(e) => { e.stopPropagation(); setView('chat'); }}>Message</button>
                    <button className="action-btn" onClick={(e) => { e.stopPropagation(); alert('Voice coming soon'); }}>Voice</button>
                    <button className="action-btn" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>Details</button>
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
            <PersonaForm initialData={selectedPersona} onSubmit={handleUpdate} isEditing={true} onCancel={() => setIsEditing(false)} />
          </div>
        )}

        {user && view === 'chat' && selectedPersona && (
          <div className="chat-wrapper">
            <div className="chat-top">
              <button className="back-arrow" onClick={() => setView('dashboard')}>←</button>
              <div style={{fontWeight:600, fontSize:'1.1rem'}}>{selectedPersona.name}</div>
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
            <form onSubmit={e => { e.preventDefault(); const el = (e.target as any).elements.text; if(el.value.trim()) { handleSend(el.value); el.value=''; } }} className="chat-bottom">
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