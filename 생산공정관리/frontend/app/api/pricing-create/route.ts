import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// app/api/client-create/route.ts와 동일한 얇은 프록시 패턴(SKILL-15: 폴더명 영문).
export async function POST(request: Request) {
  const body = await request.json();
  const res = await fastapiFetch("/단가마스터", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ detail: "요청 처리 중 오류가 발생했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
