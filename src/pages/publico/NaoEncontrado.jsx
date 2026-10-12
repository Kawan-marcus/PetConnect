import { Link, useLocation } from 'react-router-dom';
import Icone from '../../components/Icone.jsx';
import { useAuth, rotaInicial } from '../../context/AuthContext.jsx';
import { useRotuloPagina } from '../../components/Trilha.jsx';

/** Atalhos úteis conforme quem está navegando (Sprint 06: a 404 deixa de ser um beco sem saída). */
const ATALHOS = {
  visitante: [['/animais', 'Ver animais para adoção'], ['/como-funciona', 'Como funciona'], ['/login', 'Entrar']],
  adotante: [['/animais', 'Ver animais'], ['/recomendados', 'Meus recomendados'], ['/minhas-solicitacoes', 'Minhas solicitações']],
  ong: [['/ong/animais', 'Meus animais'], ['/ong/solicitacoes', 'Solicitações'], ['/ong/animais/novo', 'Cadastrar animal']],
  admin: [['/admin/ongs', 'ONGs'], ['/admin/usuarios', 'Usuários'], ['/admin/historico', 'Histórico']],
};

export default function NaoEncontrado() {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  useRotuloPagina('Página não encontrada', { semTrilha: true });
  const atalhos = ATALHOS[usuario?.perfil || 'visitante'];

  return (
    <div className="container pagina pagina--estreita">
      <div className="estado-pagina">
        <span className="estado-pagina__icone"><Icone nome="bussola" tamanho={34} /></span>
        <p className="eyebrow eyebrow--neutro">Erro 404</p>
        <h1>Página não encontrada</h1>
        <p className="texto-suave">
          O endereço <code>{pathname}</code> não existe ou foi movido. Parece que esse caminho fugiu pelo portão.
        </p>
        <div className="estado-pagina__acoes">
          <Link to={rotaInicial(usuario)} className="btn btn--primario"><Icone nome="casa" tamanho={18} /> Página inicial</Link>
        </div>
        <p className="texto-suave estado-pagina__dica">Ou vá direto para:</p>
        <div className="pilulas pilulas--centro">
          {atalhos.map(([to, rotulo]) => <Link key={to} to={to} className="pilula">{rotulo}</Link>)}
        </div>
      </div>
    </div>
  );
}
