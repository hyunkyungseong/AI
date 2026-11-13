import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 접속 보안 설정(유휴시간_분·중복로그인차단, 관리자 전용) 조회·저장 중계 — FastAPI GET·PUT /시스템설정
// (2026-11-13, 7단계 2-3). 서버가 요청마다 설정을 읽으므로 저장 즉시 모든 직원에게 적용된다.
export async function GET() {
  const res = await fastapiFetch("/시스템설정");
  const data = await res.json().catch(() => ({ detail: "설정을 불러오지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const res = await fastapiFetch("/시스템설정", { method: "PUT", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ detail: "설정을 저장하지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
