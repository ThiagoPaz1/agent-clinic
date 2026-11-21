# Clínica Alvorada: assistente de atendimento (projeto de estudo)

Leia o PLANO.md antes de qualquer mudança. O escopo é fechado: não adicione recursos fora dele.
O PLANO.md é local (está no .gitignore): não copie o conteúdo dele para arquivos versionados.

## Fluxo de trabalho
- Se existir `tasks/README.md`, siga o protocolo de sessão dele (local, fora do git).
- Uma branch por task (`task/NN-nome`), PR para `main`. Nunca fazer merge.
- O Claude NUNCA executa `git add`, `git commit` ou `git push`: isso é do dono do repositório.
  Ao terminar, o Claude lista os arquivos prontos e sugere a mensagem de commit no padrão
  Conventional Commits (`feat`, `fix`, `test`, `refactor`, `chore`, `docs`, ...).
- Depois que o dono fizer o push, o Claude pode abrir o PR com `gh pr create`.
- Uma task só é concluída após revisão, aprovação e merge feitos pelo dono do repositório.

## Stack
Node.js + TypeScript (strict), Postgres + pgvector (Docker), Zod, SDK da Anthropic,
SDK do MCP (TypeScript), Transformers.js (embeddings locais, multilingual-e5-small), Vitest, tsx.

## Comandos
- `docker compose up -d`: sobe o banco
- `npm run db:seed`: recria o banco a partir do seed (não toca na tabela `chunks`)
- `npm run ingest`: indexa docs-clinica/
- `npm run chat -- --paciente 1`: CLI do agente
- `npm run eval:retrieval` / `npm run eval`: evals
- `npm test`: testes unitários

## Convenções
- TypeScript strict, sem `any`. Validar toda entrada externa com Zod.
- Regras de negócio só em `src/domain/` (puras, sem LLM, com testes).
- Nada em `src/domain/` chama `new Date()`: o "agora" entra como parâmetro. Testes, seed e evals usam `AGORA_FIXO`.
- Horários em `timestamptz`, fuso `America/Sao_Paulo`.
- A identidade do paciente vem da sessão (variável de ambiente). NUNCA como argumento de tool.
- Tools de escrita exigem confirmação do host (função `confirmar` injetada no loop). Não confiar só no prompt.
- `agendar_consulta` é idempotente conforme a seção 4.6 do PLANO.md (`ON CONFLICT DO NOTHING`, nunca checar-e-depois-inserir).
- Embeddings: prefixo `"query: "` na busca e `"passage: "` na ingestão, mesmo modelo nos dois lados.
- Resultados de tools enxutos: só os campos necessários.
- Segredos só em `.env` (nunca no repositório).

## Antes de dar uma tarefa por concluída
Rodar `npm test` e o eval relevante. Mostrar o resultado.

## Não fazer
UI, WhatsApp, multi-agente, cancelamento/remarcação, multi-tenant, deploy.
