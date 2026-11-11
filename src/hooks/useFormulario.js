import { useEffect, useState } from 'react';

/**
 * Formulário controlado com validação simples.
 *
 *   const f = useFormulario({ email: '' }, (v) => ({ email: !v.email && 'Informe o e-mail' }));
 *   <input {...f.campo('email')} />   {f.erros.email}
 */
export function useFormulario(inicial, validar = () => ({})) {
  const [valores, setValores] = useState(inicial);
  const [erros, setErros] = useState({});
  const [tocado, setTocado] = useState(false);
  // Sprint 08: sabe se o usuário mudou algo, para avisar antes de sair sem salvar.
  const [alterado, setAlterado] = useState(false);

  const limpar = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v));

  const set = (nome, valor) => {
    setAlterado(true);
    setValores((v) => {
      const novo = { ...v, [nome]: valor };
      if (tocado) setErros(limpar(validar(novo)));
      return novo;
    });
  };

  const campo = (nome, tipo = 'text') => {
    if (tipo === 'checkbox') {
      return { name: nome, checked: Boolean(valores[nome]), onChange: (e) => set(nome, e.target.checked) };
    }
    return {
      name: nome,
      value: valores[nome] ?? '',
      onChange: (e) => set(nome, tipo === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value),
      'aria-invalid': erros[nome] ? true : undefined,
    };
  };

  /** Valida e, se estiver tudo certo, chama a função com os valores. */
  const enviar = (fn) => (e) => {
    e?.preventDefault();
    setTocado(true);
    const errosAtuais = limpar(validar(valores));
    setErros(errosAtuais);
    if (Object.keys(errosAtuais).length === 0) return fn(valores);
    const primeiro = document.querySelector(`[name="${Object.keys(errosAtuais)[0]}"]`);
    primeiro?.focus?.();
  };

  return { valores, setValores, set, campo, erros, enviar, alterado, marcarSalvo: () => setAlterado(false) };
}

/**
 * Avisa antes de fechar ou recarregar a aba com alterações não salvas (Sprint 08).
 *   useAvisoSaida(f.alterado);
 */
export function useAvisoSaida(ativo) {
  useEffect(() => {
    if (!ativo) return undefined;
    const aviso = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [ativo]);
}

export const validadores = {
  email: (v) => (!v ? 'Informe o e-mail.' : !/^\S+@\S+\.\S+$/.test(v) ? 'E-mail inválido.' : null),
  obrigatorio: (v, nome = 'Campo') => (v === '' || v == null ? `${nome} é obrigatório.` : null),
  senha: (v) => (!v ? 'Informe a senha.' : v.length < 6 ? 'A senha precisa ter pelo menos 6 caracteres.' : null),
};
