import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";
import { mapIssuedRow } from "@/lib/serverMappers";

// invoice-list/route.ts와 동일한 BFF 프록시 패턴(SKILL-15, 영문 폴더명 고정). 프록시 대상인
// FastAPI 경로(/발행목록)는 한글 그대로 유지. Tab4.tsx가 "거래명세서 요청 확정 직후"·"발행 취소
// 직후"·"거래명세서 관리 탭 재진입 시" 이 경로로 발행요청목록·발행완료 데이터를 다시 받아온다
// (2026-08-23) — 그 전까지는 확정/취소 낙관적 업데이트가 원래 미발행행의 개별(조건식 미적용)
// 예상공급가액을 그대로 물려받아, 레벨1(거래명세서번호 단위) 그룹 합산 시 실제 값과 전혀 다른
// 숫자가 잠깐 보이는 버그가 있었다(상세: `.claude/plans/bug_취소시_예상공급가액_전체값복사.md`).
export async function GET() {
  const res = await fastapiFetch("/발행목록");
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "발행 목록을 불러오지 못했습니다" }));
    return NextResponse.json(data, { status: res.status });
  }
  const raw = await res.json();
  return NextResponse.json(raw.map(mapIssuedRow));
}
