import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 계정 수정(이름·관리자·사용여부, 관리자 전용) 중계 — FastAPI PUT /계정/{id} (2026-11-13, 7단계 2-3).
// staff-update/route.ts와 같은 패턴 — id는 숫자라 경로 인코딩 문제 없음.
export async function PUT(request: Request) {
  const { id, ...patch } = await request.json();
  if (!id) {
    return NextResponse.json({ detail: "id가 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/계정/${Number(id)}`, { method: "PUT", body: JSON.stringify(patch) });
  const data = await res.json().catch(() => ({ detail: "계정을 수정하지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
