import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// pricing-delete/route.ts와 동일한 패턴 — 단가마스터 자재단가 삭제.
export async function POST(request: Request) {
  const { id }: { id?: number[] } = await request.json();
  if (!id || id.length === 0) {
    return NextResponse.json({ detail: "삭제할 자재단가를 선택해 주세요" }, { status: 400 });
  }
  const qs = id.map((n) => `id=${n}`).join("&");
  const res = await fastapiFetch(`/단가마스터/자재단가?${qs}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
