import type { NextRequest } from "next/server";
import { resolveSuggestion } from "@/lib/store";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/suggestions/[id]">) {
  const { id } = await ctx.params;
  const { action } = await request.json();
  if (action !== "accept" && action !== "dismiss") return Response.json({ error: "bad action" }, { status: 400 });
  const result = await resolveSuggestion(Number(id), action);
  if (!result) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(result);
}
