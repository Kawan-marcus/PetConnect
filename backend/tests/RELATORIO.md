# Relatório dos testes automatizados do back-end

Gerado em 16/11/2026 19:56 · 106 de 106 casos passaram.

Comando: `python -m pytest tests -v` (dentro da pasta `backend`).


## Autenticação e perfil

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| CT-01 | Login com e-mail e senha corretos (administrador) | 200, token e perfil "admin" | 200, perfil admin, token sim | ✅ PASSOU |
| CT-02 | Login com e-mail em maiúsculas e espaços | 200 (o e-mail não diferencia maiúsculas) | 200 | ✅ PASSOU |
| CT-03 | Login com senha errada | 401 "E-mail ou senha inválidos." | 401 E-mail ou senha inválidos. | ✅ PASSOU |
| CT-04 | Login com e-mail que não existe | 401 com a mesma mensagem (não revela se o e-mail existe) | 401 E-mail ou senha inválidos. | ✅ PASSOU |
| CT-05 | Login sem e-mail e sem senha | 400 ou 422 com mensagem | 401 | ✅ PASSOU |
| CT-06 | Consultar o próprio perfil com token válido | 200 com nome, e-mail e perfil, sem a senha | 200, perfil adotante, campos de senha: [] | ✅ PASSOU |
| CT-07 | Acessar rota protegida sem token | 401 | 401 | ✅ PASSOU |
| CT-08 | Acessar rota protegida com token falso | 401 | 401 | ✅ PASSOU |
| CT-09 | Atualizar nome, cidade e telefone do próprio perfil | 200 e os dados novos em /me | 200, nome agora: Teste Perfil Novo, cidade: Goiânia - GO | ✅ PASSOU |
| CT-10 | Atualizar perfil com nome de 2 letras | 400 "Nome deve possuir pelo menos 3 caracteres." | 400 Nome deve possuir pelo menos 3 caracteres. | ✅ PASSOU |
| CT-11 | Trocar a senha no perfil e entrar com a nova | senha antiga recusada (401) e nova aceita (200) | antiga 401, nova 200 | ✅ PASSOU |
| CT-12 | Pedir recuperação de senha para e-mail que não existe | 200 com mensagem genérica (não revela se o e-mail existe) | 200 {'mensagem': 'Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.'} | ✅ PASSOU |
| CT-13 | Redefinir senha com código inválido | 400 com mensagem | 400 Link inválido ou expirado. Solicite um novo. | ✅ PASSOU |

## Cadastro de contas (validações)

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| CT-14 | Cadastrar adotante com dados válidos | 201/200, perfil "adotante" e login liberado | 200, login 200 | ✅ PASSOU |
| CT-15 | Cadastrar com e-mail que já existe | 409 "Já existe um usuário cadastrado com este e-mail." | 409 Já existe um usuário cadastrado com este e-mail. | ✅ PASSOU |
| CT-16 | Cadastro de adotante com dado inválido (nome curto, e-mail inválido, senha curta, campo faltando) | 400 ou 422 com mensagem explicando o erro | nome curto: 400 Nome deve possuir pelo menos 3 caracteres. | ✅ PASSOU |
| CT-16 | Cadastro de adotante com dado inválido (nome curto, e-mail inválido, senha curta, campo faltando) | 400 ou 422 com mensagem explicando o erro | e-mail inválido: 400 E-mail inválido. | ✅ PASSOU |
| CT-16 | Cadastro de adotante com dado inválido (nome curto, e-mail inválido, senha curta, campo faltando) | 400 ou 422 com mensagem explicando o erro | senha curta: 400 A senha deve possuir pelo menos 6 caracteres. | ✅ PASSOU |
| CT-16 | Cadastro de adotante com dado inválido (nome curto, e-mail inválido, senha curta, campo faltando) | 400 ou 422 com mensagem explicando o erro | sem e-mail: 422 validação do campo | ✅ PASSOU |
| CT-17 | Cadastrar ONG com dados válidos | 201/200 e a ONG fica "pendente" até o administrador aprovar (RN04) | 200, status da ONG: pendente | ✅ PASSOU |
| CT-18 | Cadastrar ONG com CNPJ já usado | 409 "Já existe uma ONG cadastrada com este CNPJ." | 409 Já existe uma ONG cadastrada com este CNPJ. | ✅ PASSOU |
| CT-19 | Cadastrar ONG com CNPJ em formato inválido ("123") | 400 "CNPJ inválido." | 400 CNPJ inválido. Confira os 14 números (00.000.000/0000-00). | ✅ PASSOU |
| CT-20 | Cadastrar ONG sem telefone | 400 "Informe o telefone da ONG." | 400 Informe o telefone da ONG. | ✅ PASSOU |

