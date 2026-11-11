import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import TimelineStatus from '../../components/TimelineStatus.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import { Erro, Vazio } from '../../components/Carregando.jsx';
import Carregando from '../../components/Carregando.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { minhasSolicitacoes, cancelarSolicitacao } from '../../api/adocoes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useConfirmar } from '../../context/ConfirmarContext.jsx';
import { formatarData } from '../../utils/format.js';

const ATIVAS = ['pendente', 'em_analise', 'aprovada'];

/** RF14 + RF16: acompanhamento e histórico das solicitações do adotante. */
export default function MinhasSolicitacoes() {
  const { dados, carregando, erro, recarregar } = useAsync(minhasSolicitacoes, []);
  const [aberta, setAberta] = useState(null);
  const toast = useToast();
  const confirmar = useConfirmar();

  const cancelar = async (s) => {
    const ok = await confirmar({
      titulo: `Cancelar o pedido para ${s.animal.nome}?`,
      mensagem: `A ONG ${s.ong.nome} deixa de analisar o seu pedido.`,
      detalhe: 'Depois de cancelado, o pedido não pode ser reaberto. Se mudar de ideia, você pode enviar um novo enquanto o animal estiver disponível.',
      acao: 'Cancelar pedido',
      cancelar: 'Manter pedido',
      perigo: true,
    });
    if (!ok) return;
    try {
      await cancelarSolicitacao(s.id);
      toast('Solicitação cancelada.');
      recarregar();
    } catch (e) {
      toast(e.message, 'erro');
    }
  };

  if (carregando && !dados) return <Carregando />;
  const ativas = dados?.filter((s) => ATIVAS.includes(s.status)) || [];
  const historico = dados?.filter((s) => !ATIVAS.includes(s.status)) || [];

  const renderItem = (s) => {
    const expandida = aberta === s.id || (aberta === null && s === ativas[0]);
    return (
      <article key={s.id} className={`card solicitacao ${expandida ? 'is-aberta' : ''}`}>
        <button className="solicitacao__topo" onClick={() => setAberta(expandida ? -1 : s.id)} aria-expanded={expandida}>
          <img src={s.animal.fotos[0]} alt="" className="miniatura" />
          <div className="solicitacao__info">
            <strong>{s.animal.nome}</strong>
            <span className="texto-suave">{s.ong.nome} · enviada em {formatarData(s.criadoEm)}</span>
          </div>
          <StatusBadge tipo="solicitacao" status={s.status} />
        </button>
        {expandida && (
          <div className="solicitacao__corpo">
            <TimelineStatus historico={s.historico} status={s.status} />
            <div className="solicitacao__lateral">
              {s.score != null && (
                <p className="texto-suave"><Icone nome="ia" tamanho={14} /> Compatibilidade no envio: <strong>{s.score}%</strong></p>
              )}
              {s.status === 'aprovada' && <p className="alerta alerta--sucesso">A ONG vai entrar em contato para combinar a entrega de {s.animal.nome}.</p>}
              {s.status === 'recusada' && s.motivoRecusa && <p className="alerta alerta--erro">Motivo: {s.motivoRecusa}</p>}
              <div className="form__acoes">
                <Link to={`/animais/${s.animal.id}`} className="btn btn--fantasma">Ver animal</Link>
                {['pendente', 'em_analise'].includes(s.status) && (
                  <button className="btn btn--perigo-suave" onClick={() => cancelar(s)}>Cancelar solicitação</button>
                )}
              </div>
            </div>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="container pagina pagina--media">
      <CabecalhoPagina titulo="Minhas solicitações" subtitulo="Acompanhe cada etapa do processo de adoção." />
      <Erro erro={erro} onTentar={recarregar} />
      {dados?.length === 0 && (
        <Vazio titulo="Você ainda não fez nenhuma solicitação" acao={<Link to="/recomendados" className="btn btn--primario">Ver recomendados</Link>} />
      )}
      {ativas.length > 0 && (
        <section className="lista-solicitacoes">
          <h2 className="subtitulo">Em andamento</h2>
          {ativas.map(renderItem)}
        </section>
      )}
      {historico.length > 0 && (
        <section className="lista-solicitacoes">
          <h2 className="subtitulo">Histórico</h2>
          {historico.map(renderItem)}
        </section>
      )}
    </div>
  );
}
