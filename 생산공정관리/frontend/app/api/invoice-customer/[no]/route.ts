import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 고객 제출용 명세서(2026-11-22) — 확정된 거래명세서의 고객용 편집(발행요청목록 [고객용 편집] 버튼).
// invoice-history/[no]/route.ts와 같은 동적 라우트 프록시 패턴, 영문 폴더명 고정(SKILL-15).
// GET: 최종 줄 + 저장된 묶음 / PUT: 고객용 줄 다시 저장(서버가 금액 합산·검증).
export async function GET(_request: Request, { params }: RouteContext<"/api/invoice-customer/[no]">) {
  const { no } = await params;
  const res = await fastapiFetch(`/거래명세서고객용/${encodeURIComponent(no)}`);
  const data = await res.json().catch(() => ({ detail: "고객용 명세서 조회 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(request: Request, { params }: RouteContext<"/api/invoice-customer/[no]">) {
  const { no } = await params;
  const body = await request.json();
  const res = await fastapiFetch(`/거래명세서고객용/${encodeURIComponent(no)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ detail: "고객용 명세서 저장 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
