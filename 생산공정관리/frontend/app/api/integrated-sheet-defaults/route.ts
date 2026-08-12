import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// invoice-item-names/route.ts와 동일한 얕은 프록시 패턴 — 프록시 대상 FastAPI 경로(/통합시트기본값)는
// 한글 그대로. 쿼리스트링(거래처명 + 반복되는 업무명_목록)을 그대로 전달한다. 작업구분(조)이 2개
// 이상일 때 맨 앞에 붙는 "통합 명세서" 시트의 시트명·상단 업무명 입력칸 기본값 조회용(2026-08-12).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const 거래처명 = searchParams.get("거래처명");
  if (!거래처명) {
    return NextResponse.json({ detail: "거래처명이 필요합니다" }, { status: 400 });
  }
  const qs = new URLSearchParams({ 거래처명 });
  searchParams.getAll("업무명_목록").forEach((u) => qs.append("업무명_목록", u));
  const res = await fastapiFetch(`/통합시트기본값?${qs.toString()}`);
  const data = await res.json().catch(() => ({ detail: "기본값을 불러오지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
