/** Ícones em SVG (traço), sem dependência externa. */
const PATHS = {
  coracao: 'M12 20s-7-4.35-9.5-8.5C.9 8.6 2.6 5 6 5c2 0 3.2 1.1 4 2.3h4C14.8 6.1 16 5 18 5c3.4 0 5.1 3.6 3.5 6.5C19 15.65 12 20 12 20z',
  busca: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm10 17-4.35-4.35',
  sino: 'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 20a2 2 0 0 1-3.4 0',
  sair: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  usuario: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  ia: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  filtro: 'M22 3H2l8 9.46V19l4 2v-8.54z',
  voltar: 'M19 12H5M12 19l-7-7 7-7',
  seta: 'M5 12h14M12 5l7 7-7 7',
  lixo: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  editar: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  grafico: 'M3 3v18h18M7 16v-4M12 16V8M17 16v-7',
  relogio: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  mais: 'M12 5v14M5 12h14',
  casa: 'M3 11l9-8 9 8M5 10v10h14V10',
  predio: 'M4 21V5l8-3v19M12 9h8v12M8 8h.01M8 12h.01M8 16h.01M16 13h.01M16 17h.01',
  formulario: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2zM9 12h6M9 16h4',
  menu: 'M3 6h18M3 12h18M3 18h18',
  alerta: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  raio: 'M13 2 3 14h9l-1 8 10-12h-9z',
};

export default function Icone({ nome, tamanho = 20, preenchido = false, className = '', titulo }) {
  return (
    <svg
      className={`icone ${className}`}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill={preenchido ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titulo ? undefined : true}
      role={titulo ? 'img' : undefined}
    >
      {titulo && <title>{titulo}</title>}
      <path d={PATHS[nome]} />
    </svg>
  );
}

export function Patinha({ tamanho = 28 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--cor-primaria)" />
      <g fill="#fff">
        <ellipse cx="32" cy="40" rx="11" ry="9" />
        <circle cx="19" cy="27" r="5" />
        <circle cx="27" cy="19" r="5" />
        <circle cx="37" cy="19" r="5" />
        <circle cx="45" cy="27" r="5" />
      </g>
    </svg>
  );
}
