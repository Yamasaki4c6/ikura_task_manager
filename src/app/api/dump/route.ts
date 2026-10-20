import { dump } from "@/lib/store";

export async function POST(request: Request) {
  const { text } = await request.json();
  if (typeof text !== "string" || !text.trim()) return Response.json({ error: "empty" }, { status: 400 });
  try {
    return Response.json(await dump(text.trim()));
  } catch (e) {
    console.error(e);
    return Response.json({ error: "分類に失敗しました" }, { status: 500 });
  }
}
