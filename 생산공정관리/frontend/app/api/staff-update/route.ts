import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// client-update/route.ts와 동일한 패턴 — id는 숫자라 인코딩 문제 없음(거래처명 한글 경로와 다름).
export async function PUT(request: Request) {
  const { id, ...patch } = await request.json();
  if (!id) {
    return NextResponse.json({ detail: "id가 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/담당자/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
