import type { NextRequest } from "next/server";
import { z } from "zod/v4";
import { FOLDERS, KINDS, STATUSES } from "@/lib/schema";
import { deleteItem, updateItem } from "@/lib/store";

// 利用者が手で触るのはカテゴリ・締切・状態だけ（仕様 §3.6）。誤分類の直しとして種別と見出しも許す
const Patch = z
  .object({
    status: z.enum(STATUSES),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    onCalendar: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    folder: z.enum(FOLDERS),
    kind: z.enum(KINDS),
    title: z.string().min(1),
  })
  .partial();

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/items/[id]">) {
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  await updateItem(Number(id), parsed.data);
  return Response.json({ ok: true });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/items/[id]">) {
  const { id } = await ctx.params;
  await deleteItem(Number(id));
  return Response.json({ ok: true });
}
