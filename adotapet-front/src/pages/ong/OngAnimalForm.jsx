import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../components/Layout.jsx';
import Campo, { OpcoesPilula, SimNao } from '../../components/Campo.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import Icone from '../../components/Icone.jsx';
import { useFormulario } from '../../hooks/useFormulario.js';
import { obterAnimal, criarAnimal, atualizarAnimal, enviarFoto } from '../../api/animais.js';
import { sugerirPorImagem } from '../../api/ia.js';
import { useToast } from '../../context/ToastContext.jsx';
import { reduzirImagem } from '../../utils/imagem.js';
import { ESPECIES, PORTES } from '../../utils/format.js';

const MAX_FOTOS = 6;

const VAZIO = {
  nome: '', especie: '', raca: '', idadeAnos: '', idadeMesesExtra: '', sexo: '', porte: '', energia: '',
  convivenciaCriancas: null, convivenciaAnimais: null, castrado: null, vacinado: null, descricao: '', fotos: [],
};

const obrig = (v) => v === '' || v === null || v === undefined;

function validar(v) {
  const meses = Number(v.idadeAnos || 0) * 12 + Number(v.idadeMesesExtra || 0);
  return {
    nome: obrig(v.nome) && 'Informe o nome.',
    especie: obrig(v.especie) && 'Selecione a espécie.',
    raca: obrig(v.raca) && 'Informe a raça (ou SRD).',
    idadeAnos: meses <= 0 && 'Informe a idade aproximada.',
    sexo: obrig(v.sexo) && 'Selecione o sexo.',
    porte: obrig(v.porte) && 'Selecione o porte.',
    energia: obrig(v.energia) && 'Selecione o nível de energia.',
    convivenciaCriancas: obrig(v.convivenciaCriancas) && 'Responda esta pergunta.',
    convivenciaAnimais: obrig(v.convivenciaAnimais) && 'Responda esta pergunta.',
    castrado: obrig(v.castrado) && 'Responda esta pergunta.',
    vacinado: obrig(v.vacinado) && 'Responda esta pergunta.',
    descricao: (!v.descricao || v.descricao.trim().length < 20) && 'Descreva o animal (mínimo de 20 caracteres).',
    fotos: v.fotos.length === 0 && 'Adicione pelo menos uma foto.',
  };
}

/** Cartão com a sugestão da IA a partir da primeira foto (RF23). */
function SugestaoIA({ sugestao, analisando, onAplicar, onDescartar }) {
  if (analisando) {
    return (
      <div className="sugestao-ia">
        <span className="spinner spinner--pequeno" /> Analisando a foto com o modelo de visão computacional…
      </div>
    );
  }
  if (!sugestao) return null;
  const pct = (x) => `${Math.round(x * 100)}%`;
  return (
    <div className="sugestao-ia">
      <div className="sugestao-ia__topo">
        <Icone nome="ia" />
        <strong>A IA sugere a partir da foto</strong>
        <span className="texto-suave">{sugestao.tempoMs} ms</span>
      </div>
      <ul className="sugestao-ia__lista">
        <li>Espécie: <strong>{ESPECIES[sugestao.especie.valor]}</strong> <span className="texto-suave">({pct(sugestao.especie.confianca)})</span></li>
        <li>Raça provável: <strong>{sugestao.raca.valor}</strong> <span className="texto-suave">({pct(sugestao.raca.confianca)})</span>
          {sugestao.raca.alternativas?.length > 0 && <span className="texto-suave"> · ou {sugestao.raca.alternativas.join(', ')}</span>}
        </li>
        <li>Porte: <strong>{PORTES[sugestao.porte.valor]}</strong> <span className="texto-suave">({pct(sugestao.porte.confianca)})</span></li>
      </ul>
      <div className="form__acoes">
        <button type="button" className="btn btn--fantasma" onClick={onDescartar}>Ignorar</button>
        <button type="button" className="btn btn--ia" onClick={onAplicar}><Icone nome="check" tamanho={16} /> Aplicar sugestão</button>
      </div>
      <p className="campo__ajuda">Confira antes de salvar: a ONG sempre confirma ou corrige a sugestão.</p>
    </div>
  );
}

