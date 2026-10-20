import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, sessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return NextResponse.next();
  if (request.cookies.get(COOKIE)?.value === (await sessionToken(passcode))) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // アイコンとマニフェストはブラウザがログイン情報なしで取りに来るので、鍵の外に置く
  matcher: ["/((?!login|api/login|_next/|favicon.ico|manifest.webmanifest|icon-|apple-icon).*)"],
};
