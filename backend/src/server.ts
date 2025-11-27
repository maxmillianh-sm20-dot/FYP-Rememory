import 'dotenv/config';
import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import admin from 'firebase-admin';

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
  })
);
app.use(express.json());

// Env variables
const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_DATABASE_URL,
  GOOGLE_APPLICATION_CREDENTIALS,
  PORT = "5000",
} = process.env;

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  const firebasePrivateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: firebasePrivateKey,
    }),
    databaseURL: FIREBASE_DATABASE_URL || `https://${FIREBASE_PROJECT_ID}.firebaseio.com`
  });
} else if (GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: FIREBASE_DATABASE_URL || (FIREBASE_PROJECT_ID ? `https://${FIREBASE_PROJECT_ID}.firebaseio.com` : undefined)
  });
} else {
  console.error("Missing Firebase environment variables (provide FIREBASE_* or GOOGLE_APPLICATION_CREDENTIALS).");
  process.exit(1);
}

const PERSONAS_COLLECTION = 'personas';
const DEFAULT_GUIDANCE_MESSAGE = 'This persona has reached closure. Take a moment to reflect.';
const FALLBACK_PERSONA_NAME = process.env.FALLBACK_PERSONA_NAME ?? 'Rememory Companion';
const FALLBACK_PERSONA_MEMORIES =
  process.env.FALLBACK_PERSONA_MEMORIES ??
  'You are a compassionate memory companion helping users process their grief with warmth, empathy, and gentle prompts.';
const DEV_STATIC_BEARER = process.env.DEV_STATIC_BEARER?.trim();

const fallbackPersonaStore = new Map<string, PersonaRecord>();
const fallbackPersonaByUser = new Map<string, string>();

interface PersonaRecord {
  id: string;
  name?: string | null;
  relationship?: string | null;
  userNickname?: string | null;
  biography?: string | null;
  speakingStyle?: string | null;
  memories?: string | string[] | null;
  keyMemories?: string[];
  traits?: string[];
  commonPhrases?: string[];
  voiceSampleUrl?: string | null;
  status?: 'active' | 'expired' | 'deleted';
  ownerId?: string;
  createdAt?: admin.firestore.Timestamp;
  guidanceLevel?: number;
  expiresAt?: admin.firestore.Timestamp | Date | string | number | null | {
    _seconds: number;
    _nanoseconds?: number;
  };
}

type AuthResult = {
  uid: string;
  email?: string | null;
};

const authenticateRequest = async (req: Request): Promise<AuthResult | null> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.replace('Bearer ', '').trim();
  if (DEV_STATIC_BEARER && token === DEV_STATIC_BEARER) {
    return { uid: 'dev-static-user', email: 'dev@rememory.local' };
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
};

const requireAuth = async (req: Request, res: Response) => {
  const user = await authenticateRequest(req);
  if (!user) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return user;
};

const geminiCandidates = [
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent',
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
];

const getPersonaById = async (id: string): Promise<PersonaRecord | null> => {
  const fallback = getFallbackPersonaById(id);
  if (fallback) return fallback;
  try {
    const doc = await admin.firestore().collection(PERSONAS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    const data = { id: doc.id, ...(doc.data() as Omit<PersonaRecord, 'id'>) };
    if (data.ownerId) {
      storeFallbackPersona(data.ownerId, data);
    }
    return data;
  } catch (error) {
    console.error('Firestore error fetching persona by id', error);
    return null;
  }
};

const isPersonaExpired = (persona: PersonaRecord) => {
  const expiresAt = persona.expiresAt;
  if (!expiresAt) return false;

  const now = Date.now();
  if (typeof expiresAt === 'number') return expiresAt <= now;
  if (typeof expiresAt === 'string') {
    const parsed = Date.parse(expiresAt);
    if (!Number.isNaN(parsed)) return parsed <= now;
  }
  if (expiresAt instanceof Date) return expiresAt.getTime() <= now;
  if (expiresAt instanceof admin.firestore.Timestamp) {
    return expiresAt.toMillis() <= now;
  }
  if (typeof expiresAt === 'object' && '_seconds' in expiresAt && typeof expiresAt._seconds === 'number') {
    const millis = expiresAt._seconds * 1000 + (typeof (expiresAt as any)._nanoseconds === 'number' ? (expiresAt as any)._nanoseconds / 1_000_000 : 0);
    return millis <= now;
  }
  return false;
};

const buildPersonaMemories = (persona: PersonaRecord) => {
  if (Array.isArray(persona.memories) && persona.memories.length) {
    return persona.memories.join('\n');
  }
  if (typeof persona.memories === 'string' && persona.memories.trim()) {
    return persona.memories;
  }
  if (Array.isArray(persona.keyMemories) && persona.keyMemories.length) {
    return persona.keyMemories.join('\n');
  }
  return 'No specific memories recorded.';
};

type TimestampLike = { _seconds: number; _nanoseconds?: number };

const isTimestampLike = (value: unknown): value is TimestampLike =>
  typeof value === 'object' &&
  value !== null &&
  '_seconds' in (value as Record<string, unknown>) &&
  typeof (value as Record<string, unknown>)._seconds === 'number';

const computeRemainingMsValue = (
  expiresAt?: admin.firestore.Timestamp | Date | string | number | TimestampLike | null
) => {
  if (!expiresAt) return null;
  if (expiresAt instanceof admin.firestore.Timestamp) {
    return expiresAt.toMillis() - Date.now();
  }
  if (expiresAt instanceof Date) {
    return expiresAt.getTime() - Date.now();
  }
  if (typeof expiresAt === 'number') {
    return expiresAt - Date.now();
  }
  if (typeof expiresAt === 'string') {
    const parsed = Date.parse(expiresAt);
    if (!Number.isNaN(parsed)) {
      return parsed - Date.now();
    }
  }
  if (isTimestampLike(expiresAt)) {
    const millis = (expiresAt._seconds ?? 0) * 1000 + ((expiresAt._nanoseconds ?? 0) / 1_000_000);
    return millis - Date.now();
  }
  return null;
};

const sanitizeStringArray = (value: unknown, fallback: string[], max = 10) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
      .slice(0, max);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, max);
  }
  return fallback.slice(0, max);
};

const storeFallbackPersona = (ownerId: string, persona: PersonaRecord) => {
  fallbackPersonaStore.set(persona.id, persona);
  fallbackPersonaByUser.set(ownerId, persona.id);
};

const getFallbackPersonaByOwner = (ownerId: string) => {
  const personaId = fallbackPersonaByUser.get(ownerId);
  if (!personaId) return null;
  return fallbackPersonaStore.get(personaId) ?? null;
};

const getFallbackPersonaById = (personaId: string) => {
  return fallbackPersonaStore.get(personaId) ?? null;
};

const getPersonaByOwnerFromFirestore = async (ownerId: string) => {
  const snapshot = await admin
    .firestore()
    .collection(PERSONAS_COLLECTION)
    .where('ownerId', '==', ownerId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data() as Omit<PersonaRecord, 'id'>;
  if (data.status === 'deleted') return null;
  return { id: doc.id, ...data };
};

const getPersonaByOwner = async (ownerId: string) => {
  try {
    const persona = await getPersonaByOwnerFromFirestore(ownerId);
    if (persona) {
      storeFallbackPersona(ownerId, persona);
      return persona;
    }
  } catch (error) {
    console.error('Firestore error fetching persona by owner', error);
  }
  return getFallbackPersonaByOwner(ownerId);
};

const formatPersonaResponse = (persona: PersonaRecord) => {
  const expiresAtIso =
    persona.expiresAt instanceof admin.firestore.Timestamp
      ? persona.expiresAt.toDate().toISOString()
      : typeof persona.expiresAt === 'string'
        ? persona.expiresAt
        : null;
  return {
    id: persona.id,
    name: persona.name ?? 'Companion',
    relationship: persona.relationship ?? '',
    userNickname: persona.userNickname ?? '',
    biography: persona.biography ?? '',
    speakingStyle: persona.speakingStyle ?? '',
    status: persona.status ?? 'active',
    expiresAt: expiresAtIso,
    remainingMs: computeRemainingMsValue(persona.expiresAt),
    traits: persona.traits ?? [],
    keyMemories: persona.keyMemories ?? [],
    commonPhrases: persona.commonPhrases ?? [],
    voiceSampleUrl: persona.voiceSampleUrl ?? null,
    guidanceLevel: persona.guidanceLevel ?? 0
  };
};

const validatePersonaPayload = (body: any) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const relationship = typeof body.relationship === 'string' ? body.relationship.trim() : '';
  if (!name || !relationship) {
    const error = new Error('name and relationship are required');
    (error as any).status = 400;
    throw error;
  }
  const userNickname = typeof body.userNickname === 'string' ? body.userNickname.trim() : '';
  const biography = typeof body.biography === 'string' ? body.biography.trim() : '';
  const speakingStyle = typeof body.speakingStyle === 'string' ? body.speakingStyle.trim() : '';
  const traits = sanitizeStringArray(body.traits, ['Compassionate', 'Grounded'], 8);
  const keyMemories = sanitizeStringArray(body.keyMemories, ['Quiet evenings together'], 10);
  const commonPhrases = sanitizeStringArray(body.commonPhrases, ['I am with you.'], 10);
  const voiceSampleUrl =
    typeof body.voiceSampleUrl === 'string' && body.voiceSampleUrl.trim() ? body.voiceSampleUrl.trim() : null;

  return {
    name,
    relationship,
    userNickname,
    biography,
    speakingStyle,
    traits,
    keyMemories,
    commonPhrases,
    voiceSampleUrl
  };
};

type GeminiCallResult =
  | { ok: true; reply: string }
  | { ok: false; error: string; details?: string | null };

const callGemini = async (promptText: string, googleApiKey: string): Promise<GeminiCallResult> => {
  if (!googleApiKey) return { ok: false, error: 'no_key' };
  const body = {
    contents: [
      {
        role: 'user' as const,
        parts: [{ text: promptText }],
      },
    ],
  };

  const candidates = [...geminiCandidates];
  if (process.env.GEMINI_API_ENDPOINT && !candidates.includes(process.env.GEMINI_API_ENDPOINT)) {
    candidates.push(process.env.GEMINI_API_ENDPOINT);
  }

  let lastErrText: string | null = null;
  const tried: Array<Record<string, unknown>> = [];

  for (const ep of candidates) {
    try {
      const url = `${ep}?key=${encodeURIComponent(googleApiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        lastErrText = text;
        tried.push({ ep, status: response.status, body: text.slice(0, 200) });
        continue;
      }

      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '(No reply)';
      return { ok: true, reply };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      lastErrText = errMessage;
      tried.push({ ep, error: errMessage });
    }
  }

  console.error('[LLM] All endpoints failed:', tried);
  return { ok: false, error: 'LLM error', details: lastErrText };
};

app.get("/", (req, res) => res.send("Rememory Backend is running!"));

app.get("/health/firestore", async (req, res) => {
  try {
    await admin
      .firestore()
      .doc("_health/ping")
      .set({ ts: Date.now() }, { merge: true });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/api/persona', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  try {
    const persona = await getPersonaByOwner(user.uid);
    if (!persona) {
      return res.json(null);
    }
    return res.json(formatPersonaResponse(persona));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch persona', message);
    return res.status(500).json({ error: message });
  }
});

app.post('/api/persona', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  try {
    const existing = await getPersonaByOwner(user.uid);
    if (existing) {
      return res.status(400).json({ error: 'persona_exists' });
    }
    const payload = validatePersonaPayload(req.body ?? {});
    const docRef = await admin.firestore().collection(PERSONAS_COLLECTION).add({
      ...payload,
      ownerId: user.uid,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      guidanceLevel: 0
    });
    return res.status(201).json({ id: docRef.id });
  } catch (error) {
    const status = (error as any).status ?? 500;
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to save persona', message);
    if (status === 500) {
      const payload = validatePersonaPayload(req.body ?? {});
      const fallbackId = randomUUID();
      const personaRecord: PersonaRecord = {
        id: fallbackId,
        ownerId: user.uid,
        status: 'active',
        guidanceLevel: 0,
        name: payload.name,
        relationship: payload.relationship,
        userNickname: payload.userNickname,
        biography: payload.biography,
        speakingStyle: payload.speakingStyle,
        traits: payload.traits,
        keyMemories: payload.keyMemories,
        commonPhrases: payload.commonPhrases,
        voiceSampleUrl: payload.voiceSampleUrl ?? null
      };
      storeFallbackPersona(user.uid, personaRecord);
      return res.status(201).json({ id: fallbackId, fallback: true });
    }
    return res.status(status).json({ error: message });
  }
});

app.put('/api/persona/:id', async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;
  const personaId = req.params.id;
  const updates = req.body ?? {};
  // Block identity changes
  if (updates.name || updates.relationship) {
    return res.status(400).json({ error: 'identity_locked', message: 'Cannot change name or relationship.' });
  }

  // Prepare allowed fields
  const payload: Partial<PersonaRecord> = {
    userNickname: typeof updates.userNickname === 'string' ? updates.userNickname.trim() : undefined,
    biography: typeof updates.biography === 'string' ? updates.biography.trim() : undefined,
    speakingStyle: typeof updates.speakingStyle === 'string' ? updates.speakingStyle.trim() : undefined,
    traits: sanitizeStringArray(updates.traits, [], 8),
    keyMemories: sanitizeStringArray(updates.keyMemories, [], 10),
    commonPhrases: sanitizeStringArray(updates.commonPhrases, [], 10),
    voiceSampleUrl:
      typeof updates.voiceSampleUrl === 'string' && updates.voiceSampleUrl.trim()
        ? updates.voiceSampleUrl.trim()
        : undefined
  };

  // Remove undefined so we don't overwrite with empty
  Object.keys(payload).forEach((k) => payload[k as keyof PersonaRecord] === undefined && delete payload[k as keyof PersonaRecord]);

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'no_updates', message: 'No updatable fields provided.' });
  }

  try {
    await admin.firestore().collection(PERSONAS_COLLECTION).doc(personaId).update(payload);
    // refresh fallback
    const refreshed = await getPersonaById(personaId);
    if (refreshed) storeFallbackPersona(user.uid, refreshed);
    return res.status(204).send();
  } catch (error) {
    console.error('Update failed, trying fallback', error);
    const existing = getFallbackPersonaById(personaId);
    if (existing) {
      const merged = { ...existing, ...payload };
      storeFallbackPersona(user.uid, merged);
      return res.status(204).send();
    }
    return res.status(500).json({ error: 'update_failed' });
  }
});

const personaChatHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message, text } = req.body ?? {};
  const userMessage = typeof message === 'string' && message.trim() ? message : text;
  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  let persona: PersonaRecord | null = null;
  try {
    persona = await getPersonaById(id);
  } catch (error) {
    persona = null;
  }

  if (!persona) {
    persona = {
      id,
      name: FALLBACK_PERSONA_NAME,
      memories: FALLBACK_PERSONA_MEMORIES,
      keyMemories: [],
      userNickname: 'friend',
      speakingStyle: '',
      expiresAt: null,
      status: 'active'
    };
  }

  if (isPersonaExpired(persona)) {
    return res.status(410).json({
      error: 'Persona expired',
      guidance: DEFAULT_GUIDANCE_MESSAGE,
    });
  }

  const prompt = `You are simulating a deceased person with these memories:
${buildPersonaMemories(persona)}

 Rules:
- Speak as ${persona.name}, first person. Always call the user "${persona.userNickname || persona.relationship || 'friend'}".
- Use speaking style: ${persona.speakingStyle ?? 'casual, direct'}.
- Keep replies short (1-2 sentences), plain, human. No poetic or scenic language.
- Do NOT mention any location (including China) unless the user's current message mentions it.
- Only mention a memory if it is directly relevant to what the user just said; keep it to one short sentence.
- Avoid therapy clichés; respond how ${persona.name} really would.
 - Persona bio/context: ${persona.biography ?? ''}. Traits: ${(persona.traits ?? []).join(', ')}. Common phrases: ${(persona.commonPhrases ?? []).join(', ')}.

User: ${userMessage}
AI:`;

  const googleApiKey = process.env.GOOGLE_API_KEY ?? process.env.LLM_API_KEY ?? '';

  const buildSuccessPayload = (text: string) => ({
    personaStatus: (persona?.status as string) ?? 'active',
    remainingMs: null,
    messages: [
      {
        id: randomUUID(),
        sender: 'ai' as const,
        text,
        timestamp: new Date().toISOString()
      }
    ],
    summaryAppended: false
  });

  if (googleApiKey) {
    const resp = await callGemini(prompt, googleApiKey);
    if (resp.ok) {
      return res.json(buildSuccessPayload(resp.reply));
    }
    return res.status(502).json({ error: 'LLM error', details: resp.details ?? resp.error });
  }

  const fallback = `(${persona.name ?? 'Persona'} persona) I remember when ... In response to "${userMessage}", I'd say: I'm with you.`;
  return res.json(buildSuccessPayload(fallback));
};

app.post('/api/personas/:id/chat', personaChatHandler);
app.post('/api/persona/:id/chat', personaChatHandler);

app.listen(Number(PORT), () => {
  console.log(`Server running on port ${PORT}`);
});
