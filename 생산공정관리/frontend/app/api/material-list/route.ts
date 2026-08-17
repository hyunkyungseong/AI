import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// pricing-list/route.ts와 동일한 얇은 프록시 패턴 — 자재단가 등록 화면에서 "실제 이 업무에 어떤
// 자재가 쓰였는지" 후보를 보여주기 위한 조회(2026-08-16, 사용자 피드백으로 추가). 쿼리 파라미터를
// 그대로 FastAPI에 전달한다.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const res = await fastapiFetch(`/자재목록?${searchParams.toString()}`);
  const data = await res.json().catch(() => ({ detail: "자재 목록을 불러오지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
