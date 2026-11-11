import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from '../components/Modal.jsx';
import Icone from '../components/Icone.jsx';

/**
 * Confirmação no padrão visual do sistema (Sprint 08 — usabilidade).
 * Substitui o window.confirm do navegador, que não explica as consequências,
 * não segue o visual do site e não funciona bem no celular.
 *
 *   const confirmar = useConfirmar();
 *   if (!(await confirmar({ titulo: 'Remover Thor?', mensagem: '...', acao: 'Remover', perigo: true }))) return;
 */
const ConfirmarContext = createContext(null);

export function ConfirmarProvider({ children }) {
  const [pedido, setPedido] = useState(null);
  const resolver = useRef(null);

  const confirmar = useCallback((opcoes) => new Promise((resolve) => {
    resolver.current = resolve;
    setPedido(opcoes);
  }), []);

  const responder = useCallback((sim) => {
    resolver.current?.(sim);
    resolver.current = null;
    setPedido(null);
  }, []);

  return (
    <ConfirmarContext.Provider value={confirmar}>
      {children}
      <Modal
        aberto={!!pedido}
        titulo={pedido?.titulo || 'Confirmar'}
        onFechar={() => responder(false)}
        rodape={pedido && (
          <>
            <button type="button" className="btn btn--fantasma" onClick={() => responder(false)}>{pedido.cancelar || 'Voltar'}</button>
            <button type="button" autoFocus className={`btn ${pedido.perigo ? 'btn--perigo' : 'btn--primario'}`} onClick={() => responder(true)}>
              {pedido.acao || 'Confirmar'}
            </button>
          </>
        )}
      >
        {pedido && (
          <div className="confirmar">
            {pedido.perigo && <span className="confirmar__icone" aria-hidden="true"><Icone nome="alerta" /></span>}
            <div>
              {typeof pedido.mensagem === 'string' ? <p>{pedido.mensagem}</p> : pedido.mensagem}
              {pedido.detalhe && <p className="texto-suave">{pedido.detalhe}</p>}
            </div>
          </div>
        )}
      </Modal>
    </ConfirmarContext.Provider>
  );
}

export function useConfirmar() {
  const ctx = useContext(ConfirmarContext);
  if (!ctx) throw new Error('useConfirmar precisa estar dentro de <ConfirmarProvider>.');
  return ctx;
}
