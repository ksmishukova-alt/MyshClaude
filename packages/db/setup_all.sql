-- ============================================================
-- МышМат — полная установка БД одним файлом
-- Выполните целиком в Supabase → SQL Editor → New query → Run
-- (0001_init + 0002_seed + 0003_auth + 0004_submit_attempt)
-- Повторный запуск безопасен.
-- ============================================================

-- МышМат — миграция 0001 (MVP, ТЗ v1 с механикой МышРутки)
-- Выполняется в Supabase SQL editor или через supabase db push.
-- Содержит только то, что нужно реализованным экранам:
-- профиль ребёнка, контент заданий/шагов, Daily-сессии, попытки,
-- пошаговую аналитику самостоятельности, награды и наклейки.

-- ─────────────────────────────────────────────
-- ENUM-типы
-- ─────────────────────────────────────────────
do $$ begin
  create type subject_id as enum ('math','russian','reading','english');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_mode as enum ('platform','worksheet');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subject_status as enum
    ('notStarted','inProgress','submitted','successful','perfect','needsRevision');
exception when duplicate_object then null; end $$;

do $$ begin
  create type daily_status as enum
    ('notStarted','inProgress','submitted','successful','perfect');
exception when duplicate_object then null; end $$;

do $$ begin
  create type step_kind as enum ('reading','question');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────
-- Профиль ребёнка
-- ─────────────────────────────────────────────
create table if not exists child_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid,                 -- → auth.users.id (методист/родитель)
  name text not null,
  grade int not null default 3,
  avatar_url text,
  stars int not null default 0,   -- внутренняя валюта
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Контент: задания и шаги
-- ─────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  subject subject_id not null,
  title text not null,
  mode task_mode not null,
  prompt text not null default '',
  est_minutes int,
  created_at timestamptz not null default now()
);

create table if not exists task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  ord int not null,                 -- порядок шага
  kind step_kind not null,
  prompt text not null,
  passage text,
  hint text,                        -- доступна со 2-й попытки (логика на клиенте/сервере)
  -- варианты ответа: [{id,label,is_correct}]
  options jsonb not null default '[]'::jsonb,
  correct_input text,               -- для свободного ввода
  unique (task_id, ord)
);

-- Какие задания входят в Daily предмета на день (упрощённо для MVP)
create table if not exists daily_task_configs (
  id uuid primary key default gen_random_uuid(),
  subject subject_id not null,
  task_id uuid not null references tasks(id) on delete cascade,
  ord int not null,
  active bool not null default true
);

-- ─────────────────────────────────────────────
-- Daily-сессии и прогресс
-- ─────────────────────────────────────────────
create table if not exists daily_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  date date not null,
  status daily_status not null default 'notStarted',
  -- v1.1: флаг выдачи МышРутки (открывает игровой мир целиком)
  myshroutka_granted bool not null default false,
  myshroutka_granted_at timestamptz,
  submitted_at timestamptz,
  unique (child_id, date)
);

-- агрегат по предмету в рамках сессии
create table if not exists daily_subject_progress (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references daily_sessions(id) on delete cascade,
  subject subject_id not null,
  status subject_status not null default 'notStarted',
  tasks_total int not null default 0,
  tasks_done int not null default 0,
  unique (session_id, subject)
);

-- попытка по заданию
create table if not exists daily_task_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references daily_sessions(id) on delete cascade,
  task_id uuid not null references tasks(id),
  child_id uuid not null references child_profiles(id),
  mode task_mode not null,
  answer jsonb,
  is_correct bool,
  uploaded_solution_url text,
  status subject_status not null default 'notStarted',
  -- v1.1 аналитика самостоятельности (агрегат по заданию)
  autonomy_score numeric(4,3),     -- 0..1: доля шагов решённых сам с 1-й попытки
  submitted_at timestamptz,
  checked_at timestamptz,
  feedback text,
  created_at timestamptz not null default now()
);

-- v1.1: пошаговая статистика (самостоятельность по каждому шагу)
create table if not exists task_step_stats (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references daily_task_attempts(id) on delete cascade,
  step_id uuid not null references task_steps(id),
  attempts int not null default 0,        -- сколько раз жал «Проверить»
  hint_used bool not null default false,  -- открыл подсказку (доступна со 2-й попытки)
  solved_first_try bool not null default false,
  skipped_with_error bool not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Награды и наклейки
-- ─────────────────────────────────────────────
do $$ begin
  create type reward_type as enum
    ('myshroutka','doneDaily','myshPechat','perfectDaily',
     'skill','effort','olympiad','collection','surprise','duel');
exception when duplicate_object then null; end $$;

create table if not exists reward_cards (
  id uuid primary key default gen_random_uuid(),
  type reward_type not null,
  title text not null,
  description text,
  icon_url text
);

create table if not exists child_rewards (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  reward_id uuid not null references reward_cards(id),
  earned_at timestamptz not null default now()
);

create table if not exists stickers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text
);

