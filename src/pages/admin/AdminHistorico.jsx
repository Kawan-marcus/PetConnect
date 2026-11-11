import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import FiltrosRelatorio from '../../components/Filtros.jsx';
import TabelaRelatorio from '../../components/TabelaRelatorio.jsx';
import TimelineStatus from '../../components/TimelineStatus.jsx';
import Modal from '../../components/Modal.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useFiltrosSalvos } from '../../hooks/useTabela.js';
import { dadosAdmin } from '../../api/relatorios.js';
import { filtrarSolicitacoes, descreverPeriodo } from '../../utils/relatorios.js';
import { STATUS_SOLICITACAO, ESPECIES, formatarData } from '../../utils/format.js';

const FILTRO_PADRAO = { periodo: 'tudo', de: '', ate: '', ong: '', especie: '', status: '', usuario: '' };

/** RF16: histórico de todas as solicitações e adoções, com filtros, pesquisa e linha do tempo. */
export default function AdminHistorico() {
  const [params] = useSearchParams();
  const [filtros, alterar, limpar] = useFiltrosSalvos('historico', FILTRO_PADRAO);
  const [aberta, setAberta] = useState(null);
  const { dados, carregando, erro, recarregar } = useAsync(dadosAdmin, []);
  const linhas = useMemo(() => (dados ? filtrarSolicitacoes(dados.solicitacoes, filtros) : []), [dados, filtros]);
  const busca = params.get('busca');

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="Histórico de adoções" subtitulo="Todas as solicitações registradas na plataforma, com cada etapa." />
      <FiltrosRelatorio
        padraoPeriodo="tudo"
        filtros={filtros}
        alterar={alterar}
        limpar={limpar}
        campos={['periodo', 'ong', 'especie', 'status', 'usuario']}
        ongs={dados?.ongs || []}
        usuarios={(dados?.usuarios || []).filter((u) => u.perfil === 'adotante').sort((a, b) => a.nome.localeCompare(b.nome))}
        status={STATUS_SOLICITACAO}
      />
      <Erro erro={erro} onTentar={recarregar} />
      {carregando && !dados ? <Carregando /> : (
        <section className="card">
          <TabelaRelatorio
            key={busca || 'todas'}
            titulo="Histórico de adoções"
            arquivo="petconnect-historico-adocoes"
            contexto={[`Período: ${descreverPeriodo(filtros)}`]}
            linhas={busca ? linhas.filter((s) => String(s.id) === busca) : linhas}
            busca={(s) => [s.id, s.animal?.nome, s.adotanteNome, s.ongNome]}
            placeholder="Pesquisar por animal, adotante, ONG ou nº…"
            ordem={{ id: 'aberta', valor: (s) => s.criadoEm, desc: true }}
            colunas={[
              { id: 'id', titulo: 'Nº', valor: (s) => s.id, render: (s) => <button type="button" className="btn btn--link" onClick={() => setAberta(s)} title="Ver linha do tempo">#{s.id}</button> },
              { id: 'animal', titulo: 'Animal', valor: (s) => s.animal?.nome, render: (s) => <><strong>{s.animal?.nome}</strong><span className="texto-suave bloco">{ESPECIES[s.especie] || ''}</span></> },
              { id: 'adotante', titulo: 'Adotante', valor: (s) => s.adotanteNome },
              { id: 'ong', titulo: 'ONG', valor: (s) => s.ongNome },
              { id: 'score', titulo: 'Score', direita: true, valor: (s) => s.score, render: (s) => (s.score == null ? '—' : `${s.score}%`) },
              { id: 'aberta', titulo: 'Aberta em', valor: (s) => s.criadoEm, render: (s) => <span className="texto-suave">{formatarData(s.criadoEm)}</span> },
              { id: 'atualizada', titulo: 'Última atualização', valor: (s) => s.atualizadoEm, render: (s) => <span className="texto-suave">{formatarData(s.atualizadoEm)}</span> },
              { id: 'status', titulo: 'Situação', valor: (s) => STATUS_SOLICITACAO[s.status]?.rotulo, render: (s) => <StatusBadge tipo="solicitacao" status={s.status} /> },
            ]}
          />
        </section>
      )}
      <Modal aberto={!!aberta} titulo={aberta ? `Solicitação #${aberta.id} · ${aberta.animal?.nome}` : ''} onFechar={() => setAberta(null)}>
        {aberta && (
          <>
            <p className="texto-suave">{aberta.adotanteNome} · {aberta.ongNome}{aberta.score != null ? ` · compatibilidade ${aberta.score}%` : ''}</p>
            <TimelineStatus historico={aberta.historico} status={aberta.status} />
          </>
        )}
      </Modal>
    </div>
  );
}
