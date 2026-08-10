import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";
import { mapClientRow } from "@/lib/serverMappers";

// invoice-list/route.ts와 동일한 패턴(SKILL-15, 영문 폴더명 고정) — 프록시 대상 FastAPI 경로
// (/거래처마스터)는 한글 그대로. "거래처 마스터" 탭을 다시 클릭할 때마다 ClientMasterSection.tsx가
// 이 경로로 최신 목록을 다시 받아온다(2026-08-09 — 여러 담당자가 각자 다른 PC에서 이 화면을
// 동시에 쓰기 때문에, 다른 사람이 방금 등록한 거래처도 새로고침 없이 보이게 하기 위함).
// app/page.tsx와 동일하게 lib/serverMappers.ts로 필드 매핑을 공유(중복 방지).
export async function GET() {
  const res = await fastapiFetch("/거래처마스터");
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "거래처 마스터를 불러오지 못했습니다" }));
    return NextResponse.json(data, { status: res.status });
  }
  const raw = await res.json();
  return NextResponse.json(raw.map(mapClientRow));
}
