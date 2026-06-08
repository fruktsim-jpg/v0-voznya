# AGENTS.md

## Что это

Сайт и админ-панель экосистемы «Возня» — Next.js App Router (Tailwind v4, pnpm).
Спутник Telegram-бота `voznya-bot`. Это **не** статический лендинг: приложение
читает PostgreSQL бота, имеет авторизацию (Telegram-логин + OIDC), сессии и
админ-панель с RBAC.

См. `README.md` для карты страниц и слоёв данных.

## Границы (важно)

- PostgreSQL бота — источник истины. Сайт по `users` — **только чтение**.
- Запись разрешена только через `app/api/admin/*` (под RBAC) и OIDC-флоу.
- Не вводить запись в `users`/игровые таблицы в обход бота.

## Команды

| Действие | Команда |
|---|---|
| Установка | `pnpm install` |
| Dev | `pnpm dev` → http://localhost:3000 |
| Сборка | `pnpm build` |
| Прод | `pnpm start` (после сборки) |

## Особенности

- **Package manager:** pnpm (`pnpm-lock.yaml` — единственный лок-файл).
- **Images:** `next.config.mjs` ставит `images.unoptimized: true`.
- **Типы при сборке:** `next build` пропускает валидацию типов (см. `next.config.mjs`).
- **Analytics:** `@vercel/analytics` грузится только в продакшен-сборке.
- **Тесты:** автотестов в репозитории нет — проверять сборкой + ручным просмотром.
- **MMR-ранги** продублированы с ботом (`lib/mmr.ts` ↔ `app/settings/mmr.py`) —
  менять синхронно.

## Деплой

Автоматический на Vercel при merge в `main`.
