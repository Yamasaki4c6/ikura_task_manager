import { z } from "zod/v4";
import { shortTitles } from "@/lib/store";

const Body = z.object({ ids: z.array(z.number().int()).max(5) });

// キャラクターの吹き出しに出す項目の短い一言を返す（なければ作って保存する）
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  try {
    return Response.json({ shorts: await shortTitles(parsed.data.ids) });
  } catch (e) {
    console.error(e);
    return Response.json({ shorts: {} });
  }
}
