import React, {useState} from 'react';
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
      <header style={{
        backgroundColor: '#1e293b',
        color: '#ffffff',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span><strong>{user?.nome}</strong> ({isAdmin ? 'Admin' : 'Formador'})</span>

          {/* Botões visíveis apenas para Administrador */}
          {isAdmin && (
            <nav style={{ display: 'flex', gap: '8px' }}>
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
        </div>

        <button className="btn btn-secondary" onClick={logout}>
          Sair
        </button>
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