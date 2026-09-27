import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Executa uma função assíncrona (chamada à API) e controla carregando/erro/dados.
 *
 *   const { dados, carregando, erro, recarregar } = useAsync(() => listarAnimais(filtros), [filtros]);
 */
export function useAsync(fn, deps = []) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });
  const chamada = useRef(0);

  const executar = useCallback(async () => {
    const id = ++chamada.current;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));
    try {
      const dados = await fn();
      if (id === chamada.current) setEstado({ dados, carregando: false, erro: null });
    } catch (erro) {
      if (id === chamada.current) setEstado({ dados: null, carregando: false, erro });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    executar();
  }, [executar]);

  const setDados = useCallback((atualizar) => {
    setEstado((e) => ({ ...e, dados: typeof atualizar === 'function' ? atualizar(e.dados) : atualizar }));
  }, []);

  return { ...estado, recarregar: executar, setDados };
}

/** Para ações (botões): controla o "enviando" e devolve o erro. */
export function useAcao() {
  const [enviando, setEnviando] = useState(false);
  const executar = useCallback(async (fn) => {
    setEnviando(true);
    try {
      return await fn();
    } finally {
      setEnviando(false);
    }
  }, []);
  return [enviando, executar];
}
