-- ============================================================
-- МышМат — полная установка БД одним файлом
-- Выполните целиком в Supabase → SQL Editor → New query → Run
-- (0001_init + 0002_seed + 0003_auth + 0004_submit_attempt + 0005_olympiad)
-- Повторный запуск безопасен.
-- ============================================================


-- >>>>>>>>>> 0001_init.sql <<<<<<<<<<

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

-- >>>>>>>>>> 0002_seed.sql <<<<<<<<<<

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

-- >>>>>>>>>> 0003_auth.sql <<<<<<<<<<

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

-- >>>>>>>>>> 0004_submit_attempt.sql <<<<<<<<<<

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

-- >>>>>>>>>> 0005_olympiad.sql <<<<<<<<<<

-- МышМат — миграция 0005: олимпиадное ядро (темы, банк задач, прогресс по теме)
-- Модель: уровень L1–L6 — это МЕТОД (см. plan.md §3). Тема — единый узел с глубиной.
--
-- Контент (темы/задачи) хранится JSONB-документами + запросные колонки
-- (id, theme_id, level, ord). Это даёт переносимость и низкий vendor lock-in
-- (репозиторий-слой просто читает data → типизированный объект, см. lib/olympiad-db.ts),
-- при этом выборка по теме/уровню остаётся индексируемой.
-- Прогресс ребёнка по теме — нормализованная таблица (пишется часто).
-- Повторный запуск безопасен.

do $$ begin
  create type olympiad_level as enum ('L1','L2','L3','L4','L5','L6');
exception when duplicate_object then null; end $$;

do $$ begin
  create type theme_state as enum ('locked','open','inProgress','mastered');
exception when duplicate_object then null; end $$;

create table if not exists olympiad_themes (
  id text primary key,
  ord int not null default 0,
  title text not null,
  mastery_level olympiad_level not null,
  depends_on text[] not null default '{}',
  data jsonb not null
);

create table if not exists olympiad_problems (
  id text primary key,
  theme_id text not null references olympiad_themes(id) on delete cascade,
  level olympiad_level not null,
  ord int not null default 0,
  reward_stars int not null default 0,
  data jsonb not null
);
create index if not exists olympiad_problems_theme_level
  on olympiad_problems (theme_id, level, ord);

create table if not exists child_theme_progress (
  child_id uuid not null references child_profiles(id) on delete cascade,
  theme_id text not null references olympiad_themes(id) on delete cascade,
  current_level olympiad_level not null default 'L1',
  streak int not null default 0,
  solved_at_level int not null default 0,
  consecutive_fails int not null default 0,
  stars int not null default 0,
  badge_earned bool not null default false,
  state theme_state not null default 'locked',
  updated_at timestamptz not null default now(),
  primary key (child_id, theme_id)
);

create table if not exists olympiad_attempts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references child_profiles(id) on delete cascade,
  problem_id text not null,
  theme_id text not null,
  level olympiad_level not null,
  is_correct bool,
  attempts_used int not null default 1,
  uploaded_solution_url text,
  created_at timestamptz not null default now()
);

insert into olympiad_themes (id, ord, title, mastery_level, depends_on, data) values
 ('logic', 1, 'Логика', 'L2', '{}', '{"id":"logic","title":"Логика","blurb":"Рыцари и лжецы, истина и ложь, рассуждение от противного.","icon":"🧩","dependsOn":[],"levels":["L1","L2","L5"],"masteryLevel":"L2","skillTags":["логика","от противного"]}'),
 ('search', 2, 'Перебор', 'L2', '{logic}', '{"id":"search","title":"Перебор","blurb":"Аккуратно перебрать все случаи и ничего не пропустить.","icon":"🔎","dependsOn":["logic"],"levels":["L1","L2"],"masteryLevel":"L2","skillTags":["перебор","систематичность"]}'),
 ('heads-legs', 3, 'Головы и ноги', 'L4', '{search}', '{"id":"heads-legs","title":"Головы и ноги","blurb":"Метод предположения: «представим, что все одинаковые» и сравним.","icon":"🐰","dependsOn":["search"],"levels":["L1","L2","L3","L4","L5"],"masteryLevel":"L4","skillTags":["метод предположения","уравнивание"]}'),
 ('parity', 4, 'Чётность', 'L1', '{logic}', '{"id":"parity","title":"Чётность","blurb":"Чёт и нечёт: когда раскраска и остаток решают задачу.","icon":"⚖️","dependsOn":["logic"],"levels":["L1","L5"],"masteryLevel":"L1","skillTags":["чётность","инвариант"]}'),
 ('invariants', 5, 'Инварианты', 'L1', '{parity}', '{"id":"invariants","title":"Инварианты","blurb":"Что НЕ меняется при действиях — то и подсказывает ответ.","icon":"🔁","dependsOn":["parity"],"levels":["L1","L5"],"masteryLevel":"L1","skillTags":["инвариант"]}'),
 ('dirichlet', 6, 'Принцип Дирихле', 'L1', '{parity}', '{"id":"dirichlet","title":"Принцип Дирихле","blurb":"Если кроликов больше, чем клеток — где-то их двое.","icon":"🕳️","dependsOn":["parity"],"levels":["L1"],"masteryLevel":"L1","skillTags":["Дирихле","оценка"]}'),
 ('geometry', 7, 'Геометрия', 'L1', '{invariants}', '{"id":"geometry","title":"Геометрия","blurb":"Разрезания, площади, симметрия на клетчатой бумаге.","icon":"📐","dependsOn":["invariants"],"levels":["L1"],"masteryLevel":"L1","skillTags":["геометрия"]}')
