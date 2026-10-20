import { connection } from "next/server";
import { hasApiKey } from "@/lib/ai";
import { listItems, listSuggestions } from "@/lib/store";

export async function GET() {
  await connection(); // DB の今の中身を返すので、ビルド時にプリレンダーさせない
  const [items, suggestions] = await Promise.all([listItems(), listSuggestions()]);
  return Response.json({ items, suggestions, aiEnabled: hasApiKey() });
}
