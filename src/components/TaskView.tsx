"use client";
import { useCallback, useEffect, useState } from "react";
import { FOLDERS, STATUSES, type Status } from "@/lib/schema";
import { Composer } from "./Composer";
import { Messages, type Msg } from "./Messages";
import { KIND_STYLE, type Item, type Patch } from "./types";

// 項目ごとの相談チャット。上に項目の中身とチェックリスト、下にこの項目専用のやり取り
export function TaskView({
  item,
  itemsById,
  onClose,
  onPatch,
  onDelete,
  onOpen,
  onChanged,
}: {
  item: Item;
  itemsById: Map<number, Item>;
  onClose: () => void;
  onPatch: (id: number, patch: Patch) => void;
  onDelete: (id: number) => void;
  onOpen: (id: number) => void;
  onChanged: () => void;
}) {
  const [log, setLog] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/items/${item.id}/chat`, { cache: "no-store" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (Array.isArray(data?.messages)) setLog(data.messages);
  }, [item.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 項目を切り替えたら履歴を読み直す
    setLog([]);
    load();
  }, [load]);

  async function send(text: string) {
    setLog((l) => [...l, { id: -Date.now(), role: "user", text }]);
    setPending(true);
    const res = await fetch(`/api/items/${item.id}/chat`, { method: "POST", body: JSON.stringify({ text }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) ?? {};
    setPending(false);
    if (res?.ok) await load();
    else setLog((l) => [...l, { id: -Date.now(), role: "assistant", text: data.error ?? "失敗しました", error: true }]);
    onChanged();
  }

  const children = item.childIds.map((id) => itemsById.get(id)).filter((c): c is Item => Boolean(c));
  const parent = item.parentId ? itemsById.get(item.parentId) : undefined;
  const linked = item.linkedIds ? (JSON.parse(item.linkedIds) as number[]).map((id) => itemsById.get(id)?.title).filter(Boolean) : [];
  const field = "rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 p-3 text-sm dark:border-neutral-800">
        <div className="flex items-start gap-2">
          <button onClick={onClose} className="-ml-1 px-1 text-lg leading-none text-neutral-500" aria-label="投げ込みに戻る">‹</button>
          <div className="min-w-0 flex-1">
            {parent && (
              <button onClick={() => onOpen(parent.id)} className="block truncate text-xs text-neutral-500">{parent.title} ›</button>
            )}
            <h3 className="font-bold">
              <span className={`mr-1 rounded px-1 align-middle text-[10px] font-normal ${KIND_STYLE[item.kind]}`}>{item.kind}</span>
              {item.title}
            </h3>
          </div>
          <button onClick={() => setShowDetail((v) => !v)} className="shrink-0 text-xs text-neutral-500">
            {showDetail ? "閉じる" : "編集"}
          </button>
        </div>

        {showDetail && (
          <div className="mt-2 space-y-2">
            {item.note && <p className="whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">{item.note}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <select value={item.folder} onChange={(e) => onPatch(item.id, { folder: e.target.value })} className={field}>
                {FOLDERS.map((f) => <option key={f}>{f}</option>)}
              </select>
              <input
                type="date"
                value={item.dueDate ?? ""}
                onChange={(e) => onPatch(item.id, { dueDate: e.target.value || null })}
                className={field}
              />
              <select
                value={item.status}
                disabled={item.childIds.length > 0}
                onChange={(e) => onPatch(item.id, { status: e.target.value as Status })}
                className={`${field} disabled:opacity-50`}
              >
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={item.onCalendar} onChange={(e) => onPatch(item.id, { onCalendar: e.target.checked })} />
                カレンダーに載せる
              </label>
              <button onClick={() => onDelete(item.id)} className="ml-auto text-xs text-red-600">削除</button>
            </div>
            {linked.length > 0 && <p className="text-xs text-neutral-500">つないだもの: {linked.join("、")}</p>}
            {item.sourceText && item.sourceText !== item.title && <p className="text-xs text-neutral-400">原文: {item.sourceText}</p>}
          </div>
        )}

        {children.length > 0 && (
          <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
            {children.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={c.status === "完了"}
                  onChange={(e) => onPatch(c.id, { status: e.target.checked ? "完了" : "未着手" })}
                  className="mt-1 h-4 w-4 shrink-0"
                  aria-label={`${c.title}を完了にする`}
                />
                <button onClick={() => onOpen(c.id)} className={`text-left ${c.status === "完了" ? "text-neutral-400 line-through" : ""}`}>
                  {c.title}
                  {c.status === "進行中" && <span className="ml-1 text-[10px] text-blue-600">進行中</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {children.length === 0 && (
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.status === "完了"}
              onChange={(e) => onPatch(item.id, { status: e.target.checked ? "完了" : "未着手" })}
              className="h-4 w-4"
            />
            <span className="text-neutral-600 dark:text-neutral-400">完了</span>
          </label>
        )}
      </div>

      <Messages log={log} pending={pending} empty="この項目について相談できます。進め方、分け方、詰まっていること、終わった報告など。" />
      <Composer onSend={send} disabled={pending} placeholder="この項目について相談する" />
    </div>
  );
}
