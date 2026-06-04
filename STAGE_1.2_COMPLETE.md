# ✅ ЭТАП 1.2 ЗАВЕРШЁН: Профили игроков

**Дата:** 4 июня 2026  
**Статус:** ✅ Готово

---

## 🎯 ЦЕЛЬ ЭТАПА

Создать полноценные профили игроков с полной статистикой, доступные по клику из любого рейтинга.

---

## ✅ ВЫПОЛНЕНО

### 1. Добавлен тип PlayerProfile

**Файл:** `lib/queries.ts`

**Структура данных:**
```typescript
export type PlayerProfile = {
  userId: number
  username: string | null
  firstName: string
  balance: number
  totalEarned: number
  totalSpent: number
  farmStreak: number
  maxFarmStreak: number
  duelsWon: number
  duelsLost: number
  treasuresFound: number
  pidorCount: number
  farmSuccessCount: number
  casinoGamesCount: number
  createdAt: string
  achievementsUnlocked: number
  rankInTop: number | null
  marriage: {
    partnerId: number
    partnerName: string
    marriedAt: string
    days: number
  } | null
}
```

---

### 2. Создана функция getPlayerProfile()

**Файл:** `lib/queries.ts`

**Что делает:**
- Получает основные данные игрока из таблицы `users`
- Подсчитывает количество открытых достижений
- Вычисляет место в топе богачей
- Получает информацию о браке (если есть)

**SQL запросы:**

#### Основные данные:
```sql
SELECT 
  user_id, username, first_name,
  balance, total_earned, total_spent,
  farm_streak, max_farm_streak,
  duels_won, duels_lost,
  treasures_found, pidor_count,
  farm_success_count, casino_games_count,
  created_at
FROM users
WHERE user_id = $1
```

#### Достижения:
```sql
SELECT COUNT(*) AS count 
FROM user_achievements 
WHERE user_id = $1
```

#### Место в топе:
```sql
SELECT rank FROM (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY balance DESC, user_id ASC) AS rank
  FROM users
) ranked
WHERE user_id = $1
```

#### Брак:
```sql
SELECT 
  CASE WHEN m.user_id_1 = $1 THEN m.user_id_2 ELSE m.user_id_1 END AS partner_id,
  CASE WHEN m.user_id_1 = $1 THEN u2.first_name ELSE u1.first_name END AS partner_first_name,
  CASE WHEN m.user_id_1 = $1 THEN u2.username ELSE u1.username END AS partner_username,
  m.married_at,
  EXTRACT(DAY FROM NOW() - m.married_at) AS days
FROM marriages m
LEFT JOIN users u1 ON u1.user_id = m.user_id_1
LEFT JOIN users u2 ON u2.user_id = m.user_id_2
WHERE (m.user_id_1 = $1 OR m.user_id_2 = $1)
  AND m.divorced_at IS NULL
LIMIT 1
```

---

### 3. Создан API endpoint

**Файл:** `app/api/profile/[id]/route.ts`

**Endpoint:** `GET /api/profile/[id]`

**Функционал:**
- Валидация user_id (должен быть числом > 0)
- Получение профиля через `getPlayerProfile()`
- Возврат 404 если игрок не найден
- Возврат 400 при невалидном ID
- Возврат 500 при ошибке сервера

**Примеры:**
```bash
GET /api/profile/123456789
→ 200 { userId: 123456789, firstName: "Иван", ... }

GET /api/profile/999999999
→ 404 { error: "Player not found" }

GET /api/profile/abc
→ 400 { error: "Invalid user ID" }
```

---

### 4. Создан компонент PlayerCard

**Файл:** `components/profile/player-card.tsx`

**Что отображает:**

#### Шапка профиля:
- Аватар (эмодзи титула)
- Имя игрока
- Username (если есть)
- Текущий титул
- Место в топе богачей
- Прогресс до следующего титула (прогресс-бар)

#### Основная статистика (6 карточек):
1. **💰 Баланс** — текущий баланс
2. **📈 Всего заработано** — total_earned
3. **🏆 Достижения** — X из 30
4. **⚔️ Дуэли** — победы/поражения + винрейт
5. **🌾 Серия фермы** — текущая/рекорд + всего ферм
6. **📦 Клады** — найдено кладов

#### Дополнительная информация (условно):
- **💍 Брак** — с кем, сколько дней (если есть)
- **🏳️ Пидор дня** — сколько раз (если > 0)
- **🎰 Казино** — игр сыграно (если > 0)

#### Футер:
- Дата регистрации

**Анимации:**
- Плавное появление карточек (stagger)
- Анимированный прогресс-бар
- Hover эффекты

---

### 5. Создана страница профиля

**Файл:** `app/profile/[id]/page.tsx`

**URL:** `/profile/[id]`

**Функционал:**
- Server-side рендеринг (SSR)
- Динамические meta-теги для SEO
- 404 при несуществующем игроке
- Использует компонент PlayerCard

**Meta-теги:**
```html
<title>Иван Иванов — ВОЗНЯ</title>
<meta name="description" content="Профиль игрока Иван Иванов. Баланс: 1234 ешки, заработано: 5678 ешек." />
```

---

## 📁 СОЗДАННЫЕ ФАЙЛЫ

### Новые файлы (3):
1. ✅ `app/api/profile/[id]/route.ts` — API endpoint
2. ✅ `components/profile/player-card.tsx` — компонент карточки
3. ✅ `app/profile/[id]/page.tsx` — страница профиля

