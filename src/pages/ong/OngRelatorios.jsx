import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import FiltrosRelatorio from '../../components/Filtros.jsx';
import TabelaRelatorio from '../../components/TabelaRelatorio.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useFiltrosSalvos } from '../../hooks/useTabela.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { dadosOng } from '../../api/relatorios.js';
import { STATUS_SOLICITACAO, STATUS_ANIMAL, ESPECIES, formatarData } from '../../utils/format.js';
import { filtrarSolicitacoes, animaisEmEspera, indicadores, descreverPeriodo, fmtPct, fmtDias, fmtNumero } from '../../utils/relatorios.js';

const RELATORIOS = [
  { id: 'solicitacoes', titulo: 'Solicitações recebidas', filtros: ['periodo', 'especie', 'status'] },
  { id: 'adocoes', titulo: 'Adoções e pós-adoção', filtros: ['periodo', 'especie'] },
  { id: 'espera', titulo: 'Animais à espera', filtros: ['especie', 'status'] },
];
const FILTRO_PADRAO = { periodo: '180', de: '', ate: '', especie: '', status: '' };

/** Relatórios da ONG (Sprint 07): só os dados da própria ONG — o backend filtra pela ONG logada. */
export default function OngRelatorios() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const atual = RELATORIOS.find((r) => r.id === params.get('r')) || RELATORIOS[0];
  const [filtros, alterar, limpar] = useFiltrosSalvos('ong-relatorios', FILTRO_PADRAO);
  const { dados, carregando, erro, recarregar } = useAsync(dadosOng, []);
  const f = useMemo(() => Object.fromEntries(Object.entries(filtros).map(([k, v]) => [k, atual.filtros.includes(k) || ['de', 'ate'].includes(k) ? v : ''])), [filtros, atual]);
  const contexto = [usuario.ong?.nome || '', atual.filtros.includes('periodo') ? `Período: ${descreverPeriodo(f)}` : 'Situação atual'];
  const comum = { titulo: `${atual.titulo} — ${usuario.ong?.nome || 'ONG'}`, contexto, arquivo: `petconnect-ong-${atual.id}` };

  let conteudo = null;
  if (dados) {
    if (atual.id === 'solicitacoes') {
      const linhas = filtrarSolicitacoes(dados.solicitacoes, f);
      const ind = indicadores(linhas);
      conteudo = (
        <>
          <dl className="resumo-relatorio">
            <div><dt>Recebidas</dt><dd>{fmtNumero(ind.total)}</dd></div>
            <div><dt>Abertas</dt><dd>{fmtNumero(ind.abertas)}</dd></div>
            <div><dt>Taxa de aprovação</dt><dd>{fmtPct(ind.taxaAprovacao)}</dd></div>
            <div><dt>Espera média dos abertos</dt><dd>{fmtDias(ind.esperaMedia)}</dd></div>
          </dl>
          <TabelaRelatorio
            {...comum}
            linhas={linhas}
            busca={(s) => [s.id, s.animal?.nome, s.adotanteNome]}
            placeholder="Pesquisar animal, adotante ou nº…"
            ordem={{ id: 'data', valor: (s) => s.criadoEm, desc: true }}
            colunas={[
              { id: 'id', titulo: 'Nº', valor: (s) => s.id, render: (s) => <Link to={`/ong/solicitacoes/${s.id}`}>#{s.id}</Link> },
              { id: 'data', titulo: 'Recebida', valor: (s) => s.criadoEm, render: (s) => formatarData(s.criadoEm) },
              { id: 'animal', titulo: 'Animal', valor: (s) => s.animal?.nome, render: (s) => <strong>{s.animal?.nome}</strong> },
              { id: 'adotante', titulo: 'Adotante', valor: (s) => s.adotanteNome },
              { id: 'score', titulo: 'Score', direita: true, valor: (s) => s.score, render: (s) => (s.score == null ? '—' : `${s.score}%`) },
              { id: 'status', titulo: 'Situação', valor: (s) => STATUS_SOLICITACAO[s.status]?.rotulo, render: (s) => <StatusBadge tipo="solicitacao" status={s.status} /> },
              { id: 'aberto', titulo: 'Dias em aberto', direita: true, valor: (s) => s.diasEmAberto },
            ]}
          />
        </>
      );
    } else if (atual.id === 'adocoes') {
      const linhas = filtrarSolicitacoes(dados.solicitacoes.filter((s) => s.concluidaEm), f, 'concluidaEm');
      const semAcomp = linhas.filter((s) => !s.acompanhamentos.length).length;
      conteudo = (
        <>
          <dl className="resumo-relatorio">
            <div><dt>Adoções concluídas</dt><dd>{fmtNumero(linhas.length)}</dd></div>
            <div><dt>Tempo médio até a adoção</dt><dd>{fmtDias(indicadores(linhas).tempoMedio)}</dd></div>
            <div><dt>Sem acompanhamento</dt><dd>{fmtNumero(semAcomp)}</dd></div>
          </dl>
          {semAcomp > 0 && (
            <p className="alerta alerta--aviso">{semAcomp} {semAcomp === 1 ? 'adoção ainda não tem' : 'adoções ainda não têm'} acompanhamento registrado. <Link to="/ong/acompanhamentos">Registrar agora</Link></p>
          )}
          <TabelaRelatorio
            {...comum}
            linhas={linhas}
            busca={(s) => [s.animal?.nome, s.adotanteNome]}
            placeholder="Pesquisar animal ou adotante…"
            ordem={{ id: 'concluida', valor: (s) => s.concluidaEm, desc: true }}
            colunas={[
              { id: 'concluida', titulo: 'Concluída em', valor: (s) => s.concluidaEm, render: (s) => formatarData(s.concluidaEm) },
              { id: 'animal', titulo: 'Animal', valor: (s) => s.animal?.nome, render: (s) => <strong>{s.animal?.nome}</strong> },
              { id: 'especie', titulo: 'Categoria', valor: (s) => ESPECIES[s.especie] || '—' },
              { id: 'adotante', titulo: 'Adotante', valor: (s) => s.adotanteNome },
              { id: 'dias', titulo: 'Dias até a adoção', direita: true, valor: (s) => s.diasAteAdocao },
              { id: 'acomp', titulo: 'Acompanhamentos', direita: true, valor: (s) => s.acompanhamentos.length },
              { id: 'ultimo', titulo: 'Último contato', valor: (s) => s.acompanhamentos[0]?.data || null, render: (s) => formatarData(s.acompanhamentos[0]?.data) },
            ]}
          />
        </>
      );
    } else {
      const linhas = animaisEmEspera(dados.animais, dados.solicitacoes).filter((a) => (!f.especie || a.especie === f.especie) && (!f.status || a.status === f.status));
      conteudo = (
        <TabelaRelatorio
          {...comum}
          linhas={linhas}
          busca={(a) => [a.nome, a.raca]}
          placeholder="Pesquisar animal ou raça…"
          ordem={{ id: 'dias', valor: (a) => a.diasNaPlataforma, desc: true }}
          colunas={[
            { id: 'animal', titulo: 'Animal', valor: (a) => a.nome, render: (a) => <Link to={`/ong/animais/${a.id}/editar`}><strong>{a.nome}</strong></Link> },
            { id: 'especie', titulo: 'Categoria', valor: (a) => ESPECIES[a.especie] },
            { id: 'status', titulo: 'Situação', valor: (a) => STATUS_ANIMAL[a.status]?.rotulo, render: (a) => <StatusBadge tipo="animal" status={a.status} /> },
            { id: 'dias', titulo: 'Dias na plataforma', direita: true, valor: (a) => a.diasNaPlataforma },
            { id: 'pedidos', titulo: 'Pedidos recebidos', direita: true, valor: (a) => a.pedidos },
          ]}
        />
      );
    }
  }

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="Relatórios da ONG" subtitulo="Acompanhe os pedidos, as adoções e os animais que ainda esperam um lar." />
      <div className="abas abas--linha nao-imprimir">
        {RELATORIOS.map((r) => (
          <button key={r.id} type="button" className={`aba ${r.id === atual.id ? 'is-ativa' : ''}`} onClick={() => setParams({ r: r.id }, { replace: true })}>{r.titulo}</button>
        ))}
      </div>
      <section className="card">
        <h2 className="so-imprimir">{comum.titulo}</h2>
        <p className="so-imprimir">{contexto[1]} · Gerado em {new Date().toLocaleString('pt-BR')}</p>
        <div className="nao-imprimir">
          <FiltrosRelatorio
            filtros={filtros}
            alterar={alterar}
            limpar={limpar}
            campos={atual.filtros}
            status={atual.id === 'espera' ? { disponivel: STATUS_ANIMAL.disponivel, em_processo: STATUS_ANIMAL.em_processo } : STATUS_SOLICITACAO}
          />
        </div>
        <Erro erro={erro} onTentar={recarregar} />
        {carregando && !dados ? <Carregando /> : conteudo}
      </section>
    </div>
  );
}
