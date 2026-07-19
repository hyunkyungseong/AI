import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 브라우저 fetch의 DELETE+JSON바디 조합이 번거로워, 이 Route Handler 자체는 POST로 배열을
// 받고 내부에서 FastAPI DELETE /거래처마스터?거래처명=...&거래처명=...(반복 쿼리파라미터)로
// 변환해 호출한다(HTTP 메서드가 프록시 대상과 다른 유일한 write-proxy — 의도된 편차).
export async function POST(request: Request) {
  const { 거래처명 }: { 거래처명?: string[] } = await request.json();
  if (!거래처명 || 거래처명.length === 0) {
    return NextResponse.json({ detail: "삭제할 거래처를 선택해 주세요" }, { status: 400 });
  }
  const qs = 거래처명.map((n) => `거래처명=${encodeURIComponent(n)}`).join("&");
  const res = await fastapiFetch(`/거래처마스터?${qs}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
