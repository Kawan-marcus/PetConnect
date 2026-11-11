/**
 * Cálculos do dashboard e dos relatórios (Sprint 07).
 *
 * Tudo é calculado no front a partir das rotas que o backend já tem
 * (/admin/solicitacoes, /admin/animais, /admin/usuarios, /admin/ongs, /ong/...).
 * As mesmas contas existem no banco nas views vw_rel_* (database/08_sprint07_relatorios.sql).
 */

const DIA = 86400000;

/* ───────────── Período ───────────── */

export const PERIODOS = [
  { valor: '30', rotulo: 'Últimos 30 dias' },
  { valor: '90', rotulo: 'Últimos 90 dias' },
  { valor: '180', rotulo: 'Últimos 6 meses' },
  { valor: '365', rotulo: 'Últimos 12 meses' },
  { valor: 'tudo', rotulo: 'Todo o período' },
  { valor: 'personalizado', rotulo: 'Personalizado…' },
];

const isoDia = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

/** Converte o filtro { periodo, de, ate } num intervalo de datas { inicio, fim } (Date ou null). */
export function intervalo({ periodo = '180', de = '', ate = '' } = {}) {
  if (periodo === 'tudo') return { inicio: null, fim: null };
  if (periodo === 'personalizado') {
    return {
      inicio: de ? new Date(`${de}T00:00:00`) : null,
      fim: ate ? new Date(`${ate}T23:59:59.999`) : null,
    };
  }
  const fim = new Date();
  fim.setHours(23, 59, 59, 999);
  const inicio = new Date(fim.getTime() - Number(periodo) * DIA + 1);
  inicio.setHours(0, 0, 0, 0);
  return { inicio, fim };
}

export function dentro(iso, { inicio, fim }) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return (!inicio || t >= inicio.getTime()) && (!fim || t <= fim.getTime());
}

/** Texto do período para cabeçalhos e arquivos exportados. */
export function descreverPeriodo(filtro) {
  const p = PERIODOS.find((x) => x.valor === filtro.periodo);
  if (filtro.periodo !== 'personalizado') return p?.rotulo || '';
  const f = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR') : '…');
  return `De ${f(filtro.de)} a ${f(filtro.ate)}`;
}

export const hojeISO = () => isoDia(new Date());

/** Meses (AAAA-MM) cobertos pelo intervalo. Sem início: desde o registro mais antigo. */
export function mesesDoIntervalo({ inicio, fim }, datasIso = []) {
  const primeira = inicio || (datasIso.length ? new Date(datasIso.reduce((a, b) => (a < b ? a : b))) : new Date());
  const ultima = fim && fim < new Date() ? fim : new Date();
  const meses = [];
  const d = new Date(primeira.getFullYear(), primeira.getMonth(), 1);
  while (d <= ultima && meses.length < 36) {
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return meses;
}

export const chaveMes = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function rotuloMes(chave, comAno = false) {
  const [a, m] = chave.split('-').map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return comAno ? `${nome}/${String(a).slice(2)}` : nome;
}

/* ───────────── Solicitações ───────────── */

export const ABERTAS = ['pendente', 'em_analise'];
export const VENCEDORAS = ['aprovada', 'concluida'];

/** Data em que a solicitação chegou a um status (pelo histórico). */
export function dataDoStatus(s, status) {
  const h = (s.historico || []).filter((x) => x.status === status);
  return h.length ? h[h.length - 1].data : null;
}

export const dataConclusao = (s) => (s.status === 'concluida' ? dataDoStatus(s, 'concluida') || s.historico?.at(-1)?.data : null);

export function diasEntre(a, b) {
  if (!a || !b) return null;
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / DIA));
}

export const media = (nums) => {
  const v = nums.filter((n) => n != null && !Number.isNaN(n));
  return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
};

export const porcentagem = (parte, total) => (total ? Math.round((parte / total) * 1000) / 10 : null);

export function faixaScore(score) {
  if (score == null) return null;
  if (score >= 75) return 'alta';
  if (score >= 50) return 'moderada';
  return 'baixa';
}

export const FAIXAS = { alta: 'Alta (75–100%)', moderada: 'Moderada (50–74%)', baixa: 'Baixa (0–49%)' };

