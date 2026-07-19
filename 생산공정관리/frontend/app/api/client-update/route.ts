import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 이 프로젝트에서 경로에 한글 값(거래처명)을 실어보내는 첫 사례 — lib/fastapi.ts의
// fastapiFetch()는 path를 그대로 이어붙일 뿐 자체 인코딩을 하지 않으므로(직접 확인함),
// encodeURIComponent는 여기서 정확히 한 번만 적용한다(중복 인코딩 시 FastAPI 라우팅이 깨짐).
export async function PUT(request: Request) {
  const { 거래처명, ...patch } = await request.json();
  if (!거래처명) {
    return NextResponse.json({ detail: "거래처명이 필요합니다" }, { status: 400 });
  }
  const res = await fastapiFetch(`/거래처마스터/${encodeURIComponent(거래처명)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
