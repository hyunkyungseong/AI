"use client";

import { useEffect, useState } from "react";

// 화면·서버 버전 표시 (2026-11-22, 버전 관리 — .claude/plans/plan_버전관리_화면health표시.md).
// 화면과 서버(api.py)는 사무실 PC에 따로 복사·배포되므로 두 번호를 나란히 보여준다.
// 두 번호가 다르면 주황색 — 한쪽만 배포했다는 신호. 서버 응답이 없으면 "서버 ?".
const 화면버전 = process.env.NEXT_PUBLIC_APP_VERSION ?? "?";

export default function VersionBadge() {
  // undefined = 아직 불러오는 중, null = 서버에서 버전을 못 받음
  const [서버버전, set서버버전] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let 취소됨 = false;
    fetch("/api/version", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!취소됨) set서버버전(typeof d?.서버버전 === "string" ? d.서버버전 : null);
      })
      .catch(() => {
        if (!취소됨) set서버버전(null);
      });
    return () => {
      취소됨 = true;
    };
  }, []);

  const 불일치 = 서버버전 !== undefined && 서버버전 !== 화면버전;
  const 서버표시 = 서버버전 === undefined ? "…" : 서버버전 === null ? "?" : `v${서버버전}`;
  const 안내 = 서버버전 === null
    ? "서버 버전을 확인하지 못했습니다 (API 서버가 꺼져 있을 수 있음)"
    : 불일치
      ? "화면·서버 버전이 다릅니다 — 한쪽만 배포되었을 수 있습니다"
      : "화면·서버 버전이 같습니다";

  return (
    <span
      data-testid="version-badge"
      title={서버버전 === undefined ? undefined : 안내}
      className={
        "whitespace-nowrap text-[11px] " +
        (불일치
          ? "font-medium text-orange-600 dark:text-orange-400"
          : "text-gray-400 dark:text-gray-500")
      }
    >
      화면 v{화면버전} · 서버 {서버표시}
    </span>
  );
}
