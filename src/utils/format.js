/** Rótulos e formatação usados em todas as telas. */

export const ESPECIES = { cao: 'Cão', gato: 'Gato' };
export const PORTES = { pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande' };
export const SEXOS = { M: 'Macho', F: 'Fêmea' };
export const ENERGIAS = { baixa: 'Calmo', media: 'Moderado', alta: 'Agitado' };

export const STATUS_ANIMAL = {
  disponivel: { rotulo: 'Disponível', tom: 'verde' },
  em_processo: { rotulo: 'Em processo de adoção', tom: 'amarelo' },
  adotado: { rotulo: 'Adotado', tom: 'azul' },
};

/** Estados da solicitação (máquina de estados — ver docs/CONTRATO_API.md). */
export const STATUS_SOLICITACAO = {
  pendente: { rotulo: 'Pendente', tom: 'cinza' },
  em_analise: { rotulo: 'Em análise', tom: 'amarelo' },
  aprovada: { rotulo: 'Aprovada', tom: 'verde' },
  recusada: { rotulo: 'Recusada', tom: 'vermelho' },
  concluida: { rotulo: 'Adoção concluída', tom: 'azul' },
  encerrada: { rotulo: 'Encerrada', tom: 'cinza' },
  cancelada: { rotulo: 'Cancelada', tom: 'cinza' },
};

export const STATUS_ONG = {
  pendente: { rotulo: 'Aguardando aprovação', tom: 'amarelo' },
  aprovada: { rotulo: 'Aprovada', tom: 'verde' },
  suspensa: { rotulo: 'Suspensa', tom: 'vermelho' },
};

export const PERFIS = { adotante: 'Adotante', ong: 'ONG', admin: 'Administrador' };

export function formatarIdade(meses) {
  if (meses == null) return '—';
  if (meses < 12) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const anos = Math.floor(meses / 12);
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

export function faixaEtaria(meses) {
  if (meses < 12) return 'filhote';
  if (meses < 96) return 'adulto';
  return 'idoso';
}

export function formatarData(iso, comHora = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  return comHora
    ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : d.toLocaleDateString('pt-BR', { dateStyle: 'short' });
}

export function tempoRelativo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const dias = Math.floor(diff / 86400);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
}

/** Classifica o score de compatibilidade (0–100). */
export function nivelScore(score) {
  if (score >= 75) return { rotulo: 'Alta compatibilidade', tom: 'verde' };
  if (score >= 50) return { rotulo: 'Compatibilidade moderada', tom: 'amarelo' };
  return { rotulo: 'Baixa compatibilidade', tom: 'vermelho' };
}
