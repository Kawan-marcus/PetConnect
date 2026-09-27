import { useState } from 'react';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Carregando, { Erro, Vazio } from '../../components/Carregando.jsx';
import Modal from '../../components/Modal.jsx';
import Icone from '../../components/Icone.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { adocoesDaOng, registrarAcompanhamento } from '../../api/adocoes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatarData, tempoRelativo } from '../../utils/format.js';

const TIPOS = { visita: 'Visita', contato: 'Contato (telefone/mensagem)', foto: 'Fotos enviadas pelo tutor' };

/** Acompanhamento pós-adoção: a ONG registra visitas e contatos após a adoção. */
export default function OngAcompanhamentos() {
  const toast = useToast();
  const { dados, carregando, erro, recarregar } = useAsync(adocoesDaOng, []);
  const [alvo, setAlvo] = useState(null);
  const [form, setForm] = useState({ tipo: 'visita', data: new Date().toISOString().slice(0, 10), observacao: '' });
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState(null);

  const salvar = async () => {
    setErroForm(null);
    if (form.observacao.trim().length < 5) return setErroForm(new Error('Descreva o acompanhamento.'));
    setEnviando(true);
    try {
      await registrarAcompanhamento(alvo.id, { ...form, data: new Date(`${form.data}T12:00:00`).toISOString() });
      toast('Acompanhamento registrado.');
      setAlvo(null);
      setForm((f) => ({ ...f, observacao: '' }));
      recarregar();
    } catch (e) {
      setErroForm(e);
    } finally {
      setEnviando(false);
    }
  };

  if (carregando && !dados) return <Carregando />;

  return (
    <div className="container pagina pagina--media">
      <CabecalhoPagina titulo="Acompanhamento pós-adoção" subtitulo="Registre visitas e contatos para garantir o bem-estar dos animais adotados." />
      <Erro erro={erro} onTentar={recarregar} />
      {dados?.length === 0 && <Vazio titulo="Nenhuma adoção concluída ainda" />}

      {dados?.map((s) => {
        const ultimo = s.acompanhamentos[0];
        const diasSem = ultimo ? Math.floor((Date.now() - new Date(ultimo.data)) / 86400000) : null;
        return (
          <article key={s.id} className="card acompanhamento">
            <header className="acompanhamento__topo">
              <img src={s.animal.fotos[0]} alt="" className="miniatura miniatura--grande" />
              <div className="acompanhamento__info">
                <h2>{s.animal.nome}</h2>
                <p className="texto-suave">Adotado por {s.usuario.nome} em {formatarData(s.historico.at(-1).data)}</p>
                {(diasSem === null || diasSem > 30) && (
                  <span className="badge badge--amarelo">{diasSem === null ? 'Sem acompanhamento' : `Último há ${diasSem} dias`}</span>
                )}
              </div>
              <button className="btn btn--primario" onClick={() => setAlvo(s)}><Icone nome="mais" tamanho={16} /> Registrar</button>
            </header>
            {s.acompanhamentos.length > 0 && (
              <ul className="registros">
                {s.acompanhamentos.map((a) => (
                  <li key={a.id}>
                    <span className="registros__tipo">{TIPOS[a.tipo]}</span>
                    <span className="texto-suave">{formatarData(a.data)} · {tempoRelativo(a.data)}</span>
                    <p>{a.observacao}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}

      <Modal
        aberto={Boolean(alvo)}
        titulo={`Acompanhamento de ${alvo?.animal.nome}`}
        onFechar={() => setAlvo(null)}
        rodape={
          <>
            <button className="btn btn--fantasma" onClick={() => setAlvo(null)}>Cancelar</button>
            <button className="btn btn--primario" onClick={salvar} disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
          </>
        }
      >
        <Erro erro={erroForm} />
        <div className="grade-2">
          <div className="campo">
            <label htmlFor="ac-tipo">Tipo</label>
            <select id="ac-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="ac-data">Data</label>
            <input id="ac-data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="ac-obs">Observações</label>
          <textarea id="ac-obs" rows={4} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Como o animal está? Saúde, adaptação, ambiente…" />
        </div>
      </Modal>
    </div>
  );
}
