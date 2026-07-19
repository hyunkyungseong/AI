import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// app/api/client-delete/route.ts와 동일한 패턴 — 브라우저 DELETE+바디 조합이 번거로워 이
// Route Handler 자체는 POST로 배열을 받고, 내부에서 FastAPI DELETE(반복 쿼리파라미터)로 변환한다.
export async function POST(request: Request) {
  const { id }: { id?: number[] } = await request.json();
  if (!id || id.length === 0) {
    return NextResponse.json({ detail: "삭제할 단가를 선택해 주세요" }, { status: 400 });
  }
  const qs = id.map((n) => `id=${n}`).join("&");
  const res = await fastapiFetch(`/단가마스터?${qs}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
