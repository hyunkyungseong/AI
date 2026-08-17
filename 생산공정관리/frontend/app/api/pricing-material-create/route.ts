import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// pricing-create/route.ts와 동일한 얇은 프록시 패턴(SKILL-15: 폴더명 영문) — 단가마스터 자재단가
// (자재명 정규화, 2026-08-15) 등록. 바디의 단가마스터_id를 경로로 옮긴다.
export async function POST(request: Request) {
  const { 단가마스터_id, ...patch } = await request.json();
  if (!단가마스터_id) {
    return NextResponse.json({ detail: "단가마스터_id가 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/단가마스터/${단가마스터_id}/자재단가`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
