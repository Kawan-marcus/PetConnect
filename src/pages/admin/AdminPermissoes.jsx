import { CabecalhoPagina } from '../../components/Layout.jsx';
import Icone from '../../components/Icone.jsx';
import { ACOES, ROTAS_POR_PERFIL, PERFIS_SISTEMA } from '../../utils/permissoes.js';
import { PERFIS } from '../../utils/format.js';
import { exportarPDF } from '../../utils/exportar.js';

const ROTULO = { ...PERFIS, visitante: 'Visitante' };

function Celula({ sim, observacao }) {
  return sim ? (
    <td className="centro permissao permissao--sim" title={observacao || 'Permitido'}>
      <Icone nome="check" tamanho={18} titulo="Permitido" />
      {observacao && <span className="permissao__obs">{observacao}</span>}
    </td>
  ) : (
    <td className="centro permissao permissao--nao" title="Sem acesso"><Icone nome="x" tamanho={16} titulo="Sem acesso" /></td>
  );
}

/**
 * Matriz de permissões (Sprint 08): o que cada perfil pode fazer, gerada do mesmo
 * mapa (utils/permissoes.js) que as telas usam — a documentação nunca fica desatualizada.
 */
export default function AdminPermissoes() {
  const grupos = [...new Set(Object.values(ACOES).map((a) => a.grupo))];
  return (
    <div className="container pagina">
      <CabecalhoPagina
        titulo="Permissões por perfil"
        subtitulo="Cada perfil acessa apenas as funções e informações das suas atribuições."
        acoes={<button type="button" className="btn btn--fantasma nao-imprimir" onClick={() => exportarPDF('Permissões por perfil')}><Icone nome="imprimir" tamanho={16} /> PDF</button>}
      />

      <div className="alerta alerta--info">
        <Icone nome="escudo" />
        <span>
          As permissões são conferidas em três camadas: o <strong>front</strong> esconde ou desabilita o que não é permitido e explica o motivo;
          o <strong>backend</strong> recusa a chamada (403 ou 409); e o <strong>banco</strong> barra gravações que quebram as regras (triggers RN01–RN08).
        </span>
      </div>

      <section className="card">
        <h2>Funções</h2>
        <div className="tabela-wrap tabela-wrap--sem-borda">
          <table className="tabela tabela--compacta tabela-permissoes">
            <thead>
              <tr>
                <th>Função</th>
                {PERFIS_SISTEMA.map((p) => <th key={p} className="centro">{ROTULO[p]}</th>)}
                <th>Regra</th>
              </tr>
            </thead>
            {grupos.map((g) => (
              <tbody key={g}>
                <tr className="tabela-permissoes__grupo"><th colSpan={PERFIS_SISTEMA.length + 2}>{g}</th></tr>
                {Object.entries(ACOES).filter(([, a]) => a.grupo === g).map(([id, a]) => (
                  <tr key={id}>
                    <td>{a.rotulo}</td>
                    {PERFIS_SISTEMA.map((p) => <Celula key={p} sim={a.perfis.includes(p)} observacao={a.perfis.includes(p) && p !== 'visitante' ? a.observacao : null} />)}
                    <td className="texto-suave">{a.regra || '—'}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Páginas</h2>
        <p className="texto-suave">Quem não tem o perfil vê a tela “Acesso restrito”; quem não entrou vai para o login e volta para a página depois.</p>
        <div className="tabela-wrap tabela-wrap--sem-borda">
          <table className="tabela tabela--compacta tabela-permissoes">
            <thead><tr><th>Área</th><th>Endereços</th>{PERFIS_SISTEMA.map((p) => <th key={p} className="centro">{ROTULO[p]}</th>)}</tr></thead>
            <tbody>
              {ROTAS_POR_PERFIL.map((r) => (
                <tr key={r.descricao}>
                  <td><strong>{r.descricao}</strong></td>
                  <td><code>{r.rota}</code></td>
                  {PERFIS_SISTEMA.map((p) => <Celula key={p} sim={r.perfis.includes(p)} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Exemplos de acesso restrito</h2>
        <ul className="lista-exemplos">
          <li><strong>Adotante abre /admin</strong> → tela “Acesso restrito”, com botão para a área dele.</li>
          <li><strong>Visitante clica em “Quero adotar”</strong> → vai para o login e volta para o animal depois.</li>
          <li><strong>ONG pendente tenta cadastrar animal</strong> → o botão não aparece e o formulário explica que falta a aprovação (RN04).</li>
          <li><strong>ONG tenta marcar um animal como “Adotado” manualmente</strong> → a opção fica bloqueada; “adotado” só pela conclusão da adoção (RN06).</li>
          <li><strong>Administrador tenta desativar a própria conta</strong> → o botão fica desabilitado, com o motivo.</li>
          <li><strong>ONG abre a solicitação de outra ONG pelo endereço</strong> → o backend responde “Solicitação não encontrada”.</li>
        </ul>
      </section>
    </div>
  );
}
