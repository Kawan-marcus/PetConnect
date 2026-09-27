import { USE_MOCK, api } from './client.js';
import * as mock from './mock/handlers.js';

/**
 * Endpoints do componente de IA / processamento (núcleo em Python + OpenCL).
 * O front só exibe os resultados: todo o cálculo acontece no backend.
 */

/** GET /ia/compatibilidade/:animalId → { score, fatores[], modelo } ou null se não houver formulário */
export const compatibilidade = (animalId) => (USE_MOCK ? mock.compatibilidade(animalId) : api.get(`/ia/compatibilidade/${animalId}`));

/** GET /ia/recomendacoes?limite= → { itens[{animal, score, fatores}], processados, tempoMs, modelo } */
export const recomendacoes = (limite = 6) => (USE_MOCK ? mock.recomendacoes(limite) : api.get('/ia/recomendacoes', { limite }));

/** POST /ia/classificar-imagem (multipart "imagem") → { especie, raca, porte, tempoMs, modelo } */
export async function sugerirPorImagem(arquivo) {
  if (USE_MOCK) return mock.sugerirPorImagem(arquivo?.name);
  const fd = new FormData();
  fd.append('imagem', arquivo);
  return api.upload('/ia/classificar-imagem', fd);
}

/** GET /admin/desempenho → comparativo sequencial × OpenCL */
export const desempenho = () => (USE_MOCK ? mock.desempenho() : api.get('/admin/desempenho'));
