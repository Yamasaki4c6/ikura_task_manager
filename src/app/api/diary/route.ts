import { connection, type NextRequest } from "next/server";
import { z } from "zod/v4";
import { getDiary, saveDiary } from "@/lib/store";

const Date_ = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Entry = z.object({ date: Date_, mood: z.number().int().min(1).max(5).nullable(), text: z.string().max(20000) });

export async function GET(request: NextRequest) {
  await connection();
  const date = Date_.safeParse(request.nextUrl.searchParams.get("date"));
  if (!date.success) return Response.json({ error: "date" }, { status: 400 });
  return Response.json({ entry: await getDiary(date.data) });
}

export async function PUT(request: Request) {
  const parsed = Entry.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const { date, ...entry } = parsed.data;
  await saveDiary(date, entry);
  return Response.json({ ok: true });
}
