# VOZNYA 2.0 — План реализации
## Профили, семьи и новая навигация сайта

**Дата:** 5 июня 2026  
**Статус:** В разработке  
**Цель:** Превратить сайт из витрины статистики в полноценный игровой хаб сообщества

---

## 📋 ОБЗОР ЗАДАЧИ

Текущее состояние:
- ✅ Базовые профили игроков существуют (`/profile/[id]`)
- ✅ Статистика сообщества работает
- ✅ Рейтинги богачей и недельных заработков
- ✅ Достижения отображаются (30 ачивок)
- ⚠️ Нет системы XP и уровней
- ⚠️ Нет прогресса к ачивкам
- ⚠️ Нет полноценной системы семей
- ⚠️ Навигация изолирована

---

## 🗄️ АРХИТЕКТУРА БАЗЫ ДАННЫХ

### Новые таблицы

#### 1. `user_xp` — Система опыта и уровней
```sql
CREATE TABLE user_xp (
  user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp_to_next_level INTEGER DEFAULT 100,
  last_daily_login DATE,
  daily_login_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_xp_level ON user_xp(level DESC, total_xp DESC);
```

#### 2. `xp_transactions` — История получения опыта
```sql
CREATE TABLE xp_transactions (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  amount INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'achievement', 'daily_login', 'duel_win', 'treasure', 'casino', 'family_activity'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id, created_at DESC);
```

#### 3. `achievement_progress` — Прогресс к ачивкам
```sql
CREATE TABLE achievement_progress (
  user_id BIGINT REFERENCES users(user_id),
  achievement_code VARCHAR(50) NOT NULL,
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_code)
);

CREATE INDEX idx_achievement_progress_user ON achievement_progress(user_id);
```

#### 4. `families` — Система семей
```sql
CREATE TABLE families (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  leader_id BIGINT REFERENCES users(user_id),
  description TEXT,
  treasury BIGINT DEFAULT 0,
  total_xp BIGINT DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_families_treasury ON families(treasury DESC);
CREATE INDEX idx_families_xp ON families(total_xp DESC);
```

#### 5. `family_members` — Участники семей
```sql
CREATE TABLE family_members (
  family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(user_id),
  role VARCHAR(20) DEFAULT 'member', -- 'leader', 'officer', 'member'
  contribution BIGINT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (family_id, user_id)
);

CREATE INDEX idx_family_members_user ON family_members(user_id);
CREATE INDEX idx_family_members_contribution ON family_members(family_id, contribution DESC);
```

#### 6. `family_wars` — Семейные войны
```sql
CREATE TABLE family_wars (
  id SERIAL PRIMARY KEY,
  attacker_family_id INTEGER REFERENCES families(id),
  defender_family_id INTEGER REFERENCES families(id),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'finished', 'cancelled'
  attacker_score INTEGER DEFAULT 0,
  defender_score INTEGER DEFAULT 0,
  winner_family_id INTEGER REFERENCES families(id),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE INDEX idx_family_wars_status ON family_wars(status, started_at DESC);
```

#### 7. `player_history` — История активности игрока
```sql
CREATE TABLE player_history (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  event_type VARCHAR(50) NOT NULL, -- 'achievement', 'duel_win', 'duel_loss', 'treasure', 'casino_win', 'family_join', 'family_leave', 'level_up'
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_player_history_user ON player_history(user_id, created_at DESC);
CREATE INDEX idx_player_history_type ON player_history(event_type, created_at DESC);
```

#### 8. `profile_completion` — Отслеживание заполнения профиля
```sql
CREATE TABLE profile_completion (
  user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
  has_family BOOLEAN DEFAULT FALSE,
  has_achievements BOOLEAN DEFAULT FALSE,
  has_level BOOLEAN DEFAULT FALSE,
  has_history BOOLEAN DEFAULT FALSE,
  has_inventory BOOLEAN DEFAULT FALSE,
  has_legendary BOOLEAN DEFAULT FALSE,
  completion_percent INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Модификации существующих таблиц

```sql
-- Добавить поля в таблицу users (если их нет)
ALTER TABLE users ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_win_streak INTEGER DEFAULT 0;

