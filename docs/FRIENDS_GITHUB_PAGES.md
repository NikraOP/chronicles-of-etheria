# Друзья на GitHub Pages

Игра на **https://nikraop.github.io/chronicles-of-etheria/** обращается к API в интернете (браузер не может писать файлы в GitHub напрямую). Один раз настройте хостинг API — после этого игрокам ничего настраивать не нужно.

## Вариант A — Render (рекомендуется, уже в репозитории)

1. Зайдите на [render.com](https://render.com) → **New** → **Blueprint**.
2. Подключите репозиторий `chronicles-of-etheria` (ветка `main`).
3. Render подхватит файл `render.yaml` и создаст сервис **etheria-friends-api**.
4. Дождитесь статуса **Live**. Проверка: откройте  
   `https://etheria-friends-api.onrender.com/health` — должен быть `{"ok":true,...}`.
5. Обновите GitHub Pages (обычно уже задеплоено с `main`). В игре: **Друзья** → **Синхронизировать**.

URL API уже прописан в `js/config/friendsEnv.js` для домена `*.github.io`.

> На бесплатном Render сервис «засыпает» после простоя; первый запрос после паузы может занять ~30–60 с.

## Вариант B — Supabase (без Render)

1. Создайте проект на [supabase.com](https://supabase.com).
2. **SQL Editor** → вставьте и выполните `supabase/friends_schema.sql`.
3. **Settings → API** → скопируйте **Project URL** и **anon public** key.
4. В `js/config/friendsEnv.js` заполните:
   ```javascript
   ETHERIA_FRIENDS_SUPABASE_URL = 'https://xxxx.supabase.co';
   ETHERIA_FRIENDS_SUPABASE_ANON_KEY = 'eyJ...';
   ```
5. Закоммитьте и запушьте в `main`.

При заполненном Supabase клиент использует его вместо Render.

## Локальная разработка

```bash
npm run start:friends
```

Игра на `localhost` по умолчанию ходит на `http://localhost:8790`.