export default function OngAnimalForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const inputFoto = useRef(null);
  const [carregando, setCarregando] = useState(editando);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [sugestao, setSugestao] = useState(null);
  const f = useFormulario(VAZIO, validar);
  const { valores: v, erros, set } = f;

  useEffect(() => {
    if (!editando) return;
    obterAnimal(id)
      .then((a) => f.setValores({ ...VAZIO, ...a, idadeAnos: Math.floor(a.idadeMeses / 12), idadeMesesExtra: a.idadeMeses % 12 }))
      .catch(setErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const adicionarFotos = async (arquivos) => {
    const lista = [...arquivos].slice(0, MAX_FOTOS - v.fotos.length);
    if (!lista.length) return;
    setSubindo(true);
    try {
      const urls = [];
      for (const arq of lista) {
        const reduzida = await reduzirImagem(arq);
        const { url } = await enviarFoto(arq, reduzida);
        urls.push(url);
      }
      const eraPrimeira = v.fotos.length === 0;
      set('fotos', [...v.fotos, ...urls]);
      // Na primeira foto, pede a sugestão ao modelo de visão computacional.
      if (eraPrimeira && !editando) {
        setAnalisando(true);
        sugerirPorImagem(lista[0])
          .then(setSugestao)
          .catch(() => toast('Não foi possível analisar a foto.', 'erro'))
          .finally(() => setAnalisando(false));
      }
    } catch (e) {
      toast(e.message, 'erro');
    } finally {
      setSubindo(false);
    }
  };

  const aplicarSugestao = () => {
    f.setValores((atual) => ({ ...atual, especie: sugestao.especie.valor, raca: sugestao.raca.valor, porte: sugestao.porte.valor }));
    setSugestao(null);
    toast('Sugestão aplicada. Confira os campos.');
  };

  const salvar = async (valores) => {
    setErro(null);
    setEnviando(true);
    // Campos controlados pelo servidor não são enviados.
    const { idadeAnos, idadeMesesExtra, ong, id: _id, ongId, status, criadoEm, ...resto } = valores;
    const dados = { ...resto, idadeMeses: Number(idadeAnos || 0) * 12 + Number(idadeMesesExtra || 0) };
    try {
      if (editando) await atualizarAnimal(id, dados);
      else await criarAnimal(dados);
      toast(editando ? 'Alterações salvas.' : `${dados.nome} foi publicado!`);
      navigate('/ong/animais');
    } catch (e) {
      setErro(e);
      window.scrollTo?.(0, 0);
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) return <Carregando />;

  return (
    <div className="container pagina pagina--media">
      <CabecalhoPagina titulo={editando ? `Editar ${v.nome}` : 'Cadastrar animal'} voltar="/ong/animais" />

      <form className="form" onSubmit={f.enviar(salvar)} noValidate>
        <Erro erro={erro} />

        <section className="card form__secao">
          <h2>Fotos</h2>
          <p className="texto-suave">Até {MAX_FOTOS} fotos. A primeira será a capa. Ao enviar a primeira, a IA sugere espécie, raça e porte.</p>
          <div className="fotos-upload">
            {v.fotos.map((url, i) => (
              <div key={i} className="fotos-upload__item">
                <img src={url} alt={`Foto ${i + 1}`} />
                {i === 0 && <span className="fotos-upload__capa">Capa</span>}
                <button type="button" className="btn-icone btn-icone--sobre" aria-label="Remover foto" onClick={() => set('fotos', v.fotos.filter((_, j) => j !== i))}>
                  <Icone nome="x" tamanho={16} />
                </button>
              </div>
            ))}
            {v.fotos.length < MAX_FOTOS && (
              <button
                type="button"
                className="fotos-upload__add"
                onClick={() => inputFoto.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); adicionarFotos(e.dataTransfer.files); }}
                disabled={subindo}
              >
                {subindo ? <span className="spinner spinner--pequeno" /> : <Icone nome="upload" tamanho={24} />}
                <span>{subindo ? 'Enviando…' : 'Adicionar fotos'}</span>
              </button>
            )}
            <input ref={inputFoto} type="file" accept="image/*" multiple hidden name="fotos" onChange={(e) => { adicionarFotos(e.target.files); e.target.value = ''; }} />
          </div>
          {erros.fotos && <span className="campo__erro">{erros.fotos}</span>}
          <SugestaoIA sugestao={sugestao} analisando={analisando} onAplicar={aplicarSugestao} onDescartar={() => setSugestao(null)} />
        </section>

        <section className="card form__secao">
          <h2>Informações básicas</h2>
          <div className="grade-2">
            <Campo rotulo="Nome" erro={erros.nome}><input {...f.campo('nome')} /></Campo>
            <Campo rotulo="Raça" erro={erros.raca} ajuda="Use SRD para sem raça definida."><input {...f.campo('raca')} /></Campo>
          </div>
          <OpcoesPilula nome="especie" rotulo="Espécie" valor={v.especie} onChange={(x) => set('especie', x)}
            opcoes={[{ valor: 'cao', rotulo: 'Cão' }, { valor: 'gato', rotulo: 'Gato' }]} />
          {erros.especie && <span className="campo__erro">{erros.especie}</span>}
          <div className="grade-2">
            <div>
              <OpcoesPilula nome="sexo" rotulo="Sexo" valor={v.sexo} onChange={(x) => set('sexo', x)}
                opcoes={[{ valor: 'M', rotulo: 'Macho' }, { valor: 'F', rotulo: 'Fêmea' }]} />
              {erros.sexo && <span className="campo__erro">{erros.sexo}</span>}
            </div>
            <div className="campo">
              <span className="rotulo">Idade aproximada</span>
              <div className="grade-2 grade-2--justa">
                <input type="number" min={0} max={30} placeholder="Anos" aria-label="Anos" {...f.campo('idadeAnos', 'number')} />
                <input type="number" min={0} max={11} placeholder="Meses" aria-label="Meses" {...f.campo('idadeMesesExtra', 'number')} />
              </div>
              {erros.idadeAnos && <span className="campo__erro">{erros.idadeAnos}</span>}
            </div>
          </div>
          <OpcoesPilula nome="porte" rotulo="Porte" valor={v.porte} onChange={(x) => set('porte', x)}
            opcoes={[{ valor: 'pequeno', rotulo: 'Pequeno' }, { valor: 'medio', rotulo: 'Médio' }, { valor: 'grande', rotulo: 'Grande' }]} />
          {erros.porte && <span className="campo__erro">{erros.porte}</span>}
        </section>

        <section className="card form__secao">
          <h2>Comportamento e saúde</h2>
          <p className="texto-suave">Estas informações entram no cálculo de compatibilidade com os adotantes.</p>
          <OpcoesPilula nome="energia" rotulo="Nível de energia" valor={v.energia} onChange={(x) => set('energia', x)}
            opcoes={[{ valor: 'baixa', rotulo: 'Calmo' }, { valor: 'media', rotulo: 'Moderado' }, { valor: 'alta', rotulo: 'Agitado' }]} />
          {erros.energia && <span className="campo__erro">{erros.energia}</span>}
          <div className="grade-2">
            {[
              ['convivenciaCriancas', 'Convive bem com crianças?'],
              ['convivenciaAnimais', 'Convive bem com outros animais?'],
              ['castrado', 'É castrado?'],
              ['vacinado', 'Está vacinado?'],
            ].map(([nome, rotulo]) => (
              <div key={nome}>
                <SimNao nome={nome} rotulo={rotulo} valor={v[nome]} onChange={(x) => set(nome, x)} />
                {erros[nome] && <span className="campo__erro">{erros[nome]}</span>}
              </div>
            ))}
          </div>
          <Campo rotulo="Descrição" erro={erros.descricao} ajuda="Personalidade, história, cuidados especiais.">
            <textarea rows={4} {...f.campo('descricao')} />
          </Campo>
        </section>

        <div className="form__acoes">
          <button type="button" className="btn btn--fantasma" onClick={() => navigate('/ong/animais')}>Cancelar</button>
          <button className="btn btn--primario btn--grande" disabled={enviando || subindo}>
            {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Publicar animal'}
          </button>
        </div>
      </form>
    </div>
  );
}
