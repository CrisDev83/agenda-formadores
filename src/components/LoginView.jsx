// Importa o React para criação do componente de interface
import React from 'react';

// Importa o hook personalizado de autenticação para acessar as funções e estados globais de login
import { useAuth } from '../context/AuthContext';

// Importa o componente oficial do Google para exibição do botão nativo de login OAuth
import { GoogleLogin } from '@react-oauth/google';

// Componente responsável pela tela de login do sistema
export default function LoginView() {
  // Extrai a função de login e os estados de carregamento e erro do AuthContext
  const { login, loading, error } = useAuth();

  return (
    /* Container principal centralizado com largura máxima fixada em 420px */
    <div className="container" style={{ maxWidth: '420px', marginTop: '60px' }}>
      {/* Título da tela de login */}
      <h1 className="app-title">Acesso ao Sistema</h1>

      {/* Card que encapsula o alerta de erro e o botão de login */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        {/* Renderiza a caixa de mensagem de erro apenas se houver algum erro registrado */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fca5a5',
            padding: '10px 14px',
            borderRadius: '6px',
            width: '100%',
            boxSizing: 'border-box',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Exibe o indicador de carregamento ou o botão do Google dependendo do estado 'loading' */}
        {loading ? (
          <div className="loading-box" style={{ width: '100%', margin: 0 }}>
            Autenticando, aguarde...
          </div>
        ) : (
          /* Container de alinhamento centralizado do botão oficial do Google */
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <GoogleLogin
              // Chamada executada após o usuário concluir com sucesso a autenticação na janela do Google
              onSuccess={(credentialResponse) => login(credentialResponse)}
              // Chamada executada se a popup do Google falhar ou for fechada com erro
              onError={() => alert('Falha ao autenticar com o Google. Tente novamente.')}
              // Desativa o prompt flutuante de um clique (One Tap) para forçar o clique no botão
              useOneTap={false}
              // Define o tema visual do botão como 'outline' (com borda)
              theme="outline"
              // Define o formato do botão como retangular
              shape="rectangular"
            />
          </div>
        )}
      </div>
    </div>
  );
}