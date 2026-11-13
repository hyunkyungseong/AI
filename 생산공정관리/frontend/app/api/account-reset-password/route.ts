import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 비밀번호 초기화(관리자 전용) 중계 — FastAPI PUT /계정/{id}/비밀번호초기화 (2026-11-13, 7단계 2-3).
export async function PUT(request: Request) {
  const { id, 임시비밀번호 } = await request.json();
  if (!id) {
    return NextResponse.json({ detail: "id가 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/계정/${Number(id)}/비밀번호초기화`, {
    method: "PUT",
    body: JSON.stringify({ 임시비밀번호 }),
  });
  const data = await res.json().catch(() => ({ detail: "비밀번호를 초기화하지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
