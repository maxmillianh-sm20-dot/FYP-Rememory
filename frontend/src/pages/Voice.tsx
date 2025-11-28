import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';

export const Voice = () => {
  const { state, sendMessage } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Tap circle to speak');

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatus('Listening...');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setStatus('Thinking...');
        await handleAIResponse(text);
      };

      recognitionRef.current = recognition;
    } else {
      setStatus('Voice not supported in this browser');
    }
  }, [state.persona]);

  const handleAIResponse = async (userText: string) => {
    if (!state.persona) return;

    try {
      const responseText = (await sendMessage(userText)) || "I'm here with you.";

      setStatus('Speaking...');
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(responseText);
      const voices = synthRef.current.getVoices();
      if (voices.length > 0) utterance.voice = voices[0];

      utterance.onend = () => {
        setIsSpeaking(false);
        setStatus('Tap circle to reply');
        setTranscript('');
      };
      synthRef.current.speak(utterance);
    } catch (e) {
      console.error(e);
      setStatus('Connection error');
    }
  };

  const toggleListening = () => {
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setStatus('Tap to speak');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-stone-50 to-indigo-50/20">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-300/10 rounded-full blur-[100px] transition-all duration-1000 ${
            isListening ? 'scale-125 opacity-60' : 'scale-100 opacity-30'
          }`}
        ></div>
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-300/10 rounded-full blur-[80px] transition-all duration-1000 delay-100 ${
            isSpeaking ? 'scale-125 opacity-60' : 'scale-100 opacity-30'
          }`}
        ></div>
      </div>

      <div className="relative z-20 flex flex-col items-center max-w-2xl px-6">
        <div className="mb-12 text-center animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-display text-stone-800 mb-3 tracking-tight">{state.persona?.name}</h2>
          <p className="text-sm font-medium tracking-[0.2em] uppercase text-stone-400 animate-pulse-slow">{status}</p>
        </div>

        <div className="relative mb-16">
          <div className={`absolute inset-0 rounded-full border border-indigo-200 transition-all duration-1000 ${isListening ? 'animate-ping opacity-30 scale-150' : 'opacity-0 scale-100'}`}></div>
          <div className={`absolute inset-0 rounded-full border border-rose-200 transition-all duration-1000 delay-75 ${isSpeaking ? 'animate-ping opacity-30 scale-150' : 'opacity-0 scale-100'}`}></div>

          <button
            onClick={toggleListening}
            className={`relative z-10 w-48 h-48 md:w-64 md:h-64 rounded-full flex items-center justify-center shadow-2xl transition-all duration-700 hover:scale-105 focus:outline-none ${
              isListening
                ? 'bg-gradient-to-tr from-white to-indigo-50 ring-4 ring-indigo-100'
                : isSpeaking
                  ? 'bg-gradient-to-tr from-white to-rose-50 ring-4 ring-rose-100'
                  : 'bg-white ring-1 ring-stone-100'
            }`}
          >
            <div className="w-[90%] h-[90%] rounded-full overflow-hidden relative">
              {state.persona?.avatarUrl ? (
                <img
                  src={state.persona.avatarUrl}
                  alt="Avatar"
                  className={`w-full h-full object-cover transition-all duration-[2000ms] ${
                    isListening || isSpeaking ? 'scale-110' : 'scale-100 grayscale-[20%]'
                  }`}
                />
              ) : (
                <div className="w-full h-full bg-stone-100 flex items-center justify-center text-6xl text-stone-300 font-serif">R</div>
              )}
              <div
                className={`absolute inset-0 mix-blend-overlay transition-opacity duration-500 ${
                  isListening ? 'bg-indigo-500/20' : isSpeaking ? 'bg-rose-500/20' : 'bg-transparent'
                }`}
              ></div>
            </div>
          </button>
        </div>

        <div className="min-h-[100px] flex items-center justify-center">
          {transcript && (
            <p className="text-2xl md:text-3xl text-stone-600 font-serif italic text-center animate-slide-up leading-relaxed max-w-2xl">
              "{transcript}"
            </p>
          )}
        </div>
      </div>

      <div className="absolute bottom-10 left-0 w-full text-center text-xs text-stone-300 uppercase tracking-widest font-medium">
        Microphone Access Required
      </div>
    </div>
  );
};
