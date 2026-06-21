-- МышМат — миграция 0006: реальные пользователи (пилот) + поддержка обычного PIN.
-- На пилоте PIN хранится открытым 4-значным кодом в колонке pin (низкий риск).
-- Логин: если есть pin_hash — bcrypt; иначе если есть pin — сравнение; иначе демо-1234.
-- ВАЖНО: выполнить ЭТОТ файл в Supabase ДО (или вместе с) деплоем нового /api/login.
-- Повторный запуск безопасен.

alter table child_profiles add column if not exists pin text;

insert into child_profiles (id, name, grade, stars, short_code, pin) values
  ('a0000000-0000-0000-0000-0000000000a1', 'Аня',   3, 0, 'ANYA01', '2020'),
  ('a0000000-0000-0000-0000-0000000000a2', 'Настя', 2, 0, 'NAST02', '1313'),
  ('a0000000-0000-0000-0000-0000000000a3', 'Даня',  4, 0, 'DANY03', '3939')
on conflict (id) do update set
  name = excluded.name, grade = excluded.grade,
  short_code = excluded.short_code, pin = excluded.pin;