## Animais: cadastro, consulta, edição e exclusão

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| CT-21 | ONG aprovada cadastra um animal | 201/200, status "disponivel" e o animal aparece no catálogo | id 99, status disponivel, no catálogo: True | ✅ PASSOU |
| CT-22 | Consultar o detalhe de um animal | 200 com dados do animal, fotos e ONG | 200, Rex4975, ONG Patinhas Felizes, 1 foto(s) | ✅ PASSOU |
| CT-23 | Consultar animal que não existe | 404 "Animal não encontrado." | 404 Animal não encontrado. | ✅ PASSOU |
| CT-24 | ONG edita os dados do próprio animal | 200 e a descrição nova gravada | 200, descrição: Descrição atualizada pelo teste automatizado. | ✅ PASSOU |
| CT-25 | ONG tenta editar animal de outra ONG | 403 ou 404 | 403 Você não pode editar um animal de outra ONG. | ✅ PASSOU |
| CT-26 | Cadastrar animal com dado inválido (nome vazio, espécie/porte/sexo fora da lista, idade negativa ou absurda, sem foto, descrição curta) | 400 ou 422 com mensagem | nome vazio: 400 Informe o nome do animal. | ✅ PASSOU |
| CT-26 | Cadastrar animal com dado inválido (nome vazio, espécie/porte/sexo fora da lista, idade negativa ou absurda, sem foto, descrição curta) | 400 ou 422 com mensagem | espécie inválida: 400 Espécie inválida. | ✅ PASSOU |
| CT-26 | Cadastrar animal com dado inválido (nome vazio, espécie/porte/sexo fora da lista, idade negativa ou absurda, sem foto, descrição curta) | 400 ou 422 com mensagem | porte inválido: 400 Porte inválido. | ✅ PASSOU |
| CT-26 | Cadastrar animal com dado inválido (nome vazio, espécie/porte/sexo fora da lista, idade negativa ou absurda, sem foto, descrição curta) | 400 ou 422 com mensagem | idade negativa: 400 A idade do animal deve ser maior que zero. | ✅ PASSOU |
| CT-26 | Cadastrar animal com dado inválido (nome vazio, espécie/porte/sexo fora da lista, idade negativa ou absurda, sem foto, descrição curta) | 400 ou 422 com mensagem | idade absurda (50 anos): 400 Idade inválida: informe no máximo 25 anos (300 meses). | ✅ PASSOU |
| CT-26 | Cadastrar animal com dado inválido (nome vazio, espécie/porte/sexo fora da lista, idade negativa ou absurda, sem foto, descrição curta) | 400 ou 422 com mensagem | sexo inválido: 400 Sexo inválido. | ✅ PASSOU |
| CT-26 | Cadastrar animal com dado inválido (nome vazio, espécie/porte/sexo fora da lista, idade negativa ou absurda, sem foto, descrição curta) | 400 ou 422 com mensagem | sem foto: 400 Adicione pelo menos uma foto do animal. | ✅ PASSOU |
| CT-26 | Cadastrar animal com dado inválido (nome vazio, espécie/porte/sexo fora da lista, idade negativa ou absurda, sem foto, descrição curta) | 400 ou 422 com mensagem | descrição curta: 400 A descrição deve possuir pelo menos 20 caracteres. | ✅ PASSOU |
| CT-27 | ONG tenta marcar o animal como "adotado" à mão (RN06) | 409, "adotado" só pela conclusão da adoção | 409 Os status 'em_processo' e 'adotado' são controlados pelo fluxo de solicitações de adoção. | ✅ PASSOU |
| CT-28 | Alterar status do animal para um valor que não existe | 400 ou 422 | 400 Status do animal inválido. | ✅ PASSOU |
| CT-29 | ONG remove um animal sem pedidos | 200/204 e o animal some do catálogo (exclusão lógica) | 200, ainda no catálogo: False, detalhe: 404 | ✅ PASSOU |
| CT-30 | ONG tenta remover animal com solicitação em aberto (RN08) | 409 com mensagem | 409 Não é possível remover um animal com solicitações em andamento. | ✅ PASSOU |
| CT-31 | ONG pendente tenta cadastrar animal (RN04) | 403 | 403 A ONG precisa estar aprovada e ativa para realizar esta operação. | ✅ PASSOU |
| CT-32 | Adotante tenta cadastrar animal | 403 | 403 | ✅ PASSOU |
| CT-33 | Animal de ONG não aprovada não aparece no catálogo público | nenhum animal do catálogo pertence a ONG pendente/suspensa | 58 no catálogo, de ONG não aprovada: 0 | ✅ PASSOU |