create table if not exists child_stickers (
  child_id uuid not null references child_profiles(id) on delete cascade,
  sticker_id uuid not null references stickers(id),
  earned_at timestamptz not null default now(),
  primary key (child_id, sticker_id)
);

-- ─────────────────────────────────────────────
-- МышРутка: пересчёт статуса Daily и выдача
-- ─────────────────────────────────────────────
-- Вызывается после сохранения попытки. Если все предметы сессии достигли
-- статуса submitted (или выше) — сессия становится submitted и выдаётся МышРутка.
create or replace function recompute_daily_and_grant_myshroutka(p_session uuid)
returns void language plpgsql as $$
declare
  v_total int;
  v_submitted int;
  v_child uuid;
  v_already bool;
begin
  select count(*),
         count(*) filter (where status in ('submitted','successful','perfect'))
    into v_total, v_submitted
  from daily_subject_progress where session_id = p_session;

  if v_total > 0 and v_submitted = v_total then
    select child_id, myshroutka_granted into v_child, v_already
      from daily_sessions where id = p_session;

    update daily_sessions
      set status = 'submitted',
          submitted_at = coalesce(submitted_at, now()),
          myshroutka_granted = true,
          myshroutka_granted_at = coalesce(myshroutka_granted_at, now())
      where id = p_session;

    if not v_already then
      -- начислить карточку МышРутки
      insert into child_rewards (child_id, reward_id)
      select v_child, rc.id from reward_cards rc where rc.type = 'myshroutka' limit 1;
    end if;
  end if;
end $$;

-- ─────────────────────────────────────────────
-- RLS (включить при готовности auth; для MVP оставляем выключенным)
-- ─────────────────────────────────────────────
-- alter table daily_sessions enable row level security;
-- create policy child_own on daily_sessions for all
--   using (child_id in (select id from child_profiles where parent_id = auth.uid()));


-- МышМат — сид данных (демо-ребёнок Артём + банк заданий, совпадает с моками)

-- ребёнок
insert into child_profiles (id, name, grade, stars)
values ('11111111-1111-1111-1111-111111111111', 'Артём', 3, 245)
on conflict (id) do nothing;

-- награды-карточки (нужна хотя бы МышРутка для триггера)
insert into reward_cards (type, title, description) values
  ('myshroutka', 'МышРутка', 'Открывает игровой мир за выполненный Daily'),
  ('doneDaily', 'DoneDaily', 'Daily выполнен'),
  ('perfectDaily', 'PerfectDaily', 'Daily без единой доработки')
on conflict do nothing;

-- ЗАДАНИЯ ------------------------------------------------------
-- математика 1 (platform, 1 шаг)
with t as (
  insert into tasks (id, subject, title, mode, prompt, est_minutes)
  values ('a0000000-0000-0000-0000-000000000001','math','Сложение в пределах 100','platform','Реши пример.',8)
  on conflict (id) do nothing returning id
)
insert into task_steps (task_id, ord, kind, prompt, hint, options)
select 'a0000000-0000-0000-0000-000000000001',1,'question',
  'Сколько будет 47 + 38?',
  'Сложи десятки: 40 + 30 = 70. Потом единицы: 7 + 8 = 15. Сложи вместе.',
  '[{"id":"a","label":"75","is_correct":false},{"id":"b","label":"85","is_correct":true},{"id":"c","label":"95","is_correct":false},{"id":"d","label":"83","is_correct":false}]'
where not exists (select 1 from task_steps where task_id='a0000000-0000-0000-0000-000000000001' and ord=1);

-- математика 2 (worksheet)
insert into tasks (id, subject, title, mode, prompt, est_minutes)
values ('a0000000-0000-0000-0000-000000000002','math','Задача про конфеты','worksheet',
  'У Маши было 24 конфеты. Она разложила их поровну в 3 коробки, а потом добавила в каждую ещё по 2. Сколько конфет стало в каждой коробке? Реши на листочке и сфотографируй решение.',10)
on conflict (id) do nothing;

