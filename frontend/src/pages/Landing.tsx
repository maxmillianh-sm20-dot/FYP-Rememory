import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppRoute } from '../types';

export const Landing = () => {
  const { navigate, state, login } = useApp();
  const [showLogin, setShowLogin] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(state.userEmail || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleBegin = () => {
    if (!state.isAuthenticated) {
      setShowLogin(true);
      return;
    }
    navigate(AppRoute.SETUP);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || (isSignup && !name.trim())) {
      setError('All fields are required.');
      return;
    }
    setError('');
    login(email.trim());
  };

  return (
    <>
      <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden">
        <nav className="w-full py-6 px-6 md:px-12 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center text-white font-serif font-bold italic">R</div>
            <span className="font-serif font-bold text-xl tracking-tight text-stone-800">Rememory</span>
          </div>
          <button
            onClick={handleBegin}
            className="bg-white/50 hover:bg-white backdrop-blur-md border border-white/60 text-stone-800 px-6 py-2 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-md"
          >
            {state.isAuthenticated ? 'Begin Session' : 'Login to Begin'}
          </button>
        </nav>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 md:px-20 lg:px-32 py-12 relative z-10 gap-12">
        <div className="flex-1 text-center md:text-left animate-slide-up">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold tracking-wider uppercase">
            Digital Grief Support
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-stone-900 leading-[1.1] mb-8">
            Words left <br />
            <span className="italic font-serif text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-rose-400 pr-2">
              unspoken.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-stone-500 font-light leading-relaxed max-w-xl mb-10 md:mr-auto">
            A gentle, time-limited space where you can revisit a memory, find comfort, and slowly guide yourself toward peace and closure.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <button
              onClick={handleBegin}
              className="bg-stone-900 text-white px-8 py-4 rounded-full font-medium text-lg shadow-[0_10px_30px_-10px_rgba(28,25,23,0.3)] hover:bg-stone-800 hover:scale-[1.02] transition-all"
            >
              Start Your Journey
            </button>
          </div>
        </div>

        <div className="flex-1 relative h-[500px] w-full max-w-lg hidden md:block">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-rose-100/50 to-indigo-100/50 rounded-full blur-3xl animate-pulse-slow"></div>

          <div className="absolute top-10 right-10 w-64 h-80 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-xl animate-float p-6 flex flex-col gap-4 transform rotate-6">
            <div className="w-12 h-12 rounded-full bg-rose-100"></div>
            <div className="h-2 w-3/4 bg-stone-200 rounded-full"></div>
            <div className="h-2 w-1/2 bg-stone-200 rounded-full"></div>
            <div className="mt-auto p-4 bg-white/60 rounded-xl">
              <p className="text-xs text-stone-500 font-serif italic">"I'm still here with you, in the quiet moments."</p>
            </div>
          </div>

          <div className="absolute bottom-20 left-10 w-72 h-64 bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] shadow-xl animate-float-delayed p-8 flex flex-col justify-between transform -rotate-3">
            <div>
              <h3 className="font-serif text-xl text-stone-800 mb-2">30 Days</h3>
              <p className="text-sm text-stone-500">A structured path to healing, not holding on.</p>
            </div>
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              <div className="w-2/3 h-full bg-indigo-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-white/50 backdrop-blur-lg py-20 px-6 md:px-20 border-t border-white/60">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              title="Private Persona"
              desc="Create a gentle digital reflection of your loved one based on your specific memories and their personality."
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            />
            <FeatureCard
              title="Time-Limited"
              desc="A 30-day boundary prevents dependency, encouraging you to process grief and move toward acceptance."
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <FeatureCard
              title="Guided Closure"
              desc="Therapeutic prompts help you articulate unsaid words and preserve the most meaningful memories."
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
            />
          </div>
        </div>
      </div>
    </div>
    {showLogin && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative animate-fade-in">
          <button
            aria-label="Close"
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
            onClick={() => setShowLogin(false)}
          >
            X
          </button>
          <h3 className="font-serif text-2xl text-stone-800 mb-2">
            {isSignup ? 'Create an account' : 'Log in to begin'}
          </h3>
          <p className="text-stone-500 text-sm mb-6">
            {isSignup 
              ? 'Start your journey by creating a personal space.' 
              : 'Use a simple login to start your session and create a persona.'}
          </p>
          <form
            onSubmit={(e) => {
              handleLogin(e);
              if (!error) setShowLogin(false);
            }}
            className="space-y-4"
          >
            {isSignup && (
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 outline-none"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 outline-none"
                required
              />
            </div>
            {error && <div className="text-rose-500 text-sm">{error}</div>}
            <button
              type="submit"
              className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-800 transition-all"
            >
              {state.isAuthenticated ? 'Logged in' : (isSignup ? 'Sign Up' : 'Login & Continue')}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-stone-500 hover:text-stone-800 underline"
            >
              {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  );
};

const FeatureCard = ({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) => (
  <div className="p-8 rounded-3xl bg-white border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-800 mb-6">
      {icon}
    </div>
    <h3 className="font-serif text-2xl text-stone-800 mb-3">{title}</h3>
    <p className="text-stone-500 leading-relaxed font-light">{desc}</p>
  </div>
);


