import { rotuloMes, fmtNumero } from '../utils/relatorios.js';

/**
 * Gráficos do dashboard (Sprint 07), em HTML/CSS — sem biblioteca externa.
 * Cada gráfico tem tooltip ao passar o mouse (ou focar com o teclado) e uma
 * versão em tabela ("Ver como tabela") para leitores de tela e impressão.
 */

/** Colunas lado a lado por mês: duas séries (ex.: solicitações recebidas × adoções concluídas). */
export function ColunasMensais({ dados, series }) {
  const max = Math.max(1, ...dados.flatMap((d) => series.map((s) => d[s.chave])));
  const comAno = new Set(dados.map((d) => d.mes.slice(0, 4))).size > 1;
  const descricao = dados.map((d) => `${rotuloMes(d.mes, comAno)}: ${series.map((s) => `${d[s.chave]} ${s.rotulo.toLowerCase()}`).join(', ')}`).join('; ');

  if (!dados.length) return <p className="texto-suave">Sem dados no período.</p>;
  return (
    <div>
      <div className="legenda">
        {series.map((s, i) => <span key={s.chave}><i className={`legenda__cor legenda__cor--s${i + 1}`} /> {s.rotulo}</span>)}
      </div>
      <div className={`grafico-mensal ${dados.length > 8 ? 'grafico-mensal--denso' : ''}`} role="img" aria-label={descricao}>
        {dados.map((d) => (
          <div key={d.mes} className="grafico-mensal__mes" tabIndex={0}>
            <div className="grafico-mensal__barras">
              {series.map((s, i) => (
                <div key={s.chave} className={`grafico-mensal__barra grafico-mensal__barra--s${i + 1}`} style={{ height: `${(d[s.chave] / max) * 100}%` }} />
              ))}
            </div>
            <span className="grafico-mensal__rotulo">{rotuloMes(d.mes, comAno)}</span>
            <span className="tooltip">
              <strong>{rotuloMes(d.mes, true)}</strong>
              {series.map((s) => <span key={s.chave} className="bloco">{s.rotulo}: {d[s.chave]}</span>)}
            </span>
          </div>
        ))}
      </div>
      <details className="tabela-dados">
        <summary>Ver como tabela</summary>
        <table className="tabela tabela--compacta">
          <thead><tr><th>Mês</th>{series.map((s) => <th key={s.chave} className="direita">{s.rotulo}</th>)}</tr></thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.mes}><td>{rotuloMes(d.mes, true)}</td>{series.map((s) => <td key={s.chave} className="direita">{d[s.chave]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/**
 * Barras horizontais de uma série, com o valor escrito ao lado (rótulo direto).
 * itens: [{ rotulo, valor, detalhe? }]
 */
export function BarrasHorizontais({ itens, formato = (v) => fmtNumero(v), max: maxFixo, vazio = 'Sem dados no período.' }) {
  if (!itens.length || itens.every((i) => !i.valor)) return <p className="texto-suave">{vazio}</p>;
  const max = maxFixo ?? Math.max(1, ...itens.map((i) => i.valor || 0));
  return (
    <ul className="barras-h">
      {itens.map((i) => (
        <li key={i.rotulo} className="barras-h__item" tabIndex={0}>
          <span className="barras-h__rotulo">{i.rotulo}</span>
          <span className="barras-h__trilho">
            <span className="barras-h__barra" style={{ width: `${Math.max(i.valor ? 1.5 : 0, ((i.valor || 0) / max) * 100)}%` }} />
          </span>
          <span className="barras-h__valor">{formato(i.valor)}</span>
          {i.detalhe && <span className="tooltip">{i.detalhe}</span>}
        </li>
      ))}
    </ul>
  );
}
