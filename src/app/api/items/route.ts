import { connection } from "next/server";
import { hasApiKey } from "@/lib/ai";
import { z } from "zod/v4";
import { FOLDERS } from "@/lib/schema";
import { createEvent, isSeeded, listItems, listMessages, listSuggestions } from "@/lib/store";

export async function GET() {
  await connection(); // DB の今の中身を返すので、ビルド時にプリレンダーさせない
  const [items, suggestions, seeded, messages] = await Promise.all([listItems(), listSuggestions(), isSeeded(), listMessages(null)]);
  return Response.json({ items, suggestions, seeded, messages, aiEnabled: hasApiKey() });
}

const time = z.string().regex(/^\d{2}:\d{2}$/).nullable();
const NewEvent = z.object({
  title: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: time,
  endTime: time,
  folder: z.enum(FOLDERS),
});

// 日表示から時間を指定して予定を入れる
export async function POST(request: Request) {
  const parsed = NewEvent.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  return Response.json({ id: await createEvent(parsed.data) });
}
