# 🔍 ДИАГНОСТИКА ПОДКЛЮЧЕНИЯ К БД

**Дата:** 5 июня 2026, 00:42  
**Проблема:** ECONNREFUSED 188.227.107.107:5432

---

## 📊 СИМПТОМЫ

### Что НЕ работает:
- ❌ Сайт не показывает статистику
- ❌ Профили не отображаются
- ❌ Все API возвращают: `{"error":"connect ECONNREFUSED 188.227.107.107:5432"}`

### Что РАБОТАЕТ:
- ✅ Бот voznya-bot работает нормально
- ✅ Бот подключается к БД
- ✅ Все функции бота работают
- ✅ Прогресс сохраняется
- ✅ Сайт собирается и деплоится без ошибок

---

## 🔍 АНАЛИЗ

### 1. Откуда сайт берёт DATABASE_URL

**Код:** `lib/db.ts`
```typescript
export function getPool(): Pool {
  const raw = process.env.DATABASE_URL  // ← Берёт из переменной окружения
  if (!raw) {
    throw new Error('DATABASE_URL is not configured')
  }
  // ...
}
```

**Источник на Vercel:**
- Environment Variables в Vercel Dashboard
- Project Settings → Environment Variables → DATABASE_URL

### 2. Все API routes используют одно подключение

**Проверено:**
- ✅ `/api/stats` → использует `query()` из `lib/db.ts`
- ✅ `/api/economy` → использует `query()` из `lib/db.ts`
- ✅ `/api/top-rich` → использует `query()` из `lib/db.ts`
- ✅ `/api/top-weekly` → использует `query()` из `lib/db.ts`
- ✅ `/api/achievements` → использует `query()` из `lib/db.ts`
- ✅ `/api/messages` → использует `query()` из `lib/db.ts`
- ✅ `/api/daily` → использует `query()` из `lib/db.ts`
- ✅ `/api/profile/[id]` → использует `query()` из `lib/db.ts`

**Вывод:** Все API используют единый пул подключений через `getPool()`.

### 3. Подключение к PostgreSQL

**Конфигурация в коде:**
```typescript
const connectionString = normalizeConnectionString(raw)
const needsSsl = /sslmode=require/i.test(connectionString) || process.env.PGSSL === 'require'
global.__voznyaPgPool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
})
```

**Параметры:**
- Max connections: 5
- Idle timeout: 30 секунд
- Connection timeout: 8 секунд
- SSL: включается если в URL есть `sslmode=require`

---

## 🎯 ТОЧНАЯ ПРИЧИНА ПРОБЛЕМЫ

### Ошибка: `ECONNREFUSED 188.227.107.107:5432`

**Что это значит:**
- `ECONNREFUSED` = Connection Refused (соединение отклонено)
- Сервер БД **активно отказывает** в подключении
- Это НЕ timeout (сервер отвечает, но отказывает)

### Почему бот работает, а сайт нет?

**Возможные причины:**

#### 1. 🔥 Firewall блокирует Vercel IP (НАИБОЛЕЕ ВЕРОЯТНО)
**Проблема:**
- Сервер БД настроен принимать подключения только с определённых IP
- IP бота добавлен в whitelist
- IP Vercel НЕ добавлен в whitelist

**Как проверить:**
- Зайти на сервер БД (188.227.107.107)
- Проверить firewall правила (iptables, ufw, или панель хостинга)
- Проверить `pg_hba.conf` в PostgreSQL

**Решение:**
- Добавить IP адреса Vercel в whitelist
- Или открыть порт 5432 для всех (небезопасно!)

#### 2. 🔒 PostgreSQL pg_hba.conf ограничивает доступ
**Проблема:**
- В файле `/etc/postgresql/*/main/pg_hba.conf` указаны только определённые IP
- Бот подключается с разрешённого IP
- Vercel подключается с неразрешённого IP

**Как проверить:**
```bash
# На сервере БД
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#"
```

**Что искать:**
```
# Плохо (только localhost):
host    all    all    127.0.0.1/32    md5

# Хорошо (все IP):
host    all    all    0.0.0.0/0       md5
```

#### 3. 🌐 DATABASE_URL в Vercel указывает на внутренний IP
**Проблема:**
- В Vercel Environment Variables указан внутренний IP (например, 10.x.x.x или 172.x.x.x)
- Или указан localhost/127.0.0.1
- Vercel не может достучаться до внутренней сети

**Как проверить:**
- Зайти в Vercel Dashboard
- Project Settings → Environment Variables
- Посмотреть значение DATABASE_URL

**Что должно быть:**
```
# Правильно (публичный IP):
DATABASE_URL=postgresql://user:pass@188.227.107.107:5432/voznya?sslmode=require

# Неправильно (внутренний IP):
DATABASE_URL=postgresql://user:pass@10.0.0.5:5432/voznya
DATABASE_URL=postgresql://user:pass@localhost:5432/voznya
```

#### 4. 🔌 Порт 5432 закрыт для внешних подключений
**Проблема:**
- PostgreSQL слушает только на localhost (127.0.0.1)
- Не слушает на публичном IP (0.0.0.0)

**Как проверить:**
```bash
# На сервере БД
sudo netstat -tlnp | grep 5432
# или
sudo ss -tlnp | grep 5432
```

**Что искать:**
```
# Плохо (только localhost):
tcp  0  0  127.0.0.1:5432  0.0.0.0:*  LISTEN

# Хорошо (все интерфейсы):
tcp  0  0  0.0.0.0:5432    0.0.0.0:*  LISTEN
```

**Где настраивается:**
```bash
# /etc/postgresql/*/main/postgresql.conf
listen_addresses = '*'  # Слушать на всех интерфейсах
```

---

## 🔍 ЧТО НУЖНО ПРОВЕРИТЬ

