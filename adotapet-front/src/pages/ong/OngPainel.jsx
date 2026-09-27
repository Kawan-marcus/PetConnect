import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listarAnimaisDaOng } from '../../api/animais.js';
import { solicitacoesDaOng } from '../../api/adocoes.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { tempoRelativo } from '../../utils/format.js';

export function Metrica({ rotulo, valor, detalhe, tom }) {
  return (
    <div className={`metrica ${tom ? `metrica--${tom}` : ''}`}>
      <span className="metrica__rotulo">{rotulo}</span>
      <strong className="metrica__valor">{valor ?? '—'}</strong>
      {detalhe && <span className="metrica__detalhe">{detalhe}</span>}
    </div>
  );
}

export default function OngPainel() {
  const { usuario } = useAuth();
  const aprovada = usuario.ong?.status === 'aprovada';
  const { dados, carregando, erro } = useAsync(async () => {
    const [animais, solicitacoes] = await Promise.all([listarAnimaisDaOng(), solicitacoesDaOng()]);
    return { animais, solicitacoes };
  }, []);

  if (carregando) return <Carregando />;
  const { animais = [], solicitacoes = [] } = dados || {};
  const pendentes = solicitacoes.filter((s) => ['pendente', 'em_analise'].includes(s.status));

  return (
    <div className="container pagina">
      <CabecalhoPagina
        titulo={usuario.ong?.nome || 'Painel da ONG'}
        subtitulo="Resumo dos seus animais e das solicitações recebidas."
        acoes={aprovada && <Link to="/ong/animais/novo" className="btn btn--primario"><Icone nome="mais" tamanho={18} /> Cadastrar animal</Link>}
      />
      <Erro erro={erro} />

      {!aprovada && (
        <div className="alerta alerta--aviso">
          <Icone nome="relogio" />
          <span>
            <strong>Sua ONG está aguardando aprovação.</strong> Assim que o administrador aprovar o cadastro, você poderá publicar animais.
          </span>
        </div>
      )}

      <div className="metricas">
        <Metrica rotulo="Disponíveis" valor={animais.filter((a) => a.status === 'disponivel').length} />
        <Metrica rotulo="Em processo" valor={animais.filter((a) => a.status === 'em_processo').length} tom="amarelo" />
        <Metrica rotulo="Adotados" valor={animais.filter((a) => a.status === 'adotado').length} tom="verde" />
        <Metrica rotulo="Solicitações abertas" valor={pendentes.length} tom="primaria" />
      </div>

      <section className="card">
        <div className="secao__topo">
          <h2>Solicitações aguardando você</h2>
          <Link to="/ong/solicitacoes" className="btn btn--link">Ver todas <Icone nome="seta" tamanho={16} /></Link>
        </div>
        {pendentes.length === 0 ? (
          <p className="texto-suave">Nenhuma solicitação aberta no momento.</p>
        ) : (
          <ul className="lista-simples">
            {pendentes.slice(0, 5).map((s) => (
              <li key={s.id}>
                <Link to={`/ong/solicitacoes/${s.id}`} className="linha-link">
                  <img src={s.animal.fotos[0]} alt="" className="miniatura" />
                  <div className="linha-link__info">
                    <strong>{s.usuario.nome}</strong>
                    <span className="texto-suave">quer adotar {s.animal.nome} · {tempoRelativo(s.criadoEm)}</span>
                  </div>
                  <span className="chip-score">{s.score}%</span>
                  <StatusBadge tipo="solicitacao" status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
