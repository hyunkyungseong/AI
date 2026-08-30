import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// integrated-sheet-defaults/route.ts와 동일한 얕은 프록시 패턴 — 프록시 대상 FastAPI 경로
// (/조별상단업무명기본값)는 한글 그대로. 개별 조 시트 B12에 표시할 조별 상단 업무명 입력칸
// 기본값 조회용(2026-08-30) — 거래처+업무명조합의 조마다 저장된 값을 {조: 값} 형태로 반환.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const 거래처명 = searchParams.get("거래처명");
  if (!거래처명) {
    return NextResponse.json({ detail: "거래처명이 필요합니다" }, { status: 400 });
  }
  const qs = new URLSearchParams({ 거래처명 });
  searchParams.getAll("업무명_목록").forEach((u) => qs.append("업무명_목록", u));
  const res = await fastapiFetch(`/조별상단업무명기본값?${qs.toString()}`);
  const data = await res.json().catch(() => ({ detail: "기본값을 불러오지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
