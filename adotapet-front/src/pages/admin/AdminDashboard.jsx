import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import Icone from '../../components/Icone.jsx';
import { Metrica } from '../ong/OngPainel.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { estatisticas } from '../../api/admin.js';
import { desempenho } from '../../api/ia.js';

/** Gráfico de colunas simples (uma série). Passe o mouse para ver o valor exato. */
function GraficoColunas({ dados }) {
  const max = Math.max(1, ...dados.map((d) => d.adocoes));
  return (
    <div className="grafico-colunas" role="img" aria-label={`Adoções por mês: ${dados.map((d) => `${d.mes} ${d.adocoes}`).join(', ')}`}>
      {dados.map((d) => (
        <div key={d.mes} className="grafico-colunas__item" tabIndex={0}>
          <span className="grafico-colunas__valor">{d.adocoes}</span>
          <div className="grafico-colunas__trilho">
            <div className="grafico-colunas__barra" style={{ height: `${(d.adocoes / max) * 100}%` }} />
          </div>
          <span className="grafico-colunas__rotulo">{d.mes}</span>
          <span className="tooltip">{d.adocoes} {d.adocoes === 1 ? 'adoção' : 'adoções'} em {d.mes}</span>
        </div>
      ))}
    </div>
  );
}

/** Comparativo sequencial × OpenCL. Cada tarefa tem sua própria escala (tempos muito diferentes entre tarefas). */
function ComparativoDesempenho({ dados }) {
  return (
    <div className="comparativo">
      <div className="legenda">
        <span><i className="legenda__cor legenda__cor--cpu" /> Python sequencial (CPU)</span>
        <span><i className="legenda__cor legenda__cor--gpu" /> OpenCL (paralelo)</span>
      </div>
      {dados.medicoes.map((m) => {
        const ganho = m.sequencialMs / m.openclMs;
        return (
          <div key={m.tarefa} className="comparativo__tarefa">
            <div className="comparativo__topo">
              <span>{m.tarefa}</span>
              <strong className="comparativo__ganho">{ganho.toFixed(1).replace('.', ',')}× mais rápido</strong>
            </div>
            <div className="comparativo__linha" title={`Sequencial: ${m.sequencialMs} ms`}>
              <div className="comparativo__barra comparativo__barra--cpu" style={{ width: '100%' }} />
              <span className="comparativo__valor">{m.sequencialMs.toLocaleString('pt-BR')} ms</span>
            </div>
            <div className="comparativo__linha" title={`OpenCL: ${m.openclMs} ms`}>
              <div className="comparativo__barra comparativo__barra--gpu" style={{ width: `${Math.max(1.5, (m.openclMs / m.sequencialMs) * 100)}%` }} />
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
                <td className="direita">{(m.sequencialMs / m.openclMs).toFixed(1)}×</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export default function AdminDashboard() {
  const { dados, carregando, erro, recarregar } = useAsync(async () => {
    const [est, perf] = await Promise.all([estatisticas(), desempenho()]);
    return { est, perf };
  }, []);

  if (carregando) return <Carregando />;
  if (erro) return <div className="container pagina"><Erro erro={erro} onTentar={recarregar} /></div>;
  const { est, perf } = dados;
  const t = est.totais;

  return (
    <div className="container pagina">
      <CabecalhoPagina titulo="Dashboard" subtitulo="Visão geral da plataforma." />

      {t.ongsPendentes > 0 && (
        <Link to="/admin/ongs" className="alerta alerta--aviso alerta--link">
          <Icone nome="predio" />
          <span><strong>{t.ongsPendentes}</strong> {t.ongsPendentes === 1 ? 'ONG aguarda' : 'ONGs aguardam'} aprovação.</span>
          <Icone nome="seta" tamanho={16} />
        </Link>
      )}

      <div className="metricas">
        <Metrica rotulo="Animais disponíveis" valor={t.animaisDisponiveis} />
        <Metrica rotulo="Adotados" valor={t.adotados} tom="verde" detalhe={`${t.emProcesso} em processo`} />
        <Metrica rotulo="Solicitações abertas" valor={t.solicitacoesAbertas} tom="amarelo" />
        <Metrica rotulo="Tempo médio até a adoção" valor={est.tempoMedioAdocaoDias != null ? `${est.tempoMedioAdocaoDias} dias` : '—'} detalhe={`${t.adotantes} adotantes · ${t.ongsAprovadas} ONGs`} />
      </div>

      <div className="grade-2 grade-2--dashboard">
        <section className="card">
          <h2>Adoções por mês</h2>
          <p className="texto-suave">Últimos 6 meses</p>
          <GraficoColunas dados={est.adocoesPorMes} />
        </section>

        <section className="card">
          <h2>Por ONG</h2>
          <table className="tabela tabela--compacta">
            <thead><tr><th>ONG</th><th className="direita">Animais</th><th className="direita">Adoções</th></tr></thead>
            <tbody>
              {est.porOng.map((o) => (
                <tr key={o.ong}><td>{o.ong}</td><td className="direita">{o.animais}</td><td className="direita">{o.adocoes}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card">
        <div className="secao__topo">
          <div>
            <p className="eyebrow"><Icone nome="raio" tamanho={14} /> Processamento paralelo</p>
            <h2>Desempenho: sequencial × OpenCL</h2>
            <p className="texto-suave">{perf.dispositivo}</p>
          </div>
        </div>
        {perf.exemplo && (
          <p className="alerta alerta--info">Valores de exemplo. Quando o backend estiver pronto, este painel mostra as medições reais do endpoint <code>/admin/desempenho</code>.</p>
        )}
        <ComparativoDesempenho dados={perf} />
      </section>
    </div>
  );
}
