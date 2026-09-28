import React from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginView() {
  const { login, loading, error } = useAuth();

  return (
    <div className="container" style={{ maxWidth: '420px', marginTop: '60px' }}>
      <h1 className="app-title">Acesso ao Sistema</h1>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
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

        {loading ? (
          <div className="loading-box" style={{ width: '100%', margin: 0 }}>
            Autenticando, aguarde...
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <GoogleLogin
              onSuccess={(credentialResponse) => login(credentialResponse)}
              onError={() => alert('Falha ao autenticar com o Google. Tente novamente.')}
              useOneTap={false}
              theme="outline"
              shape="rectangular"
            />
          </div>
        )}
      </div>
    </div>
  );
}