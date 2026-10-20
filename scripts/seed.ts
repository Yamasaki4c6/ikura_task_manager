// 初期タスク一覧を投入する。AI は呼ばない。
// 使い方: npm run seed   （既に項目があるときは何もしない。やり直すときは --force）
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { ensureSchema, seedInitial } from "../src/lib/store";

async function main() {
  await ensureSchema();
  const force = process.argv.includes("--force");
  const [{ n }] = (await db.all(sql`SELECT count(*) AS n FROM items`)) as { n: number }[];
  if (n > 0 && !force) {
    console.log(`既に ${n} 件あるので投入しません（--force で全消去して入れ直し）`);
    return;
  }
  if (force) for (const t of ["items", "tags", "item_tags", "suggestions"]) await db.run(sql.raw(`DELETE FROM ${t}`));
  console.log(`${await seedInitial()} 件の親項目を投入しました`);
}

main();
