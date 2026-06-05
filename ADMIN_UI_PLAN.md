# ADMIN PANEL MVP — Возня (сайт)

Первый рабочий интерфейс управления платформой через сайт. Стоит поверх уже
существующего бэкенда (`admin_roles`, `audit_log`, `inventory`,
`inventory_items`, `shop_*`, `gift_transactions`, `transactions`, `users`).

Принципы MVP:
- **Без новых таблиц.** Только чтение/запись в существующие.
- **Без смены архитектуры.** Деньги — через `transactions`, предметы — через
  `inventory` + `inventory_history`, любое админ-действие — в `audit_log`.
- **Без дизайна.** Голый HTML + inline-стили. Цель — начать пользоваться.
- **Та же авторизация.** Существующий JWT (httpOnly cookie), роль из
  `admin_roles`. Новой аутентификации нет.

Статус: **реализовано в коде** (роуты + страницы + auth-слой). Не запускалось
здесь (нет dev-окружения под рукой) — перед мержем прогнать `pnpm build`.

Дата: 2026-06-06
Связанные: `voznya-bot/ADMIN_PLATFORM.md`, `voznya-bot/app/core/permissions.py`,
`MINI_APP_PLAN.md`.

---

## 1. Auth & роли

Переиспользуется существующий стек:
- `lib/auth/session.ts` — JWT в httpOnly-cookie, `uid == users.user_id`.
- `lib/auth/get-session.ts` — чтение/проверка сессии.

Добавлено:
- **`lib/auth/admin-permissions.ts`** — TypeScript-зеркало
  `app/core/permissions.py`: те же роли (`owner > admin > moderator > support`),
  те же строки прав, то же наследование. Бот и сайт проверяют доступ одинаково.
- **`lib/auth/admin-session.ts`**:
  - `getAdminSession()` → `{ uid, role }` или `null` (роль берётся из
    `admin_roles` по `uid`; нет строки — не админ).
  - `requirePermission(perm)` → guard для роутов: `401` без сессии, `403` без
    права.
  - `writeAudit(...)` → запись строки в `audit_log` (можно в общей транзакции).
- **`lib/db.ts`** → добавлен `withTransaction(fn)` — атомарные действия на одном
  клиенте (BEGIN/COMMIT/ROLLBACK).

Роль выдаётся в боте (`admin_roles`) — на сайте появляется сразу, общая таблица.

| Роль | Видит | Может менять |
|------|-------|--------------|
| support | дашборд, игроки, инвентарь(чтение), магазин(чтение), подарки(чтение) | — |
| moderator | + логи аудита, модерация | бан/разбан, правка профиля |
| admin | всё перечисленное | **±ешки, выдать/отозвать предмет**, магазин, подарки |
| owner | всё | + управление ролями |

MVP-действия (экономика, инвентарь) доступны **admin и owner**. Просмотр —
всем ролям. Аудит — moderator и выше (`logs.view`).

---

## 2. Маршруты (страницы)

Всё под `/admin`, гейт — в `app/admin/layout.tsx` (нет роли → экран «доступ
только для администраторов»).

| Путь | Файл | Назначение | Право |
|------|------|-----------|-------|
| `/admin` | `app/admin/page.tsx` | Дашборд: счётчики + лента аудита | `dashboard.view` |
| `/admin/players` | `app/admin/players/page.tsx` | Поиск игроков | `players.view` |
| `/admin/players/[id]` | `app/admin/players/[id]/page.tsx` | Карточка игрока + действия | `players.view` (+ действия) |
| `/admin/audit` | `app/admin/audit/page.tsx` | Просмотр аудита с фильтрами | `logs.view` |

Действия игрока — клиентский компонент `app/admin/players/[id]/actions.tsx`
(формы экономики и инвентаря).

Навигация (шапка layout): Дашборд · Игроки · Аудит.

---

## 3. API (роуты)

Все под `/api/admin`, `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`. Каждый
роут проверяет право через `requirePermission` / `getAdminSession`.

| Метод + путь | Файл | Назначение | Право |
|--------------|------|-----------|-------|
| `GET /api/admin/dashboard` | `dashboard/route.ts` | счётчики (игроки, предметы, покупки, подарки) + 20 последних аудит-записей | `dashboard.view` |
| `GET /api/admin/players?q=` | `players/route.ts` | поиск по user_id / username / имени | `players.view` |
| `GET /api/admin/players/[id]` | `players/[id]/route.ts` | профиль + баланс + роль + инвентарь + покупки + подарки | `players.view` |
| `POST /api/admin/economy` | `economy/route.ts` | начислить/снять ешки | `economy.add` / `economy.remove` |
| `POST /api/admin/inventory` | `inventory/route.ts` | выдать/отозвать предмет | `inventory.grant` / `inventory.revoke` |
| `GET /api/admin/audit` | `audit/route.ts` | аудит с фильтрами (user, action, from, to, limit, offset) | `logs.view` |

> Дашборд и карточка игрока рендерятся сервером напрямую из `lib/db` теми же
> запросами; одноимённые API-роуты дают тот же JSON для будущего Mini App /
> внешних клиентов.

---

## 4. Действия и запись в журналы

