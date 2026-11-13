// 접속 거부 사유(서버 scripts/auth.py 인증오류의 "인증사유") → 화면 안내 문구 (2026-11-13, 7단계 2-1).
// SessionGuard(안내창)와 로그인 화면(새로고침으로 끊긴 경우 ?reason=)이 함께 쓴다.
// idle 문구는 관리자가 바꾼 유휴 시간(분)이 들어가므로 서버가 보낸 detail을 우선 사용한다.

export type 접속거부사유 = "duplicate" | "idle" | "disabled" | "expired" | "missing";

const 기본문구: Record<접속거부사유, string> = {
  duplicate: "다른 PC에서 같은 ID로 로그인하여 접속이 종료되었습니다",
  idle: "오랫동안 사용하지 않아 자동 로그아웃되었습니다",
  disabled: "사용이 중지된 계정입니다. 관리자에게 문의해 주세요",
  expired: "접속 시간이 만료되었습니다. 다시 로그인해 주세요",
  missing: "접속 시간이 만료되었습니다. 다시 로그인해 주세요",
};

export function 접속거부사유인가(값: unknown): 값 is 접속거부사유 {
  return typeof 값 === "string" && 값 in 기본문구;
}

export function 접속거부_안내문구(사유: 접속거부사유, 서버문구?: string): string {
  if (사유 === "idle" && 서버문구) return 서버문구;
  return 기본문구[사유];
}
