"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Status } from "@/lib/schema";
import { Calendar } from "./Calendar";
import { Chat, type LogEntry } from "./Chat";
import { TaskList } from "./TaskList";
import type { Item, Suggestion } from "./types";

type Tab = "calendar" | "list" | "chat";
const TABS: [Tab, string][] = [["calendar", "カレンダー"], ["list", "リスト"], ["chat", "投げ込み"]];

export function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("chat");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/items");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items);
    setSuggestions(data.suggestions);
    setAiEnabled(data.aiEnabled);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回読み込み
    refresh();
  }, [refresh]);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const selected = selectedId ? itemsById.get(selectedId) ?? null : null;

  async function dump(text: string) {
    const id = Date.now();
    setLog((l) => [...l, { id, text, pending: true }]);
    const res = await fetch("/api/dump", { method: "POST", body: JSON.stringify({ text }) });
    const data = await res.json().catch(() => ({}));
    setLog((l) =>
      l.map((e) =>
        e.id === id
          ? res.ok
            ? { id, text, reply: data.reply + (data.suggestions?.length ? "　💡提案があります" : "") }
            : { id, text, reply: data.error ?? "失敗しました", error: true }
          : e,
      ),
    );
    refresh();
  }

  async function patch(id: number, body: Partial<{ status: Status; dueDate: string | null; folder: string }>) {
    setItems((list) => list.map((i) => (i.id === id ? ({ ...i, ...body } as Item) : i)));
    await fetch(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    refresh();
  }

  async function remove(id: number) {
    setSelectedId(null);
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    refresh();
  }

  async function resolve(id: number, action: "accept" | "dismiss") {
    setSuggestions((s) => s.filter((x) => x.id !== id));
    const res = await fetch(`/api/suggestions/${id}`, { method: "POST", body: JSON.stringify({ action }) });
    const data = await res.json().catch(() => ({}));
    await refresh();
    if (data.taskId) setSelectedId(data.taskId);
  }

  const select = (id: number) => {
    setSelectedId(id);
    setTab("chat");
  };

  const pane = (t: Tab) => `${tab === t ? "flex" : "hidden"} md:flex min-h-0 flex-col`;

  return (
    <div className="flex h-dvh flex-col">
      <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[2fr_1fr_1fr] md:divide-x md:divide-neutral-200 dark:md:divide-neutral-800">
        <section className={pane("calendar")}>
          <Calendar items={items} onSelect={select} />
        </section>
        <section className={pane("list")}>
          <TaskList items={items} selectedId={selectedId} onSelect={select} onStatus={(id, status) => patch(id, { status })} />
        </section>
        <section className={pane("chat")}>
          <Chat
            log={log}
            onDump={dump}
            suggestions={suggestions}
            onSuggestion={resolve}
            selected={selected}
            onClose={() => setSelectedId(null)}
            onPatch={patch}
            onDelete={remove}
            itemsById={itemsById}
            aiEnabled={aiEnabled}
          />
        </section>
      </main>
      <nav className="grid grid-cols-3 border-t border-neutral-200 md:hidden dark:border-neutral-800">
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`py-3 text-sm ${tab === t ? "font-bold" : "text-neutral-500"}`}>
            {label}
            {t === "chat" && suggestions.length > 0 && <span className="ml-1 text-amber-600">●</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
