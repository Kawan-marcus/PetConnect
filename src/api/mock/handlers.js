/**
 * Implementação SIMULADA de todos os endpoints da API.
 * Cada função aqui tem uma equivalente real em src/api/*.js, que chama o backend.
 * As regras de negócio (RN01–RN05) também estão aqui para o front se comportar
 * como o sistema real — mas quem garante as regras de verdade é o backend.
 */
import { db, salvar, proximoId, atraso, erro, resetarMock } from './db.js';
import { calcularCompatibilidade } from './compatibilidade.js';
import { tokenStorage } from '../client.js';
import { faixaEtaria } from '../../utils/format.js';

const agora = () => new Date().toISOString();
const semSenha = ({ senha, ...u }) => u;

function usuarioAtual() {
  const token = tokenStorage.get();
  const id = token?.startsWith('mock-') ? Number(token.slice(5)) : null;
  const u = db().usuarios.find((x) => x.id === id);
  if (!u) throw erro('Sessão expirada. Faça login novamente.');
  return u;
}

function exigirPerfil(...perfis) {
  const u = usuarioAtual();
  if (!perfis.includes(u.perfil)) throw erro('Você não tem permissão para esta ação.');
  return u;
}

function notificar(usuarioId, texto, link) {
  const d = db();
  d.notificacoes.push({ id: proximoId(d.notificacoes), usuarioId, texto, link, lida: false, data: agora() });
}

function notificarOng(ongId, texto, link) {
  db().usuarios.filter((u) => u.ongId === ongId).forEach((u) => notificar(u.id, texto, link));
}

function mudarStatus(s, status, obs = '') {
  s.status = status;
  s.historico.push({ status, data: agora(), obs });
}

const comOng = (a) => ({ ...a, ong: db().ongs.find((o) => o.id === a.ongId) });

function detalharSolicitacao(s) {
  const d = db();
  const animal = d.animais.find((a) => a.id === s.animalId);
  const usuario = d.usuarios.find((u) => u.id === s.usuarioId);
  const ong = d.ongs.find((o) => o.id === s.ongId);
  return { ...s, animal, usuario: usuario && semSenha(usuario), ong };
}

/* ───────────── Autenticação ───────────── */

export async function login(email, senha) {
  await atraso(400);
  const u = db().usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || u.senha !== senha) throw erro('E-mail ou senha inválidos.');
  if (!u.ativo) throw erro('Usuário desativado. Entre em contato com o administrador.');
  return { token: `mock-${u.id}`, usuario: semSenha(u) };
}

export async function me() {
  await atraso(100);
  const u = usuarioAtual();
  return { ...semSenha(u), ong: u.ongId ? db().ongs.find((o) => o.id === u.ongId) : null };
}

export async function cadastrarAdotante(dados) {
  await atraso(400);
  const d = db();
  if (d.usuarios.some((u) => u.email.toLowerCase() === dados.email.toLowerCase())) throw erro('Este e-mail já está cadastrado.');
  const u = { id: proximoId(d.usuarios), nome: dados.nome, email: dados.email, senha: dados.senha, telefone: dados.telefone, cidade: dados.cidade, perfil: 'adotante', ativo: true, criadoEm: agora() };
  d.usuarios.push(u);
  salvar();
  return { token: `mock-${u.id}`, usuario: semSenha(u) };
}

export async function cadastrarOng(dados) {
  await atraso(400);
  const d = db();
  if (d.usuarios.some((u) => u.email.toLowerCase() === dados.email.toLowerCase())) throw erro('Este e-mail já está cadastrado.');
  const ong = { id: proximoId(d.ongs), nome: dados.nomeOng, cnpj: dados.cnpj, email: dados.email, telefone: dados.telefone, cidade: dados.cidade, descricao: dados.descricao, status: 'pendente', criadoEm: agora() };
  d.ongs.push(ong);
  const u = { id: proximoId(d.usuarios), nome: dados.nomeResponsavel, email: dados.email, senha: dados.senha, telefone: dados.telefone, cidade: dados.cidade, perfil: 'ong', ongId: ong.id, ativo: true, criadoEm: agora() };
  d.usuarios.push(u);
  d.usuarios.filter((x) => x.perfil === 'admin').forEach((a) => notificar(a.id, `Nova ONG aguardando aprovação: ${ong.nome}.`, '/admin/ongs'));
  salvar();
  return { token: `mock-${u.id}`, usuario: semSenha(u) };
}

