"use client";

import { useEffect } from "react";

// 화면 위쪽 안내 상자(배너) 공용 부품(2026-11-15) — 예전엔 6개 화면에 같은 코드가 복사돼 있었고 닫는
// 방법이 없어 오류 문구가 계속 남아 있었다(사용자 요청). ✕로 닫을 수 있고, 성공(초록)은 5초 뒤 자동으로
// 사라진다. 오류·경고는 읽기 전에 사라지면 안 되므로 ✕나 다음 동작(setBanner(null))까지 유지한다.
export type 배너 = { type: "success" | "warning" | "error"; text: string };

const 배너색상: Record<배너["type"], string> = {
  success: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  error: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
};

const 성공_자동닫힘_ms = 5000;

export default function Banner({ banner, onClose }: { banner: 배너 | null; onClose: () => void }) {
  useEffect(() => {
    if (banner?.type !== "success") return;
    const t = setTimeout(onClose, 성공_자동닫힘_ms);
    return () => clearTimeout(t);
    // banner 객체가 바뀔 때마다(새 메시지) 5초를 다시 센다 — onClose는 매 렌더 새 함수라 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner]);

  if (!banner) return null;
  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm ${배너색상[banner.type]}`}
    >
      <span className="whitespace-pre-line">{banner.text}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="안내 닫기"
        title="닫기"
        className="shrink-0 rounded px-1 leading-none opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
