import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// invoice-excel/[no]/route.ts와 동일한 동적 라우트 프록시 패턴이되, 바이너리가 아니라 JSON을
// 그대로 반환 — 편집된 거래명세서의 원본·최종 품목 스냅샷 비교용(2026-07-22 신규,
// GET /거래명세서품목이력/{no} 프록시).
export async function GET(_request: Request, { params }: RouteContext<"/api/invoice-history/[no]">) {
  const { no } = await params;

  const res = await fastapiFetch(`/거래명세서품목이력/${encodeURIComponent(no)}`);

  const data = await res.json().catch(() => ({ detail: "이력 조회 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
