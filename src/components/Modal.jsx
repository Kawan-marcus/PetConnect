import { useEffect } from 'react';
import Icone from './Icone.jsx';

export default function Modal({ aberto, titulo, onFechar, children, rodape }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => e.key === 'Escape' && onFechar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [aberto, onFechar]);

  if (!aberto) return null;
  return (
    <div className="modal-fundo" onMouseDown={onFechar}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal__topo">
          <h2>{titulo}</h2>
          <button className="btn-icone" onClick={onFechar} aria-label="Fechar">
            <Icone nome="x" />
          </button>
        </header>
        <div className="modal__corpo">{children}</div>
        {rodape && <footer className="modal__rodape">{rodape}</footer>}
      </div>
    </div>
  );
}
