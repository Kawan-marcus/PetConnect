import { USE_MOCK, api } from './client.js';
import * as mock from './mock/handlers.js';

/** GET /notificacoes */
export const listarNotificacoes = () => (USE_MOCK ? mock.listarNotificacoes() : api.get('/notificacoes'));
/** POST /notificacoes/marcar-lidas */
export const marcarNotificacoesLidas = () => (USE_MOCK ? mock.marcarNotificacoesLidas() : api.post('/notificacoes/marcar-lidas'));
