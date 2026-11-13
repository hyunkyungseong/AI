import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 본인 비밀번호 변경 중계 — FastAPI PUT /내비밀번호 (2026-11-13, 7단계 2-4). 규칙 검사·현재 비밀번호
// 확인은 서버가 최종 판단하고, 오류 문구(detail)를 그대로 돌려줘 변경 창에 표시한다. 폴더명 영문(SKILL-15).
export async function PUT(request: Request) {
  const body = await request.json();
  const res = await fastapiFetch("/내비밀번호", { method: "PUT", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ detail: "비밀번호를 변경하지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