-- Добавить индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_family ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_users_reputation ON users(reputation DESC);
```

---

## 🎯 ЭТАПЫ РЕАЛИЗАЦИИ

### ЭТАП 1: Система XP и уровней (2-3 дня)

#### 1.1 Backend — XP система

**Файлы:**
- `lib/xp-system.ts` — логика расчёта XP и уровней
- `lib/queries-xp.ts` — SQL запросы для XP
- `app/api/xp/[id]/route.ts` — API для получения XP игрока

**Функционал:**
```typescript
// lib/xp-system.ts
export const XP_SOURCES = {
  ACHIEVEMENT: { base: 100, multiplier: 1 },
  DAILY_LOGIN: { base: 10, multiplier: 1 },
  DUEL_WIN: { base: 25, multiplier: 1 },
  TREASURE: { base: 15, multiplier: 1 },
  CASINO_WIN: { base: 5, multiplier: 1 },
  FAMILY_ACTIVITY: { base: 20, multiplier: 1 },
  NOMINATION_WIN: { base: 50, multiplier: 1 }
}

export function calculateLevel(totalXp: number): number {
  // Формула: level = floor(sqrt(totalXp / 100))
  return Math.floor(Math.sqrt(totalXp / 100)) + 1
}

export function xpForNextLevel(currentLevel: number): number {
  // Формула: xp = (level + 1)^2 * 100
  return Math.pow(currentLevel + 1, 2) * 100
}

export function xpProgress(totalXp: number, currentLevel: number): {
  current: number
  needed: number
  percent: number
} {
  const currentLevelXp = Math.pow(currentLevel, 2) * 100
  const nextLevelXp = Math.pow(currentLevel + 1, 2) * 100
  const current = totalXp - currentLevelXp
  const needed = nextLevelXp - currentLevelXp
  const percent = Math.round((current / needed) * 100)
  
  return { current, needed, percent }
}
```

#### 1.2 Frontend — Отображение уровня

**Файлы:**
- `components/profile/xp-card.tsx` — карточка с уровнем и прогрессом
- `components/profile/level-badge.tsx` — бейдж уровня

**Компонент:**
```typescript
// components/profile/xp-card.tsx
export function XpCard({ userId }: { userId: number }) {
  const { data: xp } = useApi<XpData>(`/api/xp/${userId}`)
  
  if (!xp) return <Skeleton />
  
  const progress = xpProgress(xp.totalXp, xp.level)
  
  return (
    <motion.div className="glass rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Уровень</div>
          <div className="text-3xl font-bold text-primary">{xp.level}</div>
        </div>
        <LevelBadge level={xp.level} />
      </div>
      
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">До {xp.level + 1} уровня</span>
          <span className="font-semibold">{progress.current} / {progress.needed} XP</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            className="h-full bg-gradient-to-r from-primary/50 to-primary"
          />
        </div>
        <div className="text-xs text-muted-foreground mt-1 text-right">
          {progress.percent}%
        </div>
      </div>
    </motion.div>
  )
}
```

---

### ЭТАП 2: Прогресс к ачивкам (2-3 дня)

#### 2.1 Backend — Трекинг прогресса

**Файлы:**
- `lib/achievement-tracker.ts` — логика отслеживания прогресса
- `lib/queries-achievements.ts` — расширенные запросы для ачивок
- `app/api/achievements/progress/[id]/route.ts` — API прогресса

**Функционал:**
```typescript
// lib/achievement-tracker.ts
export type AchievementWithProgress = {
  code: string
  emoji: string
  name: string
  description: string
  category: string
  reward: number
  hidden: boolean
  unlocked: boolean
  progress: {
    current: number
    target: number
    percent: number
  } | null
}

