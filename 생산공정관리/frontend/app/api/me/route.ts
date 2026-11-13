import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 내 정보(이름·관리자 여부·비밀번호 변경 필요) 중계 — FastAPI GET /내정보 (2026-11-13, 7단계 2-2).
// 비밀번호 변경이 필요한 상태에서도 서버가 통과시키는 API라 필수 변경 화면 판단에 쓴다. 폴더명 영문(SKILL-15).
export async function GET() {
  const res = await fastapiFetch("/내정보");
  const data = await res.json().catch(() => ({ detail: "내 정보를 불러오지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