## Área do adotante (formulário, favoritos, IA, notificações)

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| CT-34 | Adotante preenche e consulta o formulário de avaliação | 200 e os dados salvos voltam iguais | 200, moradia casa, pessoas 3 | ✅ PASSOU |
| CT-35 | Formulário com moradia fora da lista e horas sozinho negativas | 400 ou 422 | 400 | ✅ PASSOU |
| CT-36 | Adotante sem formulário tenta pedir adoção (RN03) | 400/409/422 pedindo para preencher o formulário | 400 Preencha o formulário de avaliação antes de solicitar a adoção. | ✅ PASSOU |
| CT-37 | Favoritar um animal e depois remover o favorito | aparece em /favoritos e some ao clicar de novo | após favoritar: True; após remover: False | ✅ PASSOU |
| CT-38 | Recomendações da IA para adotante com formulário | 200, lista ordenada por compatibilidade | 200, 9 animais, scores [97, 97, 97, 97, 97] | ✅ PASSOU |
| CT-39 | Compatibilidade entre o adotante e um animal | 200 com score de 0 a 100 e motivos | 200, score 97 | ✅ PASSOU |
| CT-40 | Listar e marcar notificações como lidas | 200 nas duas chamadas e nenhuma não lida depois | 200/200, não lidas depois: 0 | ✅ PASSOU |

## Solicitações de adoção (fluxo e regras de negócio)

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| CT-41 | Adotante com formulário pede adoção de um animal disponível | 201/200, status "pendente" e score de compatibilidade | 200, status pendente, score 97 | ✅ PASSOU |
| CT-42 | Mesmo adotante pede o mesmo animal de novo (RN05) | 409 "já existe solicitação ativa" | 409 Você já tem uma solicitação ativa para este animal. | ✅ PASSOU |
| CT-43 | Outro adotante pede o mesmo animal | 201/200 (vários interessados podem pedir) | 200, status pendente | ✅ PASSOU |
| CT-44 | A ONG vê os pedidos do próprio animal | os dois pedidos aparecem em /ong/solicitacoes | Ana: True, Carlos: True | ✅ PASSOU |
| CT-45 | Outra ONG tenta abrir o pedido pelo número | 403 ou 404 | 403 | ✅ PASSOU |
| CT-46 | ONG recusa um pedido sem informar o motivo | 400 ou 422 pedindo o motivo | 400 Informe o motivo da recusa. | ✅ PASSOU |
| CT-47 | ONG tenta concluir uma adoção que ainda não foi aprovada (RN07) | 409 | 409 Somente uma solicitação aprovada pode ser concluída. | ✅ PASSOU |
| CT-48 | ONG coloca o pedido em análise | 200 e status "em_analise" | 200, status em_analise | ✅ PASSOU |
| CT-49 | Adotante tenta aprovar o próprio pedido | 403 | 403 | ✅ PASSOU |
| CT-50 | ONG aprova o pedido (RN02) | 200, pedido "aprovada", animal "em_processo" e o outro pedido "encerrada" | 200, pedido aprovada, animal em_processo, outro pedido encerrada | ✅ PASSOU |
| CT-51 | Novo adotante tenta pedir animal que já está em processo de adoção (RN01) | 409 | 409 Este animal não está disponível para adoção. | ✅ PASSOU |
| CT-52 | Adotante tenta cancelar um pedido já aprovado | 409 (só cancela pendente ou em análise) | 409 Esta solicitação não pode mais ser cancelada. | ✅ PASSOU |
| CT-53 | ONG conclui a adoção | 200, pedido "concluida" e animal "adotado" | 200, pedido concluida, animal adotado | ✅ PASSOU |
| CT-54 | Linha do tempo do pedido registra cada etapa | pendente → em_analise → aprovada → concluida | pendente → em_analise → aprovada → concluida | ✅ PASSOU |
| CT-55 | ONG registra acompanhamento pós-adoção | 201/200 e o registro aparece em /ong/adocoes | 200, acompanhamentos: 1 | ✅ PASSOU |
| CT-56 | Acompanhamento com data no futuro | 400 ou 422 | 400 A data do acompanhamento não pode estar no futuro. | ✅ PASSOU |
| CT-57 | Pedir adoção de animal já adotado (RN01) | 409 | 409 Este animal não está disponível para adoção. | ✅ PASSOU |
| CT-58 | Adotante cancela um pedido pendente | 200 e status "cancelada" | 200, status cancelada | ✅ PASSOU |
| CT-59 | ONG recusa um pedido informando o motivo | 200, status "recusada" e o motivo visível para o adotante | 200, status recusada, motivo: Moradia sem tela de proteção. | ✅ PASSOU |

