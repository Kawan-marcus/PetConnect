import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import Icone from '../../components/Icone.jsx';
import FiltrosRelatorio from '../../components/Filtros.jsx';
import { ColunasMensais, BarrasHorizontais } from '../../components/Graficos.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import { Metrica } from '../ong/OngPainel.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useFiltrosSalvos } from '../../hooks/useTabela.js';
import { estatisticas } from '../../api/admin.js';
import { desempenho } from '../../api/ia.js';
import { dadosAdmin } from '../../api/relatorios.js';
import { STATUS_SOLICITACAO, tempoRelativo } from '../../utils/format.js';
import {
  filtrarSolicitacoes, indicadores, seriePorMes, porStatus, funil, desempenhoPorOng, porFaixa,
  descreverPeriodo, fmtPct, fmtDias, fmtNumero, ABERTAS,
} from '../../utils/relatorios.js';

/** Comparativo sequencial × OpenCL. Cada tarefa tem sua própria escala (tempos muito diferentes entre tarefas). */
function ComparativoDesempenho({ dados }) {
  if (!dados.medicoes?.length) {
    return (
      <div className="alerta alerta--info">
        <Icone nome="relogio" />
        <span>Nenhuma medição registrada ainda. Quando o módulo de processamento rodar o comparativo, os tempos aparecem aqui automaticamente.</span>
      </div>
    );
  }
  const ganhoDe = (m) => (m.openclMs > 0 ? m.sequencialMs / m.openclMs : null);
  return (
    <div className="comparativo">
      <div className="legenda">
        <span><i className="legenda__cor legenda__cor--cpu" /> Python sequencial (CPU)</span>
        <span><i className="legenda__cor legenda__cor--gpu" /> OpenCL (paralelo)</span>
      </div>
      {dados.medicoes.map((m) => {
        const ganho = ganhoDe(m);
        return (
          <div key={m.tarefa} className="comparativo__tarefa">
            <div className="comparativo__topo">
              <span>{m.tarefa}</span>
              <strong className="comparativo__ganho">
                {ganho == null ? '—' : ganho >= 1 ? `${ganho.toFixed(1).replace('.', ',')}× mais rápido` : `${(1 / ganho).toFixed(1).replace('.', ',')}× mais lento`}
              </strong>
            </div>
            <div className="comparativo__linha" title={`Sequencial: ${m.sequencialMs} ms`}>
              <div className="comparativo__barra comparativo__barra--cpu" style={{ width: '100%' }} />
              <span className="comparativo__valor">{m.sequencialMs.toLocaleString('pt-BR')} ms</span>
            </div>
            <div className="comparativo__linha" title={`OpenCL: ${m.openclMs} ms`}>
              <div className="comparativo__barra comparativo__barra--gpu" style={{ width: `${Math.min(100, Math.max(1.5, (m.openclMs / (m.sequencialMs || 1)) * 100))}%` }} />
              <span className="comparativo__valor">{m.openclMs.toLocaleString('pt-BR')} ms</span>
            </div>
          </div>
        );
      })}
      <details className="tabela-dados">
        <summary>Ver como tabela</summary>
        <table className="tabela">
          <thead><tr><th>Tarefa</th><th className="direita">Sequencial (ms)</th><th className="direita">OpenCL (ms)</th><th className="direita">Ganho</th></tr></thead>
          <tbody>
            {dados.medicoes.map((m) => (
              <tr key={m.tarefa}>
                <td>{m.tarefa}</td>
                <td className="direita">{m.sequencialMs}</td>
                <td className="direita">{m.openclMs}</td>
                <td className="direita">{ganhoDe(m) == null ? '—' : `${ganhoDe(m).toFixed(1)}×`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export const FILTRO_PADRAO = { periodo: '180', de: '', ate: '', ong: '', especie: '' };

/**
 * Dashboard do administrador (Sprint 07): indicadores, gráficos e tabelas calculados com os
 * dados reais da plataforma, com filtros de período, ONG e categoria (espécie).
 */
export default function AdminDashboard() {
  const [filtros, alterar, limpar] = useFiltrosSalvos('dashboard', FILTRO_PADRAO);
  const { dados, carregando, erro, recarregar } = useAsync(async () => {
    const [base, est, perf] = await Promise.all([dadosAdmin(), estatisticas(), desempenho().catch(() => null)]);
    return { ...base, est, perf };
  }, []);

  const calc = useMemo(() => {
    if (!dados) return null;
    const linhas = filtrarSolicitacoes(dados.solicitacoes, filtros);
    const adotadasNoPeriodo = filtrarSolicitacoes(dados.solicitacoes.filter((s) => s.concluidaEm), filtros, 'concluidaEm');
    const ongsAprovadas = dados.ongs.filter((o) => o.status === 'aprovada');
    const ranking = desempenhoPorOng(linhas, ongsAprovadas, dados.animais)
      .filter((o) => !filtros.ong || String(o.id) === String(filtros.ong))
      .sort((a, b) => b.solicitacoes - a.solicitacoes);
    return {
      ind: indicadores(linhas),
      adocoes: adotadasNoPeriodo.length,
      tempoAdocao: indicadores(adotadasNoPeriodo).tempoMedio,
      serie: seriePorMes(dados.solicitacoes, filtros),
      status: porStatus(linhas, STATUS_SOLICITACAO),
      funil: funil(linhas),
      ranking,
      faixas: porFaixa(linhas),
      atrasadas: linhas.filter((s) => ABERTAS.includes(s.status)).sort((a, b) => b.diasEmAberto - a.diasEmAberto).slice(0, 5),
      ongsAprovadas,
    };
  }, [dados, filtros]);

  if (carregando && !dados) return <Carregando />;
  if (erro) return <div className="container pagina"><Erro erro={erro} onTentar={recarregar} /></div>;
  const { est, perf } = dados;
  const t = est.totais;
  const { ind } = calc;

  return (
    <div className="container pagina">
      <CabecalhoPagina
        titulo="Dashboard"
        subtitulo={`Visão geral da plataforma · ${descreverPeriodo(filtros)}`}
        acoes={(
          <>
            <Link to="/admin/pesquisa" className="btn btn--fantasma"><Icone nome="busca" tamanho={18} /> Pesquisar</Link>
            <Link to="/admin/relatorios" className="btn btn--primario"><Icone nome="grafico" tamanho={18} /> Relatórios</Link>
          </>
        )}
      />

      {t.ongsPendentes > 0 && (
        <Link to="/admin/ongs" className="alerta alerta--aviso alerta--link">
          <Icone nome="predio" />
          <span><strong>{t.ongsPendentes}</strong> {t.ongsPendentes === 1 ? 'ONG aguarda' : 'ONGs aguardam'} aprovação.</span>
          <Icone nome="seta" tamanho={16} />
        </Link>
      )}

      <FiltrosRelatorio filtros={filtros} alterar={alterar} limpar={limpar} campos={['periodo', 'ong', 'especie']} ongs={calc.ongsAprovadas} />

      <p className="eyebrow eyebrow--neutro">Situação agora</p>
      <div className="metricas">
        <Metrica rotulo="Animais disponíveis" valor={t.animaisDisponiveis} detalhe={`${t.emProcesso} em processo de adoção`} />
        <Metrica rotulo="Solicitações abertas" valor={t.solicitacoesAbertas} tom="amarelo" detalhe="pendentes ou em análise" />
        <Metrica rotulo="Adotantes" valor={t.adotantes} detalhe={`${t.ongsAprovadas} ONGs aprovadas`} />
        <Metrica rotulo="Animais adotados" valor={t.adotados} tom="verde" detalhe="desde o início" />
      </div>

      <p className="eyebrow eyebrow--neutro">No período selecionado</p>
      <div className="metricas">
        <Metrica rotulo="Solicitações recebidas" valor={fmtNumero(ind.total)} tom="primaria" detalhe={`${ind.abertas} ainda abertas`} />
        <Metrica rotulo="Adoções concluídas" valor={fmtNumero(calc.adocoes)} tom="verde" detalhe={`tempo médio: ${fmtDias(calc.tempoAdocao)}`} />
        <Metrica rotulo="Taxa de aprovação" valor={fmtPct(ind.taxaAprovacao)} detalhe={`${ind.aprovadas} aprovadas · ${ind.recusadas} recusadas`} />
        <Metrica rotulo="Compatibilidade média" valor={ind.scoreMedio != null ? `${fmtNumero(ind.scoreMedio)}%` : '—'} detalhe="score dos pedidos" />
      </div>

      <section className="card">
        <div className="secao__topo">
          <div>
            <h2>Solicitações e adoções por mês</h2>
            <p className="texto-suave">Pedidos recebidos no mês e adoções concluídas no mês.</p>
          </div>
        </div>
        <ColunasMensais dados={calc.serie} series={[{ chave: 'recebidas', rotulo: 'Solicitações recebidas' }, { chave: 'concluidas', rotulo: 'Adoções concluídas' }]} />
      </section>

      <div className="grade-2 grade-2--justa">
        <section className="card">
          <h2>Funil de adoção</h2>
          <p className="texto-suave">Quantas solicitações do período chegaram a cada etapa.</p>
          <BarrasHorizontais
            itens={calc.funil.map((f, i) => ({ ...f, detalhe: i ? `${fmtPct(Math.round((f.valor / (calc.funil[0].valor || 1)) * 1000) / 10)} das recebidas` : undefined }))}
          />
        </section>
        <section className="card">
          <h2>Situação das solicitações</h2>
          <p className="texto-suave">Status atual dos pedidos do período.</p>
          <BarrasHorizontais itens={calc.status.map((s) => ({ rotulo: s.rotulo, valor: s.valor }))} />
        </section>
      </div>

      <div className="grade-2 grade-2--justa">
        <section className="card">
          <div className="secao__topo">
            <h2>Desempenho por ONG</h2>
            <Link to="/admin/relatorios?r=ongs" className="btn btn--link">Relatório completo <Icone nome="seta" tamanho={16} /></Link>
          </div>
          <div className="tabela-wrap tabela-wrap--sem-borda">
            <table className="tabela tabela--compacta">
              <thead><tr><th>ONG</th><th className="direita">Pedidos</th><th className="direita">Adoções</th><th className="direita">Aprovação</th></tr></thead>
              <tbody>
                {calc.ranking.map((o) => (
                  <tr key={o.id}><td>{o.ong}</td><td className="direita">{o.solicitacoes}</td><td className="direita">{o.concluidas}</td><td className="direita">{fmtPct(o.taxaAprovacao)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <div className="secao__topo">
            <h2>A compatibilidade ajuda?</h2>
            <Link to="/admin/relatorios?r=compatibilidade" className="btn btn--link">Detalhes <Icone nome="seta" tamanho={16} /></Link>
          </div>
          <p className="texto-suave">Taxa de aprovação dos pedidos em cada faixa de score.</p>
          <BarrasHorizontais
            max={100}
            formato={fmtPct}
            itens={calc.faixas.map((f) => ({ rotulo: f.rotulo, valor: f.taxaAprovacao ?? 0, detalhe: `${f.solicitacoes} pedidos · ${f.aprovadas} aprovados · ${f.recusadas} recusados` }))}
          />
        </section>
      </div>

      <section className="card">
        <div className="secao__topo">
          <div>
            <h2>Pedidos esperando há mais tempo</h2>
            <p className="texto-suave">Solicitações abertas do período, da mais antiga para a mais nova.</p>
          </div>
          <Link to="/admin/historico" className="btn btn--link">Ver histórico <Icone nome="seta" tamanho={16} /></Link>
        </div>
        {calc.atrasadas.length === 0 ? <p className="texto-suave">Nenhuma solicitação aberta no período. 🎉</p> : (
          <div className="tabela-wrap tabela-wrap--sem-borda">
            <table className="tabela tabela--compacta">
              <thead><tr><th>#</th><th>Animal</th><th>Adotante</th><th>ONG</th><th>Aberta</th><th>Status</th></tr></thead>
              <tbody>
                {calc.atrasadas.map((s) => (
                  <tr key={s.id}>
                    <td className="texto-suave">{s.id}</td><td><strong>{s.animal?.nome}</strong></td><td>{s.adotanteNome}</td><td>{s.ongNome}</td>
                    <td className="texto-suave">{tempoRelativo(s.criadoEm)}</td><td><StatusBadge tipo="solicitacao" status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {perf && (
        <section className="card">
          <div className="secao__topo">
            <div>
              <p className="eyebrow"><Icone nome="raio" tamanho={14} /> Processamento paralelo</p>
              <h2>Desempenho: sequencial × OpenCL</h2>
              <p className="texto-suave">{perf.dispositivo}</p>
            </div>
          </div>
          {perf.exemplo && (
            <p className="alerta alerta--info">Valores de exemplo. Com o backend ligado, este painel mostra as medições reais do endpoint <code>/admin/desempenho</code>.</p>
          )}
          <ComparativoDesempenho dados={perf} />
        </section>
      )}
    </div>
  );
}
