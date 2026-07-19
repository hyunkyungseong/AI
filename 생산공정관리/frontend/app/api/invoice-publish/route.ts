import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// app/api/invoice-request/route.ts와 동일한 패턴 — 폴더명은 영문 고정(SKILL-15, Next.js Route
// Handler 폴더명이 한글이면 Turbopack이 라우트 자체를 인식 못 함). FastAPI 쪽 경로는 한글 유지.
export async function POST(request: Request) {
  const body = await request.json();

  const res = await fastapiFetch("/거래명세서발행", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
