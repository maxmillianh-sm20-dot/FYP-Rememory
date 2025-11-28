import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { PersonaSetup } from './pages/PersonaSetup';
import { Dashboard } from './pages/Dashboard';
import { Chat } from './pages/Chat';
import { Voice } from './pages/Voice';
import { Closure } from './pages/Closure';
import { AppRoute } from './types';

const AppContent = () => {
  const { currentRoute } = useApp();

  const renderPage = () => {
    switch (currentRoute) {
      case AppRoute.LANDING:
        return <Landing />;
      case AppRoute.SETUP:
        return <PersonaSetup />;
      case AppRoute.DASHBOARD:
        return <Dashboard />;
      case AppRoute.CHAT:
        return <Chat />;
      case AppRoute.VOICE:
        return <Voice />;
      case AppRoute.CLOSURE:
        return <Closure />;
      default:
        return <Landing />;
    }
  };

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
