import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { FOLDERS, KINDS, PRIORITIES, STATUSES } from "./schema";
import { heuristicInterpret, heuristicLink } from "./heuristic";

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
  startTime: z.string().nullable().describe("HH:MM。時刻が本文にあるときだけ。なければ null"),
  endTime: z.string().nullable().describe("HH:MM。終わりの時刻が分かるときだけ。なければ null"),
  recurrence: z.string().nullable().describe("習慣なら「毎日」「毎週月」など。なければ null"),
  priority: z.enum(PRIORITIES),
  onCalendar: z.boolean().describe("カレンダーに載せるか"),
  children: z.array(z.string()).describe("子タスクの見出し。分ける必要がなければ空"),
});
export type ClassifiedItem = z.infer<typeof ClassifiedItem>;

const NewItem = ClassifiedItem.extend({
  parentId: z.number().nullable().describe("既存項目の子として足すなら親の id。独立した項目なら null"),
  status: z.enum(STATUSES).describe("ふつうは未着手。報告で既に終わった部分を切り出すときだけ完了"),
});
export type NewItem = z.infer<typeof NewItem>;

const ItemUpdate = z.object({
  id: z.number().describe("更新する既存項目の id"),
  status: z.enum(STATUSES).nullable().describe("状態を変えるときだけ。変えないなら null"),
  hold: z.boolean().describe("保留にする（日付を外して寝かせる）なら true"),
  dueDate: z.string().nullable().describe("締切を変えるときだけ YYYY-MM-DD。変えないなら null"),
  onCalendar: z.boolean().nullable().describe("カレンダー掲載を変えるときだけ。変えないなら null"),
  note: z.string().nullable().describe("補足に書き足すことがあれば。なければ null"),
});
export type ItemUpdate = z.infer<typeof ItemUpdate>;

const Interpretation = z.object({
  reply: z.string().describe("利用者への返事"),
  conversational: z.boolean().describe("相談・質問・深掘りへの会話としての返事なら true。登録や更新の報告だけなら false"),
  updates: z.array(ItemUpdate),
  creates: z.array(NewItem),
});
export type Interpretation = z.infer<typeof Interpretation>;

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

const ROLE = "あなたは利用者の思考を広げる秘書「VertexPilot」です。";

const ITEM_RULES = `種別:
- 願望: 「いつかやりたい」。締切なし。
- アイデア: 「できた」「気づいた」「思いついた」日記的なもの。締切なし。
- 予定: 日付が確定しているもの（イベント、面接、応募期限）。
- タスク: 実行可能な作業単位。

フォルダ（領域）: 就活 / サークル / 制作 / 学習 / 生活 のどれか一つ。

優先度（カレンダーの色）: 赤=締切が迫る・落とせない、橙=依存の起点になる（企業連絡・大学交渉など）、青=通常の作業、緑=習慣、灰=任意・余裕があれば。

カレンダー（onCalendar）:
- true にするのは、予定（その日・その期間に起きること）と、「この日にやる」と日が決まっているタスクだけ。
- 「今月中に」「〜までに」のように期間内のどこかでやればいいもの、習慣、願望、アイデアは false。締切はリストで追う。

項目のルール:
- 一回の投げ込みに複数の事柄が含まれていれば分けて返す。
- 締切のない願望・アイデアに締切を勝手に付けない。日付は本文に根拠があるときだけ入れる。
- 「15時」「夜7時から2時間」など時刻があれば startTime / endTime に HH:MM で入れる。時刻つきの予定は onCalendar を true にする。
- 「来週」「再来週」「冬休み」などの相対表現は、与えられた今日の日付から YYYY-MM-DD に直す。曖昧な期間は startDate と dueDate で幅を持たせる。
- タグは既存タグの一覧にあるものを優先して使い、新規タグは本当に必要なときだけ作る。種別名やフォルダ名はタグにしない。
- 子タスクは、明らかに複数の手順があるときだけ挙げる。`;

const DUMP_SYSTEM = `${ROLE}利用者は思いついたことを形式を問わず一つの入力欄に投げ込みます。投げ込みは次のどれか、または混ざったものです。

1. 新しい事柄 → creates に項目として足す。
2. 既存項目の進捗報告（完了した、一部だけ終わった、保留にした、日付が変わった）→ updates で既存の id を更新する。
3. 相談・質問・雑談 → creates も updates も空にして、reply で答える。

進捗報告のルール:
- 報告そのもの（「タスクの完了報告」など）を項目にしない。
- 「完了しました」は、手持ちの項目のどれのことかを文脈から特定して status を完了にする。特定できなければ何も更新せず、reply でどれのことか尋ねる。
- 一部だけ終わった場合: 子タスクがあれば終わった子だけ完了にする。子がなければ、終わった部分（status 完了）と残り（status 未着手）を、その項目の子として creates で足す（parentId に親の id）。
- 「残りは保留」と言われた部分は hold を true にする（日付を外して寝かせる）。
- 終わったことで新しくやることが出てきたら、関係する項目の子か新しい項目として creates に足す。
- 利用者がはっきり言っていない完了や変更はしない。

reply と conversational:
- 登録や報告だけなら、何をしたかを20字程度で。conversational は false。
- 相談・質問・深掘りには、話し相手として会話で答える。状況に寄り添い、考えを広げる問いかけや具体的な次の一手を添える。300字程度まで。見出しや太字などの記法は使わず、段落と改行で書く。conversational は true。
- 登録しつつ相談にも答えるときは、会話の返事の中で登録したことに一言触れ、conversational は true。

${ITEM_RULES}`;