### Обновлённые файлы (1):
1. ✅ `lib/queries.ts` — добавлен тип и функция

**Итого:** 4 файла

---

## 🎨 КАК ЭТО РАБОТАЕТ

### Навигация:

1. Пользователь видит **Топ богачей**
2. Кликает на имя "Иван Иванов"
3. Переходит на `/profile/123456789`
4. Видит полный профиль с анимациями ✅

### Пример профиля:

```
┌─────────────────────────────────────┐
│  🏆  Иван Иванов                    │
│      @ivan_ivanov                   │
│      🏆 Авторитет Возни  #5 в топе  │
│                                     │
│  До 👑 Король Возни                 │
│  5 432 ешки / 7 000 ешек            │
│  [████████░░] 77%                   │
└─────────────────────────────────────┘

┌──────────┬──────────┬──────────┐
│ 💰       │ 📈       │ 🏆       │
│ 1 234    │ 5 432    │ 15 / 30  │
│ ешки     │ ешек     │ достиж.  │
└──────────┴──────────┴──────────┘

┌──────────┬──────────┬──────────┐
│ ⚔️       │ 🌾       │ 📦       │
│ 43 / 12  │ 5 / 30   │ 21       │
│ 78% побед│ 100 ферм │ клад     │
└──────────┴──────────┴──────────┘

┌─────────────────┬─────────────────┐
│ 💍 В браке с    │ 🏳️ Пидор дня   │
│ Мария Мариева   │ 3 раза          │
│ 45 дней         │                 │
└─────────────────┴─────────────────┘

Участник с 15 января 2024
```

---

## 🔗 ИНТЕГРАЦИЯ С ЭТАПОМ 1.1

### До (Этап 1.1):
- Клик на имя → переход на `/profile/123`
- **404 Not Found** ❌

### После (Этап 1.2):
- Клик на имя → переход на `/profile/123`
- **Полный профиль игрока** ✅

### Работает из:
- ✅ Топ богачей
- ✅ Топ недели
- ✅ Профиль партнёра по браку (кликабельно)

---

## 🗄️ ДАННЫЕ ИЗ БД БОТА

### Используемые таблицы:

**users:**
- user_id, username, first_name
- balance, total_earned, total_spent
- farm_streak, max_farm_streak
- duels_won, duels_lost
- treasures_found
- pidor_count
- farm_success_count
- casino_games_count
- created_at

**user_achievements:**
- user_id, achievement_id
- Подсчёт: COUNT(*)

**marriages:**
- user_id_1, user_id_2
- married_at, divorced_at
- JOIN с users для имён партнёров

---

## 🎯 ОСОБЕННОСТИ РЕАЛИЗАЦИИ

### 1. Прогресс до следующего титула

Вычисляется на клиенте:
```typescript
const currentTitleIndex = titles.findIndex((t) => profile.totalEarned < t.minEarned) - 1
const nextTitle = titles[currentTitleIndex + 1]
const progressPercent = Math.round(
  ((profile.totalEarned - titles[currentTitleIndex].minEarned) / 
   (nextTitle.minEarned - titles[currentTitleIndex].minEarned)) * 100
)
```

### 2. Винрейт в дуэлях

```typescript
const duelsTotal = profile.duelsWon + profile.duelsLost
const winRate = duelsTotal > 0 
  ? Math.round((profile.duelsWon / duelsTotal) * 100) 
  : 0
```

### 3. Условное отображение

Блоки показываются только если есть данные:
- Брак — только если `profile.marriage !== null`
- Пидор — только если `profile.pidorCount > 0`
- Казино — только если `profile.casinoGamesCount > 0`

### 4. Кликабельный партнёр

В блоке брака имя партнёра — это `PlayerLink`:
```tsx
<PlayerLink
  userId={profile.marriage.partnerId}
  name={profile.marriage.partnerName}
/>
```

Можно переходить от профиля к профилю! 🔗

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ

- [x] Создан тип PlayerProfile
- [x] Создана функция getPlayerProfile()
- [x] Создан API /api/profile/[id]
- [x] Создан компонент PlayerCard
- [x] Создана страница /profile/[id]
- [x] Клик из топа ведёт на профиль
- [x] Профиль показывает полную статистику
- [x] Прогресс до следующего титула
- [x] Брак с кликабельным партнёром
- [x] Условное отображение блоков
- [x] Анимации и плавные переходы

---

## 🚀 СЛЕДУЮЩИЙ ЭТАП

**Этап 1.3: Рейтинг семей**

Создать:
1. API `/api/families`
2. Компонент `families-top.tsx`
3. Добавить на страницу `/live`

Чтобы показывать топ-10 самых долгих браков с кликабельными именами.

---

## 📊 СТАТИСТИКА

- **Время выполнения:** ~20 минут
- **Создано файлов:** 3
- **Обновлено файлов:** 1
- **Строк кода:** ~350
- **SQL запросов:** 4
- **Готовность к Этапу 1.3:** ✅ 100%

---

## ✅ ЗАКЛЮЧЕНИЕ

Этап 1.2 успешно завершён! 

Профили игроков полностью работают:
- Полная статистика из БД бота
- Красивый дизайн с анимациями
- Прогресс до следующего титула
- Кликабельные ссылки на партнёров
- SEO-оптимизация

Готов к переходу на **Этап 1.3: Рейтинг семей**! 🚀
