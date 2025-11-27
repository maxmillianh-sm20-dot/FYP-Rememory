import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useState, useEffect, useRef, } from 'react';
const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');
const API_STATIC_BEARER = import.meta.env.VITE_API_STATIC_BEARER ?? '';
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const PERSONA_CACHE_KEY = 'rememory_persona_cache';
// --- HELPERS ---
const buildAuthHeaders = (token) => {
    const finalToken = token || API_STATIC_BEARER;
    return finalToken ? { Authorization: `Bearer ${finalToken}` } : {};
};
const splitList = (input, fallback, limit = 10) => {
    const entries = input.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
    return entries.length === 0 ? [fallback] : Array.from(new Set(entries)).slice(0, limit);
};
const createRandomId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `persona-${Date.now().toString(36)}`;
const createClientMessageId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID)
        return crypto.randomUUID();
    // RFC4122-ish fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
/* --- UI ATOMS --- */
const Card = ({ children, style, onClick }) => (_jsx("div", { className: "card", style: style, onClick: onClick, children: children }));
const Button = ({ children, variant = 'primary', ...props }) => (_jsx("button", { className: `btn btn-${variant}`, ...props, children: children }));
const Input = ({ style, className, ...props }) => (_jsx("input", { className: `input ${className || ''}`, style: { width: '100%', ...style }, ...props }));
const TextArea = ({ style, ...props }) => (_jsx("textarea", { className: "textarea", style: { width: '100%', resize: 'vertical', ...style }, ...props }));
/* --- SUB COMPONENTS --- */
const PersonaForm = ({ initialData, onSubmit, onDelete, isEditing, onCancel }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '', relationship: initialData?.relationship || '', userNickname: initialData?.userNickname || '',
        biography: initialData?.biography || '', speakingStyle: initialData?.speakingStyle || '',
        traits: initialData?.traits?.join('\n') || '', keyMemories: initialData?.keyMemories?.join('\n') || '',
        commonPhrases: initialData?.commonPhrases?.join('\n') || '', voiceUrl: initialData?.voiceUrl || ''
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData, voiceUrl: formData.voiceUrl || undefined,
            traits: splitList(formData.traits, 'Kind', 8), keyMemories: splitList(formData.keyMemories, 'Memories', 10), commonPhrases: splitList(formData.commonPhrases, 'Phrases', 10),
        });
    };
    return (_jsxs(Card, { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }, children: [_jsx("h1", { className: "title", style: { margin: 0 }, children: isEditing ? 'Refine Memory' : 'Create Memory' }), isEditing && _jsx("button", { className: "btn-close", onClick: onCancel, children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "form-grid", children: [_jsxs("div", { children: [_jsx("div", { className: "form-section-title", children: "Identity" }), _jsxs("div", { className: "grid-2", children: [_jsxs("label", { children: ["Their Name ", _jsx(Input, { value: formData.name, onChange: e => setFormData({ ...formData, name: e.target.value }), disabled: isEditing, className: isEditing ? 'locked' : '', required: true })] }), _jsxs("label", { children: ["Relationship ", _jsx(Input, { value: formData.relationship, onChange: e => setFormData({ ...formData, relationship: e.target.value }), disabled: isEditing, className: isEditing ? 'locked' : '', required: true })] })] })] }), _jsxs("div", { children: [_jsx("div", { className: "form-section-title", children: "Voice" }), _jsxs("div", { className: "grid-2", children: [_jsxs("label", { children: ["Nickname for You ", _jsx(Input, { value: formData.userNickname, onChange: e => setFormData({ ...formData, userNickname: e.target.value }), required: true, placeholder: "e.g. Ah Boy" })] }), _jsxs("label", { children: ["Speaking Style ", _jsx(Input, { value: formData.speakingStyle, onChange: e => setFormData({ ...formData, speakingStyle: e.target.value }), required: true, placeholder: "e.g. Manglish, Rude, uses 'sohai'" })] })] }), _jsxs("label", { style: { marginTop: 12 }, children: ["Life Context ", _jsx(TextArea, { rows: 2, value: formData.biography, onChange: e => setFormData({ ...formData, biography: e.target.value }), placeholder: "e.g. Lived in Ipoh, loved cooking..." })] }), _jsx("div", { className: "form-section-title", style: { marginTop: 20 }, children: "Personality" }), _jsxs("div", { className: "grid-2", children: [_jsxs("label", { children: ["Key Memories ", _jsx(TextArea, { rows: 3, value: formData.keyMemories, onChange: e => setFormData({ ...formData, keyMemories: e.target.value }), placeholder: "Comma separated..." })] }), _jsxs("label", { children: ["Common Phrases ", _jsx(TextArea, { rows: 3, value: formData.commonPhrases, onChange: e => setFormData({ ...formData, commonPhrases: e.target.value }), placeholder: "Phrases they use often..." })] })] }), _jsxs("label", { style: { marginTop: 12 }, children: ["Traits ", _jsx(Input, { value: formData.traits, onChange: e => setFormData({ ...formData, traits: e.target.value }), placeholder: "Rude, Funny, Loving..." })] })] }), _jsxs("div", { style: { display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 20 }, children: [isEditing && onDelete ? (_jsx(Button, { type: "button", variant: "danger", onClick: () => {
                                    if (confirm("Are you sure? This cannot be undone."))
                                        onDelete();
                                }, children: "Delete Memory" })) : _jsx("div", {}), _jsxs("div", { style: { display: 'flex', gap: 12 }, children: [isEditing && _jsx(Button, { type: "button", variant: "ghost", onClick: onCancel, children: "Cancel" }), _jsx(Button, { type: "submit", children: isEditing ? 'Update Memory' : 'Create Memory' })] })] })] })] }));
};
/* --- MAIN APP --- */
const App = () => {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('home');
    const [personas, setPersonas] = useState([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);
    const [chatMessages, setChatMessages] = useState({});
    const [isSending, setIsSending] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    // Auth Form State
    const [authEmail, setAuthEmail] = useState('');
    const [authPass, setAuthPass] = useState('');
    const [authError, setAuthError] = useState('');
    const chatBottomRef = useRef(null);
    const selectedPersona = personas.find(p => p.id === selectedPersonaId) || null;
    useEffect(() => { if (view === 'chat')
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, view]);
    // Load user from session on mount
    useEffect(() => {
        const stored = localStorage.getItem('rememory_user');
        if (stored) {
            setUser(JSON.parse(stored));
            setView('dashboard');
        }
    }, []);
    // Fetch Persona Data
    const normalizePersona = useCallback((data) => ({
        id: data.id, name: data.name, relationship: data.relationship, userNickname: data.userNickname || '',
        biography: data.biography || '', speakingStyle: data.speakingStyle || '', voiceUrl: data.voiceSampleUrl ?? null,
        createdAt: data.expiresAt ?? new Date().toISOString(), remainingDays: typeof data.remainingMs === 'number' ? Math.max(0, Math.ceil(data.remainingMs / MS_IN_DAY)) : 30,
        status: data.status, traits: data.traits || [], keyMemories: data.keyMemories || [], commonPhrases: data.commonPhrases || []
    }), []);
    const loadPersona = useCallback(async (currentUser) => {
        try {
            const res = await fetch(`${API_BASE_URL}/persona`, { headers: buildAuthHeaders() });
            if (!res.ok) {
                const cached = localStorage.getItem(PERSONA_CACHE_KEY);
                if (cached) {
                    const cachedPersona = JSON.parse(cached);
                    setPersonas([cachedPersona]);
                    setSelectedPersonaId(cachedPersona.id);
                }
                else {
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
                const history = (msgData.messages || []).map((m) => ({
                    sender: m.sender, text: m.text, timestamp: m.timestamp
                })).filter((m) => !m.text.startsWith('[HIDDEN_INSTRUCTION]'));
                setChatMessages(prev => ({ ...prev, [p.id]: history }));
            }
            return p;
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }, [normalizePersona]);
    useEffect(() => {
        if (user && (view === 'dashboard' || view === 'chat')) {
            loadPersona(user);
        }
    }, [user, view, loadPersona]);
    // --- AUTH ACTIONS (MOCKED) ---
    const handleAuth = (type) => {
        setAuthError('');
        if (!authEmail || !authPass)
            return setAuthError('Please fill in all fields');
        const dbUsers = JSON.parse(localStorage.getItem('rememory_db_users') || '{}');
        if (type === 'signup') {
            if (dbUsers[authEmail])
                return setAuthError('User already exists');
            const newUser = { id: createRandomId(), email: authEmail, name: authEmail.split('@')[0] };
            dbUsers[authEmail] = newUser;
            localStorage.setItem('rememory_db_users', JSON.stringify(dbUsers));
            localStorage.setItem('rememory_user', JSON.stringify(newUser));
            setUser(newUser);
            setView('dashboard');
        }
        else {
            const found = dbUsers[authEmail];
            if (!found)
                return setAuthError('User not found');
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
    const handleCreate = async (input) => {
        if (!user)
            return;
        const payload = { ...input, voiceSampleUrl: input.voiceUrl || undefined };
        const res = await fetch(`${API_BASE_URL}/persona`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
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
    const handleUpdate = async (input) => {
        if (!selectedPersona || !user)
            return;
        const { name, relationship, ...allowedUpdates } = input;
        const payload = { ...allowedUpdates, voiceSampleUrl: allowedUpdates.voiceUrl || undefined };
        delete payload.voiceUrl;
        const res = await fetch(`${API_BASE_URL}/persona/${selectedPersona.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const updated = await loadPersona(user);
            if (updated) {
                localStorage.setItem(PERSONA_CACHE_KEY, JSON.stringify(updated));
            }
            setIsEditing(false);
        }
        else {
            alert('Failed to update. Note: You cannot change Name or Relationship.');
        }
    };
    const handleDelete = async (personaId) => {
        if (!user)
            return;
        const targetId = personaId || selectedPersona?.id;
        if (!targetId)
            return;
        const CONFIRMATION_SENTENCE = 'I understand this will permanently delete my persona and messages.';
        const res = await fetch(`${API_BASE_URL}/persona/${targetId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
            body: JSON.stringify({ confirmation: CONFIRMATION_SENTENCE })
        });
        if (res.ok) {
            setPersonas([]);
            setSelectedPersonaId(null);
            setIsEditing(false);
            localStorage.removeItem(PERSONA_CACHE_KEY);
            setView('dashboard');
        }
        else {
            alert('Delete failed.');
        }
    };
    const sendMessage = async (text, isHiddenInstruction = false) => {
        if (!selectedPersona || !user)
            return;
        const pid = selectedPersona.id;
        if (!isHiddenInstruction) {
            setChatMessages(prev => ({ ...prev, [pid]: [...(prev[pid] || []), { sender: 'user', text, timestamp: new Date().toISOString() }] }));
        }
        setIsSending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/persona/${pid}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
                body: JSON.stringify({ text, clientMessageId: createClientMessageId() })
            });
            const data = await res.json();
            const aiText = data.messages.find((m) => m.sender === 'ai')?.text || "...";
            setChatMessages(prev => ({ ...prev, [pid]: [...(prev[pid] || []).filter(m => m.timestamp !== 'pending'), { sender: 'ai', text: aiText, timestamp: new Date().toISOString() }] }));
        }
        catch (e) { /* handle error */ }
        finally {
            setIsSending(false);
        }
    };
    useEffect(() => {
        if (view === 'chat' && selectedPersona) {
            const msgs = chatMessages[selectedPersona.id] || [];
            if (msgs.length === 0 && !isSending) {
                sendMessage("[HIDDEN_INSTRUCTION] The user has entered the room. Start the conversation now. Greet them authentically based on your persona profile and style.", true);
            }
        }
    }, [view, selectedPersonaId]);
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "header", children: [_jsx("div", { className: "logo", onClick: () => setView('home'), style: { cursor: 'pointer' }, children: "Rememory" }), _jsxs("div", { className: "header-right", children: [selectedPersona && view !== 'home' && _jsxs("div", { className: "timer-pill", children: [selectedPersona.remainingDays, " Days Left"] }), user && _jsx(Button, { variant: "ghost", onClick: logout, children: "Logout" })] })] }), _jsxs("main", { className: "main", children: [!user && (_jsxs("div", { className: "auth-box", children: [_jsx("h1", { className: "title", style: { fontSize: '3.5rem', marginBottom: 10 }, children: "Rememory" }), _jsx("p", { className: "subtitle", children: "A space to hold on, before letting go." }), view === 'home' && (_jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }, children: [_jsx(Button, { onClick: () => setView('login'), children: "Login" }), _jsx(Button, { variant: "ghost", onClick: () => setView('signup'), children: "Sign Up" })] })), (view === 'login' || view === 'signup') && (_jsxs("div", { style: { marginTop: 20, textAlign: 'left', maxWidth: 300, marginInline: 'auto' }, children: [_jsxs("div", { style: { marginBottom: 10 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 5, fontSize: '0.9rem', color: '#666' }, children: "Email" }), _jsx(Input, { type: "email", autoComplete: "off", placeholder: "Your email", value: authEmail, onChange: e => setAuthEmail(e.target.value) })] }), _jsxs("div", { style: { marginBottom: 10 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 5, fontSize: '0.9rem', color: '#666' }, children: "Password" }), _jsx(Input, { type: "password", autoComplete: "off", placeholder: "Create a password", value: authPass, onChange: e => setAuthPass(e.target.value) })] }), authError && _jsx("div", { style: { color: 'red', marginBottom: 10 }, children: authError }), _jsx(Button, { style: { width: '100%' }, onClick: () => handleAuth(view), children: view === 'login' ? 'Enter Space' : 'Create Account' }), _jsx("div", { style: { marginTop: 10, textAlign: 'center', fontSize: '0.9rem', cursor: 'pointer', color: '#888' }, onClick: () => setView(view === 'login' ? 'signup' : 'login'), children: view === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login" })] }))] })), user && view === 'dashboard' && (personas.length > 0 ? (_jsx("div", { className: "dashboard-grid", children: personas.map(p => (_jsxs("div", { className: "memory-tile", onClick: () => { setSelectedPersonaId(p.id); setView('chat'); }, children: [_jsx("h2", { className: "memory-name", children: p.name }), _jsx("div", { className: "memory-rel", children: p.relationship }), _jsxs("div", { className: "tile-actions", children: [_jsx("button", { className: "action-btn", onClick: (e) => { e.stopPropagation(); setSelectedPersonaId(p.id); setView('chat'); }, children: "Message" }), _jsx("button", { className: "action-btn", onClick: (e) => { e.stopPropagation(); alert('Voice coming soon'); }, children: "Voice" }), _jsx("button", { className: "action-btn", onClick: (e) => { e.stopPropagation(); setSelectedPersonaId(p.id); setIsEditing(true); }, children: "Details" }), _jsx("button", { className: "action-btn", onClick: (e) => {
                                                e.stopPropagation();
                                                setSelectedPersonaId(p.id);
                                                if (confirm('Delete this persona and all chat history?')) {
                                                    handleDelete(p.id);
                                                }
                                            }, children: "Delete" })] })] }, p.id))) })) : (_jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("p", { className: "subtitle", children: "No memories found." }), _jsx(Button, { onClick: () => setView('persona'), children: "Create Memory" })] }))), user && view === 'persona' && _jsx(PersonaForm, { onSubmit: handleCreate, onCancel: () => setView('dashboard') }), user && isEditing && selectedPersona && (_jsx("div", { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }, children: _jsx(PersonaForm, { initialData: selectedPersona, onSubmit: handleUpdate, onDelete: handleDelete, isEditing: true, onCancel: () => setIsEditing(false) }) })), user && view === 'chat' && selectedPersona && (_jsxs("div", { className: "chat-wrapper", children: [_jsxs("div", { className: "chat-top", style: { gap: 12 }, children: [_jsx("button", { className: "back-arrow", onClick: () => setView('dashboard'), children: "<" }), _jsx("div", { style: { fontWeight: 600, fontSize: '1.1rem' }, children: selectedPersona.name }), _jsxs("div", { style: { marginLeft: 'auto', display: 'flex', gap: 8 }, children: [_jsx("button", { className: "action-btn", onClick: () => setIsEditing(true), children: "Edit" }), _jsx("button", { className: "action-btn", onClick: () => { if (confirm('Delete this persona and all chat history?'))
                                                    handleDelete(selectedPersona.id); }, children: "Delete" })] })] }), _jsxs("div", { className: "chat-scroll", children: [(chatMessages[selectedPersona.id] || []).map((m, i) => (_jsxs("div", { className: `msg-group ${m.sender === 'user' ? 'msg-user' : 'msg-ai'}`, children: [_jsx("div", { className: "bubble", children: m.text }), _jsx("div", { className: "timestamp", children: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })] }, i))), isSending && _jsxs("div", { style: { paddingLeft: 32, color: '#aaa', fontStyle: 'italic' }, children: [selectedPersona.name, " is typing..."] }), _jsx("div", { ref: chatBottomRef })] }), _jsxs("form", { onSubmit: e => { e.preventDefault(); const el = e.target.elements.text; if (el.value.trim()) {
                                    sendMessage(el.value);
                                    el.value = '';
                                } }, className: "chat-bottom", children: [_jsx("input", { name: "text", className: "chat-input", placeholder: "Type a message...", disabled: isSending, autoFocus: true }), _jsx("button", { type: "submit", className: "send-circle", disabled: isSending, children: "\u2191" })] })] }))] })] }));
};
export default App;
