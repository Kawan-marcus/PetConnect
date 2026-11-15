/**
 * Testes de navegação, validação e fluxo pela interface (Sprint 09).
 *
 * Abre o PetConnect num navegador de verdade (Chromium) com o back-end e o banco
 * ligados, executa cada caso de teste, tira um print e gera RELATORIO.md.
 *
 * Como rodar (com o back e o front ligados):
 *   npm install --no-save playwright
 *   npx playwright install chromium
 *   node testes-e2e/sistema.cjs http://localhost:5173
 *
 * Use HASH=1 se o front estiver publicado com HashRouter (endereços com #/).
 */
const fs = require('fs');
const path = require('path');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(process.env.PLAYWRIGHT_PATH); }

const BASE = (process.argv[2] || 'http://localhost:5173').replace(/\/$/, '');
const HASH = process.env.HASH === '1';
const SAIDA = process.env.SAIDA || path.join(__dirname, 'resultado');
const SUF = String(Date.now()).slice(-6);
fs.mkdirSync(SAIDA, { recursive: true });

const url = (rota) => (HASH ? `${BASE}/#${rota}` : `${BASE}${rota}`);
const casos = [];
const caso = (id, tipo, descricao, esperado, fn) => casos.push({ id, tipo, descricao, esperado, fn });

(async () => {
  const navegador = await playwright.chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await contexto.newPage();
  p.setDefaultTimeout(8000);
  const errosJs = [];
  p.on('pageerror', (e) => errosJs.push(e.message));

  const ir = async (rota) => { await p.goto(url(rota)); await p.waitForTimeout(900); };
  const rotaAtual = () => decodeURIComponent(HASH ? new URL(p.url()).hash.slice(1) : new URL(p.url()).pathname + new URL(p.url()).search);
  const h1 = async () => (await p.locator('h1').first().textContent({ timeout: 3000 }).catch(() => '')).trim();
  // Limpa a sessão e recarrega a página (a aplicação guarda o usuário em memória)
  const sair = async () => { await ir('/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700); };
  const entrar = async (email, senha = '123456') => {
    await sair(); await ir('/login');
    await p.fill('input[name=email]', email); await p.fill('input[name=senha]', senha);
    await p.click('form button:not([type=button])'); await p.waitForTimeout(1300);
  };
  const textoDaPagina = () => p.locator('main, body').first().innerText();
  const verMenu = async (links) => {
    const resultados = [];
    for (const [rotulo, rota] of links) {
      await ir(rota);
      const titulo = await h1();
      const erro = /Algo deu errado|Página não encontrada|exclusiva para/.test(await textoDaPagina());
      resultados.push(`${rotulo}: ${erro ? 'ERRO' : titulo || 'ok'}`);
    }
    return resultados;
  };

  /* ───────── Navegação ───────── */
  caso('NV-01', 'Navegação', 'Visitante percorre o menu público (Início, Animais, Como funciona, Entrar, Cadastrar)',
    'Todas as páginas abrem com título, sem erro', async () => {
      const r = await verMenu([['Início', '/'], ['Animais', '/animais'], ['Como funciona', '/como-funciona'], ['Entrar', '/login'], ['Cadastrar', '/cadastro']]);
      return { ok: !r.some((x) => x.includes('ERRO')), obtido: r.join(' · ') };
    });
  caso('NV-02', 'Navegação', 'Visitante abre uma área logada pelo endereço (/minhas-solicitacoes)',
    'Vai para o login e, depois de entrar, volta para a página pedida', async () => {
      await sair(); await ir('/minhas-solicitacoes');
      const foiLogin = rotaAtual().startsWith('/login');
      await p.fill('input[name=email]', 'ana@email.com'); await p.fill('input[name=senha]', '123456');
      await p.click('form button:not([type=button])'); await p.waitForTimeout(1500);
      return { ok: foiLogin && rotaAtual() === '/minhas-solicitacoes', obtido: `login: ${foiLogin}, depois: ${rotaAtual()}` };
    });
  caso('NV-03', 'Navegação', 'Visitante clica em "Entrar para adotar" no detalhe de um animal',
    'Login e volta para o mesmo animal', async () => {
      await sair(); await ir('/animais'); await p.locator('a[href*="animais/"]').first().click(); await p.waitForTimeout(900);
      const animal = rotaAtual();
      await p.click('text=Entrar para adotar'); await p.waitForTimeout(700);
      await p.fill('input[name=email]', 'ana@email.com'); await p.fill('input[name=senha]', '123456');
      await p.click('form button:not([type=button])'); await p.waitForTimeout(1500);
      return { ok: rotaAtual() === animal, obtido: `animal ${animal} → depois do login ${rotaAtual()}` };
    });
  caso('NV-04', 'Navegação', 'Adotante entra e percorre o próprio menu',
    'Cai em /minha-area e todas as páginas do menu abrem', async () => {
      await entrar('ana@email.com'); const inicio = rotaAtual();
      const r = await verMenu([['Minha área', '/minha-area'], ['Recomendados', '/recomendados'], ['Favoritos', '/favoritos'], ['Solicitações', '/minhas-solicitacoes'], ['Formulário', '/formulario'], ['Comparar', '/comparar'], ['Perfil', '/perfil']]);
      return { ok: inicio === '/minha-area' && !r.some((x) => x.includes('ERRO')), obtido: `início ${inicio} · ${r.join(' · ')}` };
    });
  caso('NV-05', 'Navegação', 'Adotante tenta abrir a área do administrador (/admin)',
    'Tela "Acesso restrito" com botão para a própria área', async () => {
      await entrar('ana@email.com'); await ir('/admin');
      const t = await h1(); const botao = await p.locator('a.btn').first().getAttribute('href').catch(() => '');
      return { ok: /exclusiva/i.test(t), obtido: `"${t}", botão → ${botao}` };
    });
  caso('NV-06', 'Navegação', 'ONG entra e percorre o próprio menu',
    'Cai em /ong e todas as páginas abrem', async () => {
      await entrar('ong@patinhas.org'); const inicio = rotaAtual();
      const r = await verMenu([['Painel', '/ong'], ['Animais', '/ong/animais'], ['Novo animal', '/ong/animais/novo'], ['Solicitações', '/ong/solicitacoes'], ['Pós-adoção', '/ong/acompanhamentos'], ['Relatórios', '/ong/relatorios'], ['Perfil', '/perfil']]);
      return { ok: inicio === '/ong' && !r.some((x) => x.includes('ERRO')), obtido: `início ${inicio} · ${r.join(' · ')}` };
    });
  caso('NV-07', 'Navegação', 'ONG tenta abrir área do adotante (/favoritos)', 'Tela "Acesso restrito"', async () => {
    await entrar('ong@patinhas.org'); await ir('/favoritos'); const t = await h1();
    return { ok: /exclusiva/i.test(t), obtido: t };
  });
  caso('NV-08', 'Navegação', 'Administrador entra e percorre o menu (dashboard, ONGs, usuários, animais, relatórios, adoções, operações, pesquisa, permissões)',
    'Cai em /admin e todas as páginas abrem', async () => {
      await entrar('admin@adotapet.com'); const inicio = rotaAtual();
      const r = await verMenu([['Dashboard', '/admin'], ['ONGs', '/admin/ongs'], ['Usuários', '/admin/usuarios'], ['Animais', '/admin/animais'], ['Relatórios', '/admin/relatorios'], ['Adoções', '/admin/historico'], ['Operações', '/admin/operacoes'], ['Pesquisar', '/admin/pesquisa'], ['Permissões', '/admin/permissoes']]);
      return { ok: inicio === '/admin' && !r.some((x) => x.includes('ERRO')), obtido: `início ${inicio} · ${r.join(' · ')}` };
    });
  caso('NV-09', 'Navegação', 'ONG pendente entra no painel', 'Painel abre com aviso de aprovação pendente, sem erro', async () => {
    await entrar('amigos4patas@email.com'); await ir('/ong'); const txt = await textoDaPagina();
    return { ok: /aprova/i.test(txt) && !/Algo deu errado/.test(txt), obtido: /aprova/i.test(txt) ? 'aviso de aprovação exibido' : 'sem aviso' };
  });
  caso('NV-10', 'Navegação', 'Endereço que não existe (/pagina-que-nao-existe)', 'Página "não encontrada" com link para o início', async () => {
    await ir('/pagina-que-nao-existe'); const t = await h1();
    return { ok: /não encontrada/i.test(t), obtido: t };
  });
  caso('NV-11', 'Navegação', 'Trilha de navegação no cadastro de animal da ONG', 'Mostra o caminho até a página e os links funcionam', async () => {
    await entrar('ong@patinhas.org'); await ir('/ong/animais/novo');
    const trilha = (await p.locator('nav[aria-label*="rilha"], .trilha').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    await p.locator('.trilha a, nav[aria-label*="rilha"] a').last().click().catch(() => {}); await p.waitForTimeout(700);
    return { ok: trilha.length > 0 && rotaAtual().startsWith('/ong'), obtido: `trilha "${trilha}", clique → ${rotaAtual()}` };
  });
  caso('NV-12', 'Navegação', 'Sair da conta e tentar voltar para a área logada', 'Depois de sair, a área logada pede login de novo', async () => {
    await entrar('ana@email.com'); await p.click('button[aria-label="Menu do usuário"]');
    await p.click('.dropdown__item:has-text("Sair")'); await p.waitForTimeout(800); const depoisDeSair = rotaAtual(); await ir('/minha-area');
    return { ok: depoisDeSair === '/' && rotaAtual().startsWith('/login'), obtido: `depois de sair: ${depoisDeSair}; ao abrir /minha-area: ${rotaAtual()}` };
  });
  caso('NV-13', 'Navegação', 'Token vencido ou inválido guardado no navegador', 'O sistema não quebra e pede login', async () => {
    await sair(); await p.evaluate(() => localStorage.setItem('adotapet.token', 'token.invalido.123')); await p.reload(); await ir('/minha-area');
    return { ok: rotaAtual().startsWith('/login'), obtido: rotaAtual() };
  });

  /* ───────── Validação na interface ───────── */
  caso('VL-01', 'Validação', 'Login com campos vazios', 'Mensagens embaixo dos campos, sem chamar o servidor', async () => {
    await sair(); await ir('/login'); await p.click('form button:not([type=button])'); await p.waitForTimeout(400);
    const msgs = await p.locator('.campo__erro').allInnerTexts();
    return { ok: msgs.length >= 2, obtido: msgs.join(' / ') };
  });
  caso('VL-02', 'Validação', 'Login com senha errada', 'Mensagem "E-mail ou senha inválidos."', async () => {
    await sair(); await ir('/login'); await p.fill('input[name=email]', 'ana@email.com'); await p.fill('input[name=senha]', 'errada1');
    await p.click('form button:not([type=button])'); await p.waitForTimeout(1200);
    const txt = await textoDaPagina();
    return { ok: /inválid/i.test(txt), obtido: (txt.match(/[^\n]*inválid[^\n]*/i) || ['nenhuma mensagem'])[0] };
  });
  caso('VL-03', 'Validação', 'Cadastro de adotante com e-mail inválido, senha curta e confirmação diferente', 'Uma mensagem para cada campo errado', async () => {
    await sair(); await ir('/cadastro');
    await p.fill('input[name=nome]', 'Te').catch(() => {}); await p.fill('input[name=email]', 'email-errado');
    await p.fill('input[name=senha]', '123'); await p.fill('input[name=confirmar]', '999');
    await p.click('form button:not([type=button])'); await p.waitForTimeout(400);
    const msgs = await p.locator('.campo__erro').allInnerTexts();
    return { ok: msgs.length >= 3, obtido: msgs.join(' / ') };
  });
  caso('VL-04', 'Validação', 'Cadastro de ONG com CNPJ inválido (11.111.111/1111-11)', 'Mensagem "CNPJ inválido"', async () => {
    await sair(); await ir('/cadastro?tipo=ong');
    await p.click('text=Sou uma ONG').catch(() => {}); await p.waitForTimeout(300);
    await p.fill('input[name=cnpj]', '11.111.111/1111-11'); await p.click('form button:not([type=button])'); await p.waitForTimeout(400);
    const msgs = await p.locator('.campo__erro').allInnerTexts();
    return { ok: msgs.some((m) => /CNPJ inválido/i.test(m)), obtido: msgs.filter((m) => /CNPJ/i.test(m)).join(' / ') || msgs.join(' / ') };
  });
  caso('VL-05', 'Validação', 'Cadastro de animal enviado vazio', 'Mensagens nos campos obrigatórios', async () => {
    await entrar('ong@patinhas.org'); await ir('/ong/animais/novo');
    await p.click('form button:not([type=button])'); await p.waitForTimeout(400);
    const msgs = await p.locator('.campo__erro').allInnerTexts();
    return { ok: msgs.length >= 5, obtido: `${msgs.length} mensagens: ${msgs.slice(0, 4).join(' / ')}…` };
  });
  caso('VL-06', 'Validação', 'Cadastro de animal com 30 anos de idade', 'Mensagem "no máximo 25 anos"', async () => {
    await ir('/ong/animais/novo'); await p.fill('input[name=idadeAnos]', '30');
    await p.click('form button:not([type=button])'); await p.waitForTimeout(400);
    const msgs = await p.locator('.campo__erro').allInnerTexts();
    return { ok: msgs.some((m) => /25 anos/.test(m)), obtido: msgs.filter((m) => /idade|anos/i.test(m)).join(' / ') };
  });
  caso('VL-07', 'Validação', 'Formulário de avaliação enviado sem respostas', 'Mensagens pedindo as respostas', async () => {
    await entrar('marina@email.com'); await ir('/formulario');
    await p.click('form button:not([type=button])'); await p.waitForTimeout(400);
    const msgs = await p.locator('.campo__erro').allInnerTexts();
    return { ok: msgs.length >= 1, obtido: `${msgs.length} mensagens: ${msgs.slice(0, 3).join(' / ')}` };
  });
  caso('VL-08', 'Validação', 'Pesquisa geral do admin com 1 letra', 'Pede pelo menos 2 letras', async () => {
    await entrar('admin@adotapet.com'); await ir('/admin/pesquisa'); await p.fill('input[type=search]', 'a'); await p.waitForTimeout(500);
    const txt = await textoDaPagina();
    return { ok: /pelo menos 2/i.test(txt), obtido: (txt.match(/[^\n]*pelo menos 2[^\n]*/i) || ['sem aviso'])[0] };
  });

  /* ───────── Fluxo completo pela interface ───────── */
  let animalFluxo = null;
  caso('FX-01', 'Fluxo', 'ONG cadastra um animal pela tela', 'Animal salvo e listado em "Meus animais"', async () => {
    await entrar('ong@patinhas.org'); await ir('/ong/animais/novo');
    const nome = 'E2E' + SUF;
    await p.fill('input[name=nome]', nome);
    const escolher = (nome, valor) => p.locator(`label:has(input[name=${nome}][value="${valor}"])`).first().click();
    await escolher('especie', 'cao');
    await p.fill('input[name=raca]', 'SRD'); await p.fill('input[name=idadeAnos]', '2');
    await escolher('sexo', 'F'); await escolher('porte', 'medio'); await escolher('energia', 'media');
    for (const n of ['convivenciaCriancas', 'convivenciaAnimais', 'castrado', 'vacinado']) await escolher(n, 'sim');
    await p.fill('textarea[name=descricao]', 'Cadela muito carinhosa, criada em teste automatizado de ponta a ponta.');
    const foto = path.join(__dirname, 'foto-teste.png');
    if (!fs.existsSync(foto)) fs.writeFileSync(foto, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
    await p.setInputFiles('input[type=file]', foto); await p.waitForTimeout(1500);
    await p.click('form button:not([type=button])'); await p.waitForTimeout(1800);
    await ir('/ong/animais'); const txt = await textoDaPagina();
    animalFluxo = nome;
    return { ok: txt.includes(nome), obtido: txt.includes(nome) ? `${nome} aparece em Meus animais` : `não apareceu (rota ${rotaAtual()})` };
  });
  caso('FX-02', 'Fluxo', 'Adotante encontra o animal no catálogo e solicita a adoção', 'Pedido enviado e visível em "Minhas solicitações" como Pendente', async () => {
    await entrar('ana@email.com'); await ir('/animais');
    await p.fill('input[type=search]', animalFluxo).catch(() => {}); await p.waitForTimeout(1200);
    await p.locator(`a:has-text("${animalFluxo}")`).first().click(); await p.waitForTimeout(1200);
    await p.click('text=Solicitar adoção'); await p.waitForTimeout(400);
    await p.fill('#msg', 'Pedido feito pelo teste automatizado.'); await p.click('text=Enviar solicitação'); await p.waitForTimeout(1500);
    await ir('/minhas-solicitacoes'); const txt = await textoDaPagina();
    return { ok: txt.includes(animalFluxo), obtido: txt.includes(animalFluxo) ? 'pedido listado' : 'pedido não encontrado' };
  });
  caso('FX-03', 'Fluxo', 'ONG analisa, aprova e conclui a adoção pela tela', 'Pedido "Concluída" e animal "Adotado"', async () => {
    await entrar('ong@patinhas.org'); await ir('/ong/solicitacoes');
    await p.locator('.abas button, .aba').filter({ hasText: /Todas|Pendentes|Novas/ }).first().click().catch(() => {});
    await p.fill('input[type=search]', animalFluxo).catch(() => {}); await p.waitForTimeout(800);
    await p.locator(`a:has-text("${animalFluxo}")`).first().click(); await p.waitForTimeout(1200);
    const passos = [];
    for (const [nome, botao, confirma] of [['analisar', /análise/i, null], ['aprovar', /^\s*Aprovar\s*$/, /Aprovar|Confirmar/], ['concluir', /Concluir adoção/, /Concluir|Confirmar/]]) {
      await p.locator('button').filter({ hasText: botao }).first().click(); await p.waitForTimeout(700);
      if (confirma) { await p.locator('.modal button').filter({ hasText: confirma }).last().click(); await p.waitForTimeout(1300); }
      passos.push(nome);
    }
    const txt = await textoDaPagina();
    await ir('/ong/animais'); const lista = await textoDaPagina();
    const linha = lista.split('\n').findIndex((l) => l.includes(animalFluxo));
    const adotado = lista.split('\n').slice(linha, linha + 6).join(' ').includes('Adotado');
    return { ok: /Concluída/i.test(txt) && adotado, obtido: `passos: ${passos.join(' → ')}; pedido concluído: ${/Concluída/i.test(txt)}; animal adotado: ${adotado}` };
  });
  caso('FX-04', 'Fluxo', 'Administrador acha a adoção na pesquisa e no histórico de operações', 'A adoção aparece na pesquisa e as etapas no histórico', async () => {
    await entrar('admin@adotapet.com'); await ir('/admin/pesquisa'); await p.fill('input[type=search]', animalFluxo); await p.waitForTimeout(1200);
    const pesquisa = (await textoDaPagina()).includes(animalFluxo);
    await ir('/admin/operacoes'); await p.fill('input[type=search]', animalFluxo).catch(() => {}); await p.waitForTimeout(1000);
    const ops = (await p.locator('table tbody tr').count());
    return { ok: pesquisa && ops >= 2, obtido: `na pesquisa: ${pesquisa}; registros no histórico: ${ops}` };
  });

  /* ───────── Execução ───────── */
  const resultados = [];
  for (const c of casos) {
    let r;
    errosJs.length = 0;
    try { r = await c.fn(); } catch (e) { r = { ok: false, obtido: 'Erro no teste: ' + e.message.split('\n')[0] }; }
    if (errosJs.length) { r.ok = false; r.obtido += ` · erro de JavaScript: ${errosJs[0]}`; }
    const print = `${c.id}.png`;
    await p.screenshot({ path: path.join(SAIDA, print), fullPage: false }).catch(() => {});
    resultados.push({ ...c, ...r, print });
    console.log(`${r.ok ? 'PASSOU' : 'FALHOU'}  ${c.id}  ${c.descricao}\n        → ${r.obtido}`);
  }
  await navegador.close();

  const limpa = (t) => String(t).replace(/\|/g, '/').replace(/\n/g, ' ');
  const linhas = ['# Relatório dos testes pela interface (navegação, validação e fluxo)', '',
    `Gerado em ${new Date().toLocaleString('pt-BR')} · ${resultados.filter((r) => r.ok).length} de ${resultados.length} casos passaram.`,
    '', 'Sistema real: front + back + banco. Cada caso tem um print com o mesmo nome do ID.', ''];
  for (const tipo of ['Navegação', 'Validação', 'Fluxo']) {
    linhas.push(`## ${tipo}`, '', '| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |', '|---|---|---|---|---|');
    resultados.filter((r) => r.tipo === tipo).forEach((r) => linhas.push(`| ${r.id} | ${limpa(r.descricao)} | ${limpa(r.esperado)} | ${limpa(r.obtido)} | ${r.ok ? '✅ PASSOU' : '❌ FALHOU'} |`));
    linhas.push('');
  }
  fs.writeFileSync(path.join(SAIDA, 'RELATORIO.md'), linhas.join('\n'));
  process.exit(resultados.every((r) => r.ok) ? 0 : 1);
})();
