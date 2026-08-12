import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// client-list/route.ts와 동일한 얕은 프록시 패턴 — 프록시 대상 FastAPI 경로(/거래명세서품명이력)는
// 한글 그대로. 거래처명은 쿼리스트링으로 그대로 전달(값 자체에 인코딩 필요한 특수문자 없음이 보통이지만
// 안전하게 encodeURIComponent 적용). 미리보기 화면 "새 행 추가" 품명 자동완성 후보용(2026-08-12).
export async function GET(request: Request) {
  const 거래처명 = new URL(request.url).searchParams.get("거래처명");
  if (!거래처명) {
    return NextResponse.json({ detail: "거래처명이 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/거래명세서품명이력?거래처명=${encodeURIComponent(거래처명)}`);
  const data = await res.json().catch(() => ({ detail: "품명 이력을 불러오지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
