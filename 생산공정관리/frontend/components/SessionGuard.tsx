"use client";

import { useEffect, useRef, useState } from "react";
import { 접속거부사유인가, 접속거부_안내문구, type 접속거부사유 } from "@/lib/authReasons";
import { 로그아웃후_로그인화면 } from "@/lib/session";
import PasswordChangeDialog from "./PasswordChangeDialog";

// 화면 접속 감시 장치(2026-11-13, 7단계 2-1) — Dashboard에 1개만 둔다.
// ① 화면의 모든 /api/... 요청 응답을 한곳에서 지켜보다가 401(접속 거부)이 오면 사유별 안내창을 띄운다.
//    중계 파일(app/api/*/route.ts)이 서버 응답 본문을 그대로 넘기므로 {"detail","인증사유"}가 그대로 도착한다 —
//    39개 중계 파일·각 탭 버튼 코드를 하나하나 고치지 않기 위해 window.fetch를 감싸는 방식을 씀.
// ② 30초마다 + 창으로 돌아올 때 /api/session-check로 조용히 확인 — 화면만 켜둔 상태에서도
//    다른 곳 로그인·유휴 시간 초과를 알아챈다.
// ③ 마우스·키보드·스크롤 조작이 있었을 때만 확인 요청에 active=1을 실어 서버가 마지막활동을 갱신 —
//    자리를 비우면 갱신이 멈춰 유휴 자동 로그아웃이 동작한다.
// ④ (2-4) 403 password_change 응답이나 30초 확인 결과 비밀번호변경필요=true를 보면 필수 비밀번호 변경 창을
//    띄운다 — 사용하는 도중에 관리자가 비밀번호를 초기화한 경우. 403 forbidden(관리자 전용)은 다루지 않음.

const 확인주기_ms = 30_000;
const 감시제외경로 = ["/api/login", "/api/logout"]; // 로그인 실패 401은 정상 응답(로그인 화면이 직접 표시)
const 조작이벤트 = ["mousedown", "mousemove", "keydown", "wheel", "touchstart", "scroll"] as const;

function 요청경로(input: RequestInfo | URL): string | null {
  try {
    const 주소 = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(주소, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

export default function SessionGuard({ 비밀번호변경감시 = true }: { 비밀번호변경감시?: boolean }) {
  const [안내, set안내] = useState<{ 사유: 접속거부사유; 문구: string } | null>(null);
  const [필수변경, set필수변경] = useState(false);
  const 종료됨 = useRef(false); // 안내창이 한 번 뜨면 이후 응답은 무시(요청 여러 개가 동시에 401이어도 창 1개)
  const 조작있음 = useRef(false);
  const 원래fetch = useRef<typeof window.fetch | null>(null);

  useEffect(() => {
    const 원본 = window.fetch;
    원래fetch.current = 원본;

    function 접속종료(사유: 접속거부사유, 서버문구?: string) {
      if (종료됨.current) return;
      종료됨.current = true;
      set안내({ 사유, 문구: 접속거부_안내문구(사유, 서버문구) });
    }

    async function 응답확인(res: Response, 경로: string) {
      if (비밀번호변경감시) {
        if (res.status === 403) {
          const data = await res.clone().json().catch(() => ({}));
          if (data?.인증사유 === "password_change") set필수변경(true);
          return;
        }
        if (res.ok && 경로 === "/api/session-check") {
          const data = await res.clone().json().catch(() => ({}));
          if (data?.비밀번호변경필요 === true) set필수변경(true);
          return;
        }
      }
      if (res.status !== 401) return;
      const data = await res.clone().json().catch(() => ({}));
      const 사유 = 접속거부사유인가(data?.인증사유) ? data.인증사유 : "expired";
      접속종료(사유, typeof data?.detail === "string" ? data.detail : undefined);
    }

    const 감싼fetch: typeof window.fetch = async (input, init) => {
      const res = await 원본(input, init);
      const 경로 = 요청경로(input);
      if (경로 && 경로.startsWith("/api/") && !감시제외경로.includes(경로)) {
        void 응답확인(res, 경로);
      }
      return res;
    };
    window.fetch = 감싼fetch;

    function 세션확인() {
      if (종료됨.current) return;
      const active = 조작있음.current ? "1" : "0";
      조작있음.current = false;
      // 감싼 fetch를 거치므로 401이면 위 응답확인이 안내창을 띄움. 네트워크 오류는 다음 주기에 재시도
      window.fetch(`/api/session-check?active=${active}`, { cache: "no-store" }).catch(() => {});
    }

    function 조작감지() {
      조작있음.current = true;
    }

    function 창복귀() {
      if (document.visibilityState === "visible") 세션확인();
    }

    const 타이머 = window.setInterval(세션확인, 확인주기_ms);
    document.addEventListener("visibilitychange", 창복귀);
    window.addEventListener("focus", 창복귀);
    for (const 이벤트 of 조작이벤트) {
      window.addEventListener(이벤트, 조작감지, { passive: true, capture: true });
    }

    return () => {
      window.fetch = 원본;
      window.clearInterval(타이머);
      document.removeEventListener("visibilitychange", 창복귀);
      window.removeEventListener("focus", 창복귀);
      for (const 이벤트 of 조작이벤트) {
        window.removeEventListener(이벤트, 조작감지, { capture: true });
      }
    };
  }, [비밀번호변경감시]);

  function 확인() {
    void 로그아웃후_로그인화면(원래fetch.current ?? window.fetch);
  }

  // 접속 종료(401) 안내가 비밀번호 변경보다 우선 — 이미 끊긴 접속으로는 변경도 할 수 없음
  if (!안내) {
    if (!필수변경) return null;
    return (
      <PasswordChangeDialog
        모드="필수"
        onSuccess={() => window.location.reload()}
        onLogout={확인}
      />
    );
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-guard-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <h2 id="session-guard-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
          접속이 종료되었습니다
        </h2>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{안내.문구}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">확인을 누르면 로그인 화면으로 이동합니다.</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={확인}
            className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
