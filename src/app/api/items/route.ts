import { connection } from "next/server";
import { hasApiKey } from "@/lib/ai";
import { isSeeded, listItems, listMessages, listSuggestions } from "@/lib/store";

export async function GET() {
  await connection(); // DB の今の中身を返すので、ビルド時にプリレンダーさせない
  const [items, suggestions, seeded, messages] = await Promise.all([listItems(), listSuggestions(), isSeeded(), listMessages(null)]);
  return Response.json({ items, suggestions, seeded, messages, aiEnabled: hasApiKey() });
}
