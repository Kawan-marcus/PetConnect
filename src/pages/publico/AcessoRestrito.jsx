import { Link } from 'react-router-dom';
import Icone from '../../components/Icone.jsx';
import { useAuth, rotaInicial } from '../../context/AuthContext.jsx';
import { useRotuloPagina } from '../../components/Trilha.jsx';
import { PERFIS } from '../../utils/format.js';

const AREA = { adotante: 'adotantes', ong: 'ONGs parceiras', admin: 'administradores' };

/** Mostrada quando alguém logado abre uma área de outro perfil (ex.: adotante em /admin). */
export default function AcessoRestrito({ perfisPermitidos = [] }) {
  const { usuario, logout } = useAuth();
  useRotuloPagina('Acesso restrito', { semTrilha: true });
  const quem = perfisPermitidos.map((p) => AREA[p] || p).join(' e ');

  return (
    <div className="container pagina pagina--estreita">
      <div className="estado-pagina">
        <span className="estado-pagina__icone estado-pagina__icone--aviso"><Icone nome="cadeado" tamanho={34} /></span>
        <h1>Esta área é exclusiva para {quem}</h1>
        <p className="texto-suave">
          Você está conectado como <strong>{PERFIS[usuario.perfil]}</strong> ({usuario.email}). Por segurança, cada perfil
          só acessa as próprias telas.
        </p>
        <div className="estado-pagina__acoes">
          <Link to={rotaInicial(usuario)} className="btn btn--primario">
            <Icone nome="casa" tamanho={18} /> Ir para a minha página inicial
          </Link>
          <button className="btn btn--fantasma" onClick={logout}>Entrar com outra conta</button>
        </div>
      </div>
    </div>
  );
}
