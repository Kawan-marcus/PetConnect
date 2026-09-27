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
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.mensagem ||
      err.message ||
      'Erro de comunicação com o servidor.';
    return Promise.reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)));
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
