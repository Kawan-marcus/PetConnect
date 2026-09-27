import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Galeria from '../../components/Galeria.jsx';
import Icone from '../../components/Icone.jsx';
import Modal from '../../components/Modal.jsx';
import ScoreCompatibilidade from '../../components/ScoreCompatibilidade.jsx';
import { BotaoFavorito } from '../../components/AnimalCard.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import Carregando, { Erro } from '../../components/Carregando.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { obterAnimal } from '../../api/animais.js';
import { compatibilidade } from '../../api/ia.js';
import { solicitarAdocao, obterFormulario, minhasSolicitacoes } from '../../api/adocoes.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ESPECIES, PORTES, SEXOS, ENERGIAS, STATUS_SOLICITACAO, formatarIdade } from '../../utils/format.js';

function Caracteristica({ rotulo, valor }) {
  return (
    <div className="caracteristica">
      <span className="texto-suave">{rotulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

const simNao = (v) => (v ? 'Sim' : 'Não');

/** Painel lateral: IA + botão de adoção, conforme o perfil e as regras de negócio. */
function PainelAdocao({ animal }) {
  const { usuario } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const ehAdotante = usuario?.perfil === 'adotante';
  const { dados, carregando, recarregar } = useAsync(async () => {
    if (!ehAdotante) return null;
    const [formulario, compat, solicitacoes] = await Promise.all([obterFormulario(), compatibilidade(animal.id), minhasSolicitacoes()]);
    const ativa = solicitacoes.find((s) => s.animalId === animal.id && ['pendente', 'em_analise', 'aprovada'].includes(s.status));
    return { formulario, compat, ativa };
  }, [animal.id, ehAdotante]);

  const enviar = async () => {
    setErro(null);
    setEnviando(true);
    try {
      await solicitarAdocao(animal.id, mensagem);
      toast(`Solicitação enviada para ${animal.ong.nome}!`);
      setModal(false);
      recarregar();
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  };

  if (animal.status === 'adotado') {
    return <div className="card"><p className="alerta alerta--info">{animal.nome} já encontrou um lar. 💛</p></div>;
  }

  if (!usuario) {
    return (
      <div className="card painel-adocao">
        <h3>Quer adotar {animal.nome}?</h3>
        <p className="texto-suave">Entre ou crie sua conta para solicitar a adoção e ver sua compatibilidade.</p>
        <button className="btn btn--primario btn--bloco" onClick={() => navigate('/login', { state: { de: `/animais/${animal.id}` } })}>
          Entrar para adotar
        </button>
      </div>
    );
  }

  if (!ehAdotante) return null;
  if (carregando) return <div className="card"><Carregando texto="Calculando compatibilidade…" /></div>;

  return (
    <div className="painel-adocao">
      {dados?.compat ? (
        <ScoreCompatibilidade resultado={dados.compat} titulo="Sua compatibilidade" compacto />
      ) : (
        <div className="card card--ia">
          <p className="eyebrow"><Icone nome="ia" tamanho={14} /> Compatibilidade</p>
          <p>Preencha o formulário de avaliação para ver quanto você combina com {animal.nome}.</p>
          <Link to="/formulario" state={{ voltarPara: `/animais/${animal.id}` }} className="btn btn--ia btn--bloco">Preencher formulário</Link>
        </div>
      )}

      <div className="card">
        {dados?.ativa ? (
          <>
            <p className="alerta alerta--info">
              Você já tem uma solicitação <strong>{STATUS_SOLICITACAO[dados.ativa.status].rotulo.toLowerCase()}</strong> para {animal.nome}.
            </p>
            <Link to="/minhas-solicitacoes" className="btn btn--fantasma btn--bloco">Acompanhar solicitação</Link>
          </>
        ) : (
          <>
            <button className="btn btn--primario btn--bloco btn--grande" disabled={!dados?.formulario} onClick={() => setModal(true)}>
              Solicitar adoção
            </button>
            {!dados?.formulario && <p className="campo__ajuda">É necessário preencher o formulário de avaliação antes.</p>}
          </>
        )}
      </div>

      <Modal
        aberto={modal}
        titulo={`Solicitar adoção de ${animal.nome}`}
        onFechar={() => setModal(false)}
        rodape={
          <>
            <button className="btn btn--fantasma" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn--primario" onClick={enviar} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitação'}</button>
          </>
        }
      >
        <Erro erro={erro} />
        <p>
          Seu formulário de avaliação será enviado para <strong>{animal.ong.nome}</strong>, junto com o índice de compatibilidade
          {dados?.compat ? ` (${dados.compat.score}%)` : ''}.
        </p>
        <div className="campo">
          <label htmlFor="msg">Mensagem para a ONG (opcional)</label>
          <textarea id="msg" rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder={`Conte por que você quer adotar ${animal.nome}…`} />
        </div>
      </Modal>
    </div>
  );
}

export default function AnimalDetalhe() {
  const { id } = useParams();
  const { dados: animal, carregando, erro } = useAsync(() => obterAnimal(id), [id]);

  if (carregando) return <Carregando />;
  if (erro) return <div className="container pagina"><Erro erro={erro} /></div>;

  return (
    <div className="container pagina">
      <Link to="/animais" className="btn btn--link voltar"><Icone nome="voltar" tamanho={16} /> Todos os animais</Link>
      <div className="detalhe">
        <div className="detalhe__principal">
          <Galeria fotos={animal.fotos} nome={animal.nome} />

          <div className="detalhe__titulo">
            <div>
              <h1>{animal.nome}</h1>
              <p className="texto-suave">{animal.raca} · {SEXOS[animal.sexo]} · {formatarIdade(animal.idadeMeses)}</p>
            </div>
            <div className="detalhe__acoes">
              {animal.status !== 'disponivel' && <StatusBadge tipo="animal" status={animal.status} />}
              <BotaoFavorito animalId={animal.id} grande />
            </div>
          </div>

          <p className="detalhe__descricao">{animal.descricao}</p>

          <div className="caracteristicas">
            <Caracteristica rotulo="Espécie" valor={ESPECIES[animal.especie]} />
            <Caracteristica rotulo="Porte" valor={PORTES[animal.porte]} />
            <Caracteristica rotulo="Energia" valor={ENERGIAS[animal.energia]} />
            <Caracteristica rotulo="Castrado" valor={simNao(animal.castrado)} />
            <Caracteristica rotulo="Vacinado" valor={simNao(animal.vacinado)} />
            <Caracteristica rotulo="Convive com crianças" valor={simNao(animal.convivenciaCriancas)} />
            <Caracteristica rotulo="Convive com outros animais" valor={simNao(animal.convivenciaAnimais)} />
          </div>

          <div className="card card--linha">
            <div>
              <p className="texto-suave">Responsável</p>
              <strong>{animal.ong.nome}</strong>
              <p className="texto-suave">{animal.ong.cidade} · {animal.ong.telefone}</p>
            </div>
          </div>
        </div>

        <aside className="detalhe__lateral">
          <PainelAdocao animal={animal} />
        </aside>
      </div>
    </div>
  );
}
