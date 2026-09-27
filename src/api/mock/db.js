/**
 * "Banco de dados" falso que roda no navegador (localStorage).
 * Serve para desenvolver e demonstrar o front antes do backend ficar pronto.
 * A estrutura das tabelas espelha o modelo do MySQL.
 */
import { ilustracaoAnimal } from '../../utils/placeholder.js';

const CHAVE = 'adotapet.mockdb.v1';

const dias = (n) => new Date(Date.now() - n * 86400000).toISOString();

function fotos(especie, semente) {
  return [0, 1, 2].map((v) => ilustracaoAnimal(especie, semente, v));
}

function seed() {
  const ongs = [
    { id: 1, nome: 'Patinhas Felizes', cnpj: '12.345.678/0001-90', email: 'contato@patinhas.org', telefone: '(62) 99999-1111', cidade: 'Goiânia - GO', descricao: 'Resgate e reabilitação de cães e gatos desde 2015.', status: 'aprovada', criadoEm: dias(200) },
    { id: 2, nome: 'Lar Animal', cnpj: '98.765.432/0001-10', email: 'ola@laranimal.org', telefone: '(62) 98888-2222', cidade: 'Anápolis - GO', descricao: 'Abrigo com foco em gatos e animais idosos.', status: 'aprovada', criadoEm: dias(150) },
    { id: 3, nome: 'Amigos de Quatro Patas', cnpj: '11.222.333/0001-44', email: 'amigos4patas@email.com', telefone: '(62) 97777-3333', cidade: 'Aparecida de Goiânia - GO', descricao: 'Grupo de voluntários recém-formado.', status: 'pendente', criadoEm: dias(2) },
  ];

  const usuarios = [
    { id: 1, nome: 'Administrador', email: 'admin@adotapet.com', senha: '123456', perfil: 'admin', telefone: '', cidade: 'Goiânia - GO', ativo: true, criadoEm: dias(300) },
    { id: 2, nome: 'Ana Souza', email: 'ana@email.com', senha: '123456', perfil: 'adotante', telefone: '(62) 91234-5678', cidade: 'Goiânia - GO', ativo: true, criadoEm: dias(40) },
    { id: 3, nome: 'Carlos Lima', email: 'carlos@email.com', senha: '123456', perfil: 'adotante', telefone: '(62) 92345-6789', cidade: 'Goiânia - GO', ativo: true, criadoEm: dias(25) },
    { id: 4, nome: 'Equipe Patinhas', email: 'ong@patinhas.org', senha: '123456', perfil: 'ong', ongId: 1, telefone: '(62) 99999-1111', cidade: 'Goiânia - GO', ativo: true, criadoEm: dias(200) },
    { id: 5, nome: 'Equipe Lar Animal', email: 'ong@laranimal.org', senha: '123456', perfil: 'ong', ongId: 2, telefone: '(62) 98888-2222', cidade: 'Anápolis - GO', ativo: true, criadoEm: dias(150) },
    { id: 6, nome: 'Marina Alves', email: 'marina@email.com', senha: '123456', perfil: 'adotante', telefone: '(62) 93456-7890', cidade: 'Anápolis - GO', ativo: true, criadoEm: dias(12) },
    { id: 7, nome: 'Voluntários 4 Patas', email: 'amigos4patas@email.com', senha: '123456', perfil: 'ong', ongId: 3, telefone: '(62) 97777-3333', cidade: 'Aparecida de Goiânia - GO', ativo: true, criadoEm: dias(2) },
  ];

  const base = [
    ['Thor', 'cao', 'Vira-lata', 30, 'M', 'grande', 'alta', true, true, 'Brincalhão, adora correr e buscar bolinha. Precisa de espaço e passeios diários.', 1],
    ['Luna', 'gato', 'SRD', 8, 'F', 'pequeno', 'media', true, true, 'Curiosa e carinhosa, já usa caixinha de areia.', 2],
    ['Paçoca', 'cao', 'Caramelo', 18, 'M', 'medio', 'media', true, true, 'O clássico caramelo: dócil, leal e ótimo com crianças.', 1],
    ['Mia', 'gato', 'Siamês', 48, 'F', 'pequeno', 'baixa', false, true, 'Calma e independente, prefere ambientes tranquilos sem crianças pequenas.', 2],
    ['Bento', 'cao', 'Labrador', 96, 'M', 'grande', 'baixa', true, true, 'Idoso e muito tranquilo, perfeito para quem busca um companheiro calmo.', 1],
    ['Pipoca', 'cao', 'Shih-tzu', 5, 'F', 'pequeno', 'alta', true, true, 'Filhote cheia de energia, está aprendendo os comandos básicos.', 1],
    ['Frajola', 'gato', 'SRD', 36, 'M', 'medio', 'media', true, false, 'Gato de colo, mas não gosta de dividir espaço com outros animais.', 2],
    ['Nina', 'cao', 'Border Collie', 24, 'F', 'medio', 'alta', true, true, 'Muito inteligente, precisa de atividades e estímulos todos os dias.', 1],
    ['Tobias', 'cao', 'Pinscher', 60, 'M', 'pequeno', 'media', false, false, 'Protetor e apegado ao tutor; ideal para adultos sem outros pets.', 2],
    ['Amora', 'gato', 'Persa', 14, 'F', 'pequeno', 'baixa', true, true, 'Tranquila, pelagem longa que precisa de escovação frequente.', 2],
    ['Zeus', 'cao', 'Pastor Alemão', 42, 'M', 'grande', 'alta', false, true, 'Leal e ativo, recomendado para adotantes com experiência.', 1],
    ['Belinha', 'cao', 'Poodle', 110, 'F', 'pequeno', 'baixa', true, true, 'Senhorinha doce que só quer um sofá e carinho.', 2],
  ];

  const animais = base.map(([nome, especie, raca, idadeMeses, sexo, porte, energia, convivenciaCriancas, convivenciaAnimais, descricao, ongId], i) => ({
    id: i + 1, ongId, nome, especie, raca, idadeMeses, sexo, porte, energia,
    convivenciaCriancas, convivenciaAnimais, castrado: idadeMeses > 6, vacinado: true,
    descricao, fotos: fotos(especie, i + 1), status: 'disponivel', criadoEm: dias(60 - i * 4),
  }));
  animais[4].status = 'adotado';
  animais[2].status = 'em_processo';

  const formularios = [
    { usuarioId: 2, tipoMoradia: 'casa', temQuintal: true, telaProtecao: false, pessoasCasa: 3, temCriancas: true, outrosAnimais: false, horasSozinho: 5, experiencia: 'alguma', nivelAtividade: 'medio', motivacao: 'Queremos um companheiro para a família e para as crianças.', atualizadoEm: dias(20) },
    { usuarioId: 3, tipoMoradia: 'apartamento', temQuintal: false, telaProtecao: true, pessoasCasa: 1, temCriancas: false, outrosAnimais: true, horasSozinho: 9, experiencia: 'muita', nivelAtividade: 'baixo', motivacao: 'Moro sozinho e sempre tive gatos.', atualizadoEm: dias(10) },
  ];

  const h = (status, d, obs = '') => ({ status, data: dias(d), obs });
  const solicitacoes = [
    { id: 1, animalId: 5, usuarioId: 3, ongId: 1, status: 'concluida', score: 71, criadoEm: dias(30), historico: [h('pendente', 30), h('em_analise', 29), h('aprovada', 26, 'Visita realizada com sucesso.'), h('concluida', 22, 'Termo de adoção assinado.')] },
    { id: 2, animalId: 3, usuarioId: 2, ongId: 1, status: 'aprovada', score: 88, criadoEm: dias(6), historico: [h('pendente', 6), h('em_analise', 5), h('aprovada', 2, 'Aguardando data para retirada.')] },
    { id: 3, animalId: 2, usuarioId: 3, ongId: 2, status: 'pendente', score: 80, criadoEm: dias(1), historico: [h('pendente', 1)] },
    { id: 4, animalId: 1, usuarioId: 2, ongId: 1, status: 'em_analise', score: 74, criadoEm: dias(3), historico: [h('pendente', 3), h('em_analise', 2)] },
    { id: 5, animalId: 4, usuarioId: 2, ongId: 2, status: 'recusada', score: 38, motivoRecusa: 'A Mia não convive bem com crianças pequenas.', criadoEm: dias(15), historico: [h('pendente', 15), h('em_analise', 14), h('recusada', 13, 'A Mia não convive bem com crianças pequenas.')] },
  ];

  const acompanhamentos = [
    { id: 1, solicitacaoId: 1, animalId: 5, tipo: 'visita', data: dias(15), observacao: 'Bento adaptado, dorme na sala e passeia duas vezes por dia.' },
    { id: 2, solicitacaoId: 1, animalId: 5, tipo: 'contato', data: dias(5), observacao: 'Tutor enviou fotos; vacinas em dia.' },
  ];

  const favoritos = [
    { usuarioId: 2, animalId: 1 },
    { usuarioId: 2, animalId: 8 },
  ];

  const notificacoes = [
    { id: 1, usuarioId: 2, texto: 'Sua solicitação para Paçoca foi aprovada!', link: '/minhas-solicitacoes', lida: false, data: dias(2) },
    { id: 2, usuarioId: 2, texto: 'Sua solicitação para Thor está em análise.', link: '/minhas-solicitacoes', lida: true, data: dias(2) },
    { id: 3, usuarioId: 5, texto: 'Nova solicitação de adoção para Luna.', link: '/ong/solicitacoes', lida: false, data: dias(1) },
    { id: 4, usuarioId: 1, texto: 'Nova ONG aguardando aprovação: Amigos de Quatro Patas.', link: '/admin/ongs', lida: false, data: dias(2) },
  ];

  return { ongs, usuarios, animais, formularios, solicitacoes, acompanhamentos, favoritos, notificacoes };
}

let cache = null;

export function db() {
  if (cache) return cache;
  try {
    const salvo = localStorage.getItem(CHAVE);
    cache = salvo ? JSON.parse(salvo) : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

export function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(cache));
  } catch {
    // Sem espaço (fotos grandes) ou navegador bloqueando: segue só em memória.
  }
}

export function resetarMock() {
  cache = seed();
  salvar();
}

export function proximoId(lista) {
  return lista.reduce((m, x) => Math.max(m, x.id), 0) + 1;
}

/** Simula a latência da rede para o front mostrar os estados de carregamento. */
export const atraso = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export function erro(mensagem) {
  return new Error(mensagem);
}