### Экономика — `POST /api/admin/economy`
Тело: `{ userId, amount (>0), direction: "add"|"remove", reason? }`. В **одной
транзакции** (`withTransaction`):
1. `SELECT balance ... FOR UPDATE` (блокировка строки игрока);
2. при снятии — проверка `balance >= amount` (иначе `409`);
3. `UPDATE users.balance` (+ total_earned/total_spent);
4. `INSERT transactions` (`reason='admin_reward'`, `meta.via='admin_panel'`);
5. `INSERT audit_log` (`economy.add`/`economy.remove`, `amount`, `target_id` =
   id транзакции).

Баланс не дублируется: живёт в `users`, движение — в `transactions`.

### Инвентарь — `POST /api/admin/inventory`
Тело: `{ userId, itemCode, quantity (>0), action: "grant"|"revoke", reason? }`.
В одной транзакции:
- **grant**: проверка `inventory_items.code` существует → upsert в `inventory`
  (стак `quantity`, `source='admin'`, slot копируется из каталога);
- **revoke**: `SELECT ... FOR UPDATE`, проверка достаточного количества (иначе
  `409`), декремент или удаление строки;
- `INSERT audit_log` (`inventory.grant`/`inventory.revoke`, `target_id`=code);
- `INSERT inventory_history` (`event`, `delta` ±qty, `source='admin'`,
  `audit_id` ссылается на строку аудита).

Владение — только в `inventory`; леджер предметов — `inventory_history`.

Все админ-действия пишут IP (`x-forwarded-for`) в `audit_log.ip`.

---

## 5. Дашборд — счётчики

| Карточка | Источник |
|----------|----------|
| Игроки | `COUNT(*) FROM users` |
| Предметы (в инвентарях) | `SUM(quantity) FROM inventory` |
| Покупки | `COUNT(*) FROM purchase_history` |
| Подарки | `COUNT(*) FROM gift_transactions` |
| Последние действия | `audit_log ORDER BY created_at DESC LIMIT 20` |

---

## 6. Поиск и карточка игрока

**Поиск** (`/admin/players`): один инпут → `q`. По `user_id` (точное, если
число), `username` и `first_name` (ILIKE). До 25 результатов, ссылка на карточку.

**Карточка** (`/admin/players/[id]`):
- профиль (имя, username, user_id, дата);
- баланс, роль, заработано/потрачено, сообщений;
- формы действий (экономика/инвентарь) — только для admin/owner;
- инвентарь (`inventory` + `inventory_items`);
- история покупок (`purchase_history`);
- история подарков (входящие + исходящие из `gift_transactions`).

---

## 7. Аудит-вьюер

`/admin/audit` → `GET /api/admin/audit`. Фильтры:
- **user** — совпадение по `actor_user_id` ИЛИ `target_user_id`;
- **action** — префикс (ILIKE `economy%`, `inventory%`, …);
- **from / to** — диапазон по `created_at`;
- пагинация `limit` (≤200) / `offset`.

Колонки: время, актор (+роль), действие, цель, сумма, причина, IP.

---

## 8. Карта прав (итог)

```
support    → dashboard.view, players.view, economy.view, inventory.view,
             shop.view, moderation.view, gift.view
moderator  → + moderation.ban, logs.view, players.edit
admin      → + economy.add/remove, inventory.grant/revoke, shop.manage,
             gift.manage
owner      → + roles.manage
```

Источник правды — `app/core/permissions.py` (бот) и зеркало
`lib/auth/admin-permissions.ts` (сайт). При изменении — править оба.

---

## 9. Безопасность

- Каждый API-роут проверяет право **на сервере** (UI-кнопки — лишь удобство).
- Деньги/предметы меняются только сервером и только в транзакции; клиент не
  пишет в БД напрямую.
- Снятие ешек/предметов не уходит в минус (проверка под блокировкой строки).
- Все мутации логируются в `audit_log` (актор, роль, цель, сумма, причина, IP).
- `players` / `audit` параметризованы (нет SQL-инъекций), ввод валидируется.

---

## 10. Что НЕ делалось (MVP-границы)
- ❌ управление ролями через UI (право есть, страница — позже)
- ❌ CRUD магазина (`shop.manage` есть, UI позже)
- ❌ отправка подарков из панели (`gift.manage` есть, UI позже)
- ❌ бан/разбан, правка профиля (`moderation.*`, `players.edit` — позже)
- ❌ красивый дизайн / общие UI-компоненты

---

## 11. Файлы (этот проход)

```
lib/auth/admin-permissions.ts      права (зеркало permissions.py)
lib/auth/admin-session.ts          getAdminSession / requirePermission / writeAudit
lib/db.ts                          + withTransaction()

app/admin/layout.tsx               гейт + навигация
app/admin/page.tsx                 дашборд
app/admin/players/page.tsx         поиск игроков (client)
app/admin/players/[id]/page.tsx    карточка игрока (server)
app/admin/players/[id]/actions.tsx формы действий (client)
app/admin/audit/page.tsx           аудит-вьюер (client)

app/api/admin/dashboard/route.ts
app/api/admin/players/route.ts
app/api/admin/players/[id]/route.ts
app/api/admin/economy/route.ts
app/api/admin/inventory/route.ts
app/api/admin/audit/route.ts
```

---

## 12. Следующие шаги
1. `pnpm build` / `pnpm lint` — проверить типы и сборку.
2. Назначить себе роль `owner` в боте (`admin_roles`), войти на сайте, открыть
   `/admin`.
3. Дальше по приоритету: UI ролей → CRUD магазина → подарки из панели →
   модерация. Бэкенд под них уже готов.


