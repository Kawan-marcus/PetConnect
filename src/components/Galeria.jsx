import { useState } from 'react';

export default function Galeria({ fotos = [], nome }) {
  const [atual, setAtual] = useState(0);
  if (!fotos.length) return <div className="galeria galeria--vazia">Sem fotos</div>;
  return (
    <div className="galeria">
      <img className="galeria__principal" src={fotos[atual]} alt={`${nome} — foto ${atual + 1}`} />
      {fotos.length > 1 && (
        <div className="galeria__miniaturas">
          {fotos.map((f, i) => (
            <button
              key={i}
              type="button"
              className={i === atual ? 'is-ativa' : ''}
              onClick={() => setAtual(i)}
              aria-label={`Ver foto ${i + 1}`}
            >
              <img src={f} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
