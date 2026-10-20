import { dump } from "@/lib/store";

// 分類と接続で Claude を2回呼ぶので、既定の実行時間では足りないことがある
export const maxDuration = 60;

export async function POST(request: Request) {
  const { text } = await request.json();
  if (typeof text !== "string" || !text.trim()) return Response.json({ error: "empty" }, { status: 400 });
  try {
    return Response.json(await dump(text.trim()));
  } catch (e) {
    console.error(e);
    return Response.json({ error: `分類に失敗しました: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
