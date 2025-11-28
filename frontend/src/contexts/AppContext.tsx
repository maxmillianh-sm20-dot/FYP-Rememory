import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { AppRoute, Message, Persona, TOTAL_DAYS, UserState } from '../types';

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');
const API_STATIC_BEARER = import.meta.env.VITE_API_STATIC_BEARER ?? '';
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const PERSONA_CACHE_KEY = 'rememory_persona_cache';
const STATE_CACHE_KEY = 'rememory_state_ui';

interface AppContextType {
  state: UserState;
  currentRoute: AppRoute;
  navigate: (route: AppRoute) => void;
  login: (email: string) => void;
  createPersona: (data: Omit<Persona, 'id' | 'createdAt' | 'expiryDate'>) => Promise<void>;
  updatePersona: (data: Partial<Persona>) => Promise<void>;
  addMessage: (text: string, role: Message['role']) => void;
  sendMessage: (text: string, options?: { hidden?: boolean }) => Promise<string | null>;
  daysRemaining: number;
  logout: () => void;
  reloadPersona: () => Promise<void>;
  isSending: boolean;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const splitList = (input: string, fallback: string, limit = 10) => {
  const entries = input.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
  return entries.length === 0 ? [fallback] : Array.from(new Set(entries)).slice(0, limit);
};

const buildAuthHeaders = (token?: string): Record<string, string> => {
  const finalToken = token || API_STATIC_BEARER;
  return finalToken ? { Authorization: `Bearer ${finalToken}` } : {};
};

