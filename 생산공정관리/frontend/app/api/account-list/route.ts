import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 계정 목록(관리자 전용) 중계 — FastAPI GET /계정 (2026-11-13, 7단계 2-3). 관리자 여부는 서버가 403으로 판단.
export async function GET() {
  const res = await fastapiFetch("/계정");
  const data = await res.json().catch(() => ({ detail: "계정 목록을 불러오지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
