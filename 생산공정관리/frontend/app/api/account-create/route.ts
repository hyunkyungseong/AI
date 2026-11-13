import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 계정 추가(관리자 전용) 중계 — FastAPI POST /계정 (2026-11-13, 7단계 2-3).
export async function POST(request: Request) {
  const body = await request.json();
  const res = await fastapiFetch("/계정", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ detail: "계정을 추가하지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