  const normalizePersona = (data: any): Persona => {
    const remainingDays = typeof data.remainingMs === 'number'
      ? Math.max(0, Math.ceil(data.remainingMs / MS_IN_DAY))
      : data.remainingDays;

  const traitsArray = Array.isArray(data.traits) ? data.traits : [];
  const memoriesArray = Array.isArray(data.keyMemories) ? data.keyMemories : [];

  return {
    id: data.id,
    name: data.name,
    relationship: data.relationship,
    age: data.age ?? '',
    traits: traitsArray.join(', '),
    memories: memoriesArray.join(', '),
    voiceStyle: data.voiceStyle || data.speakingStyle || '',
    createdAt: data.expiresAt ? Date.parse(data.expiresAt) : Date.now(),
    expiryDate: data.expiresAt ? Date.parse(data.expiresAt) : Date.now() + TOTAL_DAYS * MS_IN_DAY,
    avatarUrl: data.avatarUrl || data.voiceSampleUrl || undefined,
    remainingDays,
    status: data.status,
    userNickname: data.userNickname || '',
    biography: data.biography || '',
    speakingStyle: data.speakingStyle || '',
    keyMemories: memoriesArray,
    commonPhrases: Array.isArray(data.commonPhrases) ? data.commonPhrases : [],
    voiceSampleUrl: data.voiceSampleUrl ?? null,
  };
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<UserState>(() => {
    const cached = localStorage.getItem(STATE_CACHE_KEY);
        return cached
          ? JSON.parse(cached)
          : {
              isAuthenticated: false,
              userEmail: '',
              hasOnboarded: false,
              persona: null,
              messages: [],
              guidedReflectionAnswers: {},
            };
  });
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(
    state.hasOnboarded && state.persona ? AppRoute.DASHBOARD : AppRoute.LANDING,
  );
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    localStorage.setItem(STATE_CACHE_KEY, JSON.stringify(state));
  }, [state]);

  const fetchMessages = useCallback(async (personaId: string): Promise<Message[]> => {
    const res = await fetch(`${API_BASE_URL}/persona/${personaId}/chat?limit=25`, {
      headers: buildAuthHeaders(),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const history = (data.messages || []).filter((m: any) => !m.text?.startsWith('[HIDDEN_INSTRUCTION]'));
    return history.map((m: any) => ({
      id: m.id || crypto.randomUUID(),
      role: m.sender === 'ai' ? 'model' : m.sender,
      text: m.text,
      timestamp: m.timestamp ? Date.parse(m.timestamp) : Date.now(),
    }));
  }, []);

  const loadPersona = useCallback(async () => {
    if (!state.isAuthenticated) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/persona`, { headers: buildAuthHeaders() });
      if (!res.ok) {
        const cached = localStorage.getItem(PERSONA_CACHE_KEY);
        if (cached) {
          const cachedPersona = JSON.parse(cached);
          setState((prev) => ({
            ...prev,
            hasOnboarded: true,
            persona: cachedPersona,
          }));
        }
        return;
      }

      const data = await res.json();

      if (!data) {
        setState((prev) => ({ ...prev, hasOnboarded: false, persona: null, messages: [] }));
        localStorage.removeItem(PERSONA_CACHE_KEY);
        if (currentRoute !== AppRoute.SETUP) {
          setCurrentRoute(AppRoute.LANDING);
        }
        return;
      }

      const persona = normalizePersona(data);
      localStorage.setItem(PERSONA_CACHE_KEY, JSON.stringify(persona));
      const messages = await fetchMessages(persona.id);

      setState({
        hasOnboarded: true,
        persona,
        messages,
        guidedReflectionAnswers: {},
      });

      if (currentRoute === AppRoute.LANDING) {
        setCurrentRoute(AppRoute.DASHBOARD);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentRoute, fetchMessages, state.isAuthenticated]);

  useEffect(() => {
    if (state.isAuthenticated) {
      loadPersona();
    }
  }, [currentRoute, loadPersona, state.isAuthenticated]);

  const createPersona = useCallback(
    async (data: Omit<Persona, 'id' | 'createdAt' | 'expiryDate'>) => {
      const payload = {
        name: data.name,
        relationship: data.relationship,
        biography: data.biography || data.memories || '',
        speakingStyle: data.voiceStyle || data.speakingStyle || '',
        userNickname: data.userNickname || '',
        traits: splitList(data.traits, 'Kind', 8),
        keyMemories: splitList(data.memories || '', 'Memory', 10),
        commonPhrases: splitList(data.commonPhrases || '', 'Phrase', 8),
        voiceSampleUrl: data.voiceSampleUrl || data.avatarUrl || undefined,
      };

      const res = await fetch(`${API_BASE_URL}/persona`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // If persona already exists, just load it and continue to dashboard
        if (res.status === 400) {
          await loadPersona();
          return;
        }
        const text = await res.text();
        throw new Error(`Create failed: ${res.status} ${text || ''}`);
      }

      await loadPersona();
    },
    [loadPersona],
  );

  const login = useCallback((email: string) => {
    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      userEmail: email,
    }));
    setCurrentRoute(AppRoute.SETUP);
  }, []);

  const updatePersona = useCallback(
    async (data: Partial<Persona> & { id?: string }) => {
      const personaIdHint = data.id ?? state.persona?.id;

      const ensurePersona = async () => {
        if (personaIdHint && state.persona?.id === personaIdHint) return state.persona;
        const res = await fetch(`${API_BASE_URL}/persona`, { headers: buildAuthHeaders() });
        if (!res.ok) throw new Error('Unable to load persona.');
        const body = await res.json();
        if (!body) throw new Error('Persona not found. Please create one first.');
        const personaLoaded = normalizePersona(body);
        setState((prev) => ({ ...prev, hasOnboarded: true, persona: personaLoaded }));
        return personaLoaded;
      };

      const persona = await ensurePersona();
      const idToUse = personaIdHint ?? persona?.id;
      if (!idToUse) throw new Error('Persona not found. Please create one first.');

      const { name, relationship, id, createdAt, expiryDate, ...rest } = data;

      const payload: Record<string, any> = {
        biography: rest.biography ?? rest.memories ?? persona.biography ?? persona.memories ?? '',
        speakingStyle: rest.voiceStyle ?? rest.speakingStyle ?? persona.speakingStyle ?? '',
        userNickname: rest.userNickname ?? persona.userNickname ?? '',
        traits: splitList(rest.traits ?? persona.traits ?? '', 'Kind', 8),
        keyMemories: splitList(rest.memories ?? persona.memories ?? '', 'Memory', 10),
        commonPhrases: splitList(rest.commonPhrases ?? (persona.commonPhrases || '').toString(), 'Phrase', 8),
        voiceSampleUrl: rest.voiceSampleUrl ?? persona.voiceSampleUrl ?? undefined,
      };

      let res = await fetch(`${API_BASE_URL}/persona/${idToUse}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
        body: JSON.stringify(payload),
      });

      // If 404, the local ID might be stale. Try to fetch the actual persona and retry.
      if (res.status === 404) {
        const currentRes = await fetch(`${API_BASE_URL}/persona`, { headers: buildAuthHeaders() });
        if (currentRes.ok) {
          const currentData = await currentRes.json();
          if (currentData && currentData.id) {
            // Retry update with the correct ID
            res = await fetch(`${API_BASE_URL}/persona/${currentData.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
              body: JSON.stringify(payload),
            });
          }
        }
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update persona.');
      }
      await loadPersona();
    },
    [loadPersona, state.persona],
  );

  const addMessage = useCallback((text: string, role: Message['role']) => {
    setState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: crypto.randomUUID(),
          role,
          text,
          timestamp: Date.now(),
        },
      ],
    }));
  }, []);

  const sendMessage = useCallback(
    async (text: string, options?: { hidden?: boolean }) => {
      if (!state.persona) return null;
      const personaId = state.persona.id;

      if (!options?.hidden) {
        addMessage(text, 'user');
      }

      setIsSending(true);
      try {
        const res = await fetch(`${API_BASE_URL}/persona/${personaId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...buildAuthHeaders() },
          body: JSON.stringify({ text, clientMessageId: crypto.randomUUID() }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Chat failed (${res.status}): ${body || res.statusText}`);
        }

        const data = await res.json();
        const aiText =
          (data.messages || []).find((m: any) => m.sender === 'ai')?.text ||
          "I'm here with you.";

        addMessage(aiText, 'model');
        return aiText;
      } catch (e) {
        console.error(e);
        if (!options?.hidden) {
          addMessage('Unable to send message. Please try again.', 'model');
        }
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [addMessage, state.persona],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(PERSONA_CACHE_KEY);
    localStorage.removeItem(STATE_CACHE_KEY);
    setState({
      isAuthenticated: false,
      userEmail: '',
      hasOnboarded: false,
      persona: null,
      messages: [],
      guidedReflectionAnswers: {},
    });
    setCurrentRoute(AppRoute.LANDING);
  }, []);

  const daysRemaining = useMemo(() => {
    if (!state.persona) return TOTAL_DAYS;
    if (typeof state.persona.remainingDays === 'number') return state.persona.remainingDays;

    const diff = state.persona.expiryDate - Date.now();
    return Math.max(0, Math.ceil(diff / MS_IN_DAY));
  }, [state.persona]);

  const contextValue = useMemo<AppContextType>(
    () => ({
      state,
      currentRoute,
      navigate: setCurrentRoute,
      login,
      createPersona,
      updatePersona,
      addMessage,
      sendMessage,
      daysRemaining,
      logout,
      reloadPersona: loadPersona,
      isSending,
      loading,
    }),
    [
      state,
      currentRoute,
      login,
      createPersona,
      updatePersona,
      addMessage,
      sendMessage,
      daysRemaining,
      logout,
      loadPersona,
      isSending,
      loading,
    ],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