on conflict (id) do update set
  ord = excluded.ord, title = excluded.title, mastery_level = excluded.mastery_level,
  depends_on = excluded.depends_on, data = excluded.data;

insert into olympiad_problems (id, theme_id, level, ord, reward_stars, data) values
 ('hl-l1-1','heads-legs','L1',1,15,'{"id":"hl-l1-1","themeId":"heads-legs","level":"L1","title":"Зайцы и змеи","statement":"В живом уголке сидят зайцы и змеи. Всего 8 голов и 20 ног. У зайца 4 лапы, у змеи лап нет (0). Сколько зайцев и сколько змей?","expectedAnswer":"5 зайцев, 3 змеи","acceptedAnswers":["5 и 3","зайцев 5 змей 3","5 зайцев 3 змеи"],"hints":["Представь, что в уголке ВСЕ — змеи. Сколько тогда было бы ног?","Ног на самом деле 20, а у «всех змей» — 0. Куда делась разница?","Каждая замена змеи на зайца добавляет 4 ноги. Раздели разницу на 4."],"rewardStars":15,"skillTags":["метод предположения"],"steps":[{"id":"s1","title":"Представь, что ВСЕ — змеи. Сколько тогда всего ног?","guidance":"У змеи 0 ног. Если бы все 8 голов были змеями, ног было бы 8 × 0 = 0.","kind":"number","accepted":["0"],"hint":"8 змей × 0 ног = 0."},{"id":"s2","title":"На сколько это меньше, чем на самом деле?","guidance":"На самом деле ног 20. Разница: 20 − 0 = 20.","kind":"number","accepted":["20"],"hint":"20 − 0 = 20."},{"id":"s3","title":"Замена змеи на зайца добавляет 4 ноги. Сколько зайцев нужно?","guidance":"Разницу 20 делим на 4: 20 ÷ 4 = 5. Значит зайцев 5.","kind":"expression","accepted":["20 / 4","20÷4","5"],"hint":"20 ÷ 4 = ?"},{"id":"s4","title":"Сколько тогда змей?","guidance":"Всего голов 8. Змей: 8 − 5 = 3.","kind":"number","accepted":["3"],"hint":"8 − 5 = 3."}]}'),
 ('hl-l2-1','heads-legs','L2',1,18,'{"id":"hl-l2-1","themeId":"heads-legs","level":"L2","title":"Овцы и гуси","statement":"На лугу пасутся овцы (4 ноги) и гуси (2 ноги). Всего 10 голов и 28 ног. Сколько овец и сколько гусей?","expectedAnswer":"4 овцы, 6 гусей","acceptedAnswers":["4 и 6","овец 4 гусей 6","4 овцы 6 гусей"],"hints":["Представь, что все 10 — гуси (по 2 ноги). Сколько ног получится?","Сравни с настоящими 28 ногами — найди разницу.","Замена гуся на овцу добавляет 4 − 2 = 2 ноги. Раздели разницу на 2."],"rewardStars":18,"skillTags":["метод предположения"],"steps":[{"id":"s1","title":"Пусть все 10 — гуси. Сколько всего ног?","guidance":"Гусь — 2 ноги. 10 × 2 = 20.","kind":"expression","accepted":["10 * 2","10×2","20"],"hint":"10 × 2 = ?"},{"id":"s2","title":"Какая разница с настоящими 28 ногами?","guidance":"28 − 20 = 8.","kind":"number","accepted":["8"],"hint":"28 − 20."},{"id":"s3","title":"Замена гуся на овцу добавляет сколько ног?","guidance":"У овцы 4, у гуся 2. Разница 4 − 2 = 2 ноги за замену.","kind":"number","accepted":["2"],"hint":"4 − 2."},{"id":"s4","title":"Сколько овец? А гусей?","guidance":"Овец: 8 ÷ 2 = 4. Гусей: 10 − 4 = 6.","kind":"expression","accepted":["8 / 2","8÷2","4"],"hint":"Раздели разницу 8 на 2."}]}'),
 ('hl-l3-1','heads-legs','L3',1,22,'{"id":"hl-l3-1","themeId":"heads-legs","level":"L3","title":"Машины и мотоциклы","statement":"На стоянке машины (4 колеса) и мотоциклы (2 колеса). Всего 7 транспортных средств и 22 колеса. Сколько машин?","expectedAnswer":"4 машины","acceptedAnswers":["4","4 машины 3 мотоцикла","машин 4"],"hints":["Предположи, что все — мотоциклы, и сравни число колёс."],"rewardStars":22,"skillTags":["метод предположения","план"],"steps":[{"id":"plan","title":"Сначала расставь план решения по порядку","kind":"order","options":[{"id":"a","label":"Предположить, что все — мотоциклы"},{"id":"b","label":"Посчитать колёса при этом предположении"},{"id":"c","label":"Найти разницу с настоящим числом колёс"},{"id":"d","label":"Разделить разницу на «добавку» за замену"}],"correctOrder":["a","b","c","d"]},{"id":"s1","title":"Все 7 — мотоциклы: сколько колёс?","kind":"number","accepted":["14"]},{"id":"s2","title":"Разница с 22 колёсами?","kind":"number","accepted":["8"]},{"id":"s3","title":"Сколько машин? (замена добавляет 2 колеса)","kind":"number","accepted":["4"]}]}'),
 ('hl-l4-1','heads-legs','L4',1,28,'{"id":"hl-l4-1","themeId":"heads-legs","level":"L4","title":"Пауки и жуки","statement":"В коробке пауки (8 ног) и жуки (6 ног). Всего 12 насекомых и 84 ноги. Сколько пауков?","expectedAnswer":"6 пауков","acceptedAnswers":["6","6 пауков 6 жуков","пауков 6"],"hints":[],"rewardStars":28,"skillTags":["метод предположения","самостоятельный план"],"actionCount":3,"answerScaffold":["Пауков —","значит, жуков —"],"steps":[{"id":"a1","title":"Действие 1","kind":"expression","accepted":["12 * 6","12×6","72"],"actionKindOptions":["сложение","вычитание","умножение","деление"],"actionKind":"умножение"},{"id":"a2","title":"Действие 2","kind":"expression","accepted":["84 - 72","12"],"actionKindOptions":["сложение","вычитание","умножение","деление"],"actionKind":"вычитание"},{"id":"a3","title":"Действие 3","kind":"expression","accepted":["12 / 2","12÷2","6"],"actionKindOptions":["сложение","вычитание","умножение","деление"],"actionKind":"деление"}]}'),
 ('hl-l5-1','heads-legs','L5',1,40,'{"id":"hl-l5-1","themeId":"heads-legs","level":"L5","title":"Велосипеды, машины и трёхколёсные","statement":"Во дворе стоят велосипеды (2 колеса), машины (4 колеса) и трёхколёсные самокаты (3 колеса). Всего 10 штук и 29 колёс, причём велосипедов вдвое больше, чем машин. Сколько каждого вида? Реши на листочке, сфотографируй решение и впиши ответ.","expectedAnswer":"4 велосипеда, 2 машины, 4 самоката","acceptedAnswers":["4 2 4","велосипедов 4 машин 2 самокатов 4"],"hints":[],"rewardStars":40,"skillTags":["метод предположения","система условий","самостоятельность"]}'),
 ('logic-l1-1','logic','L1',1,16,'{"id":"logic-l1-1","themeId":"logic","level":"L1","title":"Рыцари и лжецы","statement":"На острове рыцари всегда говорят правду, а лжецы всегда лгут. Встретились трое. А сказал: «Б — лжец». Б сказал: «В — лжец». В сказал: «А и Б оба лжецы». Сколько среди них рыцарей?","expectedAnswer":"1","acceptedAnswers":["1 рыцарь","один"],"hints":["Предположи, что В говорит правду. Тогда А и Б — лжецы. Нет ли противоречия?","Если В — лжец, то неверно, что «А и Б оба лжецы» — значит хотя бы один из них рыцарь."],"rewardStars":16,"skillTags":["логика","от противного"],"steps":[{"id":"s1","title":"Предположим, что В — рыцарь (говорит правду). Кто тогда А и Б?","guidance":"Если В прав, то «А и Б оба лжецы» — правда. Значит и А, и Б лжецы.","kind":"choice","options":[{"id":"a","label":"Оба лжецы","correct":true},{"id":"b","label":"Оба рыцари"},{"id":"c","label":"Один рыцарь, один лжец"}],"hint":"В утверждает: «А и Б оба лжецы»."},{"id":"s2","title":"А — лжец и сказал «Б — лжец». Значит Б на самом деле…","guidance":"Лжец лжёт, поэтому правда обратна: Б — рыцарь. Но мы предположили, что Б лжец — противоречие!","kind":"choice","options":[{"id":"a","label":"Рыцарь — противоречие с предположением","correct":true},{"id":"b","label":"Лжец — всё сходится"}],"hint":"Лжец говорит неправду, значит обратное его словам — истина."},{"id":"s3","title":"Значит В — лжец. Сколько всего рыцарей среди троих?","guidance":"Разбор показывает: рыцарь ровно один (это Б).","kind":"number","accepted":["1"],"hint":"Проверь: только Б оказывается рыцарем."}]}'),
 ('logic-l5-1','logic','L5',1,36,'{"id":"logic-l5-1","themeId":"logic","level":"L5","title":"Кто разбил вазу","statement":"Трое детей. Ровно один разбил вазу и ровно один соврал. Аня: «Я не била». Боря: «Это Аня». Вера: «Это не я». Кто разбил вазу? Реши на листочке и впиши ответ.","expectedAnswer":"Вера","acceptedAnswers":["вера","вазу разбила вера"],"hints":[],"rewardStars":36,"skillTags":["логика","перебор случаев"]}'),
 ('parity-l1-1','parity','L1',1,14,'{"id":"parity-l1-1","themeId":"parity","level":"L1","title":"Сумма 1..10","statement":"На доске числа от 1 до 10. Можно ли стереть несколько так, чтобы сумма оставшихся равнялась 7? Если да — приведи пример (впиши оставшиеся числа), если нет — напиши «нет».","expectedAnswer":"7","acceptedAnswers":["3 4","1 2 4","2 5","1 6"],"hints":["Какая самая маленькая сумма, если оставить только одно число?","Можно оставить, например, числа 3 и 4 — их сумма 7."],"rewardStars":14,"skillTags":["чётность","сумма"],"steps":[{"id":"s1","title":"Можно ли получить сумму 7?","guidance":"Да: оставим только числа, дающие в сумме 7, остальные сотрём.","kind":"choice","options":[{"id":"a","label":"Да, можно","correct":true},{"id":"b","label":"Нет, невозможно"}],"hint":"Попробуй оставить 3 и 4."},{"id":"s2","title":"Впиши пример оставшихся чисел (через пробел)","guidance":"Например, 3 и 4: 3 + 4 = 7.","kind":"number","accepted":["3 4","1 2 4","2 5","1 6","7"],"hint":"3 + 4 = 7."}]}')
on conflict (id) do update set
  theme_id = excluded.theme_id, level = excluded.level, ord = excluded.ord,
  reward_stars = excluded.reward_stars, data = excluded.data;

insert into child_theme_progress
  (child_id, theme_id, current_level, streak, solved_at_level, stars, badge_earned, state) values
 ('11111111-1111-1111-1111-111111111111','logic','L2',1,3,48,true,'mastered'),
 ('11111111-1111-1111-1111-111111111111','search','L1',2,2,20,false,'inProgress'),
 ('11111111-1111-1111-1111-111111111111','heads-legs','L1',0,0,0,false,'open')
on conflict (child_id, theme_id) do nothing;
