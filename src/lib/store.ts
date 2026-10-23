import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, dbConfigError } from "./db";
import { itemTags, items, messages, suggestions, tags, type Status } from "./schema";
import { interpret, link, type ClassifiedItem, type Interpretation, type Known } from "./ai";
import { todayJST } from "./dates";
import { SEED_SOURCE, seeds } from "./seed-data";

let ready: Promise<void> | null = null;
// 初回アクセス時にテーブルを作る。スキーマが育ってきたら drizzle-kit のマイグレーションに移す
export function ensureSchema() {
  ready ??= (async () => {
    if (dbConfigError) throw new Error(dbConfigError);
    await db.run(sql`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, note TEXT, kind TEXT NOT NULL, folder TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '未着手', parent_id INTEGER, start_date TEXT, due_date TEXT, recurrence TEXT,
      priority TEXT NOT NULL DEFAULT '青', source_text TEXT, linked_ids TEXT, created_at TEXT NOT NULL)`);
    await db.run(sql`CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE)`);
    await db.run(sql`CREATE TABLE IF NOT EXISTS item_tags (item_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, PRIMARY KEY (item_id, tag_id))`);
    await db.run(sql`CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, anchor_id INTEGER NOT NULL, material_ids TEXT NOT NULL, message TEXT NOT NULL,
      task_title TEXT NOT NULL, due_date TEXT, steps TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL)`);
    await db.run(sql`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER, role TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL)`);
    const cols = await db.all<{ name: string }>(sql`PRAGMA table_info(items)`);
    if (!cols.some((c) => c.name === "on_calendar")) {
      await db.run(sql`ALTER TABLE items ADD COLUMN on_calendar INTEGER NOT NULL DEFAULT 0`);
      // 既存の項目は、予定と「日が一日に決まっているタスク」だけをカレンダーに残す
      await db.run(sql`UPDATE items SET on_calendar = 1 WHERE kind = '予定' AND parent_id IS NULL
        OR (kind = 'タスク' AND due_date IS NOT NULL AND start_date IS NULL AND recurrence IS NULL AND parent_id IS NULL)`);
    }
  })().catch((e) => {
    ready = null; // 失敗した初期化を覚え続けず、次のリクエストでやり直す
    throw e;
  });
  return ready;
}

export type ItemView = typeof items.$inferSelect & { tags: string[]; childIds: number[] };

// 親の状態は子から算出する（仕様 §3.4）
function deriveStatus(children: Status[]): Status {
  if (children.length > 0 && children.every((s) => s === "完了")) return "完了";
  if (children.some((s) => s !== "未着手")) return "進行中";
  return "未着手";
}

export async function listItems(): Promise<ItemView[]> {
  await ensureSchema();
  const rows = await db.select().from(items).orderBy(items.id);
  const tagRows = await db
    .select({ itemId: itemTags.itemId, name: tags.name })
    .from(itemTags)
    .innerJoin(tags, eq(itemTags.tagId, tags.id));
  const tagMap = new Map<number, string[]>();
  for (const t of tagRows) tagMap.set(t.itemId, [...(tagMap.get(t.itemId) ?? []), t.name]);

  const views: ItemView[] = rows.map((r) => ({ ...r, tags: tagMap.get(r.id) ?? [], childIds: [] }));
  const byId = new Map(views.map((v) => [v.id, v]));
  for (const v of views) if (v.parentId) byId.get(v.parentId)?.childIds.push(v.id);
  for (const v of views) {
    if (v.childIds.length) v.status = deriveStatus(v.childIds.map((id) => byId.get(id)!.status));
  }
  return views;
}

