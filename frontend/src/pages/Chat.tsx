import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';

export const Chat = () => {
  const { state, sendMessage, isSending } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = state.messages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (state.persona && messages.length === 0 && !isSending) {
      const nick = state.persona.userNickname || state.persona.relationship || 'friend';
      sendMessage(
        `[HIDDEN_INSTRUCTION] The user has entered the room. Start the conversation now. Greet them by their nickname "${nick}" in a short, human, casual way.`,
        { hidden: true },
      );
    }
  }, [messages.length, state.persona, isSending, sendMessage]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setIsTyping(true);
    await sendMessage(text);
    setIsTyping(false);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
    setInput('');
  };

  return (
    <div className="flex h-full md:h-screen bg-transparent md:bg-[#FDFCFB]/50">
      <div className="hidden lg:flex w-80 bg-white/60 backdrop-blur-md border-r border-white/50 p-8 flex-col gap-6">
        <h2 className="font-serif text-2xl text-stone-800">Context</h2>

        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Relationship</span>
            <p className="text-stone-700 font-medium">{state.persona?.relationship}</p>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Traits</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {(state.persona?.traits || '')
                .split(',')
                .slice(0, 4)
                .filter(Boolean)
                .map((trait, i) => (
                  <span key={i} className="px-2 py-1 bg-white border border-stone-200 rounded-md text-xs text-stone-600">
                    {trait.trim()}
                  </span>
                ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Memories</span>
            <p className="text-xs text-stone-500 mt-2 line-clamp-6 italic leading-relaxed">"{state.persona?.memories}"</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 no-scrollbar" ref={scrollRef}>
          <div className="h-4"></div>

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-60">
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <p className="text-stone-500 font-serif text-lg mb-8">Start the conversation...</p>
              <div className="flex flex-wrap justify-center gap-3 max-w-md">
                {["I've been thinking about you.", 'Do you remember when...', 'I just wanted to say hi.'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSend(t)}
                    className="px-4 py-2 bg-white border border-stone-200 rounded-full text-sm text-stone-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors shadow-sm"
                  >
                    "{t}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isSequence = index > 0 && messages[index - 1].role === msg.role;

              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
                  {!isUser && !isSequence && (
                    <div className="w-10 h-10 rounded-full bg-stone-200 mr-4 flex-shrink-0 overflow-hidden self-end mb-2 shadow-sm ring-2 ring-white">
                      {state.persona?.avatarUrl && (
                        <img src={state.persona.avatarUrl} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  {isUser && !isSequence && (
                    <div className="w-10 h-10 rounded-full bg-stone-800 ml-4 flex-shrink-0 flex items-center justify-center text-white text-xs self-end mb-2 shadow-sm order-last">
                      You
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] md:max-w-[70%] p-4 md:p-6 text-[15px] md:text-base leading-relaxed shadow-sm transition-all duration-300 hover:shadow-md ${
                      isUser
                        ? 'bg-stone-800 text-stone-50 rounded-[2rem] rounded-tr-sm order-first'
                        : 'bg-white text-stone-700 border border-white rounded-[2rem] rounded-tl-sm'
                    } ${isSequence ? (isUser ? 'mt-1 mr-[3.5rem]' : 'ml-[3.5rem] mt-1') : ''}`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}

          {isTyping && (
            <div className="flex justify-start ml-[3.5rem]">
              <div className="bg-white px-5 py-4 rounded-[2rem] rounded-tl-sm border border-stone-100 shadow-sm flex items-center gap-1.5 w-20 justify-center">
                <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div className="h-4"></div>
        </div>

        <div className="p-4 md:p-8 w-full max-w-4xl mx-auto">
          <form
            onSubmit={onFormSubmit}
            className="flex gap-4 items-end bg-white/80 backdrop-blur-xl p-3 rounded-[2rem] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write your thoughts..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                  setInput('');
                }
              }}
              className="flex-1 bg-transparent border-0 px-6 py-4 text-stone-800 placeholder-stone-400 focus:ring-0 outline-none resize-none max-h-32 min-h-[3.5rem]"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="bg-stone-900 text-white w-14 h-14 rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-stone-300 hover:bg-stone-800 hover:scale-105 transition-all shadow-md active:scale-95 flex-shrink-0"
            >
              <svg className="w-5 h-5 transform rotate-90 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
          <p className="text-center text-xs text-stone-300 mt-3 font-medium tracking-wide">Enter to send • Shift + Enter for new line</p>
        </div>
      </div>
    </div>
  );
};
