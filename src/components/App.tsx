"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { todayJST } from "@/lib/dates";
import type { Status } from "@/lib/schema";
import { Calendar } from "./Calendar";
import { Chat } from "./Chat";
import { DayView } from "./DayView";
import { Diary } from "./Diary";
import { Pet } from "./Pet";
import type { Msg } from "./Messages";
import { Suggestions } from "./Suggestions";
import { TaskList } from "./TaskList";
import { TaskView } from "./TaskView";
import type { Item, Patch, Suggestion } from "./types";

const TABS = ["カレンダー", "リスト", "投げ込み"] as const;

export function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [seeded, setSeeded] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [log, setLog] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [diaryOpen, setDiaryOpen] = useState(false);
  // 今日の日記の気分（キャラクターの表情に使う）と、もう書いたか
  const [todayDiary, setTodayDiary] = useState<{ mood: number | null; wrote: boolean }>({ mood: null, wrote: false });
  const [tab, setTab] = useState(2);
  // 「今日」はブラウザで決める。サーバー側で描かせるとプリレンダーと食い違う
  const [today, setToday] = useState<string | null>(null);
  const panes = useRef<HTMLElement>(null);
  const keyboard = useKeyboard();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/items", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json().catch(() => null);
    if (!Array.isArray(data?.items)) return;
    setItems(data.items);
    setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    if (Array.isArray(data.messages)) setLog(data.messages);
    setAiEnabled(Boolean(data.aiEnabled));
    setSeeded(data.seeded !== false);
  }, []);

  // スマホでは3つの画面を横に並べ、スワイプで移る。タブを押したときもスクロールで動かす
  const goTab = useCallback((i: number, smooth = true) => {
    const el = panes.current;
    if (!el || el.clientWidth === 0) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回読み込み
    setToday(todayJST());
    refresh();
    fetch(`/api/diary?date=${todayJST()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.entry && setTodayDiary({ mood: d.entry.mood ?? null, wrote: Boolean(d.entry.text || d.entry.mood) }))
      .catch(() => {});
    goTab(2, false);
  }, [refresh, goTab]);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const selected = selectedId ? itemsById.get(selectedId) ?? null : null;

  async function dump(text: string) {
    setLog((l) => [...l, { id: -Date.now(), role: "user", text }]);
    setPending(true);
    const res = await fetch("/api/dump", { method: "POST", body: JSON.stringify({ text }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) ?? {};
    setPending(false);
    if (!res?.ok) setLog((l) => [...l, { id: -Date.now(), role: "assistant", text: data.error ?? "失敗しました", error: true }]);
    else refresh();
  }

  async function patch(id: number, body: Patch) {
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
    if (data.taskId) select(data.taskId);
  }

  async function seed() {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" }).catch(() => null);
    setSeeding(false);
    refresh();
  }

  // 項目を押すと、その項目専用の相談チャットを開く
  function select(id: number) {
    setSelectedId(id);
    goTab(2);
  }

  return (
    <div className="flex h-dvh flex-col" style={keyboard.height ? { height: keyboard.height } : undefined}>
      <main
        ref={panes}
        onScroll={(e) => setTab(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] md:grid md:snap-none md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] md:divide-x md:divide-neutral-200 md:overflow-hidden dark:md:divide-neutral-800"
      >
        <section className="flex min-h-0 w-full shrink-0 snap-start snap-always flex-col md:w-auto">
          {today && <Calendar items={items} today={today} onSelect={select} onOpenDay={setOpenDay} />}
        </section>
        <section className="flex min-h-0 w-full shrink-0 snap-start snap-always flex-col md:w-auto">
          <TaskList items={items} today={today} selectedId={selectedId} onSelect={select} onStatus={(id, status: Status) => patch(id, { status })} />
        </section>
        <section className="flex min-h-0 w-full shrink-0 snap-start snap-always flex-col md:w-auto">
          {selected ? (
            <TaskView
              key={selected.id}
              item={selected}
              itemsById={itemsById}
              onClose={() => setSelectedId(null)}
              onPatch={patch}
              onDelete={remove}
              onOpen={select}
              onChanged={refresh}
            />
          ) : (
            <Chat
              log={log}
              pending={pending}
              onDump={dump}
              aiEnabled={aiEnabled}
              onSeed={seeded ? null : seed}
              seeding={seeding}
              pet={
                today &&
                !keyboard.open && (
                  <Pet
                    items={items}
                    today={today}
                    mood={todayDiary.mood}
                    wroteDiary={todayDiary.wrote}
                    onSelect={select}
                    onOpenDiary={() => setDiaryOpen(true)}
                  />
                )
              }
            />
          )}
        </section>
      </main>
      {openDay && today && (
        <DayView
          day={openDay}
          today={today}
          items={items}
          onClose={() => setOpenDay(null)}
          onSelect={(id) => {
            setOpenDay(null);
            select(id);
          }}
          onCreate={async (e) => {
            await fetch("/api/items", { method: "POST", body: JSON.stringify(e) });
            await refresh();
          }}
        />
      )}
      {diaryOpen && today && (
        <Diary
          today={today}
          onClose={() => setDiaryOpen(false)}
          onSaved={(date, mood) => date === today && setTodayDiary({ mood, wrote: true })}
        />
      )}
      {!keyboard.open && <Suggestions suggestions={suggestions} itemsById={itemsById} onResolve={resolve} />}
      <nav className={`relative grid-cols-3 border-t border-neutral-200 pb-[env(safe-area-inset-bottom)] md:hidden dark:border-neutral-800 ${keyboard.open ? "hidden" : "grid"}`}>
        {TABS.map((label, i) => (
          <button key={label} onClick={() => goTab(i)} className={`py-3 text-sm ${tab === i ? "font-bold" : "text-neutral-500"}`}>
            {i === 2 && selected ? "相談" : label}
          </button>
        ))}
        <span
          className="absolute top-0 h-0.5 w-1/3 bg-neutral-900 transition-transform dark:bg-neutral-100"
          style={{ transform: `translateX(${tab * 100}%)` }}
        />
      </nav>
    </div>
  );
}

// キーボードが出ている間は、見えている範囲（visualViewport）に画面を合わせ、入力欄をキーボードの上に出す。
// iOS Safari は画面の高さを縮めないので、ここで合わせる
function useKeyboard() {
  const [state, setState] = useState<{ height: number | null; open: boolean }>({ height: null, open: false });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let full = vv.height;
    let width = vv.width;
    const update = () => {
      // 画面を回したら基準の高さを取り直す
      if (vv.width !== width) [full, width] = [vv.height, vv.width];
      full = Math.max(full, vv.height);
      const open = vv.height < full * 0.8;
      setState({ height: open ? vv.height : null, open });
      // iOS は入力欄へ寄せるためにページごと上へずらすので、元に戻す
      if (open) window.scrollTo(0, 0);
    };
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);
  return state;
}
