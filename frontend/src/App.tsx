import {
  ButtonHTMLAttributes,
  CSSProperties,
  ChangeEvent,
  FormEvent,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  useCallback,
  useState,
} from 'react';

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');
const API_STATIC_BEARER = import.meta.env.VITE_API_STATIC_BEARER ?? '';
const MS_IN_DAY = 24 * 60 * 60 * 1000;

type View = 'home' | 'login' | 'signup' | 'persona' | 'dashboard' | 'chat' | 'voice' | 'closure';

type User = {
  id: string;
  email: string;
  name: string;
};

type Persona = {
  id: string;
  name: string;
  description: string;
  voiceUrl?: string | null;
  createdAt: string;
  remainingDays: number;
  status: 'active' | 'expired' | 'deleted';
};

type Message = {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
};

type GuidedClosureAnswers = {
  gratitude: string;
  regret: string;
  memory: string;
  future: string;
};

type ChatApiMessage = {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
};

type ChatApiResponse = {
  personaStatus: 'active' | 'expired' | 'deleted';
  remainingMs?: number | null;
  messages?: ChatApiMessage[];
  summaryAppended?: boolean;
};

type PersonaApiResponse = {
  id: string;
  name: string;
  relationship: string;
  status: 'active' | 'expired' | 'deleted';
  expiresAt: string | null;
  remainingMs?: number | null;
  traits?: string[];
  keyMemories?: string[];
  commonPhrases?: string[];
  voiceSampleUrl?: string | null;
  guidanceLevel?: number;
};

type PersonaFormInput = {
  name: string;
  relationship: string;
  description: string;
  voiceUrl?: string;
  traits: string[];
  keyMemories: string[];
  commonPhrases: string[];
};

const buildAuthHeaders = (): Record<string, string> =>
  API_STATIC_BEARER ? { Authorization: `Bearer ${API_STATIC_BEARER}` } : {};

const splitList = (input: string, fallback: string, limit = 10) => {
  const entries = input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (entries.length === 0) {
    return [fallback];
  }
  return Array.from(new Set(entries)).slice(0, limit);
};

const createRandomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `persona-${Date.now().toString(36)}`;

