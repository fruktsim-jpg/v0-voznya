# 🎯 ЭТАП 1: СДЕЛАТЬ САЙТ ЖИВЫМ

**Цель:** Интерактивность, навигация между игроками, реальная активность

---

## 📋 ЗАДАЧИ

### 1. ✅ Профили игроков
- Страница `/profile/[id]/page.tsx`
- API `/api/profile/[id]/route.ts`
- Компонент `components/profile/player-card.tsx`

**Что показывать:**
- Имя, username, титул
- Баланс и всего заработано
- Место в топе богачей
- Дуэли (победы/поражения, винрейт)
- Клады найдено
- Достижения (X из 30 открыто)
- Серия фермы (текущая и рекорд)
- Брак (если есть, с кем и сколько дней)
- Прогресс до следующего титула
- Дата регистрации

---

### 2. ✅ Кликабельные ники в рейтингах

**Обновить компоненты:**
- `components/live/top-rich.tsx` — клик → `/profile/[id]`
- `components/live/weekly-top.tsx` — клик → `/profile/[id]`
- `components/live/families-top.tsx` — клик → `/profile/[id]`

**Реализация:**
```tsx
<Link href={`/profile/${u.userId}`}>
  <div className="cursor-pointer hover:text-primary">
    {u.name}
  </div>
</Link>
```

---

### 3. ✅ Рейтинг семей

- API `/api/families/route.ts`
- Компонент `components/live/families-top.tsx`
- Добавить на страницу `/live`

**Что показывать:**
- Топ-10 самых долгих браков
- Имена обоих супругов (кликабельные)
- Длительность брака (дни)
- Эмодзи 💍

**SQL:**
```sql
SELECT 
  m.user_id_1, m.user_id_2, m.married_at,
  u1.first_name AS name1, u1.username AS username1,
  u2.first_name AS name2, u2.username AS username2,
  EXTRACT(DAY FROM NOW() - m.married_at) AS days
FROM marriages m
JOIN users u1 ON u1.user_id = m.user_id_1
JOIN users u2 ON u2.user_id = m.user_id_2
WHERE m.divorced_at IS NULL
ORDER BY m.married_at ASC
LIMIT 10
```

---

### 4. ✅ Лента последних событий

- API `/api/activity/route.ts`
- Компонент `components/live/activity-feed.tsx`
- Добавить на страницу `/live`

**Что показывать (последние 20 событий):**

#### Источники данных:

**a) Клады:**
```sql
SELECT 'treasure' as type, user_id, amount, found_at as timestamp
FROM treasures
ORDER BY found_at DESC
LIMIT 20
```
Формат: "🎁 Иван нашёл клад 50 ешек"

**b) Достижения:**
```sql
SELECT 'achievement' as type, user_id, achievement_id, unlocked_at as timestamp
FROM user_achievements
ORDER BY unlocked_at DESC
LIMIT 20
```
Формат: "🏆 Мария открыла достижение «Первая кровь»"

**c) Браки:**
```sql
SELECT 'marriage' as type, user_id_1, user_id_2, married_at as timestamp
FROM marriages
WHERE divorced_at IS NULL
ORDER BY married_at DESC
LIMIT 20
```
Формат: "💍 Пётр и Анна поженились"

**d) Номинации:**
```sql
SELECT 'pidor' as type, user_id, nominated_at as timestamp
FROM pidor_history
ORDER BY nominated_at DESC
LIMIT 20
```
Формат: "🏳️ Сидор стал пидором дня"

**Объединённый запрос:**
Взять по 5 последних из каждой категории, объединить, отсортировать по времени, взять топ-20.

---

### 5. ✅ Пагинация всех топов

**Обновить компоненты:**
- `components/live/top-rich.tsx`
- `components/live/weekly-top.tsx`

**Добавить:**
- Кнопки "← Назад" и "Вперёд →"
- Показывать по 10 на странице
- Всего до 50 игроков (5 страниц)
- Индикатор "Страница X из Y"

**Компонент пагинации:**
```tsx
// components/ui/pagination.tsx
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}
```

**API изменения:**
```typescript
// /api/top-rich?limit=10&offset=0
// /api/top-rich?limit=10&offset=10
// /api/top-rich?limit=10&offset=20
```

---

### 6. ✅ Навигация из рейтингов в профили

**Все рейтинги должны быть кликабельными:**
- Топ богачей → клик на имя → профиль
- Топ недели → клик на имя → профиль
- Рейтинг семей → клик на любое имя → профиль
- Лента событий → клик на имя → профиль

