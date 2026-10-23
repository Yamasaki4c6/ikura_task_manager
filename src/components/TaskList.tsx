"use client";
import { useState } from "react";
import { FOLDERS, KINDS, type Status } from "@/lib/schema";
import { KIND_STYLE, PRIORITY_COLOR, type Item } from "./types";

// チェックで完了／未完了を切り替える。進行中は相談チャットの編集から
const MARK: Record<Status, string> = { 未着手: "☐", 進行中: "◐", 完了: "☑" };

export function TaskList({
  items,
  selectedId,
  onSelect,
  onStatus,
}: {
  items: Item[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onStatus: (id: number, s: Status) => void;
}) {
  const [kind, setKind] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const byId = new Map(items.map((i) => [i.id, i]));
  const visible = (i: Item) => (showDone || i.status !== "完了") && (!kind || i.kind === kind);

  const row = (it: Item, child = false) => (
    <li key={it.id}>
      <div
        className={`flex items-start gap-1.5 rounded px-1 py-1 ${child ? "ml-5" : ""} ${selectedId === it.id ? "bg-neutral-100 dark:bg-neutral-800" : ""}`}
      >
        <button
          onClick={() => !it.childIds.length && onStatus(it.id, it.status === "完了" ? "未着手" : "完了")}
          className={`-my-1 w-6 shrink-0 py-1 text-base leading-5 ${it.childIds.length ? "cursor-default text-neutral-400" : ""}`}
          title={it.childIds.length ? `${it.status}（子から算出）` : it.status}
        >
          {MARK[it.status]}
        </button>
        <button onClick={() => onSelect(it.id)} className="min-w-0 flex-1 text-left">
          <span className={`mr-1 inline-block h-2 w-2 rounded-full ${PRIORITY_COLOR[it.priority]}`} />
          <span className={it.status === "完了" ? "text-neutral-400 line-through" : ""}>{it.title}</span>
          {!child && <span className={`ml-1 rounded px-1 text-[10px] ${KIND_STYLE[it.kind]}`}>{it.kind}</span>}
          {it.dueDate && (
            <span className="ml-1 text-[11px] text-neutral-500">
              {it.onCalendar ? "📅" : "〆"}
              {it.dueDate.slice(5).replace("-", "/")}
            </span>
          )}
          {it.recurrence && <span className="ml-1 text-[11px] text-green-700 dark:text-green-400">{it.recurrence}</span>}
          {it.tags.length > 0 && <span className="ml-1 text-[11px] text-neutral-400">#{it.tags.join(" #")}</span>}
        </button>
      </div>
      {it.childIds.length > 0 && (
        <ul>{it.childIds.map((c) => byId.get(c)!).filter(visible).map((c) => row(c, true))}</ul>
      )}
    </li>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 px-2 py-2 text-xs dark:border-neutral-800">
        {[null, ...KINDS].map((k) => (
          <button
            key={k ?? "all"}
            onClick={() => setKind(k)}
            className={`rounded-full px-2 py-0.5 ${kind === k ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900" : "bg-neutral-100 dark:bg-neutral-800"}`}
          >
            {k ?? "すべて"}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1 text-neutral-500">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />完了も
        </label>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 text-sm">
        {FOLDERS.map((f) => {
          const top = items.filter((i) => i.folder === f && !i.parentId && visible(i));
          if (top.length === 0) return null;
          // 日付のあるものを先に、締切なしの素材は後ろで寝かせる（仕様 §8）
          const dated = top.filter((i) => i.dueDate || i.startDate).sort((a, b) => (a.dueDate ?? a.startDate ?? "").localeCompare(b.dueDate ?? b.startDate ?? ""));
          const undated = top.filter((i) => !i.dueDate && !i.startDate);
          return (
            <section key={f} className="mb-3">
              <h3 className="mb-1 text-xs font-bold text-neutral-500">{f}</h3>
              <ul>{dated.map((i) => row(i))}</ul>
              {undated.length > 0 && (
                <>
                  {dated.length > 0 && <div className="mt-1 text-[10px] text-neutral-400">締切なし</div>}
                  <ul>{undated.map((i) => row(i))}</ul>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
