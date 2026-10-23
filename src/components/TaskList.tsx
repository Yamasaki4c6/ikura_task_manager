"use client";
import { useEffect, useState } from "react";
import { FOLDERS, KINDS, type Status } from "@/lib/schema";
import { KIND_STYLE, PRIORITY_COLOR, type Item } from "./types";

// チェックで完了／未完了を切り替える。進行中は相談チャットの編集から
const MARK: Record<Status, string> = { 未着手: "☐", 進行中: "◐", 完了: "☑" };

// 畳んだフォルダと、開いた親項目を覚えておく（この端末だけ）。子を持つ項目は畳んだ状態から始める
const STORE = "vp.list.open";
type Open = { folders: string[]; items: number[] };
function loadOpen(): Open | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? "null");
    return Array.isArray(v?.folders) && Array.isArray(v?.items) ? v : null;
  } catch {
    return null;
  }
}

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
  // 閉じているフォルダ名と、開いている親項目の id
  const [closed, setClosed] = useState<Open>({ folders: [], items: [] });
  useEffect(() => {
    const saved = loadOpen();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 端末に覚えた開閉を読み戻す
    if (saved) setClosed(saved);
  }, []);
  const save = (next: Open) => {
    setClosed(next);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {}
  };
  const toggle = <K extends keyof Open>(key: K, v: Open[K][number]) => {
    const list = closed[key] as Open[K][number][];
    save({ ...closed, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  };
  const folderOpen = (f: string) => !closed.folders.includes(f);
  const itemOpen = (id: number) => closed.items.includes(id);
  const allClosed = FOLDERS.every((f) => closed.folders.includes(f));
  const byId = new Map(items.map((i) => [i.id, i]));
  const visible = (i: Item) => (showDone || i.status !== "完了") && (!kind || i.kind === kind);

  const row = (it: Item, child = false) => (
    <li key={it.id}>
      <div
        className={`flex items-start gap-1.5 rounded px-1 py-1 ${child ? "ml-5" : ""} ${selectedId === it.id ? "bg-neutral-100 dark:bg-neutral-800" : ""}`}
      >
        {it.childIds.length > 0 ? (
          <button
            onClick={() => toggle("items", it.id)}
            className="-my-1 w-6 shrink-0 py-1 text-xs leading-5 text-neutral-500"
            aria-label={itemOpen(it.id) ? "たたむ" : "ひらく"}
            aria-expanded={itemOpen(it.id)}
          >
            {itemOpen(it.id) ? "▼" : "▶"}
          </button>
        ) : (
          <button
            onClick={() => onStatus(it.id, it.status === "完了" ? "未着手" : "完了")}
            className="-my-1 w-6 shrink-0 py-1 text-base leading-5"
            title={it.status}
          >
            {MARK[it.status]}
          </button>
        )}
        <button onClick={() => onSelect(it.id)} className="min-w-0 flex-1 text-left">
          <span className={`mr-1 inline-block h-2 w-2 rounded-full ${PRIORITY_COLOR[it.priority]}`} />
          <span className={it.status === "完了" ? "text-neutral-400 line-through" : ""}>{it.title}</span>
          {it.childIds.length > 0 && (
            <span className="ml-1 text-[11px] text-neutral-500 tabular-nums">
              {it.childIds.filter((c) => byId.get(c)?.status === "完了").length}/{it.childIds.length}
            </span>
          )}
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
      {it.childIds.length > 0 && itemOpen(it.id) && (
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
        <button
          onClick={() => save(allClosed ? { ...closed, folders: [] } : { folders: [...FOLDERS], items: [] })}
          className="ml-auto text-neutral-500"
        >
          {allClosed ? "全部ひらく" : "全部たたむ"}
        </button>
        <label className="flex items-center gap-1 text-neutral-500">
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
              <h3>
                <button onClick={() => toggle("folders", f)} className="mb-1 flex w-full items-center gap-1 text-xs font-bold text-neutral-500" aria-expanded={folderOpen(f)}>
                  <span className="w-6 text-left">{folderOpen(f) ? "▼" : "▶"}</span>
                  {f}
                  <span className="font-normal">{top.length}</span>
                </button>
              </h3>
              {folderOpen(f) && <ul>{dated.map((i) => row(i))}</ul>}
              {folderOpen(f) && undated.length > 0 && (
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
