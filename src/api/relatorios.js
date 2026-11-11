import { USE_MOCK, api } from './client.js';
import * as mock from './mock/handlers.js';
import { todasSolicitacoes, listarTodosAnimais, listarOngs, listarUsuarios } from './admin.js';
import { listarAnimaisDaOng } from './animais.js';
import { solicitacoesDaOng, adocoesDaOng } from './adocoes.js';
import { enriquecer } from '../utils/relatorios.js';
import { STATUS_SOLICITACAO, PERFIS } from '../utils/format.js';

/**
 * Dados do dashboard e dos relatórios (Sprint 07).
 * Usa as rotas que já existem; os cálculos ficam em utils/relatorios.js.
 */

/** Administrador: tudo da plataforma. */
export async function dadosAdmin() {
  const [solicitacoes, animais, ongs, usuarios] = await Promise.all([
    todasSolicitacoes(), listarTodosAnimais(), listarOngs(), listarUsuarios(),
  ]);
  return { solicitacoes: enriquecer(solicitacoes, animais), animais, ongs, usuarios };
}

/** ONG: só os próprios animais, solicitações e adoções (o backend já filtra pela ONG logada). */
export async function dadosOng() {
  const [solicitacoes, animais, adocoes] = await Promise.all([solicitacoesDaOng(), listarAnimaisDaOng(), adocoesDaOng()]);
  const acompanhamentos = new Map(adocoes.map((a) => [a.id, a.acompanhamentos || []]));
  const linhas = enriquecer(solicitacoes, animais).map((s) => ({ ...s, acompanhamentos: acompanhamentos.get(s.id) || [] }));
  return { solicitacoes: linhas, animais };
}

/* ───────────── Histórico de operações (logs) ───────────── */

export const TIPOS_OPERACAO = {
  solicitacao: 'Solicitações',
  animal: 'Animais',
  usuario: 'Contas',
  ong: 'ONGs',
  formulario: 'Formulários',
  auth: 'Acesso (login)',
};

const ROTULO_ACAO = {
  'usuario.cadastro': 'Conta criada',
  'usuario.ativado': 'Conta reativada',
  'usuario.desativado': 'Conta desativada',
  'ong.cadastro': 'ONG cadastrada',
  'ong.aprovada': 'ONG aprovada',
  'ong.suspensa': 'ONG suspensa',
  'ong.pendente': 'ONG voltou para análise',
  'animal.cadastrado': 'Animal cadastrado',
  'animal.editado': 'Animal editado',
  'animal.status': 'Situação do animal alterada',
  'animal.excluido': 'Animal removido',
  'formulario.preenchido': 'Formulário preenchido',
  'formulario.atualizado': 'Formulário atualizado',
  'acompanhamento.registrado': 'Acompanhamento registrado',
  'auth.login': 'Login',
  'auth.login_falhou': 'Tentativa de login recusada',
};

export function rotuloAcao(acao) {
  if (ROTULO_ACAO[acao]) return ROTULO_ACAO[acao];
  if (acao?.startsWith('solicitacao.')) {
    const st = acao.slice(12);
    return st === 'pendente' ? 'Solicitação enviada' : `Solicitação: ${STATUS_SOLICITACAO[st]?.rotulo.toLowerCase() || st}`;
  }
  return acao;
}

const QUEM_DA_ONG = ['em_analise', 'aprovada', 'recusada', 'concluida'];

/**
 * Monta o histórico a partir dos dados que a API já devolve:
 * cada etapa das solicitações (com data e observação) + cadastros de contas, ONGs e animais.
 */
export function montarOperacoes({ solicitacoes = [], usuarios = [], ongs = [], animais = [] }) {
  const ops = [];
  solicitacoes.forEach((s) => {
    (s.historico || []).forEach((h, i) => {
      const daOng = QUEM_DA_ONG.includes(h.status);
      ops.push({
        id: `s${s.id}-${i}`,
        data: h.data,
        acao: `solicitacao.${h.status}`,
        entidade: 'solicitacao',
        entidadeId: s.id,
        quem: h.status === 'encerrada' ? 'Sistema (automático)' : daOng ? (s.ong?.nome || s.ongNome) : (s.usuario?.nome || s.adotanteNome),
        perfil: h.status === 'encerrada' ? 'sistema' : daOng ? 'ong' : 'adotante',
        descricao: `#${s.id} · ${s.animal?.nome || 'animal'} · ${s.usuario?.nome || s.adotanteNome || ''}${h.obs ? ` — ${h.obs}` : ''}`,
      });
    });
  });
  usuarios.forEach((u) => ops.push({
    id: `u${u.id}`, data: u.criadoEm, acao: 'usuario.cadastro', entidade: 'usuario', entidadeId: u.id,
    quem: u.nome, perfil: u.perfil, descricao: `${u.nome} (${PERFIS[u.perfil] || u.perfil})`,
  }));
  ongs.forEach((o) => ops.push({
    id: `o${o.id}`, data: o.criadoEm, acao: 'ong.cadastro', entidade: 'ong', entidadeId: o.id,
    quem: o.nome, perfil: 'ong', descricao: `${o.nome} · ${o.cidade || ''}`,
  }));
  animais.forEach((a) => ops.push({
    id: `a${a.id}`, data: a.criadoEm, acao: 'animal.cadastrado', entidade: 'animal', entidadeId: a.id,
    quem: a.ong?.nome || '—', perfil: 'ong', descricao: `${a.nome} · ${a.raca || ''}`,
  }));
  return ops.filter((o) => o.data);
}

/** Formato da rota opcional GET /admin/logs (tabela log_acao) → mesmo formato da tela. */
function deLogAcao(l) {
  const det = l.detalhes || {};
  const partes = [det.nome, det.de && det.para ? `${det.de} → ${det.para}` : null, det.observacao, det.tipo, det.perfil].filter(Boolean);
  return {
    id: `l${l.id}`,
    data: l.criadoEm,
    acao: l.acao,
    entidade: l.entidade,
    entidadeId: l.entidadeId,
    quem: l.usuario?.nome || 'Sistema (automático)',
    perfil: l.usuario?.perfil || 'sistema',
    descricao: `${l.entidadeId ? `#${l.entidadeId} · ` : ''}${partes.join(' · ')}`,
    ip: l.ip,
  };
}

/**
 * Histórico de operações do administrador.
 * 1º tenta a rota GET /admin/logs (lê a tabela log_acao, com tudo o que os triggers gravam).
 * Se o backend ainda não tiver essa rota, monta o histórico a partir das outras rotas.
 * → { operacoes, fonte: 'logs' | 'montado', dados }
 */
export async function historicoOperacoes() {
  const dados = await dadosAdmin();
  if (USE_MOCK) {
    const extras = await mock.listarLogs();
    return { operacoes: [...montarOperacoes(dados), ...extras], fonte: 'montado', dados };
  }
  try {
    const logs = await api.get('/admin/logs', { limite: 5000 });
    const lista = Array.isArray(logs) ? logs : logs?.itens;
    if (Array.isArray(lista)) return { operacoes: lista.map(deLogAcao), fonte: 'logs', dados };
  } catch (e) {
    if (![404, 405].includes(e.status)) throw e;
  }
  return { operacoes: montarOperacoes(dados), fonte: 'montado', dados };
}