async function tagIds(names: string[]) {
  const clean = [...new Set(names.map((n) => n.replace(/^#/, "").trim()).filter(Boolean))];
  if (clean.length === 0) return [];
  await db.insert(tags).values(clean.map((name) => ({ name }))).onConflictDoNothing();
  const rows = await db.select().from(tags).where(inArray(tags.name, clean));
  return rows.map((r) => r.id);
}

export async function insertItem(
  c: ClassifiedItem & { status?: Status },
  extra: { sourceText?: string; parentId?: number; linkedIds?: number[] } = {},
) {
  await ensureSchema();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(items)
    .values({
      title: c.title,
      note: c.note,
      kind: c.kind,
      folder: c.folder,
      startDate: c.startDate,
      dueDate: c.dueDate,
      recurrence: c.recurrence,
      priority: c.priority,
      onCalendar: c.onCalendar,
      status: c.status ?? "未着手",
      parentId: extra.parentId ?? null,
      sourceText: extra.sourceText ?? null,
      linkedIds: extra.linkedIds ? JSON.stringify(extra.linkedIds) : null,
      createdAt: now,
    })
    .returning({ id: items.id });
  const ids = await tagIds(c.tags);
  if (ids.length) await db.insert(itemTags).values(ids.map((tagId) => ({ itemId: row.id, tagId }))).onConflictDoNothing();
  for (const child of c.children) {
    await insertItem({
      ...c,
      title: child,
      note: null,
      kind: c.kind === "予定" ? "タスク" : c.kind,
      tags: [],
      children: [],
      status: "未着手",
      onCalendar: false, // 親が載っていれば十分。子まで載せるとカレンダーが埋まる
      startDate: null,
      dueDate: c.kind === "予定" || c.kind === "タスク" ? c.dueDate : null,
    }, { parentId: row.id });
  }
  return row.id;
}

const toKnown = (i: ItemView): Known => ({
  id: i.id, title: i.title, kind: i.kind, folder: i.folder, status: i.status, parentId: i.parentId, dueDate: i.dueDate,
});

async function saveMessage(itemId: number | null, role: "user" | "assistant", text: string) {
  await db.insert(messages).values({ itemId, role, text, createdAt: new Date().toISOString() });
}

export async function listMessages(itemId: number | null, limit = 100) {
  await ensureSchema();
  const rows = await db
    .select()
    .from(messages)
    .where(itemId === null ? sql`${messages.itemId} IS NULL` : eq(messages.itemId, itemId))
    .orderBy(desc(messages.id))
    .limit(limit);
  return rows.reverse();
}

// AI の読み取りを DB に反映する。報告は既存項目の更新、新しい事柄だけを項目として足す
async function apply(result: Interpretation, all: ItemView[], sourceText: string) {
  const byId = new Map(all.map((i) => [i.id, i]));
  const updated: number[] = [];
  for (const u of result.updates) {
    const it = byId.get(u.id);
    if (!it) continue;
    const patch: Partial<typeof items.$inferInsert> = {};
    if (u.hold) Object.assign(patch, { startDate: null, dueDate: null, onCalendar: false });
    if (u.dueDate) patch.dueDate = u.dueDate;
    if (u.onCalendar !== null) patch.onCalendar = u.onCalendar;
    if (u.note) patch.note = it.note ? `${it.note}\n${u.note}` : u.note;
    if (u.status) {
      // 親の状態は子から算出するので、親を完了と言われたら子をまとめて完了にする
      if (it.childIds.length) {
        if (u.status === "完了") await db.update(items).set({ status: "完了" }).where(inArray(items.id, it.childIds));
      } else patch.status = u.status;
    }
    if (Object.keys(patch).length) await db.update(items).set(patch).where(eq(items.id, u.id));
    updated.push(u.id);
  }
  const created: number[] = [];
  for (const { parentId, ...c } of result.creates) {
    const parent = parentId ? byId.get(parentId) : undefined;
    // 2階層まで（仕様 §3.4）。孫になりそうなら親の親につける
    const pid = parent ? parent.parentId ?? parent.id : undefined;
    created.push(await insertItem(pid ? { ...c, children: [] } : c, { sourceText, parentId: pid }));
  }
  return { updated, created };
}

// 投げ込み → 読み取り（新規・報告・相談）→ 反映 → 新しく日付つきの項目が入ったら接続を照合（仕様 §1, §4.1）
export async function dump(text: string) {
  await ensureSchema();
  const today = todayJST();
  const existing = (await db.select({ name: tags.name }).from(tags)).map((t) => t.name);
  const all = await listItems();
  const known = all.filter((i) => i.status !== "完了").slice(-300).map(toKnown);
  await saveMessage(null, "user", text);
  const result = await interpret(text, { today, tags: existing, known });
  const { created, updated } = await apply(result, all, text);
  await saveMessage(null, "assistant", result.reply);

  const newSuggestions = [];
  for (const id of created) {
    const [it] = await db.select().from(items).where(eq(items.id, id));
    if (!it.parentId && (it.startDate || it.dueDate)) newSuggestions.push(...(await runLinking(id)));
  }
  return { reply: result.reply, created, updated, suggestions: newSuggestions };
}

// 項目ごとの相談チャット。基本は答えるだけで、報告や「足して」のときだけ項目を触る
export async function chat(itemId: number, text: string) {
  await ensureSchema();
  const all = await listItems();
  const focus = all.find((i) => i.id === itemId);
  if (!focus) return null;
  const existing = (await db.select({ name: tags.name }).from(tags)).map((t) => t.name);
  const history = (await listMessages(itemId, 20)).map((m) => ({ role: m.role, text: m.text }));
  const known = all.filter((i) => i.parentId === itemId).map(toKnown);
  await saveMessage(itemId, "user", text);
  const result = await interpret(text, {
    today: todayJST(),
    tags: existing,
    known,
    focus: { ...toKnown(focus), note: focus.note },
    history,
  });
  // 相談中の項目の外は触らせない
  const scope = new Set([itemId, ...focus.childIds]);
  const { created, updated } = await apply(
    {
      ...result,
      updates: result.updates.filter((u) => scope.has(u.id)),
      creates: result.creates.map((c) => ({ ...c, parentId: c.parentId ?? itemId })),
    },
    all,
    text,
  );
  await saveMessage(itemId, "assistant", result.reply);
  return { reply: result.reply, created, updated };
}

// 日付つきの項目に差し込める、締切のない素材を照合する
export async function runLinking(anchorId: number) {
  const [anchor] = await db.select().from(items).where(eq(items.id, anchorId));
  if (!anchor) return [];
  const all = await listItems();
  const materials = all
    .filter((m) => m.id !== anchorId && !m.parentId && m.kind !== "予定" && !m.startDate && !m.dueDate && m.status !== "完了")
    .slice(-200)
    .map((m) => ({ id: m.id, title: m.title, kind: m.kind, folder: m.folder, note: m.note, tags: m.tags }));
  const { suggestions: found } = await link(anchor, materials, todayJST());
  if (found.length === 0) return [];
  const now = new Date().toISOString();
  return db
    .insert(suggestions)
    .values(
      found.map((s) => ({
        anchorId,
        materialIds: JSON.stringify(s.materialIds),
        message: s.message,
        taskTitle: s.taskTitle,
        dueDate: s.dueDate,
        steps: JSON.stringify(s.steps),
        createdAt: now,
      })),
    )
    .returning();
}

export async function listSuggestions() {
  await ensureSchema();
  return db.select().from(suggestions).where(eq(suggestions.status, "pending")).orderBy(desc(suggestions.id));
}

// 提案を受けると、予定と素材をつないだ親タスク＋子タスクが立ち上がる
export async function resolveSuggestion(id: number, action: "accept" | "dismiss") {
  await ensureSchema();
  const [s] = await db.select().from(suggestions).where(and(eq(suggestions.id, id), eq(suggestions.status, "pending")));
  if (!s) return null;
  await db.update(suggestions).set({ status: action === "accept" ? "accepted" : "dismissed" }).where(eq(suggestions.id, id));
  if (action === "dismiss") return { id };
  const [anchor] = await db.select().from(items).where(eq(items.id, s.anchorId));
  const materialIds: number[] = JSON.parse(s.materialIds);
  const steps: string[] = JSON.parse(s.steps);
  const taskId = await insertItem(
    {
      title: s.taskTitle,
      note: s.message,
      kind: "タスク",
      folder: anchor?.folder ?? "制作",
      tags: [],
      startDate: null,
      dueDate: s.dueDate,
      recurrence: null,
      priority: "青",
      onCalendar: false,
      children: steps,
    },
    { linkedIds: [s.anchorId, ...materialIds] },
  );
  return { id, taskId };
}

export async function updateItem(
  id: number,
  patch: Partial<Pick<typeof items.$inferInsert, "status" | "dueDate" | "startDate" | "folder" | "kind" | "title" | "onCalendar">>,
) {
  await ensureSchema();
  await db.update(items).set(patch).where(eq(items.id, id));
}

export async function deleteItem(id: number) {
  await ensureSchema();
  const ids = [id, ...(await db.select({ id: items.id }).from(items).where(eq(items.parentId, id))).map((r) => r.id)];
  await db.delete(itemTags).where(inArray(itemTags.itemId, ids));
  await db.delete(messages).where(inArray(messages.itemId, ids));
  await db.delete(items).where(inArray(items.id, ids));
}


// 初期タスクが入っているか。入っていれば画面のボタンを出さない
export async function isSeeded() {
  await ensureSchema();
  const [row] = await db.select({ id: items.id }).from(items).where(eq(items.sourceText, SEED_SOURCE)).limit(1);
  return Boolean(row);
}

// 初期タスクを足す。既にある項目は消さない。二重に入らないよう、入っていれば何もしない
export async function seedInitial() {
  if (await isSeeded()) return 0;
  for (const s of seeds) await insertItem(s, { sourceText: SEED_SOURCE });
  return seeds.length;
}
