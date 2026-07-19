import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// app/api/invoice-request/route.ts와 동일한 패턴 — 폴더명은 영문 고정(SKILL-15).
export async function POST(request: Request) {
  const body = await request.json();
  const res = await fastapiFetch("/거래처마스터", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
