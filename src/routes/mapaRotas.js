import { rotaInicial } from '../context/AuthContext.jsx';

/**
 * Mapa de navegação do sistema (Sprint 06).
 * Cada rota tem um rótulo e uma rota "pai". Com isso o front monta sozinho:
 *  - a trilha de navegação (breadcrumb): Minha área › Adotar › Thor
 *  - o título da aba do navegador: "Thor · PetConnect"
 *
 * pai = 'inicio' significa "a página inicial de quem está logado"
 * (Minha área para o adotante, Painel para a ONG, Dashboard para o admin, Início para visitantes).
 */
const ROTAS = [
  { padrao: '/', rotulo: 'Início' },
  { padrao: '/como-funciona', rotulo: 'Como funciona', pai: '/' },
  { padrao: '/login', rotulo: 'Entrar', pai: '/' },
  { padrao: '/cadastro', rotulo: 'Criar conta', pai: '/' },
  { padrao: '/recuperar-senha', rotulo: 'Recuperar senha', pai: '/login' },
  { padrao: '/redefinir-senha', rotulo: 'Nova senha', pai: '/login' },
  { padrao: '/acesso-restrito', rotulo: 'Acesso restrito', pai: 'inicio' },

  { padrao: '/animais', rotulo: 'Adotar', pai: 'inicio' },
  { padrao: '/animais/:id', rotulo: 'Detalhes do animal', pai: '/animais' },
  { padrao: '/perfil', rotulo: 'Meu perfil', pai: 'inicio' },

  // Adotante
  { padrao: '/minha-area', rotulo: 'Minha área' },
  { padrao: '/recomendados', rotulo: 'Recomendados', pai: '/minha-area' },
  { padrao: '/comparar', rotulo: 'Comparar compatibilidade', pai: '/minha-area' },
  { padrao: '/favoritos', rotulo: 'Favoritos', pai: '/minha-area' },
  { padrao: '/formulario', rotulo: 'Formulário de avaliação', pai: '/minha-area' },
  { padrao: '/minhas-solicitacoes', rotulo: 'Minhas solicitações', pai: '/minha-area' },

  // ONG
  { padrao: '/ong', rotulo: 'Painel da ONG' },
  { padrao: '/ong/animais', rotulo: 'Meus animais', pai: '/ong' },
  { padrao: '/ong/animais/novo', rotulo: 'Cadastrar animal', pai: '/ong/animais' },
  { padrao: '/ong/animais/:id/editar', rotulo: 'Editar animal', pai: '/ong/animais' },
  { padrao: '/ong/solicitacoes', rotulo: 'Solicitações', pai: '/ong' },
  { padrao: '/ong/solicitacoes/:id', rotulo: 'Análise da solicitação', pai: '/ong/solicitacoes' },
  { padrao: '/ong/acompanhamentos', rotulo: 'Pós-adoção', pai: '/ong' },

  // Administrador
  { padrao: '/admin', rotulo: 'Dashboard' },
  { padrao: '/admin/ongs', rotulo: 'ONGs', pai: '/admin' },
  { padrao: '/admin/usuarios', rotulo: 'Usuários', pai: '/admin' },
  { padrao: '/admin/animais', rotulo: 'Animais', pai: '/admin' },
  { padrao: '/admin/historico', rotulo: 'Histórico', pai: '/admin' },
];

/** Páginas que não mostram a trilha (telas de entrada, sem hierarquia). */
const SEM_TRILHA = ['/', '/login', '/cadastro', '/recuperar-senha', '/redefinir-senha'];

function casa(padrao, caminho) {
  const a = padrao.split('/').filter(Boolean);
  const b = caminho.split('/').filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((parte, i) => parte.startsWith(':') || parte === b[i]);
}

/** Encontra a rota do mapa para um caminho real (ex.: /animais/8 → /animais/:id). */
export function acharRota(caminho) {
  const limpo = caminho.length > 1 ? caminho.replace(/\/$/, '') : caminho;
  // Rotas fixas têm prioridade sobre rotas com parâmetro (/ong/animais/novo × /ong/animais/:id).
  return ROTAS.find((r) => r.padrao === limpo) || ROTAS.find((r) => casa(r.padrao, limpo)) || null;
}

/**
 * Monta a trilha do caminho atual.
 * @returns {{ caminho: string, rotulo: string }[]} da raiz até a página atual
 */
export function montarTrilha(caminho, usuario, rotuloAtual) {
  const atual = acharRota(caminho);
  if (!atual) return [];
  const itens = [{ caminho, rotulo: rotuloAtual || atual.rotulo }];
  let pai = atual.pai;
  let seguranca = 0;
  while (pai && seguranca++ < 6) {
    const alvo = pai === 'inicio' ? rotaInicialOuHome(usuario) : pai;
    const rota = acharRota(alvo);
    if (!rota || itens.some((i) => i.caminho === alvo)) break;
    itens.unshift({ caminho: alvo, rotulo: rota.rotulo });
    pai = rota.pai;
  }
  return itens;
}

export function mostraTrilha(caminho) {
  return !SEM_TRILHA.includes(caminho) && !!acharRota(caminho);
}

function rotaInicialOuHome(usuario) {
  return usuario ? rotaInicial(usuario) : '/';
}
