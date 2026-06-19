import { cookies } from "next/headers";

/**
 * Серверные «сессии» через HTTP-cookie.
 *  - Ребёнок: CHILD_COOKIE = UUID ребёнка (вход по логину + PIN).
 *  - Взрослый (методист/родитель): ADULT_COOKIE = роль ("methodist"|"parent").
 *
 * Разделение детских и взрослых экранов обеспечивает middleware.ts:
 * ребёнок не попадает на «взрослые» экраны, взрослый — на детские.
 */

export const CHILD_COOKIE = "myshmat_child";
export const ADULT_COOKIE = "myshmat_adult";
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

export type AdultRole = "methodist" | "parent";

/** Роль вошедшего взрослого (или null). */
export async function getAdultRole(): Promise<AdultRole | null> {
  const store = await cookies();
  const v = store.get(ADULT_COOKIE)?.value;
  return v === "methodist" || v === "parent" ? v : null;
}