export async function recuperarSenha(email) {
  await atraso(500);
  return { mensagem: `Se ${email} estiver cadastrado, enviaremos um link de redefinição.` };
}

export async function redefinirSenha(token, novaSenha) {
  await atraso(400);
  if (!token) throw erro('Link inválido ou expirado. Solicite um novo.');
  if (!novaSenha || novaSenha.length < 6) throw erro('A nova senha deve possuir pelo menos 6 caracteres.');
  return { mensagem: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
}

export async function atualizarPerfil(dados) {
  await atraso(300);
  const u = usuarioAtual();
  Object.assign(u, { nome: dados.nome, telefone: dados.telefone, cidade: dados.cidade });
  if (dados.novaSenha) u.senha = dados.novaSenha;
  salvar();
  return semSenha(u);
}

/* ───────────── Animais ───────────── */

function aplicarFiltros(lista, f = {}) {
  let r = lista;
  if (f.especie) r = r.filter((a) => a.especie === f.especie);
  if (f.porte) r = r.filter((a) => a.porte === f.porte);
  if (f.sexo) r = r.filter((a) => a.sexo === f.sexo);
  if (f.idade) r = r.filter((a) => faixaEtaria(a.idadeMeses) === f.idade);
  if (f.status) r = r.filter((a) => a.status === f.status);
  if (f.busca) {
    const q = f.busca.toLowerCase();
    r = r.filter((a) => `${a.nome} ${a.raca} ${a.descricao}`.toLowerCase().includes(q));
  }
  if (f.ordenar === 'recentes') r = [...r].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  if (f.ordenar === 'nome') r = [...r].sort((a, b) => a.nome.localeCompare(b.nome));
  if (f.ordenar === 'idade') r = [...r].sort((a, b) => a.idadeMeses - b.idadeMeses);
  return r;
}

/** Lista pública: só animais disponíveis de ONGs aprovadas (RN04). */
export async function listarAnimais(filtros) {
  await atraso();
  const d = db();
  const aprovadas = new Set(d.ongs.filter((o) => o.status === 'aprovada').map((o) => o.id));
  const visiveis = d.animais.filter((a) => aprovadas.has(a.ongId) && a.status !== 'adotado');
  return aplicarFiltros(visiveis, { ordenar: 'recentes', ...filtros }).map(comOng);
}

export async function obterAnimal(id) {
  await atraso();
  const a = db().animais.find((x) => x.id === Number(id));
  if (!a) throw erro('Animal não encontrado.');
  return comOng(a);
}

export async function listarAnimaisDaOng(filtros) {
  await atraso();
  const u = exigirPerfil('ong');
  return aplicarFiltros(db().animais.filter((a) => a.ongId === u.ongId), { ordenar: 'recentes', ...filtros });
}

export async function criarAnimal(dados) {
  await atraso(400);
  const u = exigirPerfil('ong');
  const d = db();
  const ong = d.ongs.find((o) => o.id === u.ongId);
  if (ong.status !== 'aprovada') throw erro('Sua ONG ainda não foi aprovada pelo administrador (RN04).');
  const a = { ...dados, id: proximoId(d.animais), ongId: u.ongId, status: 'disponivel', criadoEm: agora() };
  d.animais.push(a);
  salvar();
  return a;
}

export async function atualizarAnimal(id, dados) {
  await atraso(400);
  const u = exigirPerfil('ong', 'admin');
  const a = db().animais.find((x) => x.id === Number(id));
  if (!a) throw erro('Animal não encontrado.');
  if (u.perfil === 'ong' && a.ongId !== u.ongId) throw erro('Este animal pertence a outra ONG.');
  Object.assign(a, dados, { id: a.id, ongId: a.ongId });
  salvar();
  return a;
}

export async function removerAnimal(id) {
  await atraso(300);
  const u = exigirPerfil('ong', 'admin');
  const d = db();
  const a = d.animais.find((x) => x.id === Number(id));
  if (u.perfil === 'ong' && a.ongId !== u.ongId) throw erro('Este animal pertence a outra ONG.');
  if (d.solicitacoes.some((s) => s.animalId === a.id && ['pendente', 'em_analise', 'aprovada'].includes(s.status))) {
    throw erro('Não é possível remover um animal com solicitações em andamento.');
  }
  d.animais = d.animais.filter((x) => x.id !== a.id);
  d.favoritos = d.favoritos.filter((f) => f.animalId !== a.id);
  salvar();
  return { ok: true };
}

export async function alterarStatusAnimal(id, status) {
  return atualizarAnimal(id, { status });
}

/* ───────────── Favoritos ───────────── */

export async function listarFavoritos() {
  await atraso();
  const u = usuarioAtual();
  const d = db();
  const ids = d.favoritos.filter((f) => f.usuarioId === u.id).map((f) => f.animalId);
  return d.animais.filter((a) => ids.includes(a.id)).map(comOng);
}

export async function idsFavoritos() {
  const u = usuarioAtual();
  return db().favoritos.filter((f) => f.usuarioId === u.id).map((f) => f.animalId);
}

export async function alternarFavorito(animalId) {
  await atraso(150);
  const u = usuarioAtual();
  const d = db();
  const existe = d.favoritos.some((f) => f.usuarioId === u.id && f.animalId === animalId);
  d.favoritos = existe
    ? d.favoritos.filter((f) => !(f.usuarioId === u.id && f.animalId === animalId))
    : [...d.favoritos, { usuarioId: u.id, animalId }];
  salvar();
  return { favorito: !existe };
}

/* ───────────── Formulário de avaliação ───────────── */

export async function obterFormulario() {
  await atraso();
  const u = usuarioAtual();
  return db().formularios.find((f) => f.usuarioId === u.id) || null;
}

export async function salvarFormulario(dados) {
  await atraso(400);
  const u = exigirPerfil('adotante');
  const d = db();
  const novo = { ...dados, usuarioId: u.id, atualizadoEm: agora() };
  d.formularios = [...d.formularios.filter((f) => f.usuarioId !== u.id), novo];
  salvar();
  return novo;
}

/* ───────────── Solicitações de adoção ───────────── */

export async function solicitarAdocao(animalId, mensagem = '') {
  await atraso(500);
  const u = exigirPerfil('adotante');
  const d = db();
  const animal = d.animais.find((a) => a.id === Number(animalId));
  if (!animal) throw erro('Animal não encontrado.');
  if (animal.status === 'adotado') throw erro('Este animal já foi adotado (RN01).');
  const form = d.formularios.find((f) => f.usuarioId === u.id);
  if (!form) throw erro('Preencha o formulário de avaliação antes de solicitar a adoção (RN03).');
  const ativa = d.solicitacoes.find((s) => s.usuarioId === u.id && s.animalId === animal.id && ['pendente', 'em_analise', 'aprovada'].includes(s.status));
  if (ativa) throw erro('Você já tem uma solicitação ativa para este animal (RN05).');

  const { score } = calcularCompatibilidade(form, animal);
  const s = { id: proximoId(d.solicitacoes), animalId: animal.id, usuarioId: u.id, ongId: animal.ongId, status: 'pendente', score, mensagem, criadoEm: agora(), historico: [{ status: 'pendente', data: agora(), obs: '' }] };
  d.solicitacoes.push(s);
  notificarOng(animal.ongId, `Nova solicitação de adoção para ${animal.nome}.`, `/ong/solicitacoes/${s.id}`);
  salvar();
  return detalharSolicitacao(s);
}

export async function minhasSolicitacoes() {
  await atraso();
  const u = usuarioAtual();
  return db().solicitacoes.filter((s) => s.usuarioId === u.id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).map(detalharSolicitacao);
}

export async function cancelarSolicitacao(id) {
  await atraso(300);
  const u = usuarioAtual();
  const s = db().solicitacoes.find((x) => x.id === Number(id) && x.usuarioId === u.id);
  if (!s || !['pendente', 'em_analise'].includes(s.status)) throw erro('Esta solicitação não pode mais ser cancelada.');
  mudarStatus(s, 'cancelada', 'Cancelada pelo adotante.');
  salvar();
  return detalharSolicitacao(s);
}

export async function solicitacoesDaOng(filtros = {}) {
  await atraso();
  const u = exigirPerfil('ong');
  let r = db().solicitacoes.filter((s) => s.ongId === u.ongId);
  if (filtros.status) r = r.filter((s) => s.status === filtros.status);
  return r.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).map(detalharSolicitacao);
}

