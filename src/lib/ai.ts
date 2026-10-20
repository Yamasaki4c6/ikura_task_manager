import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { FOLDERS, KINDS, PRIORITIES } from "./schema";
import { heuristicClassify, heuristicLink } from "./heuristic";

const MODEL = "claude-opus-5-5";

export const hasApiKey = () => Boolean(process.env.ANTHROPIC_API_KEY);

const ClassifiedItem = z.object({
  title: z.string().describe("短い見出し"),
  note: z.string().nullable().describe("補足。なければ null"),
  kind: z.enum(KINDS),
  folder: z.enum(FOLDERS),
  tags: z.array(z.string()).describe("種別以外の属性タグ。既存タグを優先して再利用する"),
  startDate: z.string().nullable().describe("YYYY-MM-DD。期間の開始。なければ null"),
  dueDate: z.string().nullable().describe("YYYY-MM-DD。予定の日付や締切。なければ null"),
  recurrence: z.string().nullable().describe("習慣なら「毎日」「毎週月」など。なければ null"),
  priority: z.enum(PRIORITIES),
  children: z.array(z.string()).describe("子タスクの見出し。分ける必要がなければ空"),
});
export type ClassifiedItem = z.infer<typeof ClassifiedItem>;

const ClassifyResult = z.object({
  items: z.array(ClassifiedItem),
  reply: z.string().describe("投げ込みへの一言。最小限（20字程度）"),
});
export type ClassifyResult = z.infer<typeof ClassifyResult>;

const LinkResult = z.object({
  suggestions: z.array(
    z.object({
      materialIds: z.array(z.number()).describe("使う素材の id"),
      message: z.string().describe("「では〜しませんか？」の形の一文の提案"),
      taskTitle: z.string(),
      dueDate: z.string().nullable().describe("YYYY-MM-DD"),
      steps: z.array(z.string()).describe("子タスクの見出し（3〜5個程度）"),
    }),
  ),
});
export type LinkResult = z.infer<typeof LinkResult>;

const CLASSIFY_SYSTEM = `あなたは利用者の「脳の拡張」として働く秘書です。利用者は思いついたことを形式を問わず一つの入力欄に投げ込みます。それを項目に切り分けて分類してください。

種別:
- 願望: 「いつかやりたい」。締切なし。
- アイデア: 「できた」「気づいた」「思いついた」日記的なもの。締切なし。
- 予定: 日付が確定しているもの（イベント、面接、応募期限）。
- タスク: 実行可能な作業単位。

フォルダ（領域）: 就活 / サークル / 制作 / 学習 / 生活 のどれか一つ。

優先度（カレンダーの色）: 赤=締切が迫る・落とせない、橙=依存の起点になる（企業連絡・大学交渉など）、青=通常の作業、緑=習慣、灰=任意・余裕があれば。

ルール:
- 一回の投げ込みに複数の事柄が含まれていれば分けて返す。一つなら一件。
- 締切のない願望・アイデアに締切を勝手に付けない。日付は本文に根拠があるときだけ入れる。
- 「来週」「再来週」「冬休み」などの相対表現は、与えられた今日の日付から YYYY-MM-DD に直す。曖昧な期間は startDate と dueDate で幅を持たせる。
- タグは既存タグの一覧にあるものを優先して使い、新規タグは本当に必要なときだけ作る。種別名やフォルダ名はタグにしない。
- 子タスクは、明らかに複数の手順があるときだけ挙げる。`;

const LINK_SYSTEM = `あなたは利用者の「脳の拡張」として働く秘書です。日付のある項目が新しく入りました。手持ちの締切のない素材（願望・アイデア・寝かせているタスク）のうち、この日付に差し込めるものがあれば、組み合わせて実行可能なタスクとして提案してください。

例:
- 素材「ワールドを作りたい」(願望) + 素材「HDAがたまたまできた」(アイデア) + 予定「再来週に交流会イベント」
  → 「では再来週までにHDAでワールドを作りませんか？」
- 素材「デッサン」(願望) + 日記「石膏像の貸し出しが冬休みに申請可能」
  → 「冬休みに入ったら、まず申請をしませんか？」

ルール:
- 本当に噛み合うものだけを提案する。無理に結びつけない。該当がなければ空配列を返す。
- 提案は最大3件。
- dueDate は日付のある項目の日付（またはその前日など、間に合う日）に合わせる。`;

let client: Anthropic | null = null;
function anthropic() {
  client ??= new Anthropic();
  return client;
}

function todayLine(today: string) {
  const wd = "日月火水木金土"[new Date(`${today}T00:00:00+09:00`).getUTCDay()];
  return `今日は ${today}（${wd}）です。`;
}

export async function classify(text: string, existingTags: string[], today: string): Promise<ClassifyResult> {
  if (!hasApiKey()) return heuristicClassify(text, today);

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(ClassifyResult) },
    system: CLASSIFY_SYSTEM,
    messages: [
      {
        role: "user",
        content: `${todayLine(today)}\n既存タグ: ${existingTags.join("、") || "（なし）"}\n\n投げ込み:\n${text}`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return heuristicClassify(text, today);
  }
  return response.parsed_output;
}

export type Material = { id: number; title: string; kind: string; folder: string; note: string | null; tags: string[] };
export type Anchor = { id: number; title: string; folder: string; startDate: string | null; dueDate: string | null; note: string | null };

export async function link(anchor: Anchor, materials: Material[], today: string): Promise<LinkResult> {
  if (materials.length === 0) return { suggestions: [] };
  if (!hasApiKey()) return heuristicLink(anchor, materials);

  const list = materials
    .map((m) => `- id=${m.id} [${m.kind}/${m.folder}] ${m.title}${m.note ? `（${m.note}）` : ""}${m.tags.length ? ` #${m.tags.join(" #")}` : ""}`)
    .join("\n");
  const when = [anchor.startDate, anchor.dueDate].filter(Boolean).join(" 〜 ");

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "medium", format: zodOutputFormat(LinkResult) },
    system: LINK_SYSTEM,
    messages: [
      {
        role: "user",
        content: `${todayLine(today)}\n\n新しく入った日付のある項目:\nid=${anchor.id} [${anchor.folder}] ${anchor.title}（${when}）${anchor.note ? `\n${anchor.note}` : ""}\n\n手持ちの素材:\n${list}`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return { suggestions: [] };
  const ids = new Set(materials.map((m) => m.id));
  return {
    suggestions: response.parsed_output.suggestions
      .map((s) => ({ ...s, materialIds: s.materialIds.filter((id) => ids.has(id)) }))
      .filter((s) => s.materialIds.length > 0),
  };
}
