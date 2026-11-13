// 로그인 사용자 정보·로그아웃 공용(2026-11-13, 7단계 2-2).

// FastAPI GET /내정보 응답과 같은 모양 — app/page.tsx가 서버에서 받아 Dashboard·UserMenu로 넘긴다.
export type 내정보 = {
  사용자명: string;
  이름: string | null;
  관리자: boolean;
  비밀번호변경필요: boolean;
};

// 쿠키(출입증)를 지운 뒤 화면 상태까지 완전히 비우도록 새로 불러오며 로그인 화면으로 이동.
// fetchImpl: 접속 감시 장치가 감싸기 전의 원래 fetch를 넘길 때 사용(로그아웃 응답은 감시 대상 아님).
export async function 로그아웃후_로그인화면(fetchImpl: typeof fetch = fetch) {
  await fetchImpl("/api/logout", { method: "POST" }).catch(() => {});
  window.location.assign("/login");
}
