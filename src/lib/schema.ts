import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const KINDS = ["願望", "アイデア", "予定", "タスク"] as const;
export const FOLDERS = ["就活", "サークル", "制作", "学習", "生活"] as const;
export const STATUSES = ["未着手", "進行中", "完了"] as const;
// Google カレンダーの色分け（仕様 §6.4）
export const PRIORITIES = ["赤", "橙", "青", "緑", "灰"] as const;

export type Kind = (typeof KINDS)[number];
export type Folder = (typeof FOLDERS)[number];
export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  note: text("note"),
  kind: text("kind").$type<Kind>().notNull(),
  folder: text("folder").$type<Folder>().notNull(),
  status: text("status").$type<Status>().notNull().default("未着手"),
  // 2階層まで。親の状態は子から算出する（仕様 §3.4）
  parentId: integer("parent_id"),
  // YYYY-MM-DD。締切なしの素材は null のまま寝かせる（仕様 §8）
  startDate: text("start_date"),
  dueDate: text("due_date"),
  // 例: "毎日" / "毎週月" など。null なら繰り返しなし
  recurrence: text("recurrence"),
  priority: text("priority").$type<Priority>().notNull().default("青"),
  // 投げ込まれた原文
  sourceText: text("source_text"),
  // 接続で立ち上がったタスクの場合、元になった素材・予定の id（JSON 配列）
  linkedIds: text("linked_ids"),
  createdAt: text("created_at").notNull(),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const itemTags = sqliteTable(
  "item_tags",
  {
    itemId: integer("item_id").notNull(),
    tagId: integer("tag_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.tagId] })],
);

// 日付つきの項目が入ったときに AI が出す「接続と合体」の提案（仕様 §1, §5.2）
export const suggestions = sqliteTable("suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  anchorId: integer("anchor_id").notNull(),
  materialIds: text("material_ids").notNull(),
  message: text("message").notNull(),
  taskTitle: text("task_title").notNull(),
  dueDate: text("due_date"),
  steps: text("steps").notNull(),
  status: text("status").$type<"pending" | "accepted" | "dismissed">().notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});
