import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 프로젝트 최초의 데이터 "쓰기" 프록시 — app/api/login/route.ts와 동일 패턴.
// 브라우저는 이 Next.js 자체 경로만 호출하고, httpOnly 쿠키의 FastAPI 토큰에는 직접 접근하지 않는다.
//
// 폴더명은 영문(invoice-request)으로 고정 — 처음엔 app/api/거래명세서요청/route.ts로 만들었으나
// Next.js(Turbopack, 16.2.10) App Router가 한글 라우트 폴더명을 아예 라우트로 인식하지 못해
// 재시작·URL percent-encoding과 무관하게 항상 404가 나는 것을 실측으로 확인함(.next 빌드 산출물에
// 해당 라우트 자체가 생성되지 않음). FastAPI의 한글 경로(SKILL-13, 파라미터명만 문제)와는 다른 별개의
// 제약이므로, Next.js Route Handler 폴더명은 항상 영문으로 쓴다. 프록시 대상인 FastAPI 쪽 경로
// (/거래명세서요청)는 한글 그대로 유지 — 그쪽은 정상 동작 확인됨.
export async function POST(request: Request) {
  const body = await request.json();

  const res = await fastapiFetch("/거래명세서요청", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