**Единый компонент:**
```tsx
// components/ui/player-link.tsx
interface PlayerLinkProps {
  userId: number
  name: string
  className?: string
}

export function PlayerLink({ userId, name, className }: PlayerLinkProps) {
  return (
    <Link 
      href={`/profile/${userId}`}
      className={cn("hover:text-primary transition-colors cursor-pointer", className)}
    >
      {name}
    </Link>
  )
}
```

---

## 📁 СТРУКТУРА ФАЙЛОВ

### Новые API (5):
1. `app/api/profile/[id]/route.ts` — профиль игрока
2. `app/api/families/route.ts` — рейтинг семей
3. `app/api/activity/route.ts` — лента событий
4. `app/api/top-rich/route.ts` — обновить (добавить offset)
5. `app/api/top-weekly/route.ts` — обновить (добавить offset)

### Новые страницы (1):
1. `app/profile/[id]/page.tsx` — страница профиля

### Новые компоненты (6):
1. `components/profile/player-card.tsx` — карточка игрока
2. `components/profile/stats-grid.tsx` — сетка статистики
3. `components/profile/achievements-preview.tsx` — превью достижений
4. `components/live/families-top.tsx` — рейтинг семей
5. `components/live/activity-feed.tsx` — лента событий
6. `components/ui/player-link.tsx` — кликабельное имя игрока
7. `components/ui/pagination.tsx` — пагинация

### Обновлённые компоненты (2):
1. `components/live/top-rich.tsx` — пагинация + клики
2. `components/live/weekly-top.tsx` — пагинация + клики

### Обновлённые типы (1):
1. `lib/queries.ts` — добавить типы для профиля, семей, активности

---

## 🗄️ ДАННЫЕ ИЗ БД БОТА

### Таблицы для чтения:

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

**marriages:**
- user_id_1, user_id_2
- married_at, divorced_at

**treasures:**
- user_id, amount, found_at

**user_achievements:**
- user_id, achievement_id, unlocked_at

**pidor_history:**
- user_id, nominated_at

**duels:**
- winner_id, loser_id, created_at

---

## 🎯 РЕЗУЛЬТАТ ЭТАПА 1

### Что получим:

✅ **Интерактивность:**
- Клик на любое имя → профиль игрока
- Навигация между игроками
- Живая лента событий

✅ **Полнота данных:**
- Профили с полной статистикой
- Рейтинг семей
- История активности

✅ **Удобство:**
- Пагинация топов (до 50 игроков)
- Поиск себя в рейтинге
- Сравнение с другими

✅ **Вирусность:**
- Делятся профилями
- Обсуждают рейтинги
- Следят за лентой

---

## 📊 ОЦЕНКА ВРЕМЕНИ

1. Профили игроков — **2 часа**
2. Кликабельные ники — **30 минут**
3. Рейтинг семей — **30 минут**
4. Лента событий — **1.5 часа**
5. Пагинация топов — **1 час**
6. Навигация (PlayerLink) — **30 минут**

**Итого:** ~6 часов чистого времени

---

## 🚀 ПОРЯДОК РЕАЛИЗАЦИИ

### Шаг 1: Базовая инфраструктура (1 час)
1. Создать `lib/queries.ts` — типы для профиля
2. Создать `components/ui/player-link.tsx`
3. Создать `components/ui/pagination.tsx`

### Шаг 2: API endpoints (2 часа)
1. `/api/profile/[id]` — профиль
2. `/api/families` — семьи
3. `/api/activity` — лента
4. Обновить `/api/top-rich` — пагинация
5. Обновить `/api/top-weekly` — пагинация

### Шаг 3: Компоненты (2 часа)
1. `player-card.tsx` — профиль
2. `families-top.tsx` — семьи
3. `activity-feed.tsx` — лента
4. Обновить `top-rich.tsx` — клики + пагинация
5. Обновить `weekly-top.tsx` — клики + пагинация

### Шаг 4: Страницы (1 час)
1. `/profile/[id]/page.tsx`
2. Обновить `/live` — добавить семьи и ленту

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ

- [ ] Можно кликнуть на любое имя в любом рейтинге
- [ ] Открывается профиль с полной статистикой
- [ ] Рейтинг семей показывает топ-10 браков
- [ ] Лента событий показывает последние 20 событий
- [ ] Все топы имеют пагинацию (5 страниц по 10)
- [ ] Все имена в ленте кликабельны
- [ ] Профиль показывает прогресс до следующего титула

---

## 📝 ПОСЛЕ ЗАВЕРШЕНИЯ

Провести повторный аудит и показать:
- ✅ Список новых API (5)
- ✅ Список новых страниц (1)
- ✅ Список новых компонентов (7)
- ✅ Какие данные читаются из БД бота (5 таблиц)
- ✅ Скриншоты/примеры работы

**Готов начать с Шага 1!** 🚀
