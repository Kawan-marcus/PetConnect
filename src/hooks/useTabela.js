import { useEffect, useMemo, useRef, useState } from 'react';
import { contem } from '../utils/relatorios.js';

/**
 * Filtros que ficam guardados no navegador (Sprint 08 — usabilidade):
 * ao voltar para a tela, o usuário encontra os mesmos filtros que deixou.
 * Se o navegador bloquear o armazenamento, funciona normalmente sem guardar.
 */
export function useFiltrosSalvos(chave, inicial) {
  const nome = `petconnect.filtros.${chave}`;
  const [filtros, setFiltros] = useState(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(nome) || 'null');
      return salvo ? { ...inicial, ...salvo } : inicial;
    } catch {
      return inicial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(nome, JSON.stringify(filtros)); } catch { /* sem armazenamento */ }
  }, [nome, filtros]);
  const alterar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));
  const limpar = () => setFiltros(inicial);
  return [filtros, alterar, limpar, setFiltros];
}

/** Atalho "/" para ir direto ao campo de pesquisa (como no GitHub e no YouTube). */
export function useAtalhoBusca() {
  const ref = useRef(null);
  useEffect(() => {
    const tecla = (e) => {
      const alvo = e.target;
      const digitando = alvo instanceof HTMLElement && (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName));
      if (e.key === '/' && !digitando && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select?.();
      }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, []);
  return ref;
}

/** Valor com atraso: espera o usuário parar de digitar antes de filtrar. */
export function useAtrasado(valor, ms = 250) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

/**
 * Pesquisa + ordenação por coluna + paginação de uma lista já carregada.
 *   const t = useTabela(linhas, { campos: (l) => [l.nome, l.email], ordem: { campo: 'data', desc: true } });
 */
export function useTabela(linhas, { campos, ordem: ordemInicial = null, porPagina = 20 } = {}) {
  const [busca, setBusca] = useState('');
  const termo = useAtrasado(busca);
  const [ordem, setOrdem] = useState(ordemInicial);
  const [pagina, setPagina] = useState(1);

  const filtradas = useMemo(() => {
    let r = linhas || [];
    if (termo && campos) r = r.filter((l) => contem(campos(l).join(' '), termo));
    if (ordem?.valor) {
      const fator = ordem.desc ? -1 : 1;
      r = [...r].sort((a, b) => {
        const x = ordem.valor(a);
        const y = ordem.valor(b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (typeof x === 'string' ? x.localeCompare(y, 'pt-BR') : x - y) * fator;
      });
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas, termo, ordem]);

  useEffect(() => setPagina(1), [termo, linhas]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const atual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((atual - 1) * porPagina, atual * porPagina);

  const ordenarPor = (id, valor) => setOrdem((o) => (o?.id === id ? { ...o, desc: !o.desc } : { id, valor, desc: false }));

  return { busca, setBusca, termo, filtradas, visiveis, pagina: atual, totalPaginas, setPagina, ordem, ordenarPor, porPagina };
}