const Card = ({ children, style }: { children: React.ReactNode; style?: CSSProperties }) => (
  <div className="card" style={style}>
    {children}
  </div>
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

const Button = ({ children, variant = 'primary', ...props }: ButtonProps) => (
  <button className={`btn btn-${variant}`} {...props}>
    {children}
  </button>
);

const Input = ({ style, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className="input" style={{ width: '100%', boxSizing: 'border-box', ...style }} {...props} />
);

const TextArea = ({ style, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className="textarea"
    style={{ width: '100%', resize: 'none', boxSizing: 'border-box', ...style }}
    {...props}
  />
);

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('home');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({});
  const [, setClosureData] = useState<GuidedClosureAnswers | null>(null);
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

  const normalizePersonaFromApi = useCallback((data: PersonaApiResponse): Persona => {
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
      remainingDays:
        typeof data.remainingMs === 'number'
          ? Math.max(0, Math.ceil(data.remainingMs / MS_IN_DAY))
          : 30,
      status: data.status,
    };
  }, []);

  const loadPersona = useCallback(async (): Promise<Persona | null> => {
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
      const data: PersonaApiResponse | null = await response.json();
      if (!data) {
        setPersonas([]);
        setSelectedPersonaId(null);
        return null;
      }
      const personaRecord = normalizePersonaFromApi(data);
      setPersonas([personaRecord]);
      setSelectedPersonaId(personaRecord.id);
      setChatMessages((prev) => {
        if (prev[personaRecord.id]) return prev;
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
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setIsPersonaLoading(false);
    }
  }, [normalizePersonaFromApi, setChatMessages]);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    setUser({ id: 'u1', email: credentials.email, name: 'User' });
    const personaRecord = await loadPersona();
    if (personaRecord) {
      setView('dashboard');
      return;
    }
    setView('persona');
  };

  const handleSignup = (data: { name: string; email: string; password: string }) => {
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

  const handleCreatePersona = async (input: PersonaFormInput) => {
    if (isSavingPersona) return;
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
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Unable to save persona. Please make sure all required details are filled in.';
      alert(message);
    } finally {
      setIsSavingPersona(false);
    }
  };

  const handleSelectPersona = (id: string) => {
    setSelectedPersonaId(id);
  };

  const appendMessage = (personaId: string, message: Message) => {
    setChatMessages((prev) => {
      const existing = prev[personaId] ?? [];
      return { ...prev, [personaId]: [...existing, message] };
    });
  };

  const handleSendTextMessage = async (text: string) => {
    if (!selectedPersona || personaExpired) return;

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

      const payload: ChatApiResponse = await response.json();
      const aiPayload = payload.messages?.find((message) => message.sender === 'ai');
      if (aiPayload) {
        appendMessage(personaId, {
          sender: 'ai',
          text: aiPayload.text,
          timestamp: aiPayload.timestamp ?? new Date().toISOString(),
        });
      } else {
        appendMessage(personaId, {
          sender: 'ai',
          text: 'I heard you. Thank you for sharing that.',
          timestamp: new Date().toISOString(),
        });
      }

      const updatedDays =
        typeof payload.remainingMs === 'number'
          ? Math.max(0, Math.ceil(payload.remainingMs / MS_IN_DAY))
          : undefined;
      setPersonas((prev) =>
        prev.map((persona) =>
          persona.id === personaId
            ? {
                ...persona,
                status: payload.personaStatus ?? persona.status,
                ...(updatedDays !== undefined ? { remainingDays: updatedDays } : {}),
              }
            : persona,
        ),
      );
    } catch (error) {
      console.error(error);
      appendMessage(personaId, {
        sender: 'ai',
        text: 'I am having trouble reaching the Rememory service right now. Please try again shortly.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendVoiceMessage = async (simulatedTranscript: string) => {
    await handleSendTextMessage(simulatedTranscript);
  };

  const handleFinishGuidedClosure = (answers: GuidedClosureAnswers) => {
    setClosureData(answers);
    if (selectedPersona) {
      setPersonas((prev) =>
        prev.map((persona) =>
          persona.id === selectedPersona.id ? { ...persona, remainingDays: 0, status: 'expired' } : persona,
        ),
      );
    }
    setView('dashboard');
  };

  const debugDecrementDays = () => {
    if (!selectedPersona) return;
    setPersonas((prev) =>
      prev.map((persona) =>
        persona.id === selectedPersona.id
          ? { ...persona, remainingDays: Math.max(0, persona.remainingDays - 1) }
          : persona,
      ),
    );
  };

  return (
    <div className="app">
      <Header
        user={user}
        onLogout={handleLogout}
        selectedPersona={selectedPersona}
        onCheckRemaining={() => {
          if (!selectedPersona) return;
          alert(`You have ${selectedPersona.remainingDays} day(s) remaining with this persona.`);
        }}
      />

      <main className="main">
        {!user && view === 'home' && (
          <HomeScreen goLogin={() => setView('login')} goSignup={() => setView('signup')} />
        )}

        {!user && view === 'login' && (
          <LoginPage onLogin={handleLogin} goSignup={() => setView('signup')} />
        )}

        {!user && view === 'signup' && (
          <SignupPage onSignup={handleSignup} goLogin={() => setView('login')} />
        )}

        {user && isPersonaLoading && (
          <Card>
            <p className="muted">Loading your saved persona...</p>
          </Card>
        )}

        {user && view === 'persona' && !personaExists && (
          <PersonaCreationPage onCreate={handleCreatePersona} disabled={isSavingPersona} />
        )}

        {user && view === 'persona' && personaExists && (
          <Card style={{ maxWidth: 640 }}>
            <h2>You already have a companion</h2>
            <p className="muted">
              Rememory supports one active persona per account. To start another session, complete closure and delete the existing persona.
            </p>
            <Button onClick={() => setView('dashboard')}>Back to Dashboard</Button>
          </Card>
        )}

        {user && view === 'dashboard' && (
          <Dashboard
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            onSelectPersona={handleSelectPersona}
            goToPersonaPage={() => setView('persona')}
            goToChat={() => setView('chat')}
            goToVoice={() => setView('voice')}
            goToClosure={() => setView('closure')}
            personaExpired={personaExpired}
            personaLastDay={personaLastDay}
            show3DayBanner={show3DayBanner}
          />
        )}

        {user && view === 'chat' && selectedPersona && (
          <Card>
            <BackBar onBack={() => setView('dashboard')} title="Text Chat" />
            <RemainingTimeBadge persona={selectedPersona} />
            {personaExpired ? (
              <ExpiredNotice />
            ) : (
              <>
                {show3DayBanner && <ThreeDayBanner />}
                <TextChat
                  persona={selectedPersona}
                  messages={chatMessages[selectedPersona.id] ?? []}
                  onSend={handleSendTextMessage}
                  disabled={personaExpired}
                  isSending={isSending}
                />
                {personaLastDay && (
                  <div className="mt">
                    <Button variant="ghost" onClick={() => setView('closure')}>
                      Begin Guided Reflection
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {user && view === 'voice' && selectedPersona && (
          <Card>
            <BackBar onBack={() => setView('dashboard')} title="Voice Chat" />
            <RemainingTimeBadge persona={selectedPersona} />
            {personaExpired ? (
              <ExpiredNotice />
            ) : (
              <>
                {show3DayBanner && <ThreeDayBanner />}
                <VoiceChat
                  persona={selectedPersona}
                  messages={chatMessages[selectedPersona.id] ?? []}
                  onSend={handleSendVoiceMessage}
                  disabled={personaExpired}
                  isSending={isSending}
                />
                {personaLastDay && (
                  <div className="mt">
                    <Button variant="ghost" onClick={() => setView('closure')}>
                      Begin Guided Reflection
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {user && view === 'closure' && selectedPersona && (
          <Card>
            <BackBar onBack={() => setView('dashboard')} title="Guided Closure" />
            <GuidedClosure persona={selectedPersona} onFinish={handleFinishGuidedClosure} />
          </Card>
        )}
      </main>

      {isDev && user && selectedPersona && (
        <div className="debug-toolbar">
          <span>Debug:</span>
          <Button variant="ghost" onClick={debugDecrementDays}>
            -1 day (current persona)
          </Button>
        </div>
      )}
    </div>
  );
};

type HeaderProps = {
  user: User | null;
  onLogout: () => void;
  selectedPersona: Persona | null;
  onCheckRemaining: () => void;
};

const Header = ({ user, onLogout, selectedPersona, onCheckRemaining }: HeaderProps) => (
  <header className="header">
    <div className="logo">Rememory</div>
    <div className="header-right">
      {selectedPersona && (
        <Button variant="ghost" onClick={onCheckRemaining}>
          Check Remaining Time
        </Button>
      )}
      {user && (
        <>
          <span className="header-email">{user.email}</span>
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        </>
      )}
    </div>
  </header>
);

const BackBar = ({ onBack, title }: { onBack: () => void; title: string }) => (
  <div className="back-bar">
    <button className="back-btn" onClick={onBack} type="button">
      ← Back
    </button>
    <h2>{title}</h2>
  </div>
);

const HomeScreen = ({ goLogin, goSignup }: { goLogin: () => void; goSignup: () => void }) => (
  <Card style={{ maxWidth: 720, textAlign: 'center' }}>
    <h1 className="title">Rememory</h1>
    <p className="subtitle">
      A gentle place to revisit treasured memories, hold guided conversations, and move toward healing at your own pace.
    </p>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
      <Button onClick={goLogin}>Log In</Button>
      <Button variant="ghost" onClick={goSignup}>
        Create Account
      </Button>
    </div>
  </Card>
);

const LoginPage = ({ onLogin, goSignup }: { onLogin: (credentials: { email: string; password: string }) => void; goSignup: () => void }) => {
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('password123');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin({ email, password });
  };

  return (
    <Card style={{ maxWidth: 480 }}>
      <h1 className="title">Login</h1>
      <p className="subtitle">Continue your healing journey with Rememory.</p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <Input
            type="email"
            required
            placeholder="user@example.com"
            value={email}
            onFocus={() => email === 'user@example.com' && setEmail('')}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <Input
            type="password"
            required
            value={password}
            placeholder="Enter your password"
            onFocus={() => password === 'password123' && setPassword('')}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <Button type="submit">Login</Button>
      </form>
      <p className="muted">
        Don&apos;t have an account?{' '}
        <button className="link-button" type="button" onClick={goSignup}>
          Sign up
        </button>
      </p>
    </Card>
  );
};

const SignupPage = ({ onSignup, goLogin }: { onSignup: (data: { name: string; email: string; password: string }) => void; goLogin: () => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('password123');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSignup({ name, email, password });
  };

  return (
    <Card style={{ maxWidth: 480 }}>
      <h1 className="title">Sign Up</h1>
      <p className="subtitle">
        Create an account to start a time-limited conversation with an AI persona of your loved one.
      </p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Name
          <Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
        </label>
        <label>
          Email
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onFocus={() => email === 'user@example.com' && setEmail('')}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <Input
            type="password"
            required
            value={password}
            placeholder="Create a password"
            onFocus={() => password === 'password123' && setPassword('')}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <Button type="submit">Create Account</Button>
      </form>
      <p className="muted">
        Already have an account?{' '}
        <button className="link-button" type="button" onClick={goLogin}>
          Login
        </button>
      </p>
    </Card>
  );
};

const PersonaCreationPage = ({
  onCreate,
  disabled,
}: {
  onCreate: (data: PersonaFormInput) => void | Promise<void>;
  disabled?: boolean;
}) => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [description, setDescription] = useState('');
  const [traitsInput, setTraitsInput] = useState('');
  const [memoriesInput, setMemoriesInput] = useState('');
  const [phrasesInput, setPhrasesInput] = useState('');
  const [voiceUrl, setVoiceUrl] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || !name.trim() || !relationship.trim()) return;
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

  return (
    <Card style={{ maxWidth: 720 }}>
      <h1 className="title">Create Persona</h1>
      <p className="subtitle">
        Tell Rememory about your loved one. These details shape the AI persona&apos;s voice, memories, and guidance.
      </p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Persona Name
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Mum, Dad, Ah Ma"
            required
          />
        </label>
        <label>
          Relationship to you
          <Input
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            placeholder="Parent, partner, sibling..."
            required
          />
        </label>
        <label>
          Personality &amp; important context
          <TextArea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe their personality, how they talked, meaningful shared moments..."
          />
        </label>
        <label>
          Personality traits (comma or new-line separated)
          <TextArea
            rows={2}
            value={traitsInput}
            onChange={(event) => setTraitsInput(event.target.value)}
            placeholder="Gentle, humorous, encouraging"
          />
        </label>
        <label>
          Cherished memories (one per line)
          <TextArea
            rows={3}
            value={memoriesInput}
            onChange={(event) => setMemoriesInput(event.target.value)}
            placeholder="The picnic by the lake&#10;Singing together in the car"
          />
        </label>
        <label>
          Signature phrases (comma or new-line separated)
          <TextArea
            rows={2}
            value={phrasesInput}
            onChange={(event) => setPhrasesInput(event.target.value)}
            placeholder="Remember to breathe, You've got this"
          />
        </label>
        <label>
          Voice Sample URL (optional)
          <Input
            value={voiceUrl}
            onChange={(event) => setVoiceUrl(event.target.value)}
            placeholder="Link to a voice sample for future TTS"
          />
        </label>
        <Button type="submit" disabled={disabled}>
          {disabled ? 'Saving...' : 'Save Persona'}
        </Button>
      </form>
    </Card>
  );
};

type DashboardProps = {
  personas: Persona[];
  selectedPersonaId: string | null;
  onSelectPersona: (id: string) => void;
  goToPersonaPage: () => void;
  goToChat: () => void;
  goToVoice: () => void;
  goToClosure: () => void;
  personaExpired: boolean;
  personaLastDay: boolean;
  show3DayBanner: boolean;
};

const Dashboard = ({
  personas,
  selectedPersonaId,
  onSelectPersona,
  goToPersonaPage,
  goToChat,
  goToVoice,
  goToClosure,
  personaExpired,
  personaLastDay,
  show3DayBanner,
}: DashboardProps) => {
  const hasPersona = personas.length > 0;

  return (
    <Card>
      <h1>Dashboard</h1>
      <p className="muted">Choose your persona to start the daily session, or set one up to begin.</p>

      <div className="grid">
        <div>
          {hasPersona ? (
            <PersonaList personas={personas} selectedPersonaId={selectedPersonaId} onSelect={onSelectPersona} />
          ) : (
            <p className="muted">You don&apos;t have any personas yet. Please create one to begin.</p>
          )}

          <div className="mt">
            <Button onClick={goToChat} disabled={!hasPersona}>
              Open Text Chat
            </Button>
            <Button variant="ghost" onClick={goToVoice} disabled={!hasPersona} style={{ marginLeft: 8 }}>
              Open Voice Chat
            </Button>
            <Button
              variant="ghost"
              onClick={goToClosure}
              disabled={!personaLastDay && !personaExpired}
              style={{ marginLeft: 8 }}
            >
              Guided Closure
            </Button>
          </div>

          {personaExpired && (
            <p className="warning mt">This persona has expired. The one-month interaction period has ended.</p>
          )}
          {show3DayBanner && <ThreeDayBanner className="mt" />}
        </div>

        <div>
          <h2>Persona setup</h2>
          <p className="muted">Each account can host one active persona at a time.</p>
          <Button onClick={goToPersonaPage} disabled={hasPersona}>
            {hasPersona ? 'Persona Already Created' : 'Create Persona'}
          </Button>
          {hasPersona && (
            <p className="muted mt">
              To create another, complete the current journey and delete the existing persona in settings.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

const PersonaList = ({
  personas,
  selectedPersonaId,
  onSelect,
}: {
  personas: Persona[];
  selectedPersonaId: string | null;
  onSelect: (id: string) => void;
}) => {
  if (personas.length === 0) {
    return <p>No personas yet.</p>;
  }

  return (
    <div className="persona-list">
      {personas.map((persona) => (
        <button
          key={persona.id}
          className={`persona-item ${persona.id === selectedPersonaId ? 'persona-item-active' : ''}`}
          onClick={() => onSelect(persona.id)}
          type="button"
        >
          <div className="persona-name">{persona.name}</div>
          <div className="persona-meta">Remaining days: {persona.remainingDays}</div>
        </button>
      ))}
    </div>
  );
};

const TextChat = ({
  persona,
  messages,
  onSend,
  disabled,
  isSending,
}: {
  persona: Persona;
  messages: Message[];
  onSend: (text: string) => Promise<void> | void;
  disabled: boolean;
  isSending: boolean;
}) => {
  const [input, setInput] = useState('');
  const isInputDisabled = disabled || isSending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  return (
    <div>
      <h2>Chat with {persona.name}</h2>
      <div className="chat-window">
        {messages.map((message, index) => (
          <div key={`${message.timestamp}-${index}`} className={`chat-bubble chat-bubble-${message.sender}`}>
            <div className="chat-sender">{message.sender === 'user' ? 'You' : persona.name}</div>
            <div>{message.text}</div>
          </div>
        ))}
        {messages.length === 0 && <p className="muted">No messages yet. Say hello.</p>}
      </div>
      <form onSubmit={handleSubmit} className="chat-input-row">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type what you wish to say..."
          disabled={isInputDisabled}
        />
        <Button type="submit" disabled={isInputDisabled}>
          {isSending ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  );
};

const VoiceChat = ({
  persona,
  messages,
  onSend,
  disabled,
  isSending,
}: {
  persona: Persona;
  messages: Message[];
  onSend: (text: string) => Promise<void> | void;
  disabled: boolean;
  isSending: boolean;
}) => {
  const [simulatedTranscript, setSimulatedTranscript] = useState('');

  const handleSend = () => {
    if (!simulatedTranscript.trim() || disabled || isSending) return;
    onSend(simulatedTranscript.trim());
    setSimulatedTranscript('');
  };

  return (
    <div>
      <h2>Voice Chat with {persona.name}</h2>
      <p className="muted">
        Final system: microphone + Speech-to-Text + Text-to-Speech. For now, type what you would say and click &quot;Send Voice&quot;.
      </p>
      <div className="chat-window">
        {messages.map((message, index) => (
          <div key={`${message.timestamp}-${index}`} className={`chat-bubble chat-bubble-${message.sender}`}>
            <div className="chat-sender">{message.sender === 'user' ? 'You (voice)' : persona.name}</div>
            <div>{message.text}</div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="muted">No voice interaction yet. Imagine speaking and see the reply.</p>
        )}
      </div>
      <div className="chat-input-row">
        <Input
          value={simulatedTranscript}
          onChange={(event) => setSimulatedTranscript(event.target.value)}
          placeholder="Simulated spoken words..."
          disabled={disabled || isSending}
        />
        <Button type="button" onClick={handleSend} disabled={disabled || isSending}>
          {isSending ? 'Sending...' : 'Send Voice'}
        </Button>
      </div>
    </div>
  );
};

const RemainingTimeBadge = ({ persona }: { persona: Persona | null }) => {
  if (!persona) return null;
  return <div className="badge">Remaining interaction time: {persona.remainingDays} day(s)</div>;
};

const ThreeDayBanner = ({ className = '' }: { className?: string }) => {
  const classes = ['banner', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <strong>Reminder:</strong> You have 3 days remaining with your persona. Remember, Rememory is a temporary tool to aid your healing
      journey.
    </div>
  );
};

const ExpiredNotice = () => (
  <p className="warning">
    This persona has expired. The one-month interaction period has ended to support healthy grieving and emotional detachment.
  </p>
);

const GuidedClosure = ({ persona, onFinish }: { persona: Persona; onFinish: (answers: GuidedClosureAnswers) => void }) => {
  const [answers, setAnswers] = useState<GuidedClosureAnswers>({
    gratitude: '',
    regret: '',
    memory: '',
    future: '',
  });

  const handleChange = (field: keyof GuidedClosureAnswers, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onFinish(answers);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <p className="muted">
        This is your final guided reflection with {persona.name}. These questions help you move toward emotional closure.
      </p>

      <label>
        1. What would you like to thank {persona.name} for?
        <TextArea rows={3} value={answers.gratitude} onChange={(event) => handleChange('gratitude', event.target.value)} />
      </label>
      <label>
        2. Are there any apologies or regrets you wish to express?
        <TextArea rows={3} value={answers.regret} onChange={(event) => handleChange('regret', event.target.value)} />
      </label>
      <label>
        3. Describe one meaningful memory you cherish with {persona.name}.
        <TextArea rows={3} value={answers.memory} onChange={(event) => handleChange('memory', event.target.value)} />
      </label>
      <label>
        4. How would you like to carry their influence into your future life?
        <TextArea rows={3} value={answers.future} onChange={(event) => handleChange('future', event.target.value)} />
      </label>

      <Button type="submit">Complete Guided Closure</Button>
      <p className="muted mt">
        After this step, your interaction with this persona will end, but your memories and growth stay with you.
      </p>
    </form>
  );
};

export default App;
