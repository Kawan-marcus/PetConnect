import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RotaProtegida from './routes/RotaProtegida.jsx';

// Público
import Home from './pages/publico/Home.jsx';
import ComoFunciona from './pages/publico/ComoFunciona.jsx';
import Login from './pages/publico/Login.jsx';
import Cadastro from './pages/publico/Cadastro.jsx';
import RecuperarSenha from './pages/publico/RecuperarSenha.jsx';
import RedefinirSenha from './pages/publico/RedefinirSenha.jsx';
import Animais from './pages/publico/Animais.jsx';
import AnimalDetalhe from './pages/publico/AnimalDetalhe.jsx';
import NaoEncontrado from './pages/publico/NaoEncontrado.jsx';
import Perfil from './pages/publico/Perfil.jsx';

// Adotante
import Favoritos from './pages/adotante/Favoritos.jsx';
import FormularioAvaliacao from './pages/adotante/FormularioAvaliacao.jsx';
import MinhasSolicitacoes from './pages/adotante/MinhasSolicitacoes.jsx';
import Recomendados from './pages/adotante/Recomendados.jsx';

// ONG
import OngPainel from './pages/ong/OngPainel.jsx';
import OngAnimais from './pages/ong/OngAnimais.jsx';
import OngAnimalForm from './pages/ong/OngAnimalForm.jsx';
import OngSolicitacoes from './pages/ong/OngSolicitacoes.jsx';
import OngSolicitacaoDetalhe from './pages/ong/OngSolicitacaoDetalhe.jsx';
import OngAcompanhamentos from './pages/ong/OngAcompanhamentos.jsx';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminOngs from './pages/admin/AdminOngs.jsx';
import AdminUsuarios from './pages/admin/AdminUsuarios.jsx';
import AdminAnimais from './pages/admin/AdminAnimais.jsx';
import AdminHistorico from './pages/admin/AdminHistorico.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Público */}
        <Route index element={<Home />} />
        <Route path="como-funciona" element={<ComoFunciona />} />
        <Route path="login" element={<Login />} />
        <Route path="cadastro" element={<Cadastro />} />
        <Route path="recuperar-senha" element={<RecuperarSenha />} />
        <Route path="redefinir-senha" element={<RedefinirSenha />} />
        <Route path="animais" element={<Animais />} />
        <Route path="animais/:id" element={<AnimalDetalhe />} />

        {/* Qualquer usuário logado */}
        <Route element={<RotaProtegida />}>
          <Route path="perfil" element={<Perfil />} />
        </Route>

        {/* Adotante */}
        <Route element={<RotaProtegida perfis={['adotante']} />}>
          <Route path="favoritos" element={<Favoritos />} />
          <Route path="formulario" element={<FormularioAvaliacao />} />
          <Route path="minhas-solicitacoes" element={<MinhasSolicitacoes />} />
          <Route path="recomendados" element={<Recomendados />} />
        </Route>

        {/* ONG */}
        <Route path="ong" element={<RotaProtegida perfis={['ong']} />}>
          <Route index element={<OngPainel />} />
          <Route path="animais" element={<OngAnimais />} />
          <Route path="animais/novo" element={<OngAnimalForm />} />
          <Route path="animais/:id/editar" element={<OngAnimalForm />} />
          <Route path="solicitacoes" element={<OngSolicitacoes />} />
          <Route path="solicitacoes/:id" element={<OngSolicitacaoDetalhe />} />
          <Route path="acompanhamentos" element={<OngAcompanhamentos />} />
        </Route>

        {/* Administrador */}
        <Route path="admin" element={<RotaProtegida perfis={['admin']} />}>
          <Route index element={<AdminDashboard />} />
          <Route path="ongs" element={<AdminOngs />} />
          <Route path="usuarios" element={<AdminUsuarios />} />
          <Route path="animais" element={<AdminAnimais />} />
          <Route path="historico" element={<AdminHistorico />} />
        </Route>

        <Route path="*" element={<NaoEncontrado />} />
      </Route>
    </Routes>
  );
}
