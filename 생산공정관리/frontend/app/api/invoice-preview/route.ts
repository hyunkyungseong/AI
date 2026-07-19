import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// invoice-request/route.ts와 동일한 BFF 프록시 패턴, 영문 폴더명 고정(SKILL-15 — Next.js App
// Router가 한글 Route Handler 폴더명을 라우트로 인식하지 못하는 문제 회피). 프록시 대상인 FastAPI
// 경로(/거래명세서미리보기)는 한글 그대로 유지.
export async function POST(request: Request) {
  const body = await request.json();

  const res = await fastapiFetch("/거래명세서미리보기", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ detail: "미리보기 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
