import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/fastapi";

const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://localhost:8000";
const 토큰_유효시간_초 = 12 * 60 * 60; // FastAPI(scripts/auth.py) TOKEN_유효시간_시간과 동일하게 유지

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${FASTAPI_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: "로그인 실패" }));
    return NextResponse.json(detail, { status: res.status });
  }

  const data = await res.json();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, data.access_token, {
    httpOnly: true,
    // 사내 http 접속(http://192.168.30.201:3000)에서도 로그인이 유지되도록 기본은 꺼둠.
    // 나중에 https(외부 접속)를 붙이면 .env.local에 COOKIE_SECURE=true 를 추가해 켠다.
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 토큰_유효시간_초,
    path: "/",
  });

  return NextResponse.json({ 이름: data.이름 });
}
