/**
 * SIMULAÇÃO do modelo de compatibilidade, só para o front funcionar sem o backend.
 *
 * No sistema real, este cálculo é feito no backend Python pelo modelo de
 * aprendizado de máquina treinado pela equipe (e em lote com OpenCL).
 * O formato da resposta abaixo é o mesmo que o backend deve devolver
 * (ver docs/CONTRATO_API.md → "Compatibilidade").
 */

const clamp = (v) => Math.max(0, Math.min(1, v));

function fatorEspaco(f, a) {
  const pesoPorte = { pequeno: 0, medio: 1, grande: 2 }[a.porte];
  let v = 1;
  if (f.tipoMoradia === 'apartamento') v -= pesoPorte * 0.3;
  if (!f.temQuintal) v -= pesoPorte * 0.12;
  if (a.especie === 'gato' && f.tipoMoradia === 'apartamento' && !f.telaProtecao) v -= 0.45;
  return clamp(v);
}

function fatorEnergia(f, a) {
  const pessoa = { baixo: 0, medio: 1, alto: 2 }[f.nivelAtividade];
  const animal = { baixa: 0, media: 1, alta: 2 }[a.energia];
  return clamp(1 - Math.abs(pessoa - animal) * 0.42);
}

function fatorRotina(f, a) {
  const horas = Number(f.horasSozinho) || 0;
  let tolerancia = a.especie === 'gato' ? 10 : 6;
  if (a.idadeMeses < 12) tolerancia -= 2;
  if (a.energia === 'alta') tolerancia -= 1;
  return clamp(1 - Math.max(0, horas - tolerancia) * 0.14);
}

function fatorCriancas(f, a) {
  if (!f.temCriancas) return 1;
  return a.convivenciaCriancas ? 1 : 0.2;
}

function fatorOutrosAnimais(f, a) {
  if (!f.outrosAnimais) return 1;
  return a.convivenciaAnimais ? 1 : 0.25;
}

function fatorExperiencia(f, a) {
  const exp = { nenhuma: 0, alguma: 1, muita: 2 }[f.experiencia];
  let exigencia = 0;
  if (a.idadeMeses < 12) exigencia += 1;
  if (a.energia === 'alta') exigencia += 1;
  if (a.porte === 'grande') exigencia += 0.5;
  return clamp(1 - Math.max(0, exigencia - exp) * 0.3);
}

const FATORES = [
  { chave: 'espaco', nome: 'Espaço da moradia', peso: 0.22, fn: fatorEspaco },
  { chave: 'energia', nome: 'Nível de energia × estilo de vida', peso: 0.2, fn: fatorEnergia },
  { chave: 'rotina', nome: 'Tempo que o animal ficaria sozinho', peso: 0.18, fn: fatorRotina },
  { chave: 'criancas', nome: 'Convivência com crianças', peso: 0.15, fn: fatorCriancas },
  { chave: 'animais', nome: 'Convivência com outros animais', peso: 0.13, fn: fatorOutrosAnimais },
  { chave: 'experiencia', nome: 'Experiência do adotante', peso: 0.12, fn: fatorExperiencia },
];

function descrever(chave, v) {
  const bom = v >= 0.75;
  const medio = v >= 0.45;
  const textos = {
    espaco: bom ? 'A moradia comporta bem o porte do animal.' : medio ? 'Espaço um pouco limitado para o porte.' : 'Moradia pouco adequada ao porte ou sem proteção.',
    energia: bom ? 'Ritmo do adotante combina com a energia do animal.' : medio ? 'Diferença moderada de ritmo.' : 'Energia do animal destoa bastante da rotina do adotante.',
    rotina: bom ? 'Tempo sozinho dentro do tolerável.' : medio ? 'O animal ficaria sozinho por bastante tempo.' : 'Tempo sozinho excessivo para este animal.',
    criancas: bom ? 'Sem conflito com crianças.' : 'O animal não tem histórico de convivência com crianças.',
    animais: bom ? 'Sem conflito com outros animais.' : 'O animal não convive bem com outros animais.',
    experiencia: bom ? 'Experiência compatível com as necessidades do animal.' : 'Animal exige mais experiência do que a informada.',
  };
  return textos[chave];
}

/** Calcula o score de 0 a 100 e a contribuição de cada fator. */
export function calcularCompatibilidade(formulario, animal) {
  const fatores = FATORES.map((f) => {
    const valor = f.fn(formulario, animal);
    return {
      chave: f.chave,
      nome: f.nome,
      peso: f.peso,
      valor: Number(valor.toFixed(2)),
      descricao: descrever(f.chave, valor),
    };
  });
  const bruto = fatores.reduce((s, f) => s + f.valor * f.peso, 0);
  // Um fator crítico muito baixo (ex.: crianças) derruba o resultado final.
  const minimo = Math.min(...fatores.map((f) => f.valor));
  const score = Math.round(100 * bruto * (0.7 + 0.3 * minimo));
  return { score, fatores, modelo: 'simulacao-front-v1' };
}
