import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.js';
import { tokenStorage } from '../api/client.js';

const AuthContext = createContext(null);

/** Guarda o usuário logado e expõe login/logout para toda a aplicação. */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!tokenStorage.get()) {
      setUsuario(null);
      setCarregando(false);
      return;
    }
    try {
      setUsuario(await authApi.me());
    } catch {
      tokenStorage.clear();
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
    const sair = () => setUsuario(null);
    window.addEventListener('adotapet:logout', sair);
    return () => window.removeEventListener('adotapet:logout', sair);
  }, [recarregar]);

  const entrar = useCallback(async ({ token }) => {
    tokenStorage.set(token);
    const u = await authApi.me();
    setUsuario(u);
    return u;
  }, []);

  const login = useCallback(async (email, senha) => entrar(await authApi.login(email, senha)), [entrar]);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, login, entrar, logout, recarregar }),
    [usuario, carregando, login, entrar, logout, recarregar],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}

/** Página inicial de cada perfil depois do login. */
export function rotaInicial(usuario) {
  if (!usuario) return '/';
  if (usuario.perfil === 'admin') return '/admin';
  if (usuario.perfil === 'ong') return '/ong';
  return '/animais';
}
