export interface Message {
  id: string;
  role: 'user' | 'model' | 'ai';
  text: string;
  timestamp: number;
}

export interface Persona {
  id: string;
  name: string;
  relationship: string;
  age?: string;
  traits: string;
  memories: string;
  voiceStyle: string;
  createdAt: number;
  expiryDate: number;
  avatarUrl?: string;
  remainingDays?: number;
  status?: 'active' | 'expired' | 'deleted';
  userNickname?: string;
  biography?: string;
  speakingStyle?: string;
  keyMemories?: string[];
  commonPhrases?: string[];
  voiceSampleUrl?: string | null;
}

export interface UserState {
  hasOnboarded: boolean;
  persona: Persona | null;
  messages: Message[];
  guidedReflectionAnswers: Record<string, string>;
  isAuthenticated?: boolean;
  userEmail?: string;
}

export enum AppRoute {
  LANDING = 'landing',
  SETUP = 'setup',
  DASHBOARD = 'dashboard',
  CHAT = 'chat',
  VOICE = 'voice',
  CLOSURE = 'closure',
}

export const TOTAL_DAYS = 30;
