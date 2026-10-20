import { NextResponse } from "next/server";
import { COOKIE, sessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { passcode } = await request.json();
  const expected = process.env.APP_PASSCODE;
  if (!expected || passcode !== expected) return NextResponse.json({ ok: false }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await sessionToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