-- русский (worksheet)
insert into tasks (id, subject, title, mode, prompt, est_minutes)
values ('b0000000-0000-0000-0000-000000000001','russian','Безударные гласные','worksheet',
  'Спиши и вставь пропущенные буквы, обозначь ударение: «гр_за, тр_ва, с_сна, в_лна». Сфотографируй листочек.',8)
on conflict (id) do nothing;

-- чтение (platform, 3 шага)
insert into tasks (id, subject, title, mode, prompt, est_minutes)
values ('c0000000-0000-0000-0000-000000000001','reading','Понимаем прочитанное','platform','Прочитай отрывок и ответь на вопросы.',10)
on conflict (id) do nothing;
insert into task_steps (task_id, ord, kind, prompt, passage)
select 'c0000000-0000-0000-0000-000000000001',1,'reading','Шаг 1. Внимательно прочитай отрывок.',
  'Мальчик стоял у калитки и смотрел на темнеющее небо. Дома ждал тёплый ужин, но он не торопился — хотелось досмотреть, как загорается первая звезда. Когда она наконец вспыхнула над крышей соседнего дома, мальчик улыбнулся и побежал домой.'
where not exists (select 1 from task_steps where task_id='c0000000-0000-0000-0000-000000000001' and ord=1);
insert into task_steps (task_id, ord, kind, prompt, hint, options)
select 'c0000000-0000-0000-0000-000000000001',2,'question','Шаг 2. Чего ждал мальчик у калитки?',
  'Перечитай, на что он смотрел и что хотел досмотреть.',
  '[{"id":"a","label":"Когда позовут ужинать","is_correct":false},{"id":"b","label":"Когда загорится первая звезда","is_correct":true},{"id":"c","label":"Когда придёт сосед","is_correct":false}]'
where not exists (select 1 from task_steps where task_id='c0000000-0000-0000-0000-000000000001' and ord=2);
insert into task_steps (task_id, ord, kind, prompt, hint, options)
select 'c0000000-0000-0000-0000-000000000001',3,'question','Шаг 3. Что сделал мальчик, когда звезда вспыхнула?',
  'Последнее предложение отрывка.',
  '[{"id":"a","label":"Улыбнулся и побежал домой","is_correct":true},{"id":"b","label":"Загадал желание","is_correct":false},{"id":"c","label":"Остался у калитки до утра","is_correct":false}]'
where not exists (select 1 from task_steps where task_id='c0000000-0000-0000-0000-000000000001' and ord=3);

-- дневник читателя (platform, свободный ввод)
insert into tasks (id, subject, title, mode, prompt, est_minutes)
values ('c0000000-0000-0000-0000-000000000002','reading','Дневник читателя · 30 минут','platform','Запиши, что читаешь сегодня.',30)
on conflict (id) do nothing;
insert into task_steps (task_id, ord, kind, prompt, correct_input)
select 'c0000000-0000-0000-0000-000000000002',1,'question',
  'Напиши название книги и одно предложение о том, что понравилось.',''
where not exists (select 1 from task_steps where task_id='c0000000-0000-0000-0000-000000000002' and ord=1);

-- английский (platform, 1 шаг)
insert into tasks (id, subject, title, mode, prompt, est_minutes)
values ('d0000000-0000-0000-0000-000000000001','english','Present Simple','platform','Choose the correct form.',9)
on conflict (id) do nothing;
insert into task_steps (task_id, ord, kind, prompt, hint, options)
select 'd0000000-0000-0000-0000-000000000001',1,'question','«She ___ to school every day.»',
  'Present Simple, 3rd person singular → глагол получает -s/-es.',
  '[{"id":"a","label":"go","is_correct":false},{"id":"b","label":"goes","is_correct":true},{"id":"c","label":"going","is_correct":false},{"id":"d","label":"gone","is_correct":false}]'
where not exists (select 1 from task_steps where task_id='d0000000-0000-0000-0000-000000000001' and ord=1);

-- состав Daily по предметам
insert into daily_task_configs (subject, task_id, ord) values
  ('math','a0000000-0000-0000-0000-000000000001',1),
  ('math','a0000000-0000-0000-0000-000000000002',2),
  ('russian','b0000000-0000-0000-0000-000000000001',1),
  ('reading','c0000000-0000-0000-0000-000000000001',1),
  ('reading','c0000000-0000-0000-0000-000000000002',2),
  ('english','d0000000-0000-0000-0000-000000000001',1)
on conflict do nothing;


-- МышМат — миграция 0003: вход ребёнка (PIN + короткий код)
-- Добавляет к child_profiles поля аутентификации, которые использует /api/login.

