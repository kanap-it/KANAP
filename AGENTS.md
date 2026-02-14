# Repository Guidelines

## Project Structure & Module Organization
- Root: mono-repo with `backend/` (NestJS + TypeORM), `frontend/` (React + Vite), `infra/` (Docker Compose), and `doc/` (product/architecture docs).
- Key paths:
  - Backend source: `backend/src/**` → compiled to `backend/dist/`.
  - Frontend source: `frontend/src/**` → build output in `frontend/dist/`.
  - Local stack: `infra/docker-compose.yml` (db, api, web).

## Build, Test, and Development Commands
- Local stack (recommended):
  - Start: `cd infra && docker compose up -d`.
  - Rebuild API/Web: `docker compose -f infra/docker-compose.yml up -d --build api web`.
  - Reset DB: `bash infra/scripts/db-reset.sh`.
- Backend (Node 20):
  - Dev: `npm run start:dev` in `backend/`.
  - Build: `npm run build` → emits `dist/`; Run: `npm start`.
  - Migrations: `npm run typeorm -- migration:run`.
- Frontend:
  - Dev: `npm run dev` in `frontend/`.
  - Build: `npm run build`; Preview: `npm run preview`.

## Coding Style & Naming Conventions
- TypeScript across repo. Prefer explicit types at module boundaries.
- Indentation: 2 spaces; Unix newlines; UTF-8.
- Backend filenames: kebab-case (e.g., `company-metrics.service.ts`).
- Frontend components: PascalCase files (e.g., `CompaniesPage.tsx`); hooks/utilities in camelCase.
- No repo-wide ESLint/Prettier yet—match existing style and run `tsc` cleanly.

## Testing Guidelines
- No formal test suite configured. When adding tests:
  - Backend: Nest testing + Jest structure under `backend/src/**/__tests__` or `*.spec.ts`.
  - Frontend: Vitest + React Testing Library under `frontend/src/**/__tests__` or `*.test.tsx`.
- Aim for fast unit tests; add minimal integration smokes against Docker stack when relevant.

## Commit & Pull Request Guidelines
- Commits: imperative mood, concise scope prefix when helpful (e.g., `backend: ...`, `frontend: ...`, `infra: ...`).
- PRs: include problem statement, summary of changes, testing notes (commands run), screenshots for UI, and linked issues.
- Keep changes focused; update `doc/` or inline README snippets when behavior or endpoints change.

## Security & Configuration Tips
- Do not commit secrets. Use `.env` files (`backend/.env`, `frontend/.env`) and examples provided.
- Local defaults seed an admin; override `ADMIN_EMAIL`/`ADMIN_PASSWORD` in env for development.
- DB URL is configured via Compose (`postgres://app:app@db:5432/appdb`). Rotate JWT secrets in non-local environments.

## Collaboration & Handoff
- Maintainer prefers to test new features and fixes personally. When a task is finished, state completion and ask for their testing and feedback.
