import React, { createContext, useContext, useState } from 'react';
import { apiCall } from '../services/api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Função centralizada para realizar o login
  // Função centralizada para realizar o login via Google OAuth
  async function login(credentialResponse) {
    setLoading(true);
    setError('');
    try {
      // Extrai e decodifica o e-mail verificado do token do Google
      const decoded = jwtDecode(credentialResponse.credential);
      const cleanEmail = String(decoded.email || '').trim().toLowerCase();

      const data = await apiCall({ action: 'login', email: cleanEmail });

      if (data?.user) {
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        throw new Error('E-mail não autorizado no sistema.');
      }
    } catch (err) {
      const msg = err.message || 'Erro ao autenticar com o Google.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  // Função centralizada para encerramento de sessão
  function logout() {
    setUser(null);
    setError('');
  }

  // Auxiliares de permissão
  const isAdmin = user?.perfil?.toLowerCase() === 'admin';
  const isFormador = user?.perfil?.toLowerCase() === 'formador';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        isAdmin,
        isFormador,
        isAuthenticated: Boolean(user)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom Hook para consumir o contexto em qualquer componente
export function useAuth() {
  return useContext(AuthContext);
}