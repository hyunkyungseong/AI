import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";
import { mapInvoiceRow } from "@/lib/serverMappers";

// invoice-preview/route.ts와 동일한 BFF 프록시 패턴, 영문 폴더명 고정(SKILL-15). 프록시 대상인
// FastAPI 경로(/미발행목록)는 한글 그대로 유지. "거래명세서 관리" 탭을 다시 클릭할 때마다
// Tab4.tsx가 이 경로로 최신 목록을 다시 받아와 invoice state를 갱신한다(2026-08-09 — 다른
// 탭(단가관리)에서 방금 등록한 단가가 반영된 예상공급가액을 새로고침 없이 보기 위함). app/page.tsx의
// loadInvoice()와 동일하게 lib/serverMappers.ts로 필드 매핑을 공유(중복 방지).
export async function GET() {
  const res = await fastapiFetch("/미발행목록");
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "미발행 목록을 불러오지 못했습니다" }));
    return NextResponse.json(data, { status: res.status });
  }
  const raw = await res.json();
  return NextResponse.json(raw.map(mapInvoiceRow));
}
