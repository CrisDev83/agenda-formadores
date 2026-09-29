// Importa o React e o hook 'useState' para gerenciar estados locais da página
import React, { useState } from 'react';

// Importa o hook personalizado de autenticação para acessar as informações do usuário logado
import { useAuth } from './context/AuthContext';

// Importa a tela de Login
import LoginView from './components/LoginView';

// Importa a tela de Formulário do Formador
import FormadorView from './components/FormadorView';

// Importa a tela do Painel de Controle (Dashboard) do Administrador
import DashboardView from './components/DashboardView';

// Componente principal da aplicação
export default function App() {
  // Extrai as variáveis e funções globais de autenticação via Context API
  const { isAuthenticated, user, isAdmin, logout } = useAuth();

  // Estado local para controlar a aba/tela atual para administradores ('formador' ou 'dashboard')
  const [currentTab, setCurrentTab] = useState('formador');

  // 1. Se o usuário não estiver autenticado/logado, exibe apenas a tela de login
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // 2. Se o usuário estiver logado, exibe o cabeçalho e as telas conforme seu perfil
  return (
    <div>
      {/* Cabeçalho superior do aplicativo */}
      <header className="app-header">
        {/* Bloco de informações do usuário logado (Nome e Perfil) */}
        <div className="user-info">
          <span><strong>{user?.nome}</strong> ({isAdmin ? 'Admin' : 'Formador'})</span>
        </div>

        {/* Bloco de ações e navegação do cabeçalho */}
        <div className="header-actions">
          {/* Exibe os botões de troca de aba apenas se o usuário for Administrador */}
          {isAdmin && (
            <nav className="header-nav">
              {/* Botão para alternar para a visão de Formulário do Formador */}
              <button 
                className={`btn ${currentTab === 'formador' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCurrentTab('formador')}
              >
                Formulário
              </button>
              {/* Botão para alternar para a visão de Dashboard */}
              <button 
                className={`btn ${currentTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCurrentTab('dashboard')}
              >
                Dashboard
              </button>
            </nav>
          )}

          {/* Botão de encerrar a sessão (Logout) */}
          <button className="btn btn-secondary btn-logout" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      {/* Área principal do conteúdo dinâmico */}
      <main>
        {/* Renderiza a Dashboard se for Admin e a aba atual for 'dashboard', caso contrário renderiza o formulário do formador */}
        {isAdmin && currentTab === 'dashboard' ? (
          <DashboardView />
        ) : (
          <FormadorView currentUser={user} />
        )}
      </main>
    </div>
  );
}