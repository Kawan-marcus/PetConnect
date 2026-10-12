import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import Icone from '../../components/Icone.jsx';
import { Metrica } from '../ong/OngPainel.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { obterFormulario, minhasSolicitacoes } from '../../api/adocoes.js';
import { listarFavoritos } from '../../api/animais.js';
import { recomendacoes } from '../../api/ia.js';
import { nivelScore, tempoRelativo } from '../../utils/format.js';

const ABERTAS = ['pendente', 'em_analise', 'aprovada'];

/**
 * Minha área (Sprint 06): página inicial do adotante.
 * Junta numa tela os três módulos do sistema:
 *  - Módulo 1 (animais e favoritos), Módulo 2 (solicitações) e Módulo 3 (IA de compatibilidade).
 * Cada bloco carrega de forma independente: se um falhar, os outros continuam aparecendo.
 */
export default function MinhaArea() {
  const { usuario } = useAuth();
  const { dados, carregando, recarregar } = useAsync(async () => {
    const [formulario, solicitacoes, favoritos, recs] = await Promise.allSettled([
      obterFormulario(),
      minhasSolicitacoes(),
      listarFavoritos(),
      recomendacoes(3),
    ]);
    const valor = (r, padrao) => (r.status === 'fulfilled' ? r.value ?? padrao : padrao);
    const falhas = [formulario, solicitacoes, favoritos, recs].filter((r) => r.status === 'rejected');
    return {
      formulario: valor(formulario, null),
      solicitacoes: valor(solicitacoes, []),
      favoritos: valor(favoritos, []),
      recs: valor(recs, null),
      erro: falhas[0]?.reason || null,
    };
  }, []);

  if (carregando) return <Carregando texto="Montando sua área…" />;
  const { formulario, solicitacoes, favoritos, recs, erro } = dados;
  const abertas = solicitacoes.filter((s) => ABERTAS.includes(s.status));
  const primeiroNome = usuario.nome.split(' ')[0];

  // Jornada de adoção: mostra em que etapa o adotante está e qual é o próximo passo.
  const etapas = [
    { titulo: 'Criar conta', feito: true },
    { titulo: 'Preencher formulário', feito: !!formulario, acao: { to: '/formulario', rotulo: 'Preencher formulário' } },
    { titulo: 'Escolher um animal', feito: favoritos.length > 0 || solicitacoes.length > 0, acao: { to: '/recomendados', rotulo: 'Ver recomendados' } },
    { titulo: 'Solicitar adoção', feito: solicitacoes.length > 0, acao: { to: favoritos[0] ? `/animais/${favoritos[0].id}` : '/animais', rotulo: 'Escolher e solicitar' } },
    { titulo: 'Adoção concluída', feito: solicitacoes.some((s) => s.status === 'concluida'), acao: { to: '/minhas-solicitacoes', rotulo: 'Acompanhar solicitações' } },
  ];
  const proxima = etapas.find((e) => !e.feito);
  const concluidas = etapas.filter((e) => e.feito).length;

  return (
    <div className="container pagina">
      <CabecalhoPagina
        titulo={`Olá, ${primeiroNome}!`}
        subtitulo="Acompanhe sua jornada de adoção e veja os animais que mais combinam com você."
        acoes={<Link to="/animais" className="btn btn--primario"><Icone nome="busca" tamanho={18} /> Procurar animais</Link>}
      />
      <Erro erro={erro} onTentar={recarregar} />

      <section className="card jornada" aria-labelledby="titulo-jornada">
        <div className="secao__topo">
          <div>
            <h2 id="titulo-jornada">Sua jornada de adoção</h2>
            <p className="texto-suave">{concluidas} de {etapas.length} etapas concluídas</p>
          </div>
          {proxima?.acao && (
            <Link to={proxima.acao.to} className="btn btn--ia">
              Próximo passo: {proxima.acao.rotulo} <Icone nome="seta" tamanho={16} />
            </Link>
          )}
        </div>
        <ol className="jornada__etapas">
          {etapas.map((e, i) => (
            <li key={e.titulo} className={`jornada__etapa ${e.feito ? 'is-feita' : ''} ${e === proxima ? 'is-atual' : ''}`}>
              <span className="jornada__marca" aria-hidden="true">{e.feito ? <Icone nome="check" tamanho={16} /> : i + 1}</span>
              <span className="jornada__titulo">{e.titulo}</span>
              <span className="sr-only">{e.feito ? '(concluída)' : e === proxima ? '(próxima etapa)' : '(pendente)'}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="metricas">
        <Metrica rotulo="Favoritos" valor={favoritos.length} detalhe={favoritos.length ? 'animais salvos' : 'nenhum ainda'} />
        <Metrica rotulo="Solicitações em andamento" valor={abertas.length} tom="amarelo" />
        <Metrica rotulo="Aprovadas" valor={solicitacoes.filter((s) => s.status === 'aprovada').length} tom="verde" />
        <Metrica
          rotulo="Maior compatibilidade"
          valor={recs?.itens?.[0] ? `${recs.itens[0].score}%` : '—'}
          detalhe={recs?.itens?.[0] ? `com ${recs.itens[0].animal.nome}` : 'preencha o formulário'}
          tom="primaria"
        />
      </div>

      <div className="grade-2">
        <section className="card">
          <div className="secao__topo">
            <div>
              <p className="eyebrow"><Icone nome="ia" tamanho={14} /> Calculado pela IA</p>
              <h2>Mais compatíveis com você</h2>
            </div>
            <Link to="/recomendados" className="btn btn--link">Ver todos <Icone nome="seta" tamanho={16} /></Link>
          </div>
          {!formulario || recs?.semFormulario ? (
            <div className="alerta alerta--ia alerta--com-acao">
              <Icone nome="formulario" />
              <span>Responda o formulário de avaliação para a IA calcular sua compatibilidade com cada animal.</span>
              <Link to="/formulario" className="btn btn--ia">Responder</Link>
            </div>
          ) : !recs?.itens?.length ? (
            <p className="texto-suave">Nenhum animal disponível no momento.</p>
          ) : (
            <ul className="lista-simples">
              {recs.itens.map((i) => (
                <li key={i.animal.id}>
                  <Link to={`/animais/${i.animal.id}`} className="linha-link">
                    <img src={i.animal.fotos?.[0]} alt="" className="miniatura" />
                    <div className="linha-link__info">
                      <strong>{i.animal.nome}</strong>
                      <span className="texto-suave">{i.animal.raca} · {i.animal.ong?.nome}</span>
                    </div>
                    <span className={`chip-score score--${nivelScore(i.score).tom}`}>{i.score}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {recs?.itens?.length > 1 && (
            <Link to={`/comparar?ids=${recs.itens.map((i) => i.animal.id).join(',')}`} className="btn btn--fantasma btn--bloco">
              <Icone nome="comparar" tamanho={18} /> Comparar estes {recs.itens.length}
            </Link>
          )}
        </section>

        <section className="card">
          <div className="secao__topo">
            <h2>Suas solicitações</h2>
            <Link to="/minhas-solicitacoes" className="btn btn--link">Ver todas <Icone nome="seta" tamanho={16} /></Link>
          </div>
          {solicitacoes.length === 0 ? (
            <p className="texto-suave">Você ainda não enviou nenhuma solicitação de adoção.</p>
          ) : (
            <ul className="lista-simples">
              {solicitacoes.slice(0, 4).map((s) => (
                <li key={s.id}>
                  <Link to="/minhas-solicitacoes" className="linha-link">
                    <img src={s.animal?.fotos?.[0]} alt="" className="miniatura" />
                    <div className="linha-link__info">
                      <strong>{s.animal?.nome}</strong>
                      <span className="texto-suave">{s.ong?.nome || s.animal?.ong?.nome} · {tempoRelativo(s.criadoEm)}</span>
                    </div>
                    <StatusBadge tipo="solicitacao" status={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
