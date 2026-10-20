import { Suspense } from "react";
import { App } from "@/components/App";

// カレンダーが「今日」を使うので、プリレンダーせずリクエスト時に描く
export default function Page() {
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}
