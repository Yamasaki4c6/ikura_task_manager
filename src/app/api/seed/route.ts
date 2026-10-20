import { seedInitial } from "@/lib/store";

// 初期タスクの投入に時間がかかることがある（親子あわせて100件弱の書き込み）
export const maxDuration = 60;

export async function POST() {
  return Response.json({ added: await seedInitial() });
}