export async function todasSolicitacoes() {
  await atraso();
  exigirPerfil('admin');
  return db().solicitacoes.slice().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).map(detalharSolicitacao);
}

function solicitacaoDaOng(id) {
  const u = exigirPerfil('ong');
  const s = db().solicitacoes.find((x) => x.id === Number(id));
  if (!s || s.ongId !== u.ongId) throw erro('Solicitação não encontrada.');
  return s;
}

export async function obterSolicitacao(id) {
  await atraso();
  const u = usuarioAtual();
  const d = db();
  const s = d.solicitacoes.find((x) => x.id === Number(id));
  if (!s || (u.perfil === 'ong' && s.ongId !== u.ongId) || (u.perfil === 'adotante' && s.usuarioId !== u.id)) throw erro('Solicitação não encontrada.');
  const det = detalharSolicitacao(s);
  const formulario = d.formularios.find((f) => f.usuarioId === s.usuarioId) || null;
  const compatibilidade = formulario ? calcularCompatibilidade(formulario, det.animal) : null;
  const concorrentes = d.solicitacoes.filter((x) => x.animalId === s.animalId && x.id !== s.id && ['pendente', 'em_analise'].includes(x.status)).length;
  return { ...det, formulario, compatibilidade, concorrentes };
}

export async function iniciarAnalise(id) {
  await atraso(300);
  const s = solicitacaoDaOng(id);
  if (s.status !== 'pendente') throw erro('Só solicitações pendentes podem entrar em análise.');
  mudarStatus(s, 'em_analise');
  const animal = db().animais.find((a) => a.id === s.animalId);
  notificar(s.usuarioId, `Sua solicitação para ${animal.nome} está em análise.`, '/minhas-solicitacoes');
  salvar();
  return obterSolicitacao(id);
}