export async function getAchievementProgress(userId: number): Promise<AchievementWithProgress[]> {
  // 1. Получить разблокированные ачивки
  const unlocked = await query<{ code: string }>(
    `SELECT code FROM user_achievements WHERE user_id = $1`,
    [userId]
  )
  const unlockedSet = new Set(unlocked.map(a => a.code))
  
  // 2. Получить прогресс к ачивкам
  const progress = await query<{ achievement_code: string, current_value: number, target_value: number }>(
    `SELECT achievement_code, current_value, target_value 
     FROM achievement_progress 
     WHERE user_id = $1`,
    [userId]
  )
  const progressMap = new Map(progress.map(p => [p.achievement_code, p]))
  
  // 3. Собрать данные
  return ACHIEVEMENTS.map(ach => {
    const isUnlocked = unlockedSet.has(ach.code)
    const prog = progressMap.get(ach.code)
    
    return {
      ...ach,
      unlocked: isUnlocked,
      progress: prog ? {
        current: prog.current_value,
        target: prog.target_value,
        percent: Math.round((prog.current_value / prog.target_value) * 100)
      } : null
    }
  })
}
```

#### 2.2 Frontend — Отображение прогресса

**Файлы:**
- `components/profile/achievements-grid.tsx` — сетка ачивок с прогрессом
- `components/profile/achievement-card.tsx` — карточка одной ачивки
- `components/profile/achievement-filters.tsx` — фильтры

**Компонент:**
```typescript
// components/profile/achievement-card.tsx
export function AchievementCard({ achievement }: { achievement: AchievementWithProgress }) {
  const { unlocked, progress } = achievement
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "glass rounded-xl border p-4 transition-all",
        unlocked ? "border-primary/50 bg-primary/5" : "border-border opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">{achievement.emoji}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{achievement.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
          
          {!unlocked && progress && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Прогресс</span>
                <span className="font-semibold">{progress.current} / {progress.target}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}
          
          {unlocked && (
            <div className="mt-2 flex items-center gap-2 text-xs text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Получено +{achievement.reward} ешек</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
```

---

### ЭТАП 3: Система семей 2.0 (3-4 дня)

#### 3.1 Backend — Семьи

**Файлы:**
- `lib/queries-families.ts` — запросы для семей
- `app/api/families/route.ts` — список всех семей
- `app/api/families/[id]/route.ts` — информация о семье
- `app/api/families/leaderboard/route.ts` — рейтинг семей

**Типы:**
```typescript
export type Family = {
  id: number
  name: string
  leaderId: number
  leaderName: string
  description: string | null
  treasury: number
  totalXp: number
  level: number
  memberCount: number
  totalWins: number
  createdAt: string
}

export type FamilyMember = {
  userId: number
  name: string
  role: 'leader' | 'officer' | 'member'
  contribution: number
  joinedAt: string
}

export type FamilyLeaderboard = {
  byTreasury: Family[]
  byXp: Family[]
  byWins: Family[]
  byMembers: Family[]
}
```

#### 3.2 Frontend — Страницы семей

**Файлы:**
- `app/families/page.tsx` — список всех семей
- `app/families/[id]/page.tsx` — страница семьи
- `components/families/family-card.tsx` — карточка семьи
- `components/families/family-leaderboard.tsx` — рейтинг семей
- `components/families/family-members.tsx` — список участников

---

### ЭТАП 4: Навигация и связность (2 дня)

#### 4.1 Быстрые кнопки в профиле

**Файл:** `components/profile/quick-actions.tsx`

```typescript
export function QuickActions({ userId, familyId }: { userId: number, familyId?: number }) {
  const actions = [
    { icon: Trophy, label: 'Ачивки', href: `/profile/${userId}#achievements` },
    { icon: Users, label: 'Семья', href: familyId ? `/families/${familyId}` : '/families' },
    { icon: Backpack, label: 'Инвентарь', href: `/profile/${userId}#inventory` },
    { icon: Coins, label: 'Финансы', href: `/profile/${userId}#finances` },
    { icon: BarChart3, label: 'Статистика', href: `/profile/${userId}#stats` },
    { icon: Swords, label: 'Дуэли', href: `/profile/${userId}#duels` },
    { icon: Dice5, label: 'Казино', href: `/profile/${userId}#casino` },
    { icon: Map, label: 'Клады', href: `/profile/${userId}#treasures` },
  ]
  
  return (
    <div className="grid grid-cols-4 gap-3 mt-6">
      {actions.map(action => (
        <Link
          key={action.label}
          href={action.href}
          className="glass rounded-xl border border-border p-4 hover:border-primary/50 transition-all text-center"
        >
          <action.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
          <div className="text-xs text-muted-foreground">{action.label}</div>
        </Link>
      ))}
    </div>
  )
}
```

#### 4.2 Связанные переходы

**Компоненты:**
- `components/ui/player-link.tsx` — уже существует, расширить
- `components/ui/family-link.tsx` — ссылка на семью
- `components/ui/achievement-link.tsx` — ссылка на ачивку

---

### ЭТАП 5: История игрока (1-2 дня)

#### 5.1 Backend

**Файлы:**
- `lib/queries-history.ts` — запросы истории
- `app/api/history/[id]/route.ts` — API истории игрока

#### 5.2 Frontend

**Файлы:**
- `components/profile/player-history.tsx` — лента истории
- `components/profile/history-item.tsx` — элемент истории

```typescript
export function PlayerHistory({ userId }: { userId: number }) {
  const { data: history } = useApi<HistoryEvent[]>(`/api/history/${userId}`)
  
  return (
    <div className="space-y-3">
      {history?.map(event => (
        <HistoryItem key={event.id} event={event} />
      ))}
    </div>
  )
}

function HistoryItem({ event }: { event: HistoryEvent }) {
  const icons = {
    achievement: Trophy,
    duel_win: Swords,
    duel_loss: Swords,
    treasure: Package,
    casino_win: Dice5,
    family_join: Users,
    family_leave: Users,
    level_up: TrendingUp
  }
  
  const Icon = icons[event.eventType]
  
  return (
    <div className="flex items-start gap-3 glass rounded-lg border border-border p-3">
      <div className="text-2xl"><Icon className="h-5 w-5" /></div>
      <div className="flex-1">
        <div className="text-sm text-foreground">{event.description}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(event.createdAt), { locale: ru, addSuffix: true })}
        </div>
      </div>
    </div>
  )
}
```

---

### ЭТАП 6: Расширенные рейтинги (2 дня)

#### 6.1 Новые рейтинги

**API endpoints:**
- `/api/leaderboard/wealth` — по богатству (уже есть)
- `/api/leaderboard/xp` — по опыту
- `/api/leaderboard/wins` — по победам в дуэлях
- `/api/leaderboard/achievements` — по ачивкам
- `/api/leaderboard/family-contribution` — по вкладу в семью
- `/api/leaderboard/casino` — по казино
- `/api/leaderboard/treasures` — по кладам
- `/api/leaderboard/reputation` — по репутации

#### 6.2 Frontend

**Файлы:**
- `app/leaderboard/page.tsx` — страница со всеми рейтингами
- `components/leaderboard/leaderboard-tabs.tsx` — вкладки рейтингов
- `components/leaderboard/leaderboard-table.tsx` — таблица рейтинга

---

### ЭТАП 7: Статистика аккаунта (1-2 дня)

**Файл:** `components/profile/account-stats.tsx`

```typescript
export function AccountStats({ profile }: { profile: PlayerProfile }) {
  const duelsTotal = profile.duelsWon + profile.duelsLost
  const winRate = duelsTotal > 0 ? (profile.duelsWon / duelsTotal * 100).toFixed(1) : 0
  
  const stats = [
    { label: 'Победы в дуэлях', value: profile.duelsWon, icon: Trophy },
    { label: 'Поражения', value: profile.duelsLost, icon: Swords },
    { label: 'Процент побед', value: `${winRate}%`, icon: TrendingUp },
    { label: 'Серия побед', value: profile.winStreak, icon: Flame },
    { label: 'Макс. серия', value: profile.maxWinStreak, icon: Star },
    { label: 'Найдено кладов', value: profile.treasuresFound, icon: Package },
    { label: 'Игр в казино', value: profile.casinoGamesCount, icon: Dice5 },
    { label: 'Достижения', value: `${profile.achievementsUnlocked}/30`, icon: Award },
  ]
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.label} className="glass rounded-xl border border-border p-4">
          <stat.icon className="h-5 w-5 text-primary mb-2" />
          <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
```

---

### ЭТАП 8: Мини-карта прогресса (1 день)

**Файл:** `components/profile/profile-completion.tsx`

```typescript
export function ProfileCompletion({ userId }: { userId: number }) {
  const { data: completion } = useApi<ProfileCompletionData>(`/api/profile/${userId}/completion`)
  
  if (!completion) return null
  
  const items = [
    { key: 'hasFamily', label: 'Семья', completed: completion.hasFamily },
    { key: 'hasAchievements', label: 'Ачивки', completed: completion.hasAchievements },
    { key: 'hasLevel', label: 'Уровень', completed: completion.hasLevel },
    { key: 'hasHistory', label: 'История', completed: completion.hasHistory },
    { key: 'hasInventory', label: 'Инвентарь', completed: completion.hasInventory },
    { key: 'hasLegendary', label: 'Легендарные достижения', completed: completion.hasLegendary },
  ]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl border border-border p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Заполнение профиля</h3>
        <div className="text-2xl font-bold text-primary">{completion.completionPercent}%</div>
      </div>
      
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${completion.completionPercent}%` }}
          className="h-full bg-gradient-to-r from-primary/50 to-primary"
        />
      </div>
      
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.key} className="flex items-center gap-2 text-sm">
            {item.completed ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
```

---

## 📁 СТРУКТУРА ФАЙЛОВ

```
v0-voznya/
├── app/
│   ├── families/
│   │   ├── page.tsx                    # Список семей
│   │   └── [id]/
│   │       └── page.tsx                # Страница семьи
│   ├── leaderboard/
│   │   └── page.tsx                    # Все рейтинги
│   ├── profile/
│   │   └── [id]/
│   │       └── page.tsx                # Профиль игрока (расширить)
│   └── api/
│       ├── xp/
│       │   └── [id]/route.ts           # XP игрока
│       ├── achievements/
│       │   └── progress/
│       │       └── [id]/route.ts       # Прогресс к ачивкам
│       ├── families/
│       │   ├── route.ts                # Список семей
│       │   ├── [id]/route.ts           # Информация о семье
│       │   └── leaderboard/route.ts    # Рейтинг семей
│       ├── history/
│       │   └── [id]/route.ts           # История игрока
│       └── leaderboard/
│           ├── xp/route.ts             # Рейтинг по XP
│           ├── wins/route.ts           # Рейтинг по победам
│           └── ...                     # Другие рейтинги
├── components/
│   ├── profile/
│   │   ├── player-card.tsx             # Расширить
│   │   ├── xp-card.tsx                 # Новый
│   │   ├── level-badge.tsx             # Новый
│   │   ├── achievements-grid.tsx       # Новый
│   │   ├── achievement-card.tsx        # Новый
│   │   ├── achievement-filters.tsx     # Новый
│   │   ├── quick-actions.tsx           # Новый
│   │   ├── player-history.tsx          # Новый
│   │   ├── history-item.tsx            # Новый
│   │   ├── account-stats.tsx           # Новый
│   │   └── profile-completion.tsx      # Новый
│   ├── families/
│   │   ├── family-card.tsx             # Новый
│   │   ├── family-leaderboard.tsx      # Новый
│   │   ├── family-members.tsx          # Новый
│   │   └── family-wars.tsx             # Новый
│   ├── leaderboard/
│   │   ├── leaderboard-tabs.tsx        # Новый
│   │   └── leaderboard-table.tsx       # Новый
│   └── ui/
│       ├── family-link.tsx             # Новый
│       └── achievement-link.tsx        # Новый
└── lib/
    ├── xp-system.ts                    # Новый
    ├── achievement-tracker.ts          # Новый
    ├── queries-xp.ts                   # Новый
    ├── queries-achievements.ts         # Новый
    ├── queries-families.ts             # Новый
    └── queries-history.ts              # Новый
```

---

## 🔄 МИГРАЦИИ БАЗЫ ДАННЫХ

Создать файл миграции для бота (Python):

```python
# migrations/0005_voznya_2_0.py
"""
VOZNYA 2.0: XP, Achievement Progress, Families, History
"""

async def upgrade(conn):
    # 1. XP система
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS user_xp (
            user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
            total_xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            xp_to_next_level INTEGER DEFAULT 100,
            last_daily_login DATE,
            daily_login_streak INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # 2. XP транзакции
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS xp_transactions (
            id SERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(user_id),
            amount INTEGER NOT NULL,
            source VARCHAR(50) NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # 3. Прогресс к ачивкам
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS achievement_progress (
            user_id BIGINT REFERENCES users(user_id),
            achievement_code VARCHAR(50) NOT NULL,
            current_value INTEGER DEFAULT 0,
            target_value INTEGER NOT NULL,
            last_updated TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (user_id, achievement_code)
        )
    """)
    
    # 4. Семьи
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS families (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            leader_id BIGINT REFERENCES users(user_id),
            description TEXT,
            treasury BIGINT DEFAULT 0,
            total_xp BIGINT DEFAULT 0,
            level INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # 5. Участники семей
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS family_members (
            family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
            user_id BIGINT REFERENCES users(user_id),
            role VARCHAR(20) DEFAULT 'member',
            contribution BIGINT DEFAULT 0,
            joined_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (family_id, user_id)
        )
    """)
    
    # 6. Семейные войны
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS family_wars (
            id SERIAL PRIMARY KEY,
            attacker_family_id INTEGER REFERENCES families(id),
            defender_family_id INTEGER REFERENCES families(id),
            status VARCHAR(20) DEFAULT 'active',
            attacker_score INTEGER DEFAULT 0,
            defender_score INTEGER DEFAULT 0,
            winner_family_id INTEGER REFERENCES families(id),
            started_at TIMESTAMP DEFAULT NOW(),
            ended_at TIMESTAMP
        )
    """)
    
    # 7. История игрока
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS player_history (
            id SERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(user_id),
            event_type VARCHAR(50) NOT NULL,
            event_data JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # 8. Заполнение профиля
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS profile_completion (
            user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
            has_family BOOLEAN DEFAULT FALSE,
            has_achievements BOOLEAN DEFAULT FALSE,
            has_level BOOLEAN DEFAULT FALSE,
            has_history BOOLEAN DEFAULT FALSE,
            has_inventory BOOLEAN DEFAULT FALSE,
            has_legendary BOOLEAN DEFAULT FALSE,
            completion_percent INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # 9. Модификации users
    await conn.execute("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id),
        ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS max_win_streak INTEGER DEFAULT 0
    """)
    
    # 10. Индексы
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_xp_level ON user_xp(level DESC, total_xp DESC)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id, created_at DESC)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON achievement_progress(user_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_families_treasury ON families(treasury DESC)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_families_xp ON families(total_xp DESC)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_family_members_contribution ON family_members(family_id, contribution DESC)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_family_wars_status ON family_wars(status, started_at DESC)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_player_history_user ON player_history(user_id, created_at DESC)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_player_history_type ON player_history(event_type, created_at DESC)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_family ON users(family_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_reputation ON users(reputation DESC)")
```

---

## ✅ ЧЕКЛИСТ РЕАЛИЗАЦИИ

### Подготовка
- [ ] Создать миграцию базы данных
- [ ] Применить миграцию на dev окружении
- [ ] Создать тестовые данные

### Этап 1: XP и уровни
- [ ] Создать `lib/xp-system.ts`
- [ ] Создать `lib/queries-xp.ts`
- [ ] Создать API `/api/xp/[id]/route.ts`
- [ ] Создать `components/profile/xp-card.tsx`
- [ ] Создать `components/profile/level-badge.tsx`
- [ ] Интегрировать в профиль игрока
- [ ] Тестирование

### Этап 2: Прогресс к ачивкам
- [ ] Создать `lib/achievement-tracker.ts`
- [ ] Создать `lib/queries-achievements.ts`
- [ ] Создать API `/api/achievements/progress/[id]/route.ts`
- [ ] Создать `components/profile/achievements-grid.tsx`
- [ ] Создать `components/profile/achievement-card.tsx`
- [ ] Создать `components/profile/achievement-filters.tsx`
- [ ] Интегрировать в профиль
- [ ] Тестирование

### Этап 3: Система семей
- [ ] Создать `lib/queries-families.ts`
- [ ] Создать API `/api/families/route.ts`
- [ ] Создать API `/api/families/[id]/route.ts`
- [ ] Создать API `/api/families/leaderboard/route.ts`
- [ ] Создать страницу `/app/families/page.tsx`
- [ ] Создать страницу `/app/families/[id]/page.tsx`
- [ ] Создать компоненты семей
- [ ] Тестирование

### Этап 4: Навигация
- [ ] Создать `components/profile/quick-actions.tsx`
- [ ] Создать `components/ui/family-link.tsx`
- [ ] Создать `components/ui/achievement-link.tsx`
- [ ] Обновить навигацию по сайту
- [ ] Тестирование переходов

### Этап 5: История игрока
- [ ] Создать `lib/queries-history.ts`
- [ ] Создать API `/api/history/[id]/route.ts`
- [ ] Создать `components/profile/player-history.tsx`
- [ ] Создать `components/profile/history-item.tsx`
- [ ] Интегрировать в профиль
- [ ] Тестирование

### Этап 6: Расширенные рейтинги
- [ ] Создать API для всех рейтингов
- [ ] Создать страницу `/app/leaderboard/page.tsx`
- [ ] Создать `components/leaderboard/leaderboard-tabs.tsx`
- [ ] Создать `components/leaderboard/leaderboard-table.tsx`
- [ ] Тестирование

### Этап 7: Статистика аккаунта
- [ ] Создать `components/profile/account-stats.tsx`
- [ ] Интегрировать в профиль
- [ ] Тестирование

### Этап 8: Мини-карта прогресса
- [ ] Создать API `/api/profile/[id]/completion`
- [ ] Создать `components/profile/profile-completion.tsx`
- [ ] Интегрировать в профиль
- [ ] Тестирование

### Финализация
- [ ] Обновить `PlayerCard` компонент
- [ ] Обновить мета-теги для SEO
- [ ] Оптимизация производительности
- [ ] Тестирование на мобильных
- [ ] Деплой на production

---

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### Для пользователей:
✅ Полноценная система прогрессии (уровни, XP)  
✅ Видимый прогресс к целям (ачивки)  
✅ Социальное взаимодействие (семьи)  
✅ Удобная навигация (1-2 клика до любого раздела)  
✅ История активности  
✅ Мотивация к заполнению профиля

### Для сообщества:
✅ Увеличение вовлечённости  
✅ Конкуренция между семьями  
✅ Больше контента для обсуждений  
✅ Рост активности в боте

### Технические:
✅ Масштабируемая архитектура  
✅ Оптимизированные запросы  
✅ Кэширование данных  
✅ SEO-оптимизация

---

## 🚀 ОЦЕНКА ВРЕМЕНИ

**Общее время:** 14-18 дней

- Этап 1 (XP): 2-3 дня
- Этап 2 (Ачивки): 2-3 дня
- Этап 3 (Семьи): 3-4 дня
- Этап 4 (Навигация): 2 дня
- Этап 5 (История): 1-2 дня
- Этап 6 (Рейтинги): 2 дня
- Этап 7 (Статистика): 1-2 дня
- Этап 8 (Прогресс): 1 день

**Буфер на тестирование и баги:** 3-4 дня

---

## 📝 ПРИМЕЧАНИЯ

1. **Приоритет:** Начать с Этапов 1-2 (XP и ачивки), так как они дают максимальную ценность
2. **Зависимости:** Этап 3 (семьи) можно делать параллельно с Этапами 1-2
3. **Бот:** Потребуется обновление бота для записи XP и прогресса
4. **Тестирование:** Каждый этап тестировать отдельно перед переходом к следующему
5. **Деплой:** Можно деплоить поэтапно, не дожидаясь завершения всех этапов

---

**Готов начать реализацию! 🚀**
