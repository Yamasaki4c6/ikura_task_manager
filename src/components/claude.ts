import type { Msg } from "./Messages";
import type { Item } from "./types";

// 相談の記録を Claude アプリへ引き継ぐ。
// まずクリップボードに写す（どの経路でも、うまく入らなければ貼り付けで済むように）。
// スマホは共有メニューを出し、そこで Claude を選ぶと新しいチャットの入力欄に入る。
// パソコンは claude.ai の新しいチャットを、本文を入れた状態で開く（長すぎると URL に載らないので貼り付けに任せる）
const URL_LIMIT = 6000;

export async function sendToClaude(text: string): Promise<"shared" | "opened" | "copied" | "cancelled"> {
  const copied = await navigator.clipboard?.writeText(text).then(() => true, () => false);
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  const q = encodeURIComponent(text);
  window.open(q.length <= URL_LIMIT ? `https://claude.ai/new?q=${q}` : "https://claude.ai/new", "_blank", "noopener");
  return q.length <= URL_LIMIT || !copied ? "opened" : "copied";
}

const who = (m: Msg) => (m.role === "user" ? "私" : "アシスタント");
const lines = (log: Msg[]) => log.filter((m) => !m.error).map((m) => `${who(m)}: ${m.text}`).join("\n\n");
const INTRO = "タスク管理アプリ（VertexPilot）で相談していた内容の続きです。以下の記録を踏まえて、相談に乗ってください。";

// 項目ごとの相談を、項目の中身と一緒にまとめる
export function itemTranscript(item: Item, children: Item[], log: Msg[]) {
  const meta = [item.kind, item.folder, item.status, item.dueDate && `締切 ${item.dueDate}`].filter(Boolean).join("・");
  return [
    INTRO,
    `【項目】${item.title}（${meta}）`,
    item.note && `メモ: ${item.note}`,
    children.length > 0 && `子タスク:\n${children.map((c) => `- [${c.status === "完了" ? "x" : " "}] ${c.title}`).join("\n")}`,
    log.length > 0 && `【これまでのやり取り】\n${lines(log)}`,
    "（ここから続きを書きます）",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// 投げ込み欄からは、相談として返事をしたやり取り（と、その直前の自分の投げ込み）だけを拾う。登録の一言は省く
export function dumpTranscript(log: Msg[], max = 20) {
  const talk = log.filter((m, i) => m.kind === "chat" || (m.role === "user" && log[i + 1]?.kind === "chat")).slice(-max);
  return talk.length ? [INTRO, `【これまでのやり取り】\n${lines(talk)}`, "（ここから続きを書きます）"].join("\n\n") : null;
}
