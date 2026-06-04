# 🔍 DEPLOYMENT DEBUG

## Проблема
Профили не открываются (404) после деплоя на Vercel.

## Проверка

### 1. Файлы в Git
```bash
git ls-tree -r HEAD --name-only | grep profile
```

Результат:
- ✅ app/api/profile/[id]/route.ts
- ✅ app/profile/[id]/page.tsx  
- ✅ components/profile/player-card.tsx

### 2. Последний коммит
```
7d847d2 profiles
```

### 3. Возможные причины 404

#### A) Vercel не видит динамические роуты
**Проблема:** Next.js App Router требует правильную структуру папок.

**Проверить:**
```
app/
  profile/
    [id]/
      page.tsx  ← должен быть именно page.tsx
```

#### B) Ошибка при сборке
**Проверить логи Vercel:**
1. Зайти на https://vercel.com/dashboard
2. Найти последний деплой
3. Открыть Build Logs
4. Искать ошибки TypeScript или Next.js

#### C) Кэш Vercel
**Решение:**
1. В Vercel Dashboard → Settings → General
2. Найти "Clear Build Cache"
3. Нажать и сделать Redeploy

#### D) Неправильный путь к файлу
**Проверить:**
- Имя файла: `page.tsx` (не `Page.tsx`, не `index.tsx`)
- Папка: `[id]` (с квадратными скобками)
- Расширение: `.tsx` (не `.ts`, не `.jsx`)

### 4. Тест локально

Запустить dev сервер:
```bash
npm run dev
# или
pnpm dev
```

Открыть:
```
http://localhost:3000/profile/123456789
```

Если локально работает, но на Vercel нет → проблема в деплое.

### 5. Проверка production build

```bash
npm run build
npm start
```

Если build падает с ошибкой → показать ошибку.

## Решения

### Решение 1: Пересоздать файл
Возможно проблема в кодировке или скрытых символах.

### Решение 2: Очистить кэш Vercel
```bash
# В Vercel Dashboard
Settings → General → Clear Build Cache → Redeploy
```

### Решение 3: Проверить .gitignore
Убедиться что `app/profile/` не игнорируется.

### Решение 4: Форсировать деплой
```bash
git commit --allow-empty -m "force deploy profiles"
git push origin main
```

## Следующие шаги

1. Проверить логи сборки Vercel
2. Запустить `npm run build` локально
3. Проверить что файл точно называется `page.tsx`
4. Очистить кэш Vercel и передеплоить
