import type { ItemView } from "@/lib/store";
import type { suggestions } from "@/lib/schema";
import type { Status } from "@/lib/schema";

export type Item = ItemView;
export type Suggestion = typeof suggestions.$inferSelect;

export const PRIORITY_COLOR: Record<string, string> = {
  赤: "bg-red-500",
  橙: "bg-orange-500",
  青: "bg-blue-500",
  緑: "bg-green-600",
  灰: "bg-neutral-400",
};

export const KIND_STYLE: Record<string, string> = {
  願望: "text-pink-700 bg-pink-100 dark:text-pink-300 dark:bg-pink-950",
  アイデア: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950",
  予定: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950",
  タスク: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950",
};

export type Patch = Partial<{ status: Status; dueDate: string | null; folder: string; onCalendar: boolean }>;
