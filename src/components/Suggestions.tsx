"use client";
import { useState } from "react";
import type { Item, Suggestion } from "./types";

// 横道の提案は本流を止めないよう、画面の端の「！」に畳んでおく（仕様 §2）
export function Suggestions({
  suggestions,
  itemsById,
  onResolve,
}: {
  suggestions: Suggestion[];
  itemsById: Map<number, Item>;
  onResolve: (id: number, action: "accept" | "dismiss") => void;
}) {
  const [open, setOpen] = useState(false);
  if (suggestions.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`提案が${suggestions.length}件あります`}
        className="fixed right-3 bottom-32 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 font-bold text-white shadow-lg md:bottom-24"
      >
        !
        {suggestions.length > 1 && (
          <span className="absolute -top-1 -right-1 rounded-full bg-neutral-900 px-1 text-[10px] leading-4 text-white">{suggestions.length}</span>
        )}
      </button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/30 md:items-center md:justify-center" onClick={() => setOpen(false)}>
          <div
            className="max-h-[70dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 text-sm shadow-xl md:max-w-md md:rounded-2xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center">
              <h2 className="font-bold">提案</h2>
              <button onClick={() => setOpen(false)} className="ml-auto text-neutral-400" aria-label="閉じる">×</button>
            </div>
            <ul className="space-y-3">
              {suggestions.map((s) => (
                <li key={s.id} className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
                  <p>{s.message}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {[s.anchorId, ...(JSON.parse(s.materialIds) as number[])].map((id) => itemsById.get(id)?.title).filter(Boolean).join(" ＋ ")}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        onResolve(s.id, "accept");
                        setOpen(false);
                      }}
                      className="rounded bg-amber-600 px-2 py-0.5 text-white"
                    >
                      タスクにする
                    </button>
                    <button onClick={() => onResolve(s.id, "dismiss")} className="rounded px-2 py-0.5 text-neutral-600 dark:text-neutral-300">
                      見送る
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
