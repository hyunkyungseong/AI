import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 서버 버전 중계 — FastAPI GET /health 응답의 version만 꺼내 전달 (2026-11-22, 버전 관리).
// /health는 DB가 끊겨도(503) version을 실어 보내므로 상태코드와 상관없이 version을 읽는다.
// FastAPI 자체가 꺼져 있으면 서버버전=null → 화면에 "서버 ?" 표시. 폴더명 영문(SKILL-15).
export async function GET() {
  try {
    const res = await fastapiFetch("/health");
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ 서버버전: typeof data.version === "string" ? data.version : null });
  } catch {
    return NextResponse.json({ 서버버전: null });
  }
}
