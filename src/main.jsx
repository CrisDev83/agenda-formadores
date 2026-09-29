// Importa a biblioteca do React para renderização dos componentes
import React from 'react';

// Importa o cliente de renderização de DOM do React (React 18+)
import ReactDOM from 'react-dom/client';

// Importa o provedor de autenticação do Google OAuth para habilitar o login social com conta Google
import { GoogleOAuthProvider } from '@react-oauth/google';

// Importa o componente raiz da aplicação (App.jsx)
import App from './App.jsx';

// Importa os estilos CSS globais
import './App.css';

// Importa o Provedor do Contexto de Autenticação (guarda o estado de usuário logado/admin em todo o sistema)
import { AuthProvider } from './context/AuthContext';

// Importa as regras de estilização responsiva para dispositivos móveis
import './mobile.css';

// Lê o Client ID do Google OAuth armazenado nas variáveis de ambiente do Vite (.env)
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Encontra a <div id="root"> no index.html e inicializa a árvore de componentes do React
ReactDOM.createRoot(document.getElementById('root')).render(
  // Modo estrito do React que ajuda a identificar potenciais problemas e bugs durante o desenvolvimento
  <React.StrictMode>
    {/* Envolve o app com o provedor do Google OAuth passando a chave Client ID */}
    <GoogleOAuthProvider clientId={clientId}>
      {/* Envolve o app com o contexto de autenticação customizado para controle de login/perfil */}
      <AuthProvider>
        {/* Renderiza o componente principal App */}
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);