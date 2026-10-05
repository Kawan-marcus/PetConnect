import { USE_MOCK, api } from './client.js';
import * as mock from './mock/handlers.js';

/** POST /auth/login → { token, usuario } */
export const login = (email, senha) => (USE_MOCK ? mock.login(email, senha) : api.post('/auth/login', { email, senha }));

/** GET /auth/me → usuário logado (com a ONG, se perfil = ong) */
export const me = () => (USE_MOCK ? mock.me() : api.get('/auth/me'));

/** POST /auth/cadastro/adotante → { token, usuario } */
export const cadastrarAdotante = (dados) => (USE_MOCK ? mock.cadastrarAdotante(dados) : api.post('/auth/cadastro/adotante', dados));

/** POST /auth/cadastro/ong → { token, usuario }  (ONG nasce com status "pendente") */
export const cadastrarOng = (dados) => (USE_MOCK ? mock.cadastrarOng(dados) : api.post('/auth/cadastro/ong', dados));

/** POST /auth/recuperar-senha → { mensagem } */
export const recuperarSenha = (email) => (USE_MOCK ? mock.recuperarSenha(email) : api.post('/auth/recuperar-senha', { email }));

/** POST /auth/redefinir-senha  { token, novaSenha } → { mensagem } */
export const redefinirSenha = (token, novaSenha) =>
  USE_MOCK ? mock.redefinirSenha(token, novaSenha) : api.post('/auth/redefinir-senha', { token, novaSenha });

/** PUT /auth/me → usuário atualizado */
export const atualizarPerfil = (dados) => (USE_MOCK ? mock.atualizarPerfil(dados) : api.put('/auth/me', dados));
