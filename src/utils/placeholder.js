/**
 * Gera ilustrações SVG simples (cão ou gato) para os animais de exemplo do mock.
 * Com o backend real, as fotos vêm do upload das ONGs.
 */
const FUNDOS = ['#FBE3D6', '#DDEFE6', '#E3E7F7', '#F7EBCB', '#EFE0F3', '#DCEEF3'];
const PELAGENS = ['#C9864F', '#3F3A36', '#E9D5B5', '#8E6A4E', '#B7B0A8', '#D9A066', '#F2F0EC'];

function svgCao(fundo, pelo, orelha) {
  return `
  <rect width="400" height="300" fill="${fundo}"/>
  <ellipse cx="200" cy="300" rx="120" ry="60" fill="${pelo}" opacity=".9"/>
  <ellipse cx="128" cy="140" rx="32" ry="62" fill="${orelha}" transform="rotate(18 128 140)"/>
  <ellipse cx="272" cy="140" rx="32" ry="62" fill="${orelha}" transform="rotate(-18 272 140)"/>
  <ellipse cx="200" cy="160" rx="82" ry="86" fill="${pelo}"/>
  <ellipse cx="200" cy="200" rx="46" ry="36" fill="#fff" opacity=".55"/>
  <circle cx="170" cy="148" r="9" fill="#2A2522"/><circle cx="230" cy="148" r="9" fill="#2A2522"/>
  <circle cx="173" cy="145" r="3" fill="#fff"/><circle cx="233" cy="145" r="3" fill="#fff"/>
  <ellipse cx="200" cy="188" rx="14" ry="10" fill="#2A2522"/>
  <path d="M188 204 Q200 216 212 204" stroke="#2A2522" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="200" cy="222" rx="9" ry="11" fill="#E8664A"/>`;
}

function svgGato(fundo, pelo, orelha) {
  return `
  <rect width="400" height="300" fill="${fundo}"/>
  <ellipse cx="200" cy="300" rx="110" ry="55" fill="${pelo}" opacity=".9"/>
  <path d="M130 120 L140 50 L185 100 Z" fill="${orelha}"/>
  <path d="M270 120 L260 50 L215 100 Z" fill="${orelha}"/>
  <path d="M142 108 L147 70 L172 98 Z" fill="#F4B6A6"/>
  <path d="M258 108 L253 70 L228 98 Z" fill="#F4B6A6"/>
  <ellipse cx="200" cy="165" rx="80" ry="74" fill="${pelo}"/>
  <ellipse cx="170" cy="155" rx="10" ry="13" fill="#6BAA75"/><ellipse cx="230" cy="155" rx="10" ry="13" fill="#6BAA75"/>
  <ellipse cx="170" cy="156" rx="3" ry="10" fill="#1F1B18"/><ellipse cx="230" cy="156" rx="3" ry="10" fill="#1F1B18"/>
  <path d="M192 186 L208 186 L200 196 Z" fill="#E78E8E"/>
  <path d="M200 196 Q192 206 184 202 M200 196 Q208 206 216 202" stroke="#2A2522" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M150 190 L112 184 M150 198 L114 204 M250 190 L288 184 M250 198 L286 204" stroke="#2A2522" stroke-width="2" opacity=".5"/>`;
}

export function ilustracaoAnimal(especie, semente = 0, variacao = 0) {
  const fundo = FUNDOS[(semente + variacao) % FUNDOS.length];
  const pelo = PELAGENS[semente % PELAGENS.length];
  const orelha = PELAGENS[(semente + 3) % PELAGENS.length];
  const corpo = especie === 'gato' ? svgGato(fundo, pelo, orelha) : svgCao(fundo, pelo, orelha);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${corpo}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
