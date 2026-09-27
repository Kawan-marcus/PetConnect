import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, rotaInicial } from '../context/AuthContext.jsx';
import Carregando from '../components/Carregando.jsx';

/**
 * Bloqueia a rota para quem não está logado ou não tem o perfil permitido.
 *   <Route element={<RotaProtegida perfis={['ong']} />}> ... </Route>
 */
export default function RotaProtegida({ perfis }) {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: location.pathname }} />;
  if (perfis && !perfis.includes(usuario.perfil)) return <Navigate to={rotaInicial(usuario)} replace />;
  return <Outlet />;
}
