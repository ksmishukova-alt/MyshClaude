import { cookies } from "next/headers";

/**
 * Простая серверная «сессия» ребёнка через HTTP-cookie.
 * Хранит UUID вошедшего ребёнка. Без тяжёлых auth-библиотек —
 * достаточно для детского режима MVP.
 */

export const CHILD_COOKIE = "myshmat_child";
const DEMO_CHILD = "11111111-1111-1111-1111-111111111111";

/** UUID текущего ребёнка из cookie (или демо-ребёнок, если не вошёл). */
export async function getCurrentChildId(): Promise<string> {
  const store = await cookies();
  const v = store.get(CHILD_COOKIE)?.value;
  return v && /^[0-9a-f-]{36}$/i.test(v) ? v : DEMO_CHILD;
}

/** Вошёл ли ребёнок явно (есть валидная cookie). */
export async function hasChildSession(): Promise<boolean> {
  const store = await cookies();
  const v = store.get(CHILD_COOKIE)?.value;
  return !!v && /^[0-9a-f-]{36}$/i.test(v);
}
