import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 신규(2026-08-13) — "수정이력" 하위탭 전용, GET /거래명세서수정이력 단순 프록시(SKILL-15와 동일
// 패턴). 필드 매핑 없이 원본 그대로 반환 — Tab4EditHistory.tsx가 한글 필드명을 그대로 쓴다.
export async function GET() {
  const res = await fastapiFetch("/거래명세서수정이력");
  const data = await res.json().catch(() => ({ detail: "수정 이력을 불러오지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
