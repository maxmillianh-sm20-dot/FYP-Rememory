import React, { useState } from 'react';

const QUESTIONS = [
  'What is one memory of them that brings you the most comfort?',
  'Is there anything you wish you had said to them?',
  'How have you grown since their passing?',
  'What is one thing you want to carry forward from their life?',
];

export const Closure = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answer, setAnswer] = useState('');
  const [completed, setCompleted] = useState(false);

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((c) => c + 1);
      setAnswer('');
    } else {
      setCompleted(true);
    }
  };

  if (completed) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700 bg-[#FDFCFB]">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-rose-50 rounded-full flex items-center justify-center mb-8 shadow-sm">
          <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-3xl font-serif text-stone-800 mb-4">Reflection Complete</h2>
        <p className="text-stone-500 mb-10 leading-relaxed max-w-xs mx-auto font-light">
          Your thoughts have been saved. These reflections are stepping stones on your journey.
        </p>
        <button
          onClick={() => setCompleted(false)}
          className="px-8 py-3 rounded-full border border-stone-200 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
        >
          Review Journal
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 pt-12 min-h-full flex flex-col bg-[#FDFCFB]">
      <div className="flex items-center gap-4 mb-10">
        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest border border-indigo-100 px-2 py-1 rounded-md bg-indigo-50">Journal</span>
        <div className="flex-1 h-px bg-stone-100"></div>
        <span className="text-xs text-stone-300 font-serif italic">
          {currentQuestion + 1} of {QUESTIONS.length}
        </span>
      </div>

      <div key={currentQuestion} className="flex-1 flex flex-col animate-in fade-in slide-in-from-right duration-700">
        <h3 className="text-2xl md:text-3xl font-serif text-stone-800 mb-8 leading-snug">
          {QUESTIONS[currentQuestion]}
        </h3>

        <div className="flex-1 relative mb-8 group">
          <div className="absolute inset-0 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl border border-stone-100 transition-all duration-300 group-focus-within:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] group-focus-within:border-indigo-100"></div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your thoughts here..."
            className="relative z-10 w-full h-full bg-transparent p-6 resize-none outline-none text-stone-600 leading-relaxed font-light placeholder:text-stone-300"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={!answer.trim()}
            className="bg-stone-900 text-stone-50 px-8 py-4 rounded-2xl shadow-lg hover:bg-stone-800 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 flex items-center gap-3 font-medium"
          >
            {currentQuestion === QUESTIONS.length - 1 ? 'Save Entry' : 'Next Reflection'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
