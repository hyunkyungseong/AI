import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// client-list/route.ts와 동일한 패턴(SKILL-15, 영문 폴더명 고정) — 프록시 대상 FastAPI 경로
// (/담당자)는 한글 그대로. 담당자 목록 + 각자 담당하는 거래처+업무명 매핑을 그대로 반환한다
// (2026-08-11, 거래명세서 하단 담당자 연락처 자동 표기 기능).
export async function GET() {
  const res = await fastapiFetch("/담당자");
  const data = await res.json().catch(() => ({ detail: "담당자 목록을 불러오지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
