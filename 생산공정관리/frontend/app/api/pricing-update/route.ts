import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// app/api/client-update/route.ts와 동일한 패턴(바디의 식별자를 경로로 옮김) — id는 숫자라
// client-update의 거래처명(한글)과 달리 URL 인코딩이 필요 없다.
export async function PUT(request: Request) {
  const { id, ...patch } = await request.json();
  if (!id) {
    return NextResponse.json({ detail: "id가 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/단가마스터/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