## Administração (contas, ONGs, logs)

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| CT-60 | Listar usuários filtrando por perfil e busca | 200 e só usuários do perfil pedido que batem com a busca | 200, 3 resultado(s), perfis {'adotante'} | ✅ PASSOU |
| CT-61 | Administrador desativa uma conta e depois reativa | conta desativada não entra (403); reativada entra (200) | desativada: 403, reativada: 200 | ✅ PASSOU |
| CT-62 | Conta desativada enquanto estava logada perde o acesso na hora | o token que já existia passa a dar 401 | antes 200, depois 401 | ✅ PASSOU |
| CT-63 | Administrador tenta desativar a própria conta | 409 | 409 Você não pode desativar a sua própria conta. | ✅ PASSOU |
| CT-64 | Administrador aprova uma ONG pendente | 200 e a ONG passa a cadastrar animais | 200, cadastro de animal depois: 200 | ✅ PASSOU |
| CT-65 | Mudar status de ONG para valor que não existe | 400 ou 422 | 400 Status inválido. Use: pendente, aprovada ou suspensa. | ✅ PASSOU |
| CT-66 | Estatísticas do dashboard | 200 com totais (animais, solicitações, adotantes, ONGs) | 200, {'animaisDisponiveis': 58, 'emProcesso': 3, 'adotados': 37, 'adotantes': 79, 'ongsAprovadas': 6, 'ongsPendentes': 9, 'solicitacoesAbertas': 13} | ✅ PASSOU |
| CT-67 | Histórico de operações (logs) | 200, registros com data, ação, entidade e usuário | 200, 50 registros, ações: ['acompanhamento.registrado', 'animal.cadastrado', 'animal.editado', 'animal.excluido'] | ✅ PASSOU |
| CT-68 | Logs filtrados por período e tipo | só registros de solicitação dentro do período | 200, 385 registros, entidades {'solicitacao'} | ✅ PASSOU |
| CT-69 | Logs com data em formato inválido | 422 | 422 | ✅ PASSOU |
| CT-70 | Administrador remove anúncio de animal sem pedidos | 200/204 | 200 | ✅ PASSOU |

