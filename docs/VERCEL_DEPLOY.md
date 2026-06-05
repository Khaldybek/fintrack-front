# Деплой на Vercel

Локальная разработка не требует изменений: без переменных окружения фронт по умолчанию ходит на `http://localhost:3000`.

## Шаги

1. **Репозиторий** — залейте проект в GitHub/GitLab/Bitbucket.

2. **Новый проект в Vercel**  
   [vercel.com/new](https://vercel.com/new) → Import репозитория → Next.js определится автоматически.

3. **Переменные окружения** (Settings → Environment Variables):
   - `NEXT_PUBLIC_API_URL` — полный URL бэкенда, например `https://api.example.com` (без `/v1`).

4. **Deploy** — после каждого пуша в основную ветку Vercel соберёт проект (`npm run build`) и задеплоит.

## Локально

- Работает как раньше: `npm run dev` (порт 3001), бэкенд по умолчанию `http://localhost:3000`.
- Чтобы подставить свой URL API локально: скопируйте `.env.example` в `.env.local` и измените `NEXT_PUBLIC_API_URL`.
