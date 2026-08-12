import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 담당자_담당거래처 매핑 id 목록으로 삭제 — FastAPI DELETE /담당자/거래처?id=...&id=...
export async function POST(request: Request) {
  const { id }: { id?: number[] } = await request.json();
  if (!id || id.length === 0) {
    return NextResponse.json({ detail: "삭제할 항목을 선택해 주세요" }, { status: 400 });
  }
  const qs = id.map((n) => `id=${n}`).join("&");
  const res = await fastapiFetch(`/담당자/거래처?${qs}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