/**
 * Junta na solicitação o que o relatório precisa e o backend manda em listas separadas
 * (espécie e porte do animal). Retorna uma linha "plana", pronta para tabela e CSV.
 */
export function enriquecer(solicitacoes, animais = []) {
  const porId = new Map(animais.map((a) => [a.id, a]));
  return solicitacoes.map((s) => {
    const animal = { ...(porId.get(s.animal?.id ?? s.animalId) || {}), ...(s.animal || {}) };
    const concluidaEm = dataConclusao(s);
    return {
      ...s,
      animal,
      especie: animal.especie || null,
      ongId: s.ong?.id ?? s.ongId,
      ongNome: s.ong?.nome || animal.ong?.nome || '—',
      adotanteNome: s.usuario?.nome || '—',
      adotanteId: s.usuario?.id ?? s.usuarioId,
      faixa: faixaScore(s.score),
      concluidaEm,
      diasAteAdocao: diasEntre(s.criadoEm, concluidaEm),
      diasEmAberto: ABERTAS.includes(s.status) ? diasEntre(s.criadoEm, new Date().toISOString()) : null,
      atualizadoEm: s.historico?.at(-1)?.data || s.criadoEm,
    };
  });
}

/** Aplica os filtros comuns: período (data da solicitação), ONG, espécie, situação e adotante. */
export function filtrarSolicitacoes(linhas, f, campoData = 'criadoEm') {
  const per = intervalo(f);
  return linhas.filter((s) =>
    dentro(s[campoData], per)
    && (!f.ong || String(s.ongId) === String(f.ong))
    && (!f.especie || s.especie === f.especie)
    && (!f.status || s.status === f.status)
    && (!f.usuario || String(s.adotanteId) === String(f.usuario)),
  );
}

/** Indicadores (cards) do dashboard para um conjunto já filtrado. */
export function indicadores(linhas) {
  const decididas = linhas.filter((s) => [...VENCEDORAS, 'recusada'].includes(s.status));
  const aprovadas = linhas.filter((s) => VENCEDORAS.includes(s.status));
  const concluidas = linhas.filter((s) => s.status === 'concluida');
  return {
    total: linhas.length,
    abertas: linhas.filter((s) => ABERTAS.includes(s.status)).length,
    aprovadas: aprovadas.length,
    recusadas: linhas.filter((s) => s.status === 'recusada').length,
    concluidas: concluidas.length,
    taxaAprovacao: porcentagem(aprovadas.length, decididas.length),
    tempoMedio: media(concluidas.map((s) => s.diasAteAdocao)),
    scoreMedio: media(linhas.map((s) => s.score)),
    esperaMedia: media(linhas.map((s) => s.diasEmAberto)),
  };
}

/** Série mensal: solicitações recebidas e adoções concluídas em cada mês. */
export function seriePorMes(linhasTodas, f) {
  const per = intervalo(f);
  const base = linhasTodas.filter((s) =>
    (!f.ong || String(s.ongId) === String(f.ong)) && (!f.especie || s.especie === f.especie));
  const meses = mesesDoIntervalo(per, base.map((s) => s.criadoEm));
  return meses.map((m) => ({
    mes: m,
    recebidas: base.filter((s) => dentro(s.criadoEm, per) && chaveMes(s.criadoEm) === m).length,
    concluidas: base.filter((s) => s.concluidaEm && dentro(s.concluidaEm, per) && chaveMes(s.concluidaEm) === m).length,
  }));
}

/** Quantas solicitações em cada status. */
export function porStatus(linhas, rotulos) {
  return Object.keys(rotulos)
    .map((k) => ({ chave: k, rotulo: rotulos[k].rotulo, valor: linhas.filter((s) => s.status === k).length }))
    .filter((x) => x.valor > 0);
}

/** Funil: quantas passaram por cada etapa (pelo histórico). */
export function funil(linhas) {
  const passou = (s, st) => s.status === st || (s.historico || []).some((h) => h.status === st);
  return [
    { rotulo: 'Recebidas', valor: linhas.length },
    { rotulo: 'Analisadas', valor: linhas.filter((s) => passou(s, 'em_analise') || passou(s, 'aprovada') || passou(s, 'recusada')).length },
    { rotulo: 'Aprovadas', valor: linhas.filter((s) => passou(s, 'aprovada') || s.status === 'concluida').length },
    { rotulo: 'Adoções concluídas', valor: linhas.filter((s) => s.status === 'concluida').length },
  ];
}

/** Relatório de desempenho por ONG. */
export function desempenhoPorOng(linhas, ongs = [], animais = []) {
  const nomes = new Map(ongs.map((o) => [o.id, o]));
  linhas.forEach((s) => s.ongId != null && !nomes.has(s.ongId) && nomes.set(s.ongId, { id: s.ongId, nome: s.ongNome }));
  return [...nomes.values()].map((o) => {
    const doOng = linhas.filter((s) => s.ongId === o.id);
    const ind = indicadores(doOng);
    const seus = animais.filter((a) => (a.ong?.id ?? a.ongId) === o.id);
    return {
      id: o.id,
      ong: o.nome,
      cidade: o.cidade || seus[0]?.ong?.cidade || '',
      status: o.status,
      animais: seus.length,
      disponiveis: seus.filter((a) => a.status === 'disponivel').length,
      solicitacoes: ind.total,
      abertas: ind.abertas,
      aprovadas: ind.aprovadas,
      recusadas: ind.recusadas,
      concluidas: ind.concluidas,
      taxaAprovacao: ind.taxaAprovacao,
      tempoMedio: ind.tempoMedio,
      scoreMedio: ind.scoreMedio,
    };
  });
}

/** Relatório de compatibilidade: o que acontece com os pedidos de cada faixa de score. */
export function porFaixa(linhas) {
  return Object.keys(FAIXAS).map((faixa) => {
    const l = linhas.filter((s) => s.faixa === faixa);
    const ind = indicadores(l);
    return { faixa, rotulo: FAIXAS[faixa], solicitacoes: l.length, aprovadas: ind.aprovadas, recusadas: ind.recusadas, taxaAprovacao: ind.taxaAprovacao, scoreMedio: ind.scoreMedio };
  });
}

/** Animais esperando um lar: quanto tempo estão na plataforma e quanto interesse receberam. */
export function animaisEmEspera(animais, solicitacoes) {
  const pedidos = new Map();
  solicitacoes.forEach((s) => {
    const id = s.animal?.id ?? s.animalId;
    pedidos.set(id, (pedidos.get(id) || 0) + 1);
  });
  const hoje = new Date().toISOString();
  return animais
    .filter((a) => a.status !== 'adotado')
    .map((a) => {
      const dias = diasEntre(a.criadoEm, hoje);
      return {
        ...a,
        ongNome: a.ong?.nome || '—',
        ongId: a.ong?.id ?? a.ongId,
        diasNaPlataforma: dias,
        faixaEspera: dias <= 30 ? 'até 30 dias' : dias <= 90 ? '31 a 90 dias' : 'mais de 90 dias',
        pedidos: pedidos.get(a.id) || 0,
      };
    });
}

/** Cadastros por mês e perfil. */
export function cadastrosPorMes(usuarios, f) {
  const per = intervalo(f);
  const lista = usuarios.filter((u) => dentro(u.criadoEm, per));
  const meses = mesesDoIntervalo(per, lista.map((u) => u.criadoEm));
  return meses.map((m) => {
    const doMes = lista.filter((u) => chaveMes(u.criadoEm) === m);
    return {
      mes: m,
      adotantes: doMes.filter((u) => u.perfil === 'adotante').length,
      ongs: doMes.filter((u) => u.perfil === 'ong').length,
      total: doMes.length,
    };
  });
}

/* ───────────── Pesquisa ───────────── */

/** Normaliza para pesquisar sem diferenciar maiúsculas nem acentos ("Paçoca" = "pacoca"). */
export const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function contem(texto, termo) {
  if (!termo) return true;
  const alvo = normalizar(texto);
  return normalizar(termo).split(/\s+/).filter(Boolean).every((p) => alvo.includes(p));
}

/* ───────────── Formatação ───────────── */

export const fmtNumero = (n, casas = 0) => (n == null ? '—' : n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }));
export const fmtPct = (n) => (n == null ? '—' : `${fmtNumero(n, n % 1 ? 1 : 0)}%`);
export const fmtDias = (n) => (n == null ? '—' : `${fmtNumero(n, n % 1 && n < 10 ? 1 : 0)} ${Math.round(n) === 1 ? 'dia' : 'dias'}`);
