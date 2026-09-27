import Icone from './Icone.jsx';
import { nivelScore } from '../utils/format.js';

/** Anel com o score (0–100). */
export function AnelScore({ score, tamanho = 112 }) {
  const nivel = nivelScore(score);
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className={`anel-score score--${nivel.tom} ${tamanho < 100 ? 'anel-score--pequeno' : ''}`} style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="anel-score__trilho" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className="anel-score__valor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="anel-score__texto">
        <strong>{score}%</strong>
        <span>compatível</span>
      </div>
    </div>
  );
}

/**
 * Resultado completo do modelo: score + fatores que explicam a nota.
 * Mostrar os fatores deixa claro que a IA apoia a decisão da ONG (RF21), não decide sozinha.
 */
export default function ScoreCompatibilidade({ resultado, titulo = 'Compatibilidade calculada pela IA', compacto = false }) {
  if (!resultado) return null;
  const nivel = nivelScore(resultado.score);
  return (
    <section className={`score-box ${compacto ? 'score-box--compacto' : ''}`}>
      <header className="score-box__topo">
        <AnelScore score={resultado.score} tamanho={compacto ? 88 : 112} />
        <div>
          <p className="eyebrow">
            <Icone nome="ia" tamanho={14} /> {titulo}
          </p>
          <h3>{nivel.rotulo}</h3>
          <p className="texto-suave">O índice combina os fatores abaixo. Ele apoia a análise, mas a decisão final é sempre da ONG.</p>
        </div>
      </header>
      <ul className="fatores">
        {resultado.fatores.map((f) => {
          const pct = Math.round(f.valor * 100);
          const tom = pct >= 75 ? 'verde' : pct >= 45 ? 'amarelo' : 'vermelho';
          return (
            <li key={f.chave} className="fator">
              <div className="fator__topo">
                <span>{f.nome}</span>
                <span className="texto-suave">peso {Math.round(f.peso * 100)}%</span>
              </div>
              <div className="barra" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={f.nome}>
                <div className={`barra__valor barra--${tom}`} style={{ width: `${pct}%` }} />
              </div>
              {!compacto && <p className="fator__desc">{f.descricao}</p>}
            </li>
          );
        })}
      </ul>
      {resultado.modelo && <p className="rodape-modelo">Modelo: {resultado.modelo}</p>}
    </section>
  );
}
