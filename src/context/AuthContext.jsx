// Importa o React e os hooks necessários para criação e manipulação do estado global de autenticação
import React, { createContext, useContext, useState, useEffect } from 'react';

// Importa a biblioteca jwt-decode para extrair os dados contidos no token retornado pelo Google OAuth
import { jwtDecode } from 'jwt-decode';

// Importa a lista padrão de formadores/professores com seus respectivos perfis e e-mails autorizados
import { DEFAULT_TEACHERS } from '../constants/defaults';

// Cria o Contexto do React que armazenará e compartilhará os dados de autenticação por toda a aplicação
const AuthContext = createContext({});

// Componente Provedor que envolve a aplicação e gerencia o estado de autenticação
export function AuthProvider({ children }) {
  // 1. Inicializa o estado 'user' recuperando os dados salvos no localStorage para persistir a sessão após atualizações de página
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('@Agenda:user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null; // Caso ocorra erro na leitura/parse do localStorage, inicia como deslogado
    }
  });

  // Estado para indicar se o processo de login está em andamento
  const [loading, setLoading] = useState(false);

  // Estado para armazenar mensagens de erro de autenticação
  const [error, setError] = useState('');

  // Sincroniza o objeto 'user' com o localStorage sempre que o estado sofrer alteração
  useEffect(() => {
    if (user) {
      localStorage.setItem('@Agenda:user', JSON.stringify(user));
    } else {
      localStorage.removeItem('@Agenda:user');
    }
  }, [user]);

  // Função de login instantânea que decodifica o JWT do Google e valida o e-mail contra a lista DEFAULT_TEACHERS
  async function login(credentialResponse) {
    setLoading(true);
    setError('');
    try {
      // Extrai e decodifica as informações do usuário a partir da credencial/token fornecida pelo Google
      const decoded = jwtDecode(credentialResponse.credential);
      const cleanEmail = String(decoded.email || '').trim().toLowerCase();

      // Procura se o e-mail retornado pelo Google está presente na lista local de formadores autorizados
      const foundUser = DEFAULT_TEACHERS.find((teacher) => {
        const teacherEmail = String(teacher.email || '').trim().toLowerCase();
        return teacherEmail === cleanEmail;
      });

      // Se encontrou o usuário cadastrado, autoriza o acesso e armazena os dados
      if (foundUser) {
        setUser(foundUser);
        return { success: true, user: foundUser };
      } else {
        // Lança um erro se o e-mail autenticado pelo Google não constar na lista de permissões
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

  // Função para encerrar a sessão do usuário de forma limpa
  function logout() {
    setUser(null);
    setError('');
    localStorage.removeItem('@Agenda:user');
    localStorage.removeItem('@Agenda:catalog');
  }

  // Flags booleanas auxiliares para verificação ágil de perfil nos componentes
  const isAdmin = user?.perfil?.toLowerCase().includes('admin');
  const isFormador = user?.perfil?.toLowerCase() === 'formador';

  return (
    // Prove os dados, métodos e status de autenticação para todos os componentes filhos
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        isAdmin,
        isFormador,
        isAuthenticated: Boolean(user) // Converte a existência do objeto 'user' em um booleano verdadeiro/falso
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado que facilita o consumo do AuthContext nos componentes da aplicação
export function useAuth() {
  return useContext(AuthContext);
}