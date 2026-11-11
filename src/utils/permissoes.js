/**
 * Controle de permissões do front (Sprint 08).
 *
 * Um único lugar diz o que cada perfil pode fazer. As telas usam pode() para
 * mostrar, esconder ou desabilitar botões e explicar o motivo; as rotas usam
 * RotaProtegida. Quem garante a regra de verdade é o backend (403/409) e o banco
 * (triggers do script 10) — o front só evita que o usuário tente algo proibido.
 */

export const PERFIS_SISTEMA = ['visitante', 'adotante', 'ong', 'admin'];

/**
 * acao → { rotulo, grupo, perfis, condicao?, regra? }
 * condicao(usuario, ctx) devolve uma mensagem quando a ação está BLOQUEADA naquele caso.
 */
export const ACOES = {
  'animal.ver': { rotulo: 'Ver animais disponíveis', grupo: 'Adoção', perfis: ['visitante', 'adotante', 'ong', 'admin'] },
  'favorito.usar': { rotulo: 'Favoritar animais', grupo: 'Adoção', perfis: ['adotante'] },
  'formulario.preencher': { rotulo: 'Preencher o formulário de avaliação', grupo: 'Adoção', perfis: ['adotante'] },
  'solicitacao.criar': {
    rotulo: 'Pedir adoção', grupo: 'Adoção', perfis: ['adotante'], regra: 'RN01, RN03, RN05',
    observacao: 'com formulário preenchido; um pedido ativo por animal',
    condicao: (u, ctx = {}) => {
      if (ctx.animal?.status === 'adotado') return 'Este animal já foi adotado.';
      if (ctx.semFormulario) return 'Preencha o formulário de avaliação antes de pedir adoção.';
      if (ctx.jaPediu) return 'Você já tem uma solicitação ativa para este animal.';
      return null;
    },
  },
  'solicitacao.cancelar': {
    rotulo: 'Cancelar a própria solicitação', grupo: 'Adoção', perfis: ['adotante'], observacao: 'enquanto pendente ou em análise',
    condicao: (u, ctx = {}) => (ctx.solicitacao && !['pendente', 'em_analise'].includes(ctx.solicitacao.status) ? 'Depois de aprovada ou finalizada, a solicitação não pode ser cancelada.' : null),
  },
  'animal.cadastrar': {
    rotulo: 'Cadastrar animais', grupo: 'ONG', perfis: ['ong'], regra: 'RN04', observacao: 'só ONG aprovada',
    condicao: (u) => (u?.ong && u.ong.status !== 'aprovada' ? 'Sua ONG ainda não foi aprovada pelo administrador.' : null),
  },
  'animal.editar': {
    rotulo: 'Editar os próprios animais', grupo: 'ONG', perfis: ['ong'], observacao: 'só os animais da própria ONG',
    condicao: (u, ctx = {}) => (ctx.animal && ctx.animal.ongId != null && u?.ongId != null && ctx.animal.ongId !== u.ongId ? 'Este animal pertence a outra ONG.' : null),
  },
  'animal.status': {
    rotulo: 'Mudar a situação do animal', grupo: 'ONG', perfis: ['ong'], regra: 'RN06', observacao: '"adotado" só pela conclusão da adoção',
  },
  'solicitacao.decidir': { rotulo: 'Analisar, aprovar e recusar pedidos', grupo: 'ONG', perfis: ['ong'], regra: 'RN02, RN07', observacao: 'só pedidos dos próprios animais' },
  'acompanhamento.registrar': { rotulo: 'Registrar acompanhamento pós-adoção', grupo: 'ONG', perfis: ['ong'], observacao: 'só adoções concluídas' },
  'animal.excluir': {
    rotulo: 'Excluir anúncio de animal', grupo: 'ONG', perfis: ['ong', 'admin'], regra: 'RN08', observacao: 'sem pedido em aberto',
    condicao: (u, ctx = {}) => (ctx.pedidosAbertos ? 'Há solicitações em andamento para este animal. Finalize-as antes de remover.' : null),
  },
  'relatorio.ong': { rotulo: 'Relatórios da própria ONG', grupo: 'Relatórios', perfis: ['ong'] },
  'relatorio.geral': { rotulo: 'Dashboard e relatórios de toda a plataforma', grupo: 'Relatórios', perfis: ['admin'] },
  'pesquisa.geral': { rotulo: 'Pesquisa geral (pessoas, ONGs, pedidos)', grupo: 'Relatórios', perfis: ['admin'] },
  'log.ver': { rotulo: 'Histórico de operações (logs)', grupo: 'Administração', perfis: ['admin'], observacao: 'somente leitura' },
  'ong.moderar': { rotulo: 'Aprovar ou suspender ONGs', grupo: 'Administração', perfis: ['admin'] },
  'usuario.ativar': {
    rotulo: 'Ativar e desativar contas', grupo: 'Administração', perfis: ['admin'], observacao: 'exceto a própria conta',
    condicao: (u, ctx = {}) => (ctx.alvo && ctx.alvo.id === u?.id ? 'Você não pode desativar a sua própria conta.' : null),
  },
};

/** Perfil "efetivo": visitante quando não há ninguém logado. */
export const perfilDe = (usuario) => usuario?.perfil || 'visitante';

/**
 * Pode fazer? → { permitido: boolean, motivo: string | null }
 *   const { permitido, motivo } = pode(usuario, 'animal.cadastrar');
 */
export function pode(usuario, acao, ctx) {
  const regra = ACOES[acao];
  if (!regra) return { permitido: false, motivo: 'Ação desconhecida.' };
  if (!regra.perfis.includes(perfilDe(usuario))) {
    return { permitido: false, motivo: usuario ? 'Seu perfil não tem acesso a esta função.' : 'Entre na sua conta para continuar.' };
  }
  if (usuario && usuario.ativo === false) return { permitido: false, motivo: 'Sua conta está desativada.' };
  const bloqueio = regra.condicao?.(usuario, ctx);
  return bloqueio ? { permitido: false, motivo: bloqueio } : { permitido: true, motivo: null };
}

/** Ações liberadas para um perfil (usado em "O que você pode fazer" no perfil). */
export function acoesDoPerfil(perfil) {
  return Object.entries(ACOES).filter(([, r]) => r.perfis.includes(perfil)).map(([id, r]) => ({ id, ...r }));
}

/** Páginas por perfil (as mesmas proteções do App.jsx), para a tela de permissões. */
export const ROTAS_POR_PERFIL = [
  { rota: '/, /animais, /animais/:id, /como-funciona', descricao: 'Páginas públicas', perfis: ['visitante', 'adotante', 'ong', 'admin'] },
  { rota: '/perfil', descricao: 'Meu perfil', perfis: ['adotante', 'ong', 'admin'] },
  { rota: '/minha-area, /recomendados, /favoritos, /formulario, /minhas-solicitacoes, /comparar', descricao: 'Área do adotante', perfis: ['adotante'] },
  { rota: '/ong, /ong/animais, /ong/solicitacoes, /ong/acompanhamentos, /ong/relatorios', descricao: 'Área da ONG', perfis: ['ong'] },
  { rota: '/admin, /admin/relatorios, /admin/pesquisa, /admin/operacoes, /admin/permissoes, …', descricao: 'Administração', perfis: ['admin'] },
];
