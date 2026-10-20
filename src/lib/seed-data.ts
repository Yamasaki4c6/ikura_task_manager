// 初期タスク一覧（docs/task-list-initial.md）。画面の「初期タスクを入れる」と npm run seed で使う
import type { ClassifiedItem } from "./ai";

type Seed = Partial<ClassifiedItem> & Pick<ClassifiedItem, "title" | "kind" | "folder">;
const S = (s: Seed): ClassifiedItem => ({
  note: null,
  tags: [],
  startDate: null,
  dueDate: null,
  recurrence: null,
  priority: s.kind === "予定" ? "赤" : s.kind === "タスク" ? "青" : "灰",
  children: [],
  ...s,
});

export const SEED_SOURCE = "初期データ";

export const seeds: ClassifiedItem[] = [
  // 就活
  S({ title: "ゲームフリーク 面接", kind: "予定", folder: "就活", dueDate: "2026-10-22", note: "午後", tags: ["面接"], priority: "赤",
      children: ["ポートフォリオの最終確認", "想定質問の準備／逆質問の用意", "会場・経路・持ち物の確認", "面接後: お礼連絡", "面接後: 手応えと質問内容の振り返りメモ"] }),
  S({ title: "就活の継続アクション", kind: "タスク", folder: "就活", priority: "橙",
      children: ["志望企業リストの更新（任天堂／ゲームフリーク／カプコン／フロム・ソフトウェア／モノリスソフト ほか）", "各社のエントリー時期・締切の定期チェック", "ポートフォリオの継続更新"] }),
  S({ title: "ポートフォリオサイトの作成", kind: "タスク", folder: "就活", tags: ["ポートフォリオ"] }),
  // サークル
  S({ title: "サークル飲み会", kind: "予定", folder: "サークル", note: "日付未確定（10/24-25 か 10/31-11/1）。幹事は別のメンバー。※着手に気が重さがある",
      children: ["制作していたゲームの続行可否についての話し合い", "論点整理（続ける／畳む／作り直すの判断材料）"] }),
  S({ title: "ゲームジャム第2回", kind: "タスク", folder: "サークル", note: "2027年3月開催予定。依存関係が最も長い", tags: ["ゲームジャム"], priority: "橙",
      children: ["第1回の反省まとめ（運営視点／参加者視点）", "企画書の作成（日程・規模・会場・協力依頼の内容）", "連絡: 学園祭で名刺をもらった3社", "連絡: 元々やり取りのある1社", "連絡: フリーランスのゲーム開発者2名", "大学側との交渉（企業協力が決まってから／会場・後援）", "広報活動の設計と実施"] }),
  S({ title: "名刺をもらった3社への連絡", kind: "タスク", folder: "サークル", startDate: "2026-10-20", dueDate: "2026-10-31", note: "接触の鮮度があるうちに", tags: ["ゲームジャム"], priority: "橙" }),
  S({ title: "LT会の企画", kind: "タスク", folder: "サークル" }),
  S({ title: "もくもく会の企画", kind: "タスク", folder: "サークル" }),
  // イベント出展（フォルダは制作に寄せる）
  S({ title: "ゲームダンジョン 応募", kind: "予定", folder: "制作", startDate: "2026-11-01", dueDate: "2026-11-30", note: "2027年2月開催。11月応募開始、見逃すと2月が消える", tags: ["イベント出展"], priority: "赤",
      children: ["応募開始のチェック", "出展内容の決定", "応募"] }),
  S({ title: "九州 即売会（委託出展）", kind: "予定", folder: "制作", startDate: "2027-03-01", dueDate: "2027-03-31", note: "2027年3月。グッズは少数出展", tags: ["イベント出展"],
      children: ["出すグッズの選定", "厚みのあるアクキー: 入稿データ作成 → 発注 → 納品確認", "小冊子の画集: 収録作品の選定 → 編集 → 入稿（出せたら理想）"] }),
  // 制作
  S({ title: "先輩の卒業制作の手伝い", kind: "タスク", folder: "制作" }),
  S({ title: "ホラーゲーム", kind: "アイデア", folder: "制作", note: "朝に思いついたもの", tags: ["ゲーム"], children: ["アイデアのメモ化", "コア要素の決定", "MCPで簡易プロトタイプを作る"] }),
  S({ title: "造形・3Dプリンター", kind: "タスク", folder: "制作", note: "彫刻科の友人に相談済み", tags: ["造形"],
      children: ["3Dプリンターの整備（他の造形作業の前提）", "フィギュア造形", "石膏用の金型造形", "モデリング → 3Dプリントで型 → 石膏で成形"] }),
  S({ title: "Houdini作品の制作", kind: "タスク", folder: "制作", note: "就活に直結", tags: ["Houdini", "ポートフォリオ"] }),
  S({ title: "VRChatワールドの制作（再開）", kind: "タスク", folder: "制作", note: "Unityで途中まで作って中断中。HDAを使用しているため Houdini・VEX と並行", tags: ["VRChat", "Houdini"] }),
  S({ title: "イラスト制作", kind: "タスク", folder: "制作", note: "九州即売会の画集に接続", tags: ["イラスト"] }),
  S({ title: "作曲", kind: "願望", folder: "制作", note: "3DCG・映像・ゲーム・ワールドと組み合わせて並行", tags: ["音楽"] }),
  S({ title: "映像制作", kind: "願望", folder: "制作" }),
  S({ title: "歌ってみた系の制作", kind: "願望", folder: "制作", tags: ["音楽"] }),
  S({ title: "デッサンの練習", kind: "願望", folder: "制作", tags: ["イラスト"] }),
  S({ title: "音声入力 → MCP でソフトを動かす仕組み作り", kind: "アイデア", folder: "制作", tags: ["MCP"] }),
  S({ title: "タスク管理ツールの自作", kind: "タスク", folder: "制作", note: "仕様は task-manager-spec.md", priority: "青" }),
  // 学習
  S({ title: "プログラミング", kind: "願望", folder: "学習", children: ["Python", "VEX", "C#", "C++"] }),
  S({ title: "Mayaの習得", kind: "願望", folder: "学習" }),
  S({ title: "Linux機の有効活用", kind: "願望", folder: "学習", note: "コマンドライン操作に慣れる" }),
  S({ title: "語学", kind: "願望", folder: "学習", children: ["Duolingo の再開（サボり気味）", "英語", "韓国語"] }),
  S({ title: "基本情報技術者試験", kind: "予定", folder: "学習", note: "CBT方式で通年受験可能。申込時期の確認が必要", tags: ["資格"], priority: "灰" }),
  S({ title: "著作権検定", kind: "予定", folder: "学習", note: "開催時期・申込期限の確認が必要", tags: ["資格"], priority: "灰" }),
  // 生活
  S({ title: "部屋の片付け・断捨離", kind: "タスク", folder: "生活", note: "所々床が見えないほど物が積み上がっている", children: ["サーバー関係などのジャンク品の処分", "画材の整理", "床を出す"] }),
  S({ title: "積読の消化", kind: "願望", folder: "生活" }),
  S({ title: "積みゲーの消化", kind: "願望", folder: "生活" }),
];