alter table child_profiles
  add column if not exists pin_hash text,       -- bcrypt-хэш 4-значного PIN
  add column if not exists short_code text;     -- короткий код входа, напр. MISH42

-- короткий код уникален среди детей
create unique index if not exists child_profiles_short_code_key
  on child_profiles (short_code)
  where short_code is not null;

-- Демо-данные для входа (совпадают с моками).
-- ВНИМАНИЕ: в проде pin_hash хранит bcrypt('1234'), здесь — текст-плейсхолдер.
-- Реальная проверка PIN должна выполняться через bcrypt-сравнение на сервере.
update child_profiles
  set short_code = 'MISH42'
  where id = '11111111-1111-1111-1111-111111111111'
    and short_code is null;

-- второй демо-ребёнок (Маша), если его ещё нет
insert into child_profiles (id, name, grade, stars, short_code)
values ('22222222-2222-2222-2222-222222222222', 'Маша', 2, 120, 'MISH88')
on conflict (id) do nothing;


-- МышМат — миграция 0004: надёжное серверное сохранение попытки
-- Одна RPC делает всё атомарно:
--   1. находит/создаёт сегодняшнюю сессию ребёнка
--   2. сохраняет попытку (daily_task_attempts)
--   3. пересчитывает статус предмета в daily_subject_progress
--   4. пересчитывает Daily и при готовности выдаёт МышРутку
--
-- Клиент шлёт только: child_id, task_id, режим/результат, аналитику.
-- session_id вычисляется на сервере — клиенту его знать не нужно.

create or replace function submit_task_attempt(
  p_child uuid,
  p_task uuid,
  p_mode task_mode,
  p_is_correct bool,
  p_autonomy numeric default null
)
returns jsonb language plpgsql as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_session uuid;
  v_subject subject_id;
  v_attempt uuid;
  v_status subject_status;
  v_subj_total int;
  v_subj_done int;
  v_subj_status subject_status;
  v_granted bool;
begin
  -- предмет задания
  select subject into v_subject from tasks where id = p_task;
  if v_subject is null then
    return jsonb_build_object('ok', false, 'reason', 'task-not-found');
  end if;

  -- сессия на сегодня (создаём при отсутствии)
  select id into v_session from daily_sessions
    where child_id = p_child and date = v_today;
  if v_session is null then
    insert into daily_sessions (child_id, date, status)
      values (p_child, v_today, 'inProgress')
      returning id into v_session;
  end if;

  -- статус попытки
  v_status := case
    when p_mode = 'worksheet' then 'submitted'      -- листочек → на проверку взрослому
    when p_is_correct then 'successful'             -- платформа, решено верно
    else 'submitted'                                -- платформа, отправлено (есть ошибки)
  end;

  -- сохранить попытку
  insert into daily_task_attempts
    (session_id, task_id, child_id, mode, is_correct, autonomy_score, status, submitted_at)
  values
    (v_session, p_task, p_child, p_mode, p_is_correct, p_autonomy, v_status, now())
  returning id into v_attempt;

  -- сколько заданий в предмете всего и сколько уже сдано (по последним попыткам)
  select count(*) into v_subj_total
    from daily_task_configs where subject = v_subject and active = true;

  select count(distinct dtc.task_id) into v_subj_done
    from daily_task_configs dtc
    join daily_task_attempts a
      on a.task_id = dtc.task_id
     and a.session_id = v_session
     and a.status in ('submitted','successful','perfect')
   where dtc.subject = v_subject and dtc.active = true;

  -- статус предмета: всё сдано → submitted (минимум), иначе inProgress
  v_subj_status := case when v_subj_total > 0 and v_subj_done >= v_subj_total
                        then 'submitted' else 'inProgress' end;

  -- upsert прогресса предмета
  insert into daily_subject_progress (session_id, subject, status, tasks_total, tasks_done)
  values (v_session, v_subject, v_subj_status, v_subj_total, v_subj_done)
  on conflict (session_id, subject) do update
    set status = excluded.status,
        tasks_total = excluded.tasks_total,
        tasks_done = excluded.tasks_done;

  -- пересчёт Daily + выдача МышРутки (использует уже существующую функцию)
  perform recompute_daily_and_grant_myshroutka(v_session);

  select myshroutka_granted into v_granted from daily_sessions where id = v_session;

  return jsonb_build_object(
    'ok', true,
    'attemptId', v_attempt,
    'sessionId', v_session,
    'subject', v_subject,
    'subjectDone', v_subj_done,
    'subjectTotal', v_subj_total,
    'myshroutkaGranted', coalesce(v_granted, false)
  );
end $$;
