import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useState, } from 'react';
const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');
const API_STATIC_BEARER = import.meta.env.VITE_API_STATIC_BEARER ?? '';
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const buildAuthHeaders = () => API_STATIC_BEARER ? { Authorization: `Bearer ${API_STATIC_BEARER}` } : {};
const splitList = (input, fallback, limit = 10) => {
    const entries = input
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean);
    if (entries.length === 0) {
        return [fallback];
    }
    return Array.from(new Set(entries)).slice(0, limit);
};
const createRandomId = () => typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `persona-${Date.now().toString(36)}`;
const Card = ({ children, style }) => (_jsx("div", { className: "card", style: style, children: children }));
const Button = ({ children, variant = 'primary', ...props }) => (_jsx("button", { className: `btn btn-${variant}`, ...props, children: children }));
const Input = ({ style, ...props }) => (_jsx("input", { className: "input", style: { width: '100%', boxSizing: 'border-box', ...style }, ...props }));
const TextArea = ({ style, ...props }) => (_jsx("textarea", { className: "textarea", style: { width: '100%', resize: 'none', boxSizing: 'border-box', ...style }, ...props }));
const App = () => {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('home');
    const [personas, setPersonas] = useState([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);
    const [chatMessages, setChatMessages] = useState({});
    const [, setClosureData] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isPersonaLoading, setIsPersonaLoading] = useState(false);
    const [isSavingPersona, setIsSavingPersona] = useState(false);
    const selectedPersona = personas.find((persona) => persona.id === selectedPersonaId) ?? null;
    const personaExpired = selectedPersona
        ? selectedPersona.remainingDays <= 0 || selectedPersona.status === 'expired'
        : false;
    const personaLastDay = selectedPersona ? selectedPersona.remainingDays === 1 : false;
    const show3DayBanner = selectedPersona ? selectedPersona.remainingDays === 3 : false;
    const personaExists = personas.length > 0;
    const isDev = import.meta.env.DEV;
    const normalizePersonaFromApi = useCallback((data) => {
        const summaryParts = [
            data.relationship ? `Relationship: ${data.relationship}` : null,
            data.traits?.length ? `Traits: ${data.traits.join(', ')}` : null,
            data.keyMemories?.length ? `Memories: ${data.keyMemories.join(', ')}` : null,
            data.commonPhrases?.length ? `Phrases: ${data.commonPhrases.join(', ')}` : null,
        ].filter(Boolean);
        const description = summaryParts.join(' • ') || 'Cherished companion';
        return {
            id: data.id,
            name: data.name,
            description,
            voiceUrl: data.voiceSampleUrl ?? null,
            createdAt: data.expiresAt ?? new Date().toISOString(),
            remainingDays: typeof data.remainingMs === 'number'
                ? Math.max(0, Math.ceil(data.remainingMs / MS_IN_DAY))
                : 30,
            status: data.status,
        };
    }, []);
    const loadPersona = useCallback(async () => {
        setIsPersonaLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/persona`, {
                headers: {
                    ...buildAuthHeaders(),
                },
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 404) {
                    setPersonas([]);
                    setSelectedPersonaId(null);
                    return null;
                }
                throw new Error('Failed to fetch persona');
            }
            const data = await response.json();
            if (!data) {
                setPersonas([]);
                setSelectedPersonaId(null);
                return null;
            }
            const personaRecord = normalizePersonaFromApi(data);
            setPersonas([personaRecord]);
            setSelectedPersonaId(personaRecord.id);
            setChatMessages((prev) => {
                if (prev[personaRecord.id])
                    return prev;
                return {
                    ...prev,
                    [personaRecord.id]: [
                        {
                            sender: 'ai',
                            text: `Hi, I'm ${personaRecord.name}. I'm here to listen to what you wish you could say.`,
                            timestamp: new Date().toISOString(),
                        },
                    ],
                };
            });
            return personaRecord;
        }
        catch (error) {
            console.error(error);
            return null;
        }
        finally {
            setIsPersonaLoading(false);
        }
    }, [normalizePersonaFromApi, setChatMessages]);
    const handleLogin = async (credentials) => {
        setUser({ id: 'u1', email: credentials.email, name: 'User' });
        const personaRecord = await loadPersona();
        if (personaRecord) {
            setView('dashboard');
            return;
        }
        setView('persona');
    };
    const handleSignup = (data) => {
        setUser({ id: 'u1', email: data.email, name: data.name });
        setPersonas([]);
        setSelectedPersonaId(null);
        setView('persona');
    };
    const handleLogout = () => {
        setUser(null);
        setSelectedPersonaId(null);
        setPersonas([]);
        setChatMessages({});
        setView('home');
    };
    const handleCreatePersona = async (input) => {
        if (isSavingPersona)
            return;
        if (personas.length > 0) {
            setView('dashboard');
            return;
        }
        setIsSavingPersona(true);
        try {
            const response = await fetch(`${API_BASE_URL}/persona`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...buildAuthHeaders(),
                },
                body: JSON.stringify({
                    name: input.name,
                    relationship: input.relationship,
                    traits: input.traits,
                    keyMemories: input.keyMemories,
                    commonPhrases: input.commonPhrases,
                    voiceSampleUrl: input.voiceUrl || undefined,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to save persona');
            }
            const personaRecord = await loadPersona();
            if (personaRecord) {
                setView('dashboard');
            }
        }
        catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Unable to save persona. Please make sure all required details are filled in.';
            alert(message);
        }
        finally {
            setIsSavingPersona(false);
        }
    };
    const handleSelectPersona = (id) => {
        setSelectedPersonaId(id);
    };
    const appendMessage = (personaId, message) => {
        setChatMessages((prev) => {
            const existing = prev[personaId] ?? [];
            return { ...prev, [personaId]: [...existing, message] };
        });
    };
    const handleSendTextMessage = async (text) => {
        if (!selectedPersona || personaExpired)
            return;
        const personaId = selectedPersona.id;
        appendMessage(personaId, {
            sender: 'user',
            text,
            timestamp: new Date().toISOString(),
        });
        const clientMessageId = createRandomId();
        const endpoint = `${API_BASE_URL}/persona/${personaId}/chat`;
        setIsSending(true);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...buildAuthHeaders(),
                },
                body: JSON.stringify({
                    text,
                    clientMessageId,
                }),
            });
            if (!response.ok) {
                throw new Error(`Chat request failed (${response.status})`);
            }
            const payload = await response.json();
            const aiPayload = payload.messages?.find((message) => message.sender === 'ai');
            if (aiPayload) {
                appendMessage(personaId, {
                    sender: 'ai',
                    text: aiPayload.text,
                    timestamp: aiPayload.timestamp ?? new Date().toISOString(),
                });
            }
            else {
                appendMessage(personaId, {
                    sender: 'ai',
                    text: 'I heard you. Thank you for sharing that.',
                    timestamp: new Date().toISOString(),
                });
            }
            const updatedDays = typeof payload.remainingMs === 'number'
                ? Math.max(0, Math.ceil(payload.remainingMs / MS_IN_DAY))
                : undefined;
            setPersonas((prev) => prev.map((persona) => persona.id === personaId
                ? {
                    ...persona,
                    status: payload.personaStatus ?? persona.status,
                    ...(updatedDays !== undefined ? { remainingDays: updatedDays } : {}),
                }
                : persona));
        }
        catch (error) {
            console.error(error);
            appendMessage(personaId, {
                sender: 'ai',
                text: 'I am having trouble reaching the Rememory service right now. Please try again shortly.',
                timestamp: new Date().toISOString(),
            });
        }
        finally {
            setIsSending(false);
        }
    };
    const handleSendVoiceMessage = async (simulatedTranscript) => {
        await handleSendTextMessage(simulatedTranscript);
    };
    const handleFinishGuidedClosure = (answers) => {
        setClosureData(answers);
        if (selectedPersona) {
            setPersonas((prev) => prev.map((persona) => persona.id === selectedPersona.id ? { ...persona, remainingDays: 0, status: 'expired' } : persona));
        }
        setView('dashboard');
    };
    const debugDecrementDays = () => {
        if (!selectedPersona)
            return;
        setPersonas((prev) => prev.map((persona) => persona.id === selectedPersona.id
            ? { ...persona, remainingDays: Math.max(0, persona.remainingDays - 1) }
            : persona));
    };
    return (_jsxs("div", { className: "app", children: [_jsx(Header, { user: user, onLogout: handleLogout, selectedPersona: selectedPersona, onCheckRemaining: () => {
                    if (!selectedPersona)
                        return;
                    alert(`You have ${selectedPersona.remainingDays} day(s) remaining with this persona.`);
                } }), _jsxs("main", { className: "main", children: [!user && view === 'home' && (_jsx(HomeScreen, { goLogin: () => setView('login'), goSignup: () => setView('signup') })), !user && view === 'login' && (_jsx(LoginPage, { onLogin: handleLogin, goSignup: () => setView('signup') })), !user && view === 'signup' && (_jsx(SignupPage, { onSignup: handleSignup, goLogin: () => setView('login') })), user && isPersonaLoading && (_jsx(Card, { children: _jsx("p", { className: "muted", children: "Loading your saved persona..." }) })), user && view === 'persona' && !personaExists && (_jsx(PersonaCreationPage, { onCreate: handleCreatePersona, disabled: isSavingPersona })), user && view === 'persona' && personaExists && (_jsxs(Card, { style: { maxWidth: 640 }, children: [_jsx("h2", { children: "You already have a companion" }), _jsx("p", { className: "muted", children: "Rememory supports one active persona per account. To start another session, complete closure and delete the existing persona." }), _jsx(Button, { onClick: () => setView('dashboard'), children: "Back to Dashboard" })] })), user && view === 'dashboard' && (_jsx(Dashboard, { personas: personas, selectedPersonaId: selectedPersonaId, onSelectPersona: handleSelectPersona, goToPersonaPage: () => setView('persona'), goToChat: () => setView('chat'), goToVoice: () => setView('voice'), goToClosure: () => setView('closure'), personaExpired: personaExpired, personaLastDay: personaLastDay, show3DayBanner: show3DayBanner })), user && view === 'chat' && selectedPersona && (_jsxs(Card, { children: [_jsx(BackBar, { onBack: () => setView('dashboard'), title: "Text Chat" }), _jsx(RemainingTimeBadge, { persona: selectedPersona }), personaExpired ? (_jsx(ExpiredNotice, {})) : (_jsxs(_Fragment, { children: [show3DayBanner && _jsx(ThreeDayBanner, {}), _jsx(TextChat, { persona: selectedPersona, messages: chatMessages[selectedPersona.id] ?? [], onSend: handleSendTextMessage, disabled: personaExpired, isSending: isSending }), personaLastDay && (_jsx("div", { className: "mt", children: _jsx(Button, { variant: "ghost", onClick: () => setView('closure'), children: "Begin Guided Reflection" }) }))] }))] })), user && view === 'voice' && selectedPersona && (_jsxs(Card, { children: [_jsx(BackBar, { onBack: () => setView('dashboard'), title: "Voice Chat" }), _jsx(RemainingTimeBadge, { persona: selectedPersona }), personaExpired ? (_jsx(ExpiredNotice, {})) : (_jsxs(_Fragment, { children: [show3DayBanner && _jsx(ThreeDayBanner, {}), _jsx(VoiceChat, { persona: selectedPersona, messages: chatMessages[selectedPersona.id] ?? [], onSend: handleSendVoiceMessage, disabled: personaExpired, isSending: isSending }), personaLastDay && (_jsx("div", { className: "mt", children: _jsx(Button, { variant: "ghost", onClick: () => setView('closure'), children: "Begin Guided Reflection" }) }))] }))] })), user && view === 'closure' && selectedPersona && (_jsxs(Card, { children: [_jsx(BackBar, { onBack: () => setView('dashboard'), title: "Guided Closure" }), _jsx(GuidedClosure, { persona: selectedPersona, onFinish: handleFinishGuidedClosure })] }))] }), isDev && user && selectedPersona && (_jsxs("div", { className: "debug-toolbar", children: [_jsx("span", { children: "Debug:" }), _jsx(Button, { variant: "ghost", onClick: debugDecrementDays, children: "-1 day (current persona)" })] }))] }));
};
const Header = ({ user, onLogout, selectedPersona, onCheckRemaining }) => (_jsxs("header", { className: "header", children: [_jsx("div", { className: "logo", children: "Rememory" }), _jsxs("div", { className: "header-right", children: [selectedPersona && (_jsx(Button, { variant: "ghost", onClick: onCheckRemaining, children: "Check Remaining Time" })), user && (_jsxs(_Fragment, { children: [_jsx("span", { className: "header-email", children: user.email }), _jsx(Button, { variant: "ghost", onClick: onLogout, children: "Logout" })] }))] })] }));
const BackBar = ({ onBack, title }) => (_jsxs("div", { className: "back-bar", children: [_jsx("button", { className: "back-btn", onClick: onBack, type: "button", children: "\u2190 Back" }), _jsx("h2", { children: title })] }));
const HomeScreen = ({ goLogin, goSignup }) => (_jsxs(Card, { style: { maxWidth: 720, textAlign: 'center' }, children: [_jsx("h1", { className: "title", children: "Rememory" }), _jsx("p", { className: "subtitle", children: "A gentle place to revisit treasured memories, hold guided conversations, and move toward healing at your own pace." }), _jsxs("div", { style: { display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }, children: [_jsx(Button, { onClick: goLogin, children: "Log In" }), _jsx(Button, { variant: "ghost", onClick: goSignup, children: "Create Account" })] })] }));
const LoginPage = ({ onLogin, goSignup }) => {
    const [email, setEmail] = useState('user@example.com');
    const [password, setPassword] = useState('password123');
    const handleSubmit = (event) => {
        event.preventDefault();
        onLogin({ email, password });
    };
    return (_jsxs(Card, { style: { maxWidth: 480 }, children: [_jsx("h1", { className: "title", children: "Login" }), _jsx("p", { className: "subtitle", children: "Continue your healing journey with Rememory." }), _jsxs("form", { onSubmit: handleSubmit, className: "form", children: [_jsxs("label", { children: ["Email", _jsx(Input, { type: "email", required: true, value: email, onChange: (event) => setEmail(event.target.value) })] }), _jsxs("label", { children: ["Password", _jsx(Input, { type: "password", required: true, value: password, onChange: (event) => setPassword(event.target.value) })] }), _jsx(Button, { type: "submit", children: "Login" })] }), _jsxs("p", { className: "muted", children: ["Don't have an account?", ' ', _jsx("button", { className: "link-button", type: "button", onClick: goSignup, children: "Sign up" })] })] }));
};
const SignupPage = ({ onSignup, goLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('user@example.com');
    const [password, setPassword] = useState('password123');
    const handleSubmit = (event) => {
        event.preventDefault();
        onSignup({ name, email, password });
    };
    return (_jsxs(Card, { style: { maxWidth: 480 }, children: [_jsx("h1", { className: "title", children: "Sign Up" }), _jsx("p", { className: "subtitle", children: "Create an account to start a time-limited conversation with an AI persona of your loved one." }), _jsxs("form", { onSubmit: handleSubmit, className: "form", children: [_jsxs("label", { children: ["Name", _jsx(Input, { required: true, value: name, onChange: (event) => setName(event.target.value), placeholder: "Your name" })] }), _jsxs("label", { children: ["Email", _jsx(Input, { type: "email", required: true, value: email, onChange: (event) => setEmail(event.target.value) })] }), _jsxs("label", { children: ["Password", _jsx(Input, { type: "password", required: true, value: password, onChange: (event) => setPassword(event.target.value) })] }), _jsx(Button, { type: "submit", children: "Create Account" })] }), _jsxs("p", { className: "muted", children: ["Already have an account?", ' ', _jsx("button", { className: "link-button", type: "button", onClick: goLogin, children: "Login" })] })] }));
};
const PersonaCreationPage = ({ onCreate, disabled, }) => {
    const [name, setName] = useState('');
    const [relationship, setRelationship] = useState('');
    const [description, setDescription] = useState('');
    const [traitsInput, setTraitsInput] = useState('');
    const [memoriesInput, setMemoriesInput] = useState('');
    const [phrasesInput, setPhrasesInput] = useState('');
    const [voiceUrl, setVoiceUrl] = useState('');
    const handleSubmit = (event) => {
        event.preventDefault();
        if (disabled || !name.trim() || !relationship.trim())
            return;
        const descriptionText = description.trim();
        onCreate({
            name: name.trim(),
            relationship: relationship.trim(),
            description: descriptionText,
            voiceUrl: voiceUrl.trim() || undefined,
            traits: splitList(traitsInput || descriptionText, 'Warm and compassionate', 8),
            keyMemories: splitList(memoriesInput || descriptionText, 'Quiet evenings sharing stories', 10),
            commonPhrases: splitList(phrasesInput, 'I am with you, always.', 10),
        });
    };
    return (_jsxs(Card, { style: { maxWidth: 720 }, children: [_jsx("h1", { className: "title", children: "Create Persona" }), _jsx("p", { className: "subtitle", children: "Tell Rememory about your loved one. These details shape the AI persona's voice, memories, and guidance." }), _jsxs("form", { onSubmit: handleSubmit, className: "form", children: [_jsxs("label", { children: ["Persona Name", _jsx(Input, { value: name, onChange: (event) => setName(event.target.value), placeholder: "e.g. Mum, Dad, Ah Ma", required: true })] }), _jsxs("label", { children: ["Relationship to you", _jsx(Input, { value: relationship, onChange: (event) => setRelationship(event.target.value), placeholder: "Parent, partner, sibling...", required: true })] }), _jsxs("label", { children: ["Personality & important context", _jsx(TextArea, { rows: 4, value: description, onChange: (event) => setDescription(event.target.value), placeholder: "Describe their personality, how they talked, meaningful shared moments..." })] }), _jsxs("label", { children: ["Personality traits (comma or new-line separated)", _jsx(TextArea, { rows: 2, value: traitsInput, onChange: (event) => setTraitsInput(event.target.value), placeholder: "Gentle, humorous, encouraging" })] }), _jsxs("label", { children: ["Cherished memories (one per line)", _jsx(TextArea, { rows: 3, value: memoriesInput, onChange: (event) => setMemoriesInput(event.target.value), placeholder: "The picnic by the lake\nSinging together in the car" })] }), _jsxs("label", { children: ["Signature phrases (comma or new-line separated)", _jsx(TextArea, { rows: 2, value: phrasesInput, onChange: (event) => setPhrasesInput(event.target.value), placeholder: "Remember to breathe, You've got this" })] }), _jsxs("label", { children: ["Voice Sample URL (optional)", _jsx(Input, { value: voiceUrl, onChange: (event) => setVoiceUrl(event.target.value), placeholder: "Link to a voice sample for future TTS" })] }), _jsx(Button, { type: "submit", disabled: disabled, children: disabled ? 'Saving...' : 'Save Persona' })] })] }));
};
const Dashboard = ({ personas, selectedPersonaId, onSelectPersona, goToPersonaPage, goToChat, goToVoice, goToClosure, personaExpired, personaLastDay, show3DayBanner, }) => {
    const hasPersona = personas.length > 0;
    return (_jsxs(Card, { children: [_jsx("h1", { children: "Dashboard" }), _jsx("p", { className: "muted", children: "Choose your persona to start the daily session, or set one up to begin." }), _jsxs("div", { className: "grid", children: [_jsxs("div", { children: [hasPersona ? (_jsx(PersonaList, { personas: personas, selectedPersonaId: selectedPersonaId, onSelect: onSelectPersona })) : (_jsx("p", { className: "muted", children: "You don't have any personas yet. Please create one to begin." })), _jsxs("div", { className: "mt", children: [_jsx(Button, { onClick: goToChat, disabled: !hasPersona, children: "Open Text Chat" }), _jsx(Button, { variant: "ghost", onClick: goToVoice, disabled: !hasPersona, style: { marginLeft: 8 }, children: "Open Voice Chat" }), _jsx(Button, { variant: "ghost", onClick: goToClosure, disabled: !personaLastDay && !personaExpired, style: { marginLeft: 8 }, children: "Guided Closure" })] }), personaExpired && (_jsx("p", { className: "warning mt", children: "This persona has expired. The one-month interaction period has ended." })), show3DayBanner && _jsx(ThreeDayBanner, { className: "mt" })] }), _jsxs("div", { children: [_jsx("h2", { children: "Persona setup" }), _jsx("p", { className: "muted", children: "Each account can host one active persona at a time." }), _jsx(Button, { onClick: goToPersonaPage, disabled: hasPersona, children: hasPersona ? 'Persona Already Created' : 'Create Persona' }), hasPersona && (_jsx("p", { className: "muted mt", children: "To create another, complete the current journey and delete the existing persona in settings." }))] })] })] }));
};
const PersonaList = ({ personas, selectedPersonaId, onSelect, }) => {
    if (personas.length === 0) {
        return _jsx("p", { children: "No personas yet." });
    }
    return (_jsx("div", { className: "persona-list", children: personas.map((persona) => (_jsxs("button", { className: `persona-item ${persona.id === selectedPersonaId ? 'persona-item-active' : ''}`, onClick: () => onSelect(persona.id), type: "button", children: [_jsx("div", { className: "persona-name", children: persona.name }), _jsxs("div", { className: "persona-meta", children: ["Remaining days: ", persona.remainingDays] })] }, persona.id))) }));
};
const TextChat = ({ persona, messages, onSend, disabled, isSending, }) => {
    const [input, setInput] = useState('');
    const isInputDisabled = disabled || isSending;
    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmed = input.trim();
        if (!trimmed)
            return;
        onSend(trimmed);
        setInput('');
    };
    return (_jsxs("div", { children: [_jsxs("h2", { children: ["Chat with ", persona.name] }), _jsxs("div", { className: "chat-window", children: [messages.map((message, index) => (_jsxs("div", { className: `chat-bubble chat-bubble-${message.sender}`, children: [_jsx("div", { className: "chat-sender", children: message.sender === 'user' ? 'You' : persona.name }), _jsx("div", { children: message.text })] }, `${message.timestamp}-${index}`))), messages.length === 0 && _jsx("p", { className: "muted", children: "No messages yet. Say hello." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "chat-input-row", children: [_jsx(Input, { value: input, onChange: (event) => setInput(event.target.value), placeholder: "Type what you wish to say...", disabled: isInputDisabled }), _jsx(Button, { type: "submit", disabled: isInputDisabled, children: isSending ? 'Sending...' : 'Send' })] })] }));
};
const VoiceChat = ({ persona, messages, onSend, disabled, isSending, }) => {
    const [simulatedTranscript, setSimulatedTranscript] = useState('');
    const handleSend = () => {
        if (!simulatedTranscript.trim() || disabled || isSending)
            return;
        onSend(simulatedTranscript.trim());
        setSimulatedTranscript('');
    };
    return (_jsxs("div", { children: [_jsxs("h2", { children: ["Voice Chat with ", persona.name] }), _jsx("p", { className: "muted", children: "Final system: microphone + Speech-to-Text + Text-to-Speech. For now, type what you would say and click \"Send Voice\"." }), _jsxs("div", { className: "chat-window", children: [messages.map((message, index) => (_jsxs("div", { className: `chat-bubble chat-bubble-${message.sender}`, children: [_jsx("div", { className: "chat-sender", children: message.sender === 'user' ? 'You (voice)' : persona.name }), _jsx("div", { children: message.text })] }, `${message.timestamp}-${index}`))), messages.length === 0 && (_jsx("p", { className: "muted", children: "No voice interaction yet. Imagine speaking and see the reply." }))] }), _jsxs("div", { className: "chat-input-row", children: [_jsx(Input, { value: simulatedTranscript, onChange: (event) => setSimulatedTranscript(event.target.value), placeholder: "Simulated spoken words...", disabled: disabled || isSending }), _jsx(Button, { type: "button", onClick: handleSend, disabled: disabled || isSending, children: isSending ? 'Sending...' : 'Send Voice' })] })] }));
};
const RemainingTimeBadge = ({ persona }) => {
    if (!persona)
        return null;
    return _jsxs("div", { className: "badge", children: ["Remaining interaction time: ", persona.remainingDays, " day(s)"] });
};
const ThreeDayBanner = ({ className = '' }) => {
    const classes = ['banner', className].filter(Boolean).join(' ');
    return (_jsxs("div", { className: classes, children: [_jsx("strong", { children: "Reminder:" }), " You have 3 days remaining with your persona. Remember, Rememory is a temporary tool to aid your healing journey."] }));
};
const ExpiredNotice = () => (_jsx("p", { className: "warning", children: "This persona has expired. The one-month interaction period has ended to support healthy grieving and emotional detachment." }));
const GuidedClosure = ({ persona, onFinish }) => {
    const [answers, setAnswers] = useState({
        gratitude: '',
        regret: '',
        memory: '',
        future: '',
    });
    const handleChange = (field, value) => {
        setAnswers((prev) => ({ ...prev, [field]: value }));
    };
    const handleSubmit = (event) => {
        event.preventDefault();
        onFinish(answers);
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "form", children: [_jsxs("p", { className: "muted", children: ["This is your final guided reflection with ", persona.name, ". These questions help you move toward emotional closure."] }), _jsxs("label", { children: ["1. What would you like to thank ", persona.name, " for?", _jsx(TextArea, { rows: 3, value: answers.gratitude, onChange: (event) => handleChange('gratitude', event.target.value) })] }), _jsxs("label", { children: ["2. Are there any apologies or regrets you wish to express?", _jsx(TextArea, { rows: 3, value: answers.regret, onChange: (event) => handleChange('regret', event.target.value) })] }), _jsxs("label", { children: ["3. Describe one meaningful memory you cherish with ", persona.name, ".", _jsx(TextArea, { rows: 3, value: answers.memory, onChange: (event) => handleChange('memory', event.target.value) })] }), _jsxs("label", { children: ["4. How would you like to carry their influence into your future life?", _jsx(TextArea, { rows: 3, value: answers.future, onChange: (event) => handleChange('future', event.target.value) })] }), _jsx(Button, { type: "submit", children: "Complete Guided Closure" }), _jsx("p", { className: "muted mt", children: "After this step, your interaction with this persona will end, but your memories and growth stay with you." })] }));
};
export default App;
