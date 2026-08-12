import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// staff-update/route.ts와 동일한 패턴 — 거래명세서번호는 숫자가 아니지만(예: D-202608-00001)
// URL 안전 문자(영문·숫자·하이픈)만 쓰므로 인코딩 없이 그대로 경로에 넣어도 안전.
// 발행요청목록의 "발행가능"(거래처 승인 대기) 토글 전용(2026-08-12).
export async function PUT(request: Request) {
  const { 거래명세서번호, 값 } = await request.json();
  if (!거래명세서번호) {
    return NextResponse.json({ detail: "거래명세서번호가 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/거래명세서/${거래명세서번호}/발행가능`, {
    method: "PUT",
    body: JSON.stringify({ 값 }),
  });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
