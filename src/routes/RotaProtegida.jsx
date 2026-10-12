import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Carregando from '../components/Carregando.jsx';
import AcessoRestrito from '../pages/publico/AcessoRestrito.jsx';

/**
 * Bloqueia a rota para quem não está logado ou não tem o perfil permitido.
 *   <Route element={<RotaProtegida perfis={['ong']} />}> ... </Route>
 *
 * Sprint 06:
 *  - guarda o caminho completo (com ?filtros) para voltar exatamente ao mesmo lugar depois do login;
 *  - perfil errado agora vê uma tela explicando o motivo (antes era redirecionado sem aviso).
 */
export default function RotaProtegida({ perfis }) {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: location.pathname + location.search, motivo: 'login' }} />;
  if (perfis && !perfis.includes(usuario.perfil)) return <AcessoRestrito perfisPermitidos={perfis} />;
  return <Outlet />;
}