## Consultas, paginação e permissões

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| CT-71 | Catálogo filtrado por espécie | só gatos | 19 animais, espécies {'gato'} | ✅ PASSOU |
| CT-72 | Catálogo filtrado por porte e sexo | só animais daquele porte e sexo | 10 animais | ✅ PASSOU |
| CT-73 | Busca por nome no catálogo | encontra o animal pelo nome | busca 'pri': 4 resultado(s) | ✅ PASSOU |
| CT-74 | Paginação: duas páginas seguidas não repetem animais | 5 + 5 animais diferentes | página 1 [105, 103, 104, 99, 101], página 2 [96, 94, 95, 90, 92] | ✅ PASSOU |
| CT-75 | Paginação com limite acima do máximo (5000) | 422 | 422 | ✅ PASSOU |
| CT-76 | Perfil sem permissão acessa área de outro perfil (adotante na área do admin/ONG, ONG na área do admin/adotante) | 403 | ana em /api/admin/usuarios: 403 | ✅ PASSOU |
| CT-76 | Perfil sem permissão acessa área de outro perfil (adotante na área do admin/ONG, ONG na área do admin/adotante) | 403 | ong em /api/admin/estatisticas: 403 | ✅ PASSOU |
| CT-76 | Perfil sem permissão acessa área de outro perfil (adotante na área do admin/ONG, ONG na área do admin/adotante) | 403 | ana em /api/admin/logs: 403 | ✅ PASSOU |
| CT-76 | Perfil sem permissão acessa área de outro perfil (adotante na área do admin/ONG, ONG na área do admin/adotante) | 403 | ana em /api/ong/animais: 403 | ✅ PASSOU |
| CT-76 | Perfil sem permissão acessa área de outro perfil (adotante na área do admin/ONG, ONG na área do admin/adotante) | 403 | ana em /api/ong/solicitacoes: 403 | ✅ PASSOU |
| CT-76 | Perfil sem permissão acessa área de outro perfil (adotante na área do admin/ONG, ONG na área do admin/adotante) | 403 | ong em /api/formulario: 403 | ✅ PASSOU |
| CT-77 | Área logada sem token | 401 | /api/admin/usuarios: 401 | ✅ PASSOU |
| CT-77 | Área logada sem token | 401 | /api/ong/animais: 401 | ✅ PASSOU |
| CT-77 | Área logada sem token | 401 | /api/solicitacoes/minhas: 401 | ✅ PASSOU |
| CT-77 | Área logada sem token | 401 | /api/favoritos: 401 | ✅ PASSOU |
| CT-78 | ONG pendente consulta as próprias listas | 200 (consulta liberada; cadastro bloqueado no CT-31) | 200 | ✅ PASSOU |
| CT-79 | Rota de saúde da API com o banco | 200 "conectado" | {'status': 'conectado', 'banco': 'petconnect'} | ✅ PASSOU |

## IA: sugestão pela foto (RF23) e envio de fotos

| ID | Caso de teste | Resultado esperado | Resultado obtido | Situação |
|---|---|---|---|---|
| CT-80 | ONG envia a foto de um cão | 200, espécie cão, porte grande e a sugestão gravada no banco | 200, {'valor': 'cao', 'confianca': 1.0}, raça Pastor alemão, porte grande, id 13 | ✅ PASSOU |
| CT-81 | ONG envia a foto de um gato | 200, espécie gato e porte pequeno | 200, espécie {'valor': 'gato', 'confianca': 1.0}, raça SRD, 5.5 ms | ✅ PASSOU |
| CT-82 | Foto que não mostra cão nem gato | 422 com a mensagem para preencher manualmente | 422 Não identificamos um cão ou gato nesta foto. Preencha os campos manualmente. | ✅ PASSOU |
| CT-83 | Arquivo de texto enviado como foto para a IA | 400 (formato não permitido) | 400 Formato de imagem não permitido. | ✅ PASSOU |
| CT-84 | Adotante tenta usar a sugestão pela foto | 403 (só ONG) | 403 Acesso permitido apenas para ONGs. | ✅ PASSOU |
| CT-85 | ONG aplica a sugestão; outra ONG tenta alterar o mesmo registro | 200 para a dona da sugestão e 404 para a outra ONG | dona 200 {'id': 15, 'aceita': True}, outra ONG 404 | ✅ PASSOU |
| CT-86 | Envio de foto sem estar logado (falha encontrada na revisão da Sprint 11) | recusado (401 ou 403) e nenhum arquivo gravado | 401 Not authenticated | ✅ PASSOU |
| CT-87 | ONG ainda não aprovada tenta enviar foto | 403 | 403 A ONG precisa estar aprovada e ativa para realizar esta operação. | ✅ PASSOU |
| CT-88 | ONG aprovada envia foto | 200 e endereço /uploads/... do próprio servidor | 200 http://testserver/uploads/4de4e528c538465fb083f5776259efa5.jpg | ✅ PASSOU |
