import axios from 'axios';

/** true = usa o mock do navegador; false = chama o backend Python. */
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true') === 'true';

const TOKEN_KEY = 'adotapet.token';

// Se o navegador bloquear o localStorage (aba anônima, por exemplo), o token fica só em memória.
let tokenMemoria = null;
export const tokenStorage = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) ?? tokenMemoria; } catch { return tokenMemoria; }
  },
  set: (t) => {
    tokenMemoria = t;
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* segue em memória */ }
  },
  clear: () => {
    tokenMemoria = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* nada */ }
  },
};

/**
 * Traduz qualquer falha de rede ou do backend numa frase em português que o usuário entende (Sprint 06).
 * Antes, erros sem resposta apareciam como "Network Error" e erros de validação do FastAPI como JSON.
 */
export function mensagemDeErro(err) {
  if (!err.response) {
    if (err.code === 'ECONNABORTED') return 'O servidor demorou demais para responder. Tente de novo em instantes.';
    return 'Não foi possível conectar ao servidor. Verifique sua internet ou se o backend está em execução.';
  }
  const { status, data } = err.response;
  const detalhe = data?.detail ?? data?.mensagem;
  // 422 do FastAPI: lista de erros de validação → usa a primeira mensagem
  if (Array.isArray(detalhe) && detalhe.length) {
    const campo = detalhe[0].loc?.slice(-1)[0];
    return `Dados inválidos${campo ? ` no campo "${campo}"` : ''}: ${detalhe[0].msg}`;
  }
  if (typeof detalhe === 'string' && detalhe && !['Not Found', 'Method Not Allowed', 'Internal Server Error'].includes(detalhe)) {
    return detalhe;
  }
  if (status === 403) return 'Você não tem permissão para fazer isso.';
  if (status === 404) return 'O recurso pedido não foi encontrado no servidor.';
  if (status === 405) return 'Esta funcionalidade ainda não está disponível no servidor.';
  if (status >= 500) return 'O servidor encontrou um erro inesperado. Tente novamente; se continuar, avise a equipe.';
  return 'Erro de comunicação com o servidor.';
}

/** Instância do Axios usada por todos os serviços quando USE_MOCK = false. */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
});

// Envia o token JWT em todas as requisições.
http.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Padroniza os erros: o front sempre recebe um Error com uma mensagem legível.
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      tokenStorage.clear();
      window.dispatchEvent(new Event('adotapet:logout'));
    }
    const erro = new Error(mensagemDeErro(err));
    erro.status = err.response?.status ?? 0; // 0 = sem conexão
    return Promise.reject(erro);
  },
);

/** Atalho: devolve só o corpo da resposta. */
export const api = {
  get: (url, params) => http.get(url, { params }).then((r) => r.data),
  post: (url, body) => http.post(url, body).then((r) => r.data),
  put: (url, body) => http.put(url, body).then((r) => r.data),
  patch: (url, body) => http.patch(url, body).then((r) => r.data),
  del: (url) => http.delete(url).then((r) => r.data),
  upload: (url, formData) =>
    http.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
};
