import { cloneElement, isValidElement, useId } from 'react';

/** Rótulo + controle + mensagem de erro/ajuda. O controle é passado como filho. */
export default function Campo({ rotulo, erro, ajuda, children, className = '' }) {
  const id = useId();
  const filho = isValidElement(children)
    ? cloneElement(children, { id, 'aria-describedby': erro || ajuda ? `${id}-msg` : undefined })
    : children;
  return (
    <div className={`campo ${erro ? 'campo--erro' : ''} ${className}`}>
      {rotulo && <label htmlFor={id}>{rotulo}</label>}
      {filho}
      {(erro || ajuda) && (
        <span id={`${id}-msg`} className={erro ? 'campo__erro' : 'campo__ajuda'}>
          {erro || ajuda}
        </span>
      )}
    </div>
  );
}

/** Grupo de opções em "pílulas" (radio). */
export function OpcoesPilula({ nome, valor, opcoes, onChange, rotulo }) {
  return (
    <fieldset className="campo">
      {rotulo && <legend>{rotulo}</legend>}
      <div className="pilulas" role="radiogroup">
        {opcoes.map((o) => (
          <label key={o.valor} className={`pilula ${valor === o.valor ? 'is-ativa' : ''}`}>
            <input type="radio" name={nome} value={o.valor} checked={valor === o.valor} onChange={() => onChange(o.valor)} />
            {o.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Pergunta de sim/não. */
export function SimNao({ nome, valor, onChange, rotulo }) {
  return (
    <OpcoesPilula
      nome={nome}
      rotulo={rotulo}
      valor={valor === true ? 'sim' : valor === false ? 'nao' : ''}
      opcoes={[
        { valor: 'sim', rotulo: 'Sim' },
        { valor: 'nao', rotulo: 'Não' },
      ]}
      onChange={(v) => onChange(v === 'sim')}
    />
  );
}
