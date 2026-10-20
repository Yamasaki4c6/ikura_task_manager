import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { hasApiKey } from "@/lib/ai";
import { db, dbTarget } from "@/lib/db";
import { ensureSchema } from "@/lib/store";

// どの DB に繋がり、テーブルと行があるかを返す
export async function GET() {
  await connection();
  try {
    await ensureSchema();
    const tables = (await db.all(sql`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)) as { name: string }[];
    const [{ n }] = (await db.all(sql`SELECT count(*) AS n FROM items`)) as { n: number }[];
    return Response.json({ ok: true, database: dbTarget, tables: tables.map((t) => t.name), items: n, aiEnabled: hasApiKey() });
  } catch (e) {
    return Response.json({ ok: false, database: dbTarget, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
