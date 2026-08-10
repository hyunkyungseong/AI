import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";
import { mapPricingRow } from "@/lib/serverMappers";

// client-list/route.ts와 동일한 패턴 — 프록시 대상 FastAPI 경로(/단가마스터)는 한글 그대로.
// "거래처 마스터" 탭을 다시 클릭할 때마다 ClientMasterSection.tsx가 거래처마스터와 함께
// 단가마스터도 다시 받아온다(2026-08-09 — 다른 담당자가 다른 PC에서 등록한 단가도 반영).
export async function GET() {
  const res = await fastapiFetch("/단가마스터");
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "단가 정보를 불러오지 못했습니다" }));
    return NextResponse.json(data, { status: res.status });
  }
  const raw = await res.json();
  return NextResponse.json(raw.map(mapPricingRow));
}
