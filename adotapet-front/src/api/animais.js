import { USE_MOCK, api } from './client.js';
import * as mock from './mock/handlers.js';

/** GET /animais?especie=&porte=&sexo=&idade=&busca=&ordenar= → lista pública */
export const listarAnimais = (filtros) => (USE_MOCK ? mock.listarAnimais(filtros) : api.get('/animais', filtros));

/** GET /animais/:id */
export const obterAnimal = (id) => (USE_MOCK ? mock.obterAnimal(id) : api.get(`/animais/${id}`));

/** GET /ong/animais → animais da ONG logada (todos os status) */
export const listarAnimaisDaOng = (filtros) => (USE_MOCK ? mock.listarAnimaisDaOng(filtros) : api.get('/ong/animais', filtros));

/** POST /ong/animais */
export const criarAnimal = (dados) => (USE_MOCK ? mock.criarAnimal(dados) : api.post('/ong/animais', dados));

/** PUT /animais/:id */
export const atualizarAnimal = (id, dados) => (USE_MOCK ? mock.atualizarAnimal(id, dados) : api.put(`/animais/${id}`, dados));

/** DELETE /animais/:id */
export const removerAnimal = (id) => (USE_MOCK ? mock.removerAnimal(id) : api.del(`/animais/${id}`));

/** PATCH /animais/:id/status  { status } */
export const alterarStatusAnimal = (id, status) =>
  USE_MOCK ? mock.alterarStatusAnimal(id, status) : api.patch(`/animais/${id}/status`, { status });

/**
 * Envio de fotos. No mock a foto vira dataURL (fica no navegador);
 * no real: POST /uploads/fotos (multipart) → { url }
 */
export async function enviarFoto(arquivo, dataUrlReduzida) {
  if (USE_MOCK) return { url: dataUrlReduzida };
  const fd = new FormData();
  fd.append('arquivo', arquivo);
  return api.upload('/uploads/fotos', fd);
}

/* Favoritos */
/** GET /favoritos → animais favoritados */
export const listarFavoritos = () => (USE_MOCK ? mock.listarFavoritos() : api.get('/favoritos'));
/** GET /favoritos/ids → [animalId] */
export const idsFavoritos = () => (USE_MOCK ? mock.idsFavoritos() : api.get('/favoritos/ids'));
/** POST /favoritos/:animalId (alterna) → { favorito: boolean } */
export const alternarFavorito = (animalId) => (USE_MOCK ? mock.alternarFavorito(animalId) : api.post(`/favoritos/${animalId}`));
