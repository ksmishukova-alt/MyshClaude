# МышМат

Образовательная платформа для детей 8–13 лет: ежедневный блок Daily по четырём
предметам (математика, русский, чтение, английский), олимпиадный маршрут и
игровой слой, открывающийся через механику **МышРутки**.

## Структура

```
myshmat/
├── apps/web/          Next.js 15 (App Router) + TypeScript
│   ├── src/app/       страницы и API-роуты
│   ├── src/components/ React-компоненты экранов
│   ├── src/lib/       слой данных (Supabase + моки)
│   └── src/types/     доменные типы + логика МышРутки
└── packages/db/       SQL-миграции (Supabase/Postgres)
```

Подробности по приложению — в `apps/web/README.md`.

## Запуск

```bash
cd apps/web
npm install
npm run dev          # http://localhost:3000
```

Без настройки Supabase приложение работает на встроенных мок-данных.
Для подключения БД скопируйте `apps/web/.env.example` → `apps/web/.env.local`,
заполните ключи Supabase и выполните миграции из `packages/db/`.

## Claude в GitHub

В репозитории настроен workflow `.github/workflows/claude.yml`. Упомяните
`@claude` в issue или pull request — Claude проанализирует код, ответит или
внесёт изменения. Требуется секрет `ANTHROPIC_API_KEY` (или
`CLAUDE_CODE_OAUTH_TOKEN` для подписки Pro/Max) в настройках репозитория.
