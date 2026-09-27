import Icone from './Icone.jsx';

export default function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="carregando" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function Vazio({ titulo, texto, acao }) {
  return (
    <div className="vazio">
      <div className="vazio__icone" aria-hidden="true">🐾</div>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {acao}
    </div>
  );
}

export function Erro({ erro, onTentar }) {
  if (!erro) return null;
  return (
    <div className="alerta alerta--erro" role="alert">
      <Icone nome="alerta" />
      <span>{erro.message || String(erro)}</span>
      {onTentar && (
        <button className="btn btn--link" onClick={onTentar}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function SkeletonCards({ n = 6 }) {
  return (
    <div className="grade-animais">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card-animal skeleton" aria-hidden="true">
          <div className="skeleton__img" />
          <div className="skeleton__linha" />
          <div className="skeleton__linha skeleton__linha--curta" />
        </div>
      ))}
    </div>
  );
}
