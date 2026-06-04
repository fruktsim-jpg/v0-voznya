# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Single Next.js 16 App Router app: Russian-language **ВОЗНЯ (Voznya)** community landing page. No backend, database, Docker, or monorepo. Content and outbound links live in `lib/voznya.ts`.

### Services

| Service | Port | Command |
|---------|------|---------|
| Next.js dev | 3000 | `pnpm dev` |
| Next.js prod | 3000 | `pnpm build && pnpm start` |

Only one process is required for local development and E2E checks.

### Standard commands

See `package.json` scripts and `README.md`:

- Install: `pnpm install`
- Dev: `pnpm dev` → http://localhost:3000
- Build: `pnpm build`
- Prod: `pnpm start` (after build)
- Lint: `pnpm lint` (see caveat below)

### Lint caveat

`pnpm lint` runs `eslint .`, but **ESLint is not listed** in `package.json` dependencies, so the command fails with `eslint: not found` on a fresh install. Typecheck/build still work (`next build` skips type validation per `next.config.mjs`). To fix lint locally, add ESLint as a dev dependency or use the project's intended lint setup from v0.

### Non-obvious notes

- **Package manager:** Use **pnpm** (`pnpm-lock.yaml` is the lockfile).
- **Images:** `next.config.mjs` sets `images.unoptimized: true`; optional `sharp` postinstall may be ignored by pnpm without affecting this app.
- **pnpm build scripts:** If pnpm warns about ignored `sharp` build scripts, it is safe to ignore for this repo given unoptimized images.
- **Analytics:** `@vercel/analytics` only loads in production builds, not in `pnpm dev`.
- **Tests:** No Jest/Playwright/Cypress in the repo; verify via build + manual/browser check of the landing page.
- **Hello-world check:** Load `/`, scroll through hero → about → community map, click **«Вступить в ВОЗНЮ»** to jump to the platforms section.
