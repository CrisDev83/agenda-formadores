import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginView from './components/LoginView';
import FormadorView from './components/FormadorView';
import DashboardView from './components/DashboardView';

export default function App() {
  const { isAuthenticated, user, isAdmin, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState('formador');

  // 1. Se não estiver logado, exibe apenas a tela de login
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // 2. Se estiver logado, exibe o cabeçalho e as telas conforme o perfil
  return (
    <div>
      <header className="app-header">
        <div className="user-info">
          <span><strong>{user?.nome}</strong> ({isAdmin ? 'Admin' : 'Formador'})</span>
        </div>

        <div className="header-actions">
          {isAdmin && (
            <nav className="header-nav">
              <button 
                className={`btn ${currentTab === 'formador' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCurrentTab('formador')}
              >
                Formulário
              </button>
              <button 
                className={`btn ${currentTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCurrentTab('dashboard')}
              >
                Dashboard
              </button>
            </nav>
          )}

          <button className="btn btn-secondary btn-logout" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <main>
        {isAdmin && currentTab === 'dashboard' ? (
          <DashboardView />
        ) : (
          <FormadorView currentUser={user} />
        )}
      </main>
    </div>
  );
}