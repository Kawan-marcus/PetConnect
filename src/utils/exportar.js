/**
 * Exportação de relatórios (Sprint 07).
 *
 *  - CSV: abre direto no Excel / LibreOffice / Google Planilhas. Usa ";" como separador
 *    e BOM UTF-8 para o Excel em português reconhecer acentos e colunas.
 *  - PDF: o navegador imprime a página com a folha de estilo de impressão (só o relatório,
 *    sem menu) e o usuário escolhe "Salvar como PDF". Não precisa de biblioteca extra.
 *
 * Por que não XLSX: o CSV já abre no Excel e evita incluir uma biblioteca pesada no front.
 */

function celula(valor) {
  if (valor == null) return '';
  let v = valor;
  if (typeof v === 'number') v = v.toLocaleString('pt-BR', { maximumFractionDigits: 2, useGrouping: false });
  if (typeof v === 'boolean') v = v ? 'Sim' : 'Não';
  // Datas ISO (2026-10-30T22:10:23Z) saem no formato brasileiro
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) v = new Date(v).toLocaleDateString('pt-BR');
  v = String(v);
  // Evita que o Excel interprete o texto como fórmula (=, +, -, @)
  if (/^[=+\-@]/.test(v)) v = `'${v}`;
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * @param {string} nome          nome do arquivo, sem extensão
 * @param {{titulo:string, valor:(linha)=>any}[]} colunas
 * @param {object[]} linhas
 * @param {string[]} [cabecalho] linhas de contexto no topo (título, filtros, data)
 */
export function gerarCSV(colunas, linhas, cabecalho = []) {
  const topo = cabecalho.map((t) => celula(t));
  const titulos = colunas.map((c) => celula(c.titulo)).join(';');
  const corpo = linhas.map((l) => colunas.map((c) => celula(c.valor(l))).join(';'));
  return [...topo, ...(topo.length ? [''] : []), titulos, ...corpo].join('\r\n');
}

export function baixarArquivo(nome, conteudo, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿', conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportarCSV(nome, colunas, linhas, cabecalho) {
  const data = new Date().toISOString().slice(0, 10);
  baixarArquivo(`${nome}-${data}.csv`, gerarCSV(colunas, linhas, cabecalho));
}

/** Abre a impressão do navegador ("Salvar como PDF"). O CSS @media print esconde menus e botões. */
export function exportarPDF(titulo) {
  const anterior = document.title;
  document.title = `${titulo} · PetConnect`;
  document.body.classList.add('imprimindo');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('imprimindo');
    document.title = anterior;
  }, 500);
}
