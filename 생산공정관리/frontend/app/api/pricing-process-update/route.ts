import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// pricing-material-update/route.ts와 동일한 패턴 — 단가마스터 공정단가 수정.
export async function PUT(request: Request) {
  const { id, ...patch } = await request.json();
  if (!id) {
    return NextResponse.json({ detail: "id가 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/단가마스터/공정단가/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
