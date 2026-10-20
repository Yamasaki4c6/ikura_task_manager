// ANTHROPIC_API_KEY が未設定のときの簡易版。画面の動作確認用で、精度は期待しない。
import type { Anchor, ClassifyResult, LinkResult, Material } from "./ai";
import type { Folder, Kind } from "./schema";
import { addDays, weekday } from "./dates";

const FOLDER_WORDS: [Folder, RegExp][] = [
  ["就活", /面接|就活|エントリー|ポートフォリオ|企業|選考|ES/],
  ["サークル", /サークル|ゲームジャム|LT|もくもく|飲み会|交流会/],
  ["学習", /勉強|学習|試験|検定|英語|韓国語|Duolingo|Python|C\+\+|C#|VEX|Maya|Linux/i],
  ["生活", /片付け|掃除|買い物|積読|積みゲー|部屋|病院/],
  ["制作", /作|制作|ワールド|Houdini|HDA|Unity|イラスト|作曲|映像|造形|3D|モデリング|デッサン/i],
];

export function findDate(text: string, today: string): string | null {
  let m = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = text.match(/(\d{1,2})[/月](\d{1,2})日?/);
  if (m) {
    const y = Number(today.slice(0, 4));
    let date = `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    if (date < today) date = `${y + 1}${date.slice(4)}`;
    return date;
  }
  if (/明後日/.test(text)) return addDays(today, 2);
  if (/明日/.test(text)) return addDays(today, 1);
  if (/今日/.test(text)) return today;
  const toMonday = (8 - weekday(today)) % 7 || 7;
  if (/再来週/.test(text)) return addDays(today, toMonday + 7);
  if (/来週/.test(text)) return addDays(today, toMonday);
  return null;
}

export function heuristicClassify(text: string, today: string): ClassifyResult {
  const date = findDate(text, today);
  let kind: Kind = "タスク";
  if (date) kind = "予定";
  else if (/したい|やりたい|作りたい|いつか/.test(text)) kind = "願望";
  else if (/できた|気づいた|思いついた|らしい|可能/.test(text)) kind = "アイデア";
  const folder = FOLDER_WORDS.find(([, re]) => re.test(text))?.[0] ?? "生活";
  return {
    items: [
      {
        title: text.trim().split("\n")[0].slice(0, 40),
        note: null,
        kind,
        folder,
        tags: [],
        startDate: null,
        dueDate: date,
        recurrence: null,
        priority: kind === "予定" ? "赤" : kind === "タスク" ? "青" : "灰",
        children: [],
      },
    ],
    reply: `${kind}／${folder}に置きました（簡易分類）`,
  };
}

// 2文字の重なりで素材を拾うだけの簡易版
function bigrams(s: string) {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    if (!/[\u3040-\u309f\s]/.test(g)) out.add(g); // ひらがなを含む組は「の作」のような雑音になるので捨てる
  }
  return out;
}

export function heuristicLink(anchor: Anchor, materials: Material[]): LinkResult {
  const a = bigrams(`${anchor.title}${anchor.note ?? ""}`);
  const hits = materials.filter((m) => [...bigrams(`${m.title}${m.tags.join("")}`)].some((g) => a.has(g)));
  if (hits.length === 0) return { suggestions: [] };
  const picked = hits.slice(0, 2);
  return {
    suggestions: [
      {
        materialIds: picked.map((m) => m.id),
        message: `${anchor.title}までに「${picked.map((m) => m.title).join("」と「")}」を形にしませんか？（簡易提案）`,
        taskTitle: `${anchor.title}に向けて${picked[0].title}`,
        dueDate: anchor.dueDate ?? anchor.startDate,
        steps: ["やることを決める", "手を動かす", "仕上げる"],
      },
    ],
  };
}
