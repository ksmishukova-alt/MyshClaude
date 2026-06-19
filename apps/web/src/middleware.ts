import { NextResponse, type NextRequest } from "next/server";

/**
 * Защита маршрутов и разделение детских / взрослых экранов (plan.md §2).
 *  - Детские экраны требуют детской сессии (cookie myshmat_child), иначе → /login.
 *  - Взрослые экраны (/methodist, /parent) требуют взрослой сессии
 *    (cookie myshmat_adult), иначе → /enter. Ребёнок на них не попадает.
 *  - Открытые без входа: /login, /enter, /preview, API, статика.
 *
 * Cookie проверяются по наличию/формату — без БД (middleware на edge).
 */

const CHILD_COOKIE = "myshmat_child";
const ADULT_COOKIE = "myshmat_adult";

const ADULT_ROUTES = ["/methodist", "/parent"];
const PUBLIC_ROUTES = ["/login", "/enter", "/preview"];

function isChildSession(req: NextRequest): boolean {
  const v = req.cookies.get(CHILD_COOKIE)?.value;
  return !!v && /^[0-9a-f-]{36}$/i.test(v);
}
function isAdultSession(req: NextRequest): boolean {
  const v = req.cookies.get(ADULT_COOKIE)?.value;
  return v === "methodist" || v === "parent";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // открытые маршруты
  if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // взрослые экраны
  if (ADULT_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (isAdultSession(req)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/enter";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // всё остальное — детские экраны
  if (isChildSession(req)) return NextResponse.next();
  // взрослый, забредший на детский экран → на свой вход
  if (isAdultSession(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/methodist";
    return NextResponse.redirect(url);
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // пропускаем API, статику Next, ассеты и файлы с расширением
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|myshmat-assets|.*\\.).*)"],
};
