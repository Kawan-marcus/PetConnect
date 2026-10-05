import { USE_MOCK, api } from './client.js';
import * as mock from './mock/handlers.js';

/** GET /admin/usuarios?perfil=&busca= */
export const listarUsuarios = (filtros) => (USE_MOCK ? mock.listarUsuarios(filtros) : api.get('/admin/usuarios', filtros));
/** PATCH /admin/usuarios/:id  { ativo?, perfil? } */
export const atualizarUsuario = (id, dados) => (USE_MOCK ? mock.atualizarUsuario(id, dados) : api.patch(`/admin/usuarios/${id}`, dados));

/** GET /admin/ongs?status= */
export const listarOngs = (filtros) => (USE_MOCK ? mock.listarOngs(filtros) : api.get('/admin/ongs', filtros));
/** PATCH /admin/ongs/:id/status  { status: aprovada | suspensa | pendente } */
export const alterarStatusOng = (id, status) => (USE_MOCK ? mock.alterarStatusOng(id, status) : api.patch(`/admin/ongs/${id}/status`, { status }));

/** GET /admin/animais */
export const listarTodosAnimais = (filtros) => (USE_MOCK ? mock.listarTodosAnimais(filtros) : api.get('/admin/animais', filtros));

/** DELETE /admin/animais/:id → exclusão lógica feita pelo administrador */
export const removerAnimalAdmin = (id) => (USE_MOCK ? mock.removerAnimal(id) : api.del(`/admin/animais/${id}`));

/** GET /admin/solicitacoes → histórico completo (RF16) */
export const todasSolicitacoes = () => (USE_MOCK ? mock.todasSolicitacoes() : api.get('/admin/solicitacoes'));

/** GET /admin/estatisticas */
export const estatisticas = () => (USE_MOCK ? mock.estatisticas() : api.get('/admin/estatisticas'));
