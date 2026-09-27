import { USE_MOCK, api } from './client.js';
import * as mock from './mock/handlers.js';

/* Formulário de avaliação (um por adotante) */
/** GET /formulario → formulário do adotante logado ou null */
export const obterFormulario = () => (USE_MOCK ? mock.obterFormulario() : api.get('/formulario'));
/** PUT /formulario */
export const salvarFormulario = (dados) => (USE_MOCK ? mock.salvarFormulario(dados) : api.put('/formulario', dados));

/* Solicitações — lado do adotante */
/** POST /solicitacoes  { animalId, mensagem } */
export const solicitarAdocao = (animalId, mensagem) =>
  USE_MOCK ? mock.solicitarAdocao(animalId, mensagem) : api.post('/solicitacoes', { animalId, mensagem });
/** GET /solicitacoes/minhas */
export const minhasSolicitacoes = () => (USE_MOCK ? mock.minhasSolicitacoes() : api.get('/solicitacoes/minhas'));
/** POST /solicitacoes/:id/cancelar */
export const cancelarSolicitacao = (id) => (USE_MOCK ? mock.cancelarSolicitacao(id) : api.post(`/solicitacoes/${id}/cancelar`));

/* Solicitações — lado da ONG */
/** GET /ong/solicitacoes?status= */
export const solicitacoesDaOng = (filtros) => (USE_MOCK ? mock.solicitacoesDaOng(filtros) : api.get('/ong/solicitacoes', filtros));
/** GET /solicitacoes/:id → inclui formulário do adotante e compatibilidade */
export const obterSolicitacao = (id) => (USE_MOCK ? mock.obterSolicitacao(id) : api.get(`/solicitacoes/${id}`));
/** POST /solicitacoes/:id/analisar */
export const iniciarAnalise = (id) => (USE_MOCK ? mock.iniciarAnalise(id) : api.post(`/solicitacoes/${id}/analisar`));
/** POST /solicitacoes/:id/aprovar  { obs } */
export const aprovarSolicitacao = (id, obs) => (USE_MOCK ? mock.aprovarSolicitacao(id, obs) : api.post(`/solicitacoes/${id}/aprovar`, { obs }));
/** POST /solicitacoes/:id/recusar  { motivo } */
export const recusarSolicitacao = (id, motivo) =>
  USE_MOCK ? mock.recusarSolicitacao(id, motivo) : api.post(`/solicitacoes/${id}/recusar`, { motivo });
/** POST /solicitacoes/:id/concluir  { obs } */
export const concluirAdocao = (id, obs) => (USE_MOCK ? mock.concluirAdocao(id, obs) : api.post(`/solicitacoes/${id}/concluir`, { obs }));

/* Acompanhamento pós-adoção */
/** GET /ong/adocoes → adoções concluídas com seus acompanhamentos */
export const adocoesDaOng = () => (USE_MOCK ? mock.adocoesDaOng() : api.get('/ong/adocoes'));
/** POST /solicitacoes/:id/acompanhamentos  { tipo, data, observacao } */
export const registrarAcompanhamento = (solicitacaoId, dados) =>
  USE_MOCK ? mock.registrarAcompanhamento(solicitacaoId, dados) : api.post(`/solicitacoes/${solicitacaoId}/acompanhamentos`, dados);
