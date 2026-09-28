import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { DEFAULT_TEACHERS } from '../constants/defaults';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  // 1. Inicializa o estado recuperando do localStorage para manter a sessão ativa
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('@Agenda:user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sincroniza o usuário no localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('@Agenda:user', JSON.stringify(user));
    } else {
      localStorage.removeItem('@Agenda:user');
    }
  }, [user]);

  // Função de login instantânea validando o e-mail contra o DEFAULT_TEACHERS
  async function login(credentialResponse) {
    setLoading(true);
    setError('');
    try {
      // Extrai e decodifica o e-mail retornado pelo Google
      const decoded = jwtDecode(credentialResponse.credential);
      const cleanEmail = String(decoded.email || '').trim().toLowerCase();

      // Procura o usuário na lista local de formadores
      const foundUser = DEFAULT_TEACHERS.find((teacher) => {
        const teacherEmail = String(teacher.email || '').trim().toLowerCase();
        return teacherEmail === cleanEmail;
      });

      if (foundUser) {
        setUser(foundUser);
        return { success: true, user: foundUser };
      } else {
        throw new Error(`E-mail não autorizado no sistema: ${cleanEmail}`);
      }
    } catch (err) {
      const msg = err.message || 'Erro ao autenticar com o Google.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  // Encerramento de sessão limpo
  function logout() {
    setUser(null);
    setError('');
    localStorage.removeItem('@Agenda:user');
    localStorage.removeItem('@Agenda:catalog');
  }

  const isAdmin = user?.perfil?.toLowerCase().includes('admin');
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

export function useAuth() {
  return useContext(AuthContext);
}