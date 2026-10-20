"use client";
import { useEffect, useRef, useState } from "react";
import { FOLDERS, STATUSES, type Status } from "@/lib/schema";
import { KIND_STYLE, type Item, type Suggestion } from "./types";

export type LogEntry = { id: number; text: string; reply?: string; pending?: boolean; error?: boolean };

export function Chat({
  log,
  onDump,
  suggestions,
  onSuggestion,
  selected,
  onClose,
  onPatch,
  onDelete,
  itemsById,
  aiEnabled,
  onSeed,
  seeding,
}: {
  log: LogEntry[];
  onDump: (text: string) => void;
  suggestions: Suggestion[];
  onSuggestion: (id: number, action: "accept" | "dismiss") => void;
  selected: Item | null;
  onClose: () => void;
  onPatch: (id: number, patch: Partial<{ status: Status; dueDate: string | null; folder: string }>) => void;
  onDelete: (id: number) => void;
  itemsById: Map<number, Item>;
  aiEnabled: boolean;
  onSeed: (() => void) | null;
  seeding: boolean;
}) {
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  // 波括弧で包んで何も返さない。新しい Chrome では scrollIntoView が Promise を返し、
  // それを React が後片付け関数として呼んで「i is not a function」で落ちていた
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [log]);

  const send = () => {
    if (!text.trim()) return;
    onDump(text);
    setText("");
  };

  return (
    <div className="relative flex h-full flex-col">
      {selected && (
        <div className="border-b border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <div className="flex items-start gap-2">
            <span className={`rounded px-1 text-[10px] ${KIND_STYLE[selected.kind]}`}>{selected.kind}</span>
            <h3 className="flex-1 font-bold">{selected.title}</h3>
            <button onClick={onClose} className="text-neutral-400" aria-label="閉じる">×</button>
          </div>
          {selected.note && <p className="mt-1 text-neutral-600 dark:text-neutral-400">{selected.note}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={selected.folder}
              onChange={(e) => onPatch(selected.id, { folder: e.target.value })}
              className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700"
            >
              {FOLDERS.map((f) => <option key={f}>{f}</option>)}
            </select>
            <input
              type="date"
              value={selected.dueDate ?? ""}
              onChange={(e) => onPatch(selected.id, { dueDate: e.target.value || null })}
              className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700"
            />
            <select
              value={selected.status}
              disabled={selected.childIds.length > 0}
              onChange={(e) => onPatch(selected.id, { status: e.target.value as Status })}
              className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 disabled:opacity-50 dark:border-neutral-700"
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => onDelete(selected.id)} className="ml-auto text-xs text-red-600">削除</button>
          </div>
          {selected.linkedIds && (
            <p className="mt-2 text-xs text-neutral-500">
              つないだもの: {(JSON.parse(selected.linkedIds) as number[]).map((id) => itemsById.get(id)?.title).filter(Boolean).join("、")}
            </p>
          )}
          {selected.sourceText && selected.sourceText !== selected.title && (
            <p className="mt-1 text-xs text-neutral-400">原文: {selected.sourceText}</p>
          )}
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {!aiEnabled && (
          <p className="rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            AI キーが未設定のため、簡易分類で動いています。
          </p>
        )}
        {log.length === 0 && <p className="text-neutral-400">思いついたことを、そのまま投げ込んでください。</p>}
        {onSeed && (
          <button
            onClick={onSeed}
            disabled={seeding}
            className="rounded border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-neutral-700"
          >
            {seeding ? "入れています…" : "初期タスク（31件）を入れる"}
          </button>
        )}
        {log.map((e) => (
          <div key={e.id}>
            <div className="ml-auto w-fit max-w-[90%] whitespace-pre-wrap rounded-lg bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">{e.text}</div>
            <div className={`mt-0.5 text-xs ${e.error ? "text-red-600" : "text-neutral-500"}`}>
              {e.pending ? "仕分け中…" : e.reply}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {/* 横道の吹き出し：本流を止めずに視界の端に置く（仕様 §2） */}
      {suggestions.length > 0 && (
        <div className="pointer-events-none absolute inset-x-2 bottom-20 flex flex-col items-end gap-2">
          {suggestions.slice(0, 3).map((s) => (
            <div
              key={s.id}
              className="pointer-events-auto w-full max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm shadow-lg dark:border-amber-700 dark:bg-amber-950"
            >
              <p>{s.message}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {[s.anchorId, ...(JSON.parse(s.materialIds) as number[])].map((id) => itemsById.get(id)?.title).filter(Boolean).join(" ＋ ")}
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => onSuggestion(s.id, "accept")} className="rounded bg-amber-600 px-2 py-0.5 text-white">タスクにする</button>
                <button onClick={() => onSuggestion(s.id, "dismiss")} className="rounded px-2 py-0.5 text-neutral-600 dark:text-neutral-300">見送る</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-neutral-200 p-2 dark:border-neutral-800">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="思いついたことを投げ込む（Enter で送信）"
          className="min-w-0 flex-1 resize-none rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        {/* スマホのキーボードでは Enter が改行・変換確定になりがちなので、送るボタンも置く */}
        <button
          onClick={send}
          disabled={!text.trim()}
          className="shrink-0 rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-30 dark:bg-neutral-100 dark:text-neutral-900"
        >
          送る
        </button>
      </div>
    </div>
  );
}