const FOCUS_SYSTEM = `${ROLE}利用者は一つの項目（タスクやプロジェクト）について、専用の相談チャットで話しています。

- 基本は相談相手として会話で答える。進め方、分け方、次の一手、詰まりどころを、利用者の状況に合わせて具体的に。300字程度まで。見出しや太字などの記法は使わず、段落と改行で書く。conversational は true。
- 項目は勝手に増やさない。creates に足すのは、利用者が「足して」「タスクにして」と言ったときか、報告の結果として明らかに新しくやることが出てきたときだけ。足すときは原則この項目の子（parentId にこの項目の id）。
- 「終わった」「ここまでできた」などの報告は updates で状態を更新する（この項目か、その子）。一部だけ終わったときは終わった子だけ完了にし、子がなければ終わった部分（完了）と残り（未着手）を子として足す。保留と言われたら hold を true。
- 利用者がはっきり言っていない完了や変更はしない。

${ITEM_RULES}`;

const LINK_SYSTEM = `${ROLE}日付のある項目が新しく入りました。手持ちの締切のない素材（願望・アイデア・寝かせているタスク）のうち、この日付に差し込むと決定的に効くものがあれば、組み合わせて実行可能なタスクとして提案してください。

例:
- 素材「ワールドを作りたい」(願望) + 素材「HDAがたまたまできた」(アイデア) + 予定「再来週に交流会イベント」
  → 「では再来週までにHDAでワールドを作りませんか？」
- 素材「デッサン」(願望) + 日記「石膏像の貸し出しが冬休みに申請可能」
  → 「冬休みに入ったら、まず申請をしませんか？」

ルール:
- 提案は利用者の集中を割くので、出すのは「今これを言わないと機会を逃す」「素材同士がぴったり噛み合う」ものだけ。ほとんどの場合は空配列を返す。
- 単にテーマが近い、同じフォルダにある、というだけでは提案しない。
- 提案は最大1件。
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

export type Known = { id: number; title: string; kind: string; folder: string; status: string; parentId: number | null; dueDate: string | null };
export type Turn = { role: "user" | "assistant"; text: string };

function knownLine(k: Known) {
  return `- id=${k.id}${k.parentId ? ` (親id=${k.parentId})` : ""} [${k.kind}/${k.folder}/${k.status}] ${k.title}${k.dueDate ? ` 〆${k.dueDate}` : ""}`;
}

// 投げ込みを読み、新規・更新・相談に振り分ける。focus があればその項目専用の相談として読む
export async function interpret(
  text: string,
  ctx: { today: string; tags: string[]; known: Known[]; focus?: Known & { note: string | null }; history?: Turn[] },
): Promise<Interpretation> {
  if (!hasApiKey()) return heuristicInterpret(text, ctx);

  const lines = [todayLine(ctx.today), `既存タグ: ${ctx.tags.join("、") || "（なし）"}`];
  if (ctx.focus) {
    lines.push(`\n相談中の項目:\n${knownLine(ctx.focus)}${ctx.focus.note ? `\n補足: ${ctx.focus.note}` : ""}`);
    lines.push(`\nこの項目の子:\n${ctx.known.filter((k) => k.parentId === ctx.focus!.id).map(knownLine).join("\n") || "（なし）"}`);
  } else {
    lines.push(`\n手持ちの項目（完了以外）:\n${ctx.known.map(knownLine).join("\n") || "（なし）"}`);
  }
  if (ctx.history?.length) {
    lines.push(`\nこれまでのやり取り:\n${ctx.history.map((t) => `${t.role === "user" ? "利用者" : "あなた"}: ${t.text}`).join("\n")}`);
  }
  lines.push(`\n利用者の今回の発言:\n${text}`);

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: ctx.focus ? "medium" : "low", format: zodOutputFormat(Interpretation) },
    system: ctx.focus ? FOCUS_SYSTEM : DUMP_SYSTEM,
    messages: [{ role: "user", content: lines.join("\n") }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return heuristicInterpret(text, ctx);
  const ids = new Set([...ctx.known.map((k) => k.id), ...(ctx.focus ? [ctx.focus.id] : [])]);
  const out = response.parsed_output;
  return {
    reply: out.reply,
    conversational: out.conversational,
    updates: out.updates.filter((u) => ids.has(u.id)),
    creates: out.creates.map((c) => ({
      ...c,
      parentId: c.parentId && ids.has(c.parentId) ? c.parentId : null,
      startTime: hhmm(c.startTime),
      endTime: hhmm(c.endTime),
    })),
  };
}

// "9:00" や "21:30" を "09:00" の形にそろえる。読めなければ null
function hhmm(t: string | null) {
  const m = t?.match(/^(\d{1,2}):(\d{2})/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
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
      .filter((s) => s.materialIds.length > 0)
      .slice(0, 1),
  };
}
