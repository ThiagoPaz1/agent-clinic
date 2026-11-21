# Clínica Alvorada: patient service assistant (study project)

Read PLANO.md before any change. The scope is closed: do not add features outside it.
PLANO.md is local (it is in .gitignore): do not copy its content into versioned files.

## Language
- Everything in the repository is in English: code (identifiers, comments, test names, internal
  error messages), domain terms (tools, tables, columns, appointment types, environment variables;
  glossary in PLANO.md section 4.1), this file, the README, commit messages, PR titles and descriptions.
- Patient-facing text is pt-BR: system prompt, agent replies, clinic documents (`docs-clinic/`).
- Conversation with the repository owner is in Portuguese.

## Workflow
- If `tasks/README.md` exists, follow its session protocol (local, outside git).
- One branch per task (`task/NN-name`), PR to `main`. Never merge.
- Claude NEVER runs `git add`, `git commit` or `git push`: that belongs to the repository owner.
  When done, Claude lists the files ready to stage and suggests a commit message following
  Conventional Commits (`feat`, `fix`, `test`, `refactor`, `chore`, `docs`, ...).
- After the owner pushes, Claude may open the PR with `gh pr create`.
- A task is only done after review, approval and merge by the repository owner.

## Stack
Node.js 22 + TypeScript (strict), Postgres + pgvector (Docker), Zod, Anthropic SDK,
MCP SDK (TypeScript), Transformers.js (local embeddings, multilingual-e5-small), Vitest, tsx.

## Commands
- `docker compose up -d`: start the database
- `npm run db:seed`: rebuild the database from the seed (does not touch the `chunks` table)
- `npm run ingest`: index `docs-clinic/`
- `npm run chat -- --patient 1`: agent CLI
- `npm run eval:retrieval` / `npm run eval`: evals
- `npm test`: unit tests
- `npm run typecheck`: type check

## Conventions
- TypeScript strict, no `any`. Validate every external input with Zod.
- Business rules only in `src/domain/` (pure, no LLM, tested).
- Nothing in `src/domain/` calls `new Date()`: "now" is a parameter. Tests, seed and evals use `FIXED_NOW`.
- Times as `timestamptz`, time zone `America/Sao_Paulo`.
- Patient identity comes from the session (environment variable). NEVER as a tool argument.
- Write tools require host confirmation (`confirm` function injected into the loop). Do not rely on the prompt alone.
- `book_appointment` is idempotent per PLANO.md section 4.6 (`ON CONFLICT DO NOTHING`, never check-then-insert).
- Embeddings: `"query: "` prefix for search and `"passage: "` for ingestion, same model on both sides.
- Lean tool results: only the fields needed.
- Secrets only in `.env` (never in the repository).

## Before calling a task done
Run `npm test` and the relevant eval. Show the result.

## Do not build
UI, WhatsApp, multi-agent, cancel/reschedule, multi-tenant, deploy.
