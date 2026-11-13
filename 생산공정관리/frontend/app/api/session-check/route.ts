import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";

// 화면 접속 감시 장치(components/SessionGuard.tsx)가 30초마다 부르는 접속 상태 확인 중계(2026-11-13, 7단계 2-1).
// active=1이면 직원이 실제로 조작한 것으로 보고 서버가 마지막활동을 갱신한다(0이면 갱신 안 함 →
// 화면만 켜두고 자리를 비우면 유휴 자동 로그아웃). 폴더명은 영문 고정(SKILL-15).
export async function GET(request: Request) {
  const active = new URL(request.url).searchParams.get("active") === "1";
  const res = await fastapiFetch(`/세션확인?활동=${active ? "true" : "false"}`);
  const data = await res.json().catch(() => ({ detail: "접속 상태를 확인하지 못했습니다" }));
  return NextResponse.json(data, { status: res.status });
}
