import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// invoice-request/route.ts와 동일한 BFF 프록시 패턴, 영문 폴더명 고정(SKILL-15). 프록시 대상인
// FastAPI 경로(/청구품목규칙)는 한글 그대로 유지 — 거래처+업무명별 재사용 청구 규칙 조회·저장
// (2026-07-22 [거래명세서편집_규칙엔진] 신규).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const 거래처명 = searchParams.get("거래처명") ?? "";
  const 업무명 = searchParams.get("업무명") ?? "";

  const res = await fastapiFetch(
    `/청구품목규칙?거래처명=${encodeURIComponent(거래처명)}&업무명=${encodeURIComponent(업무명)}`
  );

  const data = await res.json().catch(() => ({ detail: "규칙 조회 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(request: Request) {
  const body = await request.json();

  const res = await fastapiFetch("/청구품목규칙", {
    method: "PUT",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ detail: "규칙 저장 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