### Шаг 1: Проверить DATABASE_URL в Vercel

**Где:** Vercel Dashboard → Project Settings → Environment Variables

**Что проверить:**
- [ ] DATABASE_URL существует?
- [ ] IP адрес = 188.227.107.107 (публичный)?
- [ ] Порт = 5432?
- [ ] Username и password корректны?
- [ ] База данных = voznya?
- [ ] Есть `?sslmode=require` в конце?

**Правильный формат:**
```
postgresql://username:password@188.227.107.107:5432/voznya?sslmode=require
```

### Шаг 2: Проверить firewall на сервере БД

**На сервере 188.227.107.107:**

```bash
# Проверить iptables
sudo iptables -L -n | grep 5432

# Проверить ufw (если используется)
sudo ufw status

# Проверить открытые порты
sudo netstat -tlnp | grep 5432
```

**Что должно быть:**
- Порт 5432 открыт для внешних подключений
- Или добавлены IP Vercel в whitelist

### Шаг 3: Проверить PostgreSQL конфигурацию

**На сервере 188.227.107.107:**

```bash
# Проверить listen_addresses
sudo grep "listen_addresses" /etc/postgresql/*/main/postgresql.conf

# Проверить pg_hba.conf
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"
```

**Что должно быть:**
```
# postgresql.conf
listen_addresses = '*'

# pg_hba.conf
host    all    all    0.0.0.0/0    md5
```

### Шаг 4: Проверить доступность с Vercel

**Тест подключения:**
Можно создать временный API endpoint для теста:

```typescript
// app/api/test-db/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL
  
  if (!dbUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' })
  }
  
  // Скрыть пароль
  const safeUrl = dbUrl.replace(/:([^:@]+)@/, ':***@')
  
  try {
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: dbUrl })
    const result = await pool.query('SELECT NOW()')
    await pool.end()
    
    return NextResponse.json({ 
      success: true, 
      url: safeUrl,
      time: result.rows[0].now 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      code: error.code,
      url: safeUrl
    })
  }
}
```

---

## 📋 ЧЕКЛИСТ ДИАГНОСТИКИ

### Проверить на Vercel:
- [ ] DATABASE_URL настроен в Environment Variables
- [ ] DATABASE_URL содержит публичный IP (188.227.107.107)
- [ ] DATABASE_URL содержит правильный порт (5432)
- [ ] DATABASE_URL содержит правильные credentials
- [ ] DATABASE_URL содержит `?sslmode=require`

### Проверить на сервере БД (188.227.107.107):
- [ ] PostgreSQL запущен (`sudo systemctl status postgresql`)
- [ ] Порт 5432 слушает на 0.0.0.0 (`netstat -tlnp | grep 5432`)
- [ ] Firewall разрешает порт 5432 (`iptables -L` или `ufw status`)
- [ ] `postgresql.conf`: `listen_addresses = '*'`
- [ ] `pg_hba.conf`: разрешает подключения извне
- [ ] Можно подключиться с другого сервера (`psql -h 188.227.107.107 -U user -d voznya`)

### Проверить сеть:
- [ ] IP 188.227.107.107 доступен из интернета
- [ ] Порт 5432 открыт (проверить через telnet/nc)
- [ ] Нет NAT/proxy между Vercel и сервером БД

---

## 🎯 НАИБОЛЕЕ ВЕРОЯТНАЯ ПРИЧИНА

**Firewall блокирует Vercel IP адреса**

### Почему:
1. Бот работает → значит БД работает
2. Бот подключается → значит credentials правильные
3. Сайт получает ECONNREFUSED → значит сервер отказывает в подключении
4. ECONNREFUSED (не timeout) → значит firewall активно блокирует

### Решение:

#### Вариант 1: Открыть порт для всех (быстро, но небезопасно)
```bash
# На сервере БД
sudo ufw allow 5432/tcp
# или
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
```

#### Вариант 2: Добавить IP Vercel в whitelist (безопасно)
```bash
# Получить IP адреса Vercel
# https://vercel.com/docs/concepts/edge-network/regions

# Добавить в firewall
sudo ufw allow from VERCEL_IP to any port 5432
```

#### Вариант 3: Использовать Vercel Postgres или другой managed DB
- Supabase (бесплатный tier)
- Neon (бесплатный tier)
- Railway (бесплатный tier)
- Vercel Postgres

---

## 📊 ИТОГОВАЯ ТАБЛИЦА

| Компонент | Статус | Проблема |
|-----------|--------|----------|
| **Код сайта** | ✅ Работает | Нет |
| **API routes** | ✅ Корректны | Нет |
| **DATABASE_URL** | ⚠️ Неизвестно | Нужно проверить в Vercel |
| **Сервер БД** | ✅ Работает | Бот подключается |
| **Сетевой доступ** | ❌ Заблокирован | ECONNREFUSED |
| **Firewall** | ❌ Блокирует | Наиболее вероятно |

---

## ✅ СЛЕДУЮЩИЕ ШАГИ

### 1. Проверить DATABASE_URL в Vercel
Зайти в Vercel Dashboard и скопировать значение DATABASE_URL (скрыв пароль).

### 2. Проверить firewall на сервере БД
Выполнить команды на сервере 188.227.107.107:
```bash
sudo ufw status
sudo iptables -L -n | grep 5432
sudo netstat -tlnp | grep 5432
```

### 3. Проверить PostgreSQL конфигурацию
```bash
sudo grep "listen_addresses" /etc/postgresql/*/main/postgresql.conf
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#"
```

### 4. Решить проблему
После определения точной причины - открыть доступ для Vercel.

---

**Отчёт составлен:** 5 июня 2026, 00:42  
**Статус:** Ожидание проверки конфигурации
