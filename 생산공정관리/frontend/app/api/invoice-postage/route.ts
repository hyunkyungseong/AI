import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// pricing-update/route.ts와 동일한 패턴(바디의 식별자를 경로로 옮김) — 의뢰서번호는 VARCHAR라
// URL 인코딩 필요. 프록시 대상인 FastAPI 경로(/업무의뢰서/{request_no}/우편요금)는 경로
// 파라미터명만 영문(SKILL-13), 고정 부분은 한글 그대로.
export async function PUT(request: Request) {
  const { 의뢰서번호, ...patch } = await request.json();
  if (!의뢰서번호) {
    return NextResponse.json({ detail: "의뢰서번호가 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/업무의뢰서/${encodeURIComponent(의뢰서번호)}/우편요금`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
