"use client";

import { useEffect, useState } from "react";
import { 비밀번호_규칙통과 } from "@/lib/passwordRules";
import PasswordRuleHints from "./PasswordRuleHints";
import { useDraggable, 손잡이클래스 } from "@/lib/useDraggable";

// 비밀번호 변경 창(2026-11-13, 7단계 2-4).
// - 일반: 상단 메뉴 [비밀번호 변경]에서 열림. 취소·Esc 가능, 성공하면 "변경되었습니다" 후 닫기(접속 유지).
// - 필수: 관리자가 만들었거나 초기화한 계정(서버가 다른 기능을 403 password_change로 막는 상태).
//   취소·Esc 없음, [로그아웃]만 가능. 성공하면 onSuccess(화면 새로 불러오기).
// 규칙 표시는 lib/passwordRules.ts(서버 scripts/auth.py와 같은 규칙) — 최종 판단은 서버, 거부 문구를 그대로 표시.

type Props = {
  모드: "일반" | "필수";
  onClose?: () => void; // 일반 모드 전용
  onSuccess?: () => void;
  onLogout?: () => void; // 필수 모드 전용
};

const 입력칸 =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

export default function PasswordChangeDialog({ 모드, onClose, onSuccess, onLogout }: Props) {
  const { attachPanel: 창연결, panelStyle: 창위치, handleProps: 손잡이 } = useDraggable<HTMLFormElement>();
  const [현재, set현재] = useState("");
  const [새, set새] = useState("");
  const [확인값, set확인값] = useState("");
  const [오류, set오류] = useState("");
  const [저장중, set저장중] = useState(false);
  const [완료, set완료] = useState(false);

  useEffect(() => {
    if (모드 !== "일반" || !onClose) return;
    const 닫기 = onClose;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") 닫기();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [모드, onClose]);

  const 일치 = 새.length > 0 && 새 === 확인값;
  const 변경가능 = !!현재 && 비밀번호_규칙통과(새) && 일치 && !저장중;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!변경가능) return;
    set오류("");
    set저장중(true);
    const res = await fetch("/api/my-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 현재비밀번호: 현재, 새비밀번호: 새 }),
    }).catch(() => null);
    set저장중(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      set오류(typeof data.detail === "string" ? data.detail : "비밀번호를 변경하지 못했습니다");
      return;
    }
    if (모드 === "필수") {
      onSuccess?.();
      return;
    }
    set완료(true);
    onSuccess?.();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-change-title"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
    >
      <form
        ref={창연결}
        style={창위치}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900"
      >
        <h2
          id="password-change-title"
          {...손잡이}
          className={`text-base font-semibold text-gray-900 dark:text-gray-100 ${손잡이클래스}`}
        >
          {모드 === "필수" ? "비밀번호 변경이 필요합니다" : "비밀번호 변경"}
        </h2>

        {완료 ? (
          <>
            <p role="status" className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              비밀번호가 변경되었습니다.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                autoFocus
                onClick={onClose}
                className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                닫기
              </button>
            </div>
          </>
        ) : (
          <>
            {모드 === "필수" && (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                관리자가 설정한 임시 비밀번호입니다. 사용하시려면 비밀번호를 변경해 주세요.
              </p>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                  {모드 === "필수" ? "현재(임시) 비밀번호" : "현재 비밀번호"}
                </label>
                <input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  className={입력칸}
                  value={현재}
                  onChange={(e) => set현재(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">새 비밀번호</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={입력칸}
                  value={새}
                  onChange={(e) => set새(e.target.value)}
                />
                <PasswordRuleHints 값={새} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">새 비밀번호 확인</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={입력칸}
                  value={확인값}
                  onChange={(e) => set확인값(e.target.value)}
                />
                {확인값.length > 0 && (
                  <p
                    className={
                      "mt-1.5 text-xs " +
                      (일치 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                    }
                  >
                    {일치 ? "✓ 새 비밀번호와 일치" : "✗ 새 비밀번호와 다릅니다"}
                  </p>
                )}
              </div>
            </div>

            {오류 && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{오류}</p>}

            <div className="mt-5 flex justify-end gap-2">
              {모드 === "필수" ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  로그아웃
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  취소
                </button>
              )}
              <button
                type="submit"
                disabled={!변경가능}
                className={
                  "rounded-md px-3 py-1.5 text-sm font-medium text-white " +
                  (변경가능
                    ? "bg-gray-900 hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
                    : "cursor-not-allowed bg-gray-300 dark:bg-gray-700")
                }
              >
                {저장중 ? "변경 중..." : "변경"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
