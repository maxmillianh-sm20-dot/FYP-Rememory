import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppRoute } from '../types';

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-6 h-6 transition-all duration-300 ${active ? 'stroke-stone-800 stroke-[2.5px]' : 'stroke-stone-400 stroke-[1.5px] hover:stroke-stone-600'}`} fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
);
const ChatIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-6 h-6 transition-all duration-300 ${active ? 'stroke-stone-800 stroke-[2.5px]' : 'stroke-stone-400 stroke-[1.5px] hover:stroke-stone-600'}`} fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
);
const MicIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-6 h-6 transition-all duration-300 ${active ? 'stroke-stone-800 stroke-[2.5px]' : 'stroke-stone-400 stroke-[1.5px] hover:stroke-stone-600'}`} fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
);
const HeartIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-6 h-6 transition-all duration-300 ${active ? 'stroke-stone-800 stroke-[2.5px]' : 'stroke-stone-400 stroke-[1.5px] hover:stroke-stone-600'}`} fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
);
const SettingsIcon = () => (
  <svg className="w-5 h-5 stroke-stone-500" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const LogOutIcon = () => (
  <svg className="w-5 h-5 stroke-rose-500" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { navigate, currentRoute, state, logout } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const isSetup = currentRoute === AppRoute.LANDING || currentRoute === AppRoute.SETUP;

  if (isSetup) {
    return <main className="w-full h-full overflow-y-auto no-scrollbar bg-stone-50">{children}</main>;
  }

  return (
    <div className="flex w-full h-full overflow-hidden bg-[#FDFCFB]">
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[10%] left-[20%] w-2 h-2 bg-indigo-200 rounded-full animate-float opacity-40"></div>
        <div className="absolute top-[40%] right-[10%] w-3 h-3 bg-rose-200 rounded-full animate-float-delayed opacity-40"></div>
        <div className="absolute bottom-[20%] left-[30%] w-4 h-4 bg-stone-200 rounded-full animate-float opacity-30" style={{ animationDuration: '15s' }}></div>
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white/70 backdrop-blur-xl border-b border-white/50 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-rose-100 p-0.5">
            {state.persona?.avatarUrl ? (
              <img src={state.persona.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-stone-400 font-serif">R</div>
            )}
          </div>
          <span className="font-serif font-bold text-stone-800 truncate max-w-[120px]">{state.persona?.name}</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 text-stone-500 hover:bg-stone-100"
          >
            <SettingsIcon />
          </button>
          {showSettings && (
            <div className="absolute top-12 right-0 w-48 bg-white rounded-2xl shadow-xl border border-stone-100 p-2 z-50 animate-fade-in origin-top-right">
              <button
                onClick={() => {
                  setShowSettings(false);
                  navigate(AppRoute.SETUP);
                }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-stone-50 text-sm font-medium text-stone-600 flex items-center gap-2"
              >
                <SettingsIcon /> Edit Persona
              </button>
              <div className="h-px bg-stone-100 my-1"></div>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to log out?')) logout();
                }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-rose-50 text-sm font-medium text-rose-600 flex items-center gap-2"
              >
                <LogOutIcon /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 h-full bg-white/40 backdrop-blur-2xl border-r border-white/60 pt-8 pb-6 px-5 z-50 shadow-[4px_0_30px_-10px_rgba(0,0,0,0.02)]">
        <div className="mb-10 p-4 bg-white/60 rounded-[20px] shadow-sm border border-white/60 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-rose-100 p-0.5 shadow-sm ring-2 ring-white">
            {state.persona?.avatarUrl ? (
              <img src={state.persona.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-stone-400 font-serif">R</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif font-bold text-stone-800 leading-tight truncate">{state.persona?.name}</h1>
            <span className="text-[10px] uppercase tracking-widest text-indigo-500 font-medium">Connected</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>
            {showSettings && (
              <div className="absolute top-8 right-0 w-48 bg-white rounded-xl shadow-xl border border-stone-100 p-1.5 z-50 animate-fade-in origin-top-right">
                <button
                  onClick={() => {
                    setShowSettings(false);
                    navigate(AppRoute.SETUP);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-stone-50 text-xs font-medium text-stone-600 flex items-center gap-2"
                >
                  Edit Persona
                </button>
                <div className="h-px bg-stone-50 my-1"></div>
                <button
                  onClick={() => {
                    if (window.confirm('Sign out?')) logout();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-rose-50 text-xs font-medium text-rose-500 flex items-center gap-2"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-3">
          <DesktopNavItem
            route={AppRoute.DASHBOARD}
            current={currentRoute}
            navigate={navigate}
            icon={<HomeIcon active={currentRoute === AppRoute.DASHBOARD} />}
            label="Sanctuary"
            desc="Home & Overview"
          />
          <DesktopNavItem
            route={AppRoute.CHAT}
            current={currentRoute}
            navigate={navigate}
            icon={<ChatIcon active={currentRoute === AppRoute.CHAT} />}
            label="Conversations"
            desc="Text Messages"
          />
          <DesktopNavItem
            route={AppRoute.VOICE}
            current={currentRoute}
            navigate={navigate}
            icon={<MicIcon active={currentRoute === AppRoute.VOICE} />}
            label="Voice Space"
            desc="Speak & Listen"
          />
          <DesktopNavItem
            route={AppRoute.CLOSURE}
            current={currentRoute}
            navigate={navigate}
            icon={<HeartIcon active={currentRoute === AppRoute.CLOSURE} />}
            label="Journal"
            desc="Reflect & Heal"
          />
        </nav>

        <div className="px-2 mt-auto">
          <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl border border-white/50">
            <p className="text-[10px] text-stone-400 font-medium italic text-center">
              "Grief is the price we pay for love."
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-hidden relative z-10">
        <div className="absolute top-0 left-0 w-full h-full overflow-y-auto scroll-smooth no-scrollbar pt-16 md:pt-0">
          {children}
          <div className="h-28 md:h-0"></div>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full px-6 py-3 z-50 flex gap-8 items-center max-w-[90vw]">
        <NavButton route={AppRoute.DASHBOARD} current={currentRoute} navigate={navigate} icon={<HomeIcon active={currentRoute === AppRoute.DASHBOARD} />} />
        <NavButton route={AppRoute.CHAT} current={currentRoute} navigate={navigate} icon={<ChatIcon active={currentRoute === AppRoute.CHAT} />} />
        <NavButton route={AppRoute.VOICE} current={currentRoute} navigate={navigate} icon={<MicIcon active={currentRoute === AppRoute.VOICE} />} />
        <NavButton route={AppRoute.CLOSURE} current={currentRoute} navigate={navigate} icon={<HeartIcon active={currentRoute === AppRoute.CLOSURE} />} />
      </nav>
    </div>
  );
};

const DesktopNavItem = ({ route, current, navigate, icon, label, desc }: any) => {
  const isActive = current === route;
  return (
    <button
      onClick={() => navigate(route)}
      className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group ${
        isActive ? 'bg-white shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05)] ring-1 ring-stone-100' : 'hover:bg-white/40'
      }`}
    >
      <div className={`p-2.5 rounded-xl transition-colors ${isActive ? 'bg-stone-50 text-stone-900' : 'bg-transparent text-stone-400 group-hover:bg-white group-hover:text-stone-600'}`}>
        {icon}
      </div>
      <div className="text-left">
        <span className={`block text-sm font-semibold transition-colors ${isActive ? 'text-stone-800' : 'text-stone-500 group-hover:text-stone-700'}`}>
          {label}
        </span>
        <span className="block text-[10px] text-stone-400 font-medium">
          {desc}
        </span>
      </div>
    </button>
  );
};

const NavButton = ({ route, current, navigate, icon }: any) => {
  const isActive = current === route;
  return (
    <button
      onClick={() => navigate(route)}
      className={`p-3 rounded-full transition-all duration-300 ${isActive ? 'bg-stone-100 scale-110 shadow-sm text-stone-800' : 'hover:bg-stone-50 text-stone-400'}`}
    >
      {icon}
    </button>
  );
};