/** RN02: aprovar coloca o animal "em processo" e encerra as demais solicitações dele. */
export async function aprovarSolicitacao(id, obs = '') {
  await atraso(400);
  const s = solicitacaoDaOng(id);
  if (!['pendente', 'em_analise'].includes(s.status)) throw erro('Esta solicitação não pode ser aprovada.');
  const d = db();
  const animal = d.animais.find((a) => a.id === s.animalId);
  if (animal.status === 'adotado') throw erro('Este animal já foi adotado (RN01).');
  mudarStatus(s, 'aprovada', obs);
  animal.status = 'em_processo';
  d.solicitacoes
    .filter((x) => x.animalId === animal.id && x.id !== s.id && ['pendente', 'em_analise'].includes(x.status))
    .forEach((x) => {
      mudarStatus(x, 'encerrada', 'Outra solicitação foi aprovada para este animal.');
      notificar(x.usuarioId, `A solicitação para ${animal.nome} foi encerrada: outro adotante foi aprovado.`, '/minhas-solicitacoes');
    });
  notificar(s.usuarioId, `Sua solicitação para ${animal.nome} foi aprovada!`, '/minhas-solicitacoes');
  salvar();
  return obterSolicitacao(id);
}

export async function recusarSolicitacao(id, motivo) {
  await atraso(400);
  const s = solicitacaoDaOng(id);
  if (!['pendente', 'em_analise'].includes(s.status)) throw erro('Esta solicitação não pode ser recusada.');
  if (!motivo?.trim()) throw erro('Informe o motivo da recusa.');
  mudarStatus(s, 'recusada', motivo);
  s.motivoRecusa = motivo;
  const animal = db().animais.find((a) => a.id === s.animalId);
  notificar(s.usuarioId, `Sua solicitação para ${animal.nome} foi recusada.`, '/minhas-solicitacoes');
  salvar();
  return obterSolicitacao(id);
}

export async function concluirAdocao(id, obs = '') {
  await atraso(400);
  const s = solicitacaoDaOng(id);
  if (s.status !== 'aprovada') throw erro('Só solicitações aprovadas podem ser concluídas.');
  mudarStatus(s, 'concluida', obs || 'Adoção concluída.');
  const animal = db().animais.find((a) => a.id === s.animalId);
  animal.status = 'adotado';
  notificar(s.usuarioId, `Parabéns! A adoção de ${animal.nome} foi concluída.`, '/minhas-solicitacoes');
  salvar();
  return obterSolicitacao(id);
}

/* ───────────── Acompanhamento pós-adoção ───────────── */

export async function adocoesDaOng() {
  await atraso();
  const u = exigirPerfil('ong');
  const d = db();
  return d.solicitacoes
    .filter((s) => s.ongId === u.ongId && s.status === 'concluida')
    .map((s) => ({ ...detalharSolicitacao(s), acompanhamentos: d.acompanhamentos.filter((a) => a.solicitacaoId === s.id).sort((a, b) => b.data.localeCompare(a.data)) }));
}

export async function registrarAcompanhamento(solicitacaoId, dados) {
  await atraso(400);
  const s = solicitacaoDaOng(solicitacaoId);
  if (s.status !== 'concluida') throw erro('Acompanhamento só pode ser registrado após a adoção.');
  const d = db();
  const a = { id: proximoId(d.acompanhamentos), solicitacaoId: s.id, animalId: s.animalId, data: dados.data || agora(), tipo: dados.tipo, observacao: dados.observacao };
  d.acompanhamentos.push(a);
  salvar();
  return a;
}

/* ───────────── IA / processamento ───────────── */

export async function compatibilidade(animalId) {
  await atraso(350);
  const u = usuarioAtual();
  const d = db();
  const form = d.formularios.find((f) => f.usuarioId === u.id);
  if (!form) return null;
  const animal = d.animais.find((a) => a.id === Number(animalId));
  return calcularCompatibilidade(form, animal);
}

/** Recomendação: calcula o score do adotante contra todos os animais disponíveis (em lote). */
export async function recomendacoes(limite = 6) {
  const inicio = performance.now();
  await atraso(600);
  const u = usuarioAtual();
  const d = db();
  const form = d.formularios.find((f) => f.usuarioId === u.id);
  if (!form) return { itens: [], semFormulario: true };
  const aprovadas = new Set(d.ongs.filter((o) => o.status === 'aprovada').map((o) => o.id));
  const candidatos = d.animais.filter((a) => a.status === 'disponivel' && aprovadas.has(a.ongId));
  const itens = candidatos
    .map((a) => ({ animal: comOng(a), ...calcularCompatibilidade(form, a) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limite);
  return { itens, processados: candidatos.length, tempoMs: Math.round(performance.now() - inicio), modelo: 'simulacao-front-v1' };
}

/** Sugestão por imagem. No backend real: rede neural (PyTorch) + pré-processamento em OpenCL. */
export async function sugerirPorImagem(nomeArquivo = '') {
  await atraso(900);
  const n = nomeArquivo.toLowerCase();
  const gato = /gat|cat|felin/.test(n);
  const opcoes = gato
    ? [{ raca: 'SRD', porte: 'pequeno' }, { raca: 'Siamês', porte: 'pequeno' }, { raca: 'Persa', porte: 'pequeno' }]
    : [{ raca: 'Vira-lata', porte: 'medio' }, { raca: 'Labrador', porte: 'grande' }, { raca: 'Shih-tzu', porte: 'pequeno' }];
  const escolha = opcoes[n.length % opcoes.length];
  return {
    especie: { valor: gato ? 'gato' : 'cao', confianca: 0.97 },
    raca: { valor: escolha.raca, confianca: 0.71, alternativas: opcoes.filter((o) => o !== escolha).map((o) => o.raca) },
    porte: { valor: escolha.porte, confianca: 0.83 },
    tempoMs: 142,
    modelo: 'simulacao-front-v1',
  };
}

/* ───────────── Notificações ───────────── */

export async function listarNotificacoes() {
  const u = usuarioAtual();
  return db().notificacoes.filter((n) => n.usuarioId === u.id).sort((a, b) => b.data.localeCompare(a.data));
}

export async function marcarNotificacoesLidas() {
  const u = usuarioAtual();
  db().notificacoes.filter((n) => n.usuarioId === u.id).forEach((n) => (n.lida = true));
  salvar();
  return { ok: true };
}

/* ───────────── Administração ───────────── */

export async function listarUsuarios(filtros = {}) {
  await atraso();
  exigirPerfil('admin');
  let r = db().usuarios.map(semSenha);
  if (filtros.perfil) r = r.filter((u) => u.perfil === filtros.perfil);
  if (filtros.busca) {
    const q = filtros.busca.toLowerCase();
    r = r.filter((u) => `${u.nome} ${u.email}`.toLowerCase().includes(q));
  }
  return r;
}

export async function atualizarUsuario(id, dados) {
  await atraso(300);
  const admin = exigirPerfil('admin');
  const u = db().usuarios.find((x) => x.id === Number(id));
  if (u.id === admin.id && dados.ativo === false) throw erro('Você não pode desativar a si mesmo.');
  Object.assign(u, dados);
  salvar();
  return semSenha(u);
}

export async function listarOngs(filtros = {}) {
  await atraso();
  exigirPerfil('admin');
  const d = db();
  let r = d.ongs;
  if (filtros.status) r = r.filter((o) => o.status === filtros.status);
  return r.map((o) => ({ ...o, totalAnimais: d.animais.filter((a) => a.ongId === o.id).length, totalAdocoes: d.solicitacoes.filter((s) => s.ongId === o.id && s.status === 'concluida').length }));
}

export async function alterarStatusOng(id, status) {
  await atraso(300);
  exigirPerfil('admin');
  const o = db().ongs.find((x) => x.id === Number(id));
  o.status = status;
  const texto = status === 'aprovada' ? 'Sua ONG foi aprovada! Você já pode cadastrar animais.' : status === 'suspensa' ? 'Sua ONG foi suspensa pelo administrador.' : 'O status da sua ONG foi alterado.';
  notificarOng(o.id, texto, '/ong');
  salvar();
  return o;
}

export async function listarTodosAnimais(filtros) {
  await atraso();
  exigirPerfil('admin');
  return aplicarFiltros(db().animais, { ordenar: 'recentes', ...filtros }).map(comOng);
}

export async function estatisticas() {
  await atraso(400);
  exigirPerfil('admin');
  const d = db();
  const concluidas = d.solicitacoes.filter((s) => s.status === 'concluida');
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date();
    dt.setMonth(dt.getMonth() - i);
    meses.push({ chave: `${dt.getFullYear()}-${dt.getMonth()}`, rotulo: dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') });
  }
  // Histórico de exemplo + adoções reais do mock no mês correspondente.
  const exemplo = [3, 5, 4, 7, 6, 0];
  const porMes = meses.map((m, i) => ({
    mes: m.rotulo,
    adocoes: exemplo[i] + concluidas.filter((s) => {
      const fim = new Date(s.historico.at(-1).data);
      return `${fim.getFullYear()}-${fim.getMonth()}` === m.chave;
    }).length,
  }));
  const tempos = concluidas.map((s) => (new Date(s.historico.at(-1).data) - new Date(s.criadoEm)) / 86400000);
  return {
    totais: {
      animaisDisponiveis: d.animais.filter((a) => a.status === 'disponivel').length,
      emProcesso: d.animais.filter((a) => a.status === 'em_processo').length,
      adotados: d.animais.filter((a) => a.status === 'adotado').length,
      adotantes: d.usuarios.filter((u) => u.perfil === 'adotante').length,
      ongsAprovadas: d.ongs.filter((o) => o.status === 'aprovada').length,
      ongsPendentes: d.ongs.filter((o) => o.status === 'pendente').length,
      solicitacoesAbertas: d.solicitacoes.filter((s) => ['pendente', 'em_analise'].includes(s.status)).length,
    },
    tempoMedioAdocaoDias: tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null,
    adocoesPorMes: porMes,
    porOng: d.ongs.filter((o) => o.status === 'aprovada').map((o) => ({ ong: o.nome, adocoes: concluidas.filter((s) => s.ongId === o.id).length, animais: d.animais.filter((a) => a.ongId === o.id).length })),
  };
}

/**
 * Comparativo de desempenho CPU × OpenCL.
 * VALORES DE EXEMPLO — o backend deve medir de verdade e devolver neste formato.
 */
export async function desempenho() {
  await atraso(400);
  exigirPerfil('admin');
  return {
    exemplo: true,
    dispositivo: 'GPU (OpenCL) — preencher com o dispositivo real',
    medicoes: [
      { tarefa: 'Score de compatibilidade em lote (1 adotante × 10.000 animais)', sequencialMs: 820, openclMs: 46 },
      { tarefa: 'Pré-processamento de 500 fotos (redimensionar + normalizar)', sequencialMs: 6400, openclMs: 710 },
      { tarefa: 'Busca por similaridade (1 foto × 20.000 vetores)', sequencialMs: 1350, openclMs: 88 },
    ],
  };
}

export { resetarMock };
