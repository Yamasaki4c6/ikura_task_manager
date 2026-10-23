import { connection, type NextRequest } from "next/server";
import { chat, listMessages } from "@/lib/store";

export const maxDuration = 60;

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/items/[id]/chat">) {
  await connection();
  const { id } = await ctx.params;
  return Response.json({ messages: await listMessages(Number(id)) });
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/items/[id]/chat">) {
  const { id } = await ctx.params;
  const { text } = await request.json();
  if (typeof text !== "string" || !text.trim()) return Response.json({ error: "empty" }, { status: 400 });
  try {
    const result = await chat(Number(id), text.trim());
    if (!result) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: `返答に失敗しました: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
