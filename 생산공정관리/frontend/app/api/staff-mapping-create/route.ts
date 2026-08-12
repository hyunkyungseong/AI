import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 담당자 1명에게 거래처+업무명 매핑을 추가 — FastAPI POST /담당자/{id}/거래처.
export async function POST(request: Request) {
  const { 담당자_id, ...patch } = await request.json();
  if (!담당자_id) {
    return NextResponse.json({ detail: "담당자_id가 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/담당자/${담당자_id}/거래처`, { method: "POST", body: JSON.stringify(patch) });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
