# Histórico de versões

## 1.0.0 — versão final (Sprint 12, Code Freeze)

Versão congelada para a apresentação e a entrega final. A partir dela, só entram correções críticas (versões 1.0.x).

- Sugestão de espécie, raça e porte pela foto (RF23) com MobileNetV2 + ONNX Runtime; registro do aceite da ONG.
- Medição OpenCL real gravada no dashboard (PoCL), com ganho de 96× a 136× sobre o cálculo sequencial.
- Envio de fotos protegido (só ONG aprovada); endereço das fotos sem `127.0.0.1` fixo.
- Front usa a API real por padrão; modo demonstração só com `VITE_USE_MOCK=true`.
- Revisão de código (Ruff sem problemas), senha fixa removida do script 10.
- Manual do Usuário, Manual Técnico, requisitos e casos de uso consolidados, diagramas atualizados.
- 106 testes da API e 25 da interface passando.

## 1.0.0-rc — Release Candidate (Sprints 09 e 10)

- 97 testes da API e 25 da interface; bugs B01 a B08 corrigidos.
- Swagger em português, `docs/API.md`, `docs/BANCO_DE_DADOS.md`, script 12 de verificação final.

## 0.8 — Sprints 07 e 08

- Dashboard com dados reais, relatórios com exportação CSV/PDF, pesquisa geral, histórico de operações.
- Permissões por perfil no front, no back e no banco; regras de negócio com triggers; log imutável; paginação.

## 0.6 — Sprint 06

- Módulo 3: modelo de compatibilidade treinado (regressão logística), cálculo em lote com OpenCL, recomendações e comparação.
- Logs de auditoria e melhorias de navegação (trilha, acesso restrito, 404).

## 0.5 — Sprints 03 a 05

- Login, cadastros, animais com fotos, favoritos, formulário de avaliação, fluxo completo de adoção com histórico, notificações e pós-adoção.

## 0.2 — Sprint 02

- Arquitetura, diagrama de classes, MER, modelo relacional, protótipos navegáveis e banco criado.
