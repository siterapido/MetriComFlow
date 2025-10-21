# Repository Guidelines

## Project Structure & Module Organization
The Vite + React app boots from `src/main.tsx`, wiring routes and providers in `src/App.tsx`. Feature code lives under `src/components` (shadcn primitives in `src/components/ui`), `src/pages` (route screens), and shared logic in `src/lib`, `src/hooks`, and `src/context`. Assets sit in `public/`, documentation in `docs/`, and Supabase SQL plus policies in `supabase/`. Generated bundles land in `dist/`—never modify them by hand.

## Build, Test, and Development Commands
- `npm install`: install dependencies (lockfile is `package-lock.json`; prefer npm).
- `npm run dev`: Vite dev server with hot reload.
- `npm run build`: production bundle written to `dist/`.
- `npm run build:dev`: faster smoke build with dev flags.
- `npm run preview`: serve the latest build for QA.
- `npm run lint`: run ESLint via `eslint.config.js`.
- `npm run verify:meta`: validate Meta Ads config (`scripts/verify-meta-config.cjs`).
- `npm run sync:envs -- --prod`: mirror environment variables through `scripts/sync-envs.sh`.

## Coding Style & Naming Conventions
Follow the ESLint baseline: two-space indentation, semicolons, and double quotes for imports/strings. Use PascalCase for components (`DashboardOverview`), camelCase for hooks/utilities (`useLeadsFilters`), and SCREAMING_SNAKE_CASE for environment variables. Prefer the `@/` path alias over long relative paths. Keep Tailwind classes ordered roughly layout → spacing → color/typography, and add brief comments only when logic is non-obvious. Run `npm run lint` before pushing and resolve every warning.

## Testing Guidelines
Automated UI testing is not yet wired up, so keep components deterministic and lean on React Query caching. If you introduce tests, colocate them as `ComponentName.test.tsx` and run whatever tooling you add (document it in the PR). Until a test runner ships, pair linting with targeted manual QA—record steps covering authentication, dashboard metrics, and any lead flows you touched.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits (`feat:`, `fix:`, `chore:`). Keep subjects imperative, under 72 characters, and mention the affected domain (e.g., `feat: add kanban drag-and-drop`). PRs should include a short summary, linked issue/task, UI screenshots or GIFs when relevant, notes about env/script updates, and confirmation that linting/manually tested flows are done. Call out Supabase or configuration changes for reviewers.

## Environment & Configuration
Copy `.env.example` (or pull from the shared vault) before running locally; Supabase and Meta Ads integrations require populated keys. Use `scripts/sync-envs.sh` to stay aligned with staged environments, and extend the script when introducing new variables. Never commit secrets—document new keys in `docs/` so other agents know how to provision them.
