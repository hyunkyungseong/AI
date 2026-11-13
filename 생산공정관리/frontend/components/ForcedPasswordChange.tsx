"use client";

import PasswordChangeDialog from "./PasswordChangeDialog";
import SessionGuard from "./SessionGuard";
import { 로그아웃후_로그인화면 } from "@/lib/session";

// 필수 비밀번호 변경 화면(2026-11-13, 7단계 2-4) — 관리자가 만들었거나 초기화한 계정으로 로그인하면
// app/page.tsx가 대시보드 대신 이 화면만 보여준다(서버가 다른 기능을 403 password_change로 막는 상태라
// 대시보드를 그리면 오류 화면이 나옴). 변경 성공 시 첫 화면을 다시 불러와 정상 대시보드로 진입.
// 접속 감시 장치는 그대로 붙여 다른 곳 로그인·유휴 시간 초과 안내는 이 화면에서도 동작(비밀번호 변경
// 감시는 끔 — 이미 이 화면이 그 역할).
export default function ForcedPasswordChange() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SessionGuard 비밀번호변경감시={false} />
      <PasswordChangeDialog
        모드="필수"
        onSuccess={() => window.location.assign("/")}
        onLogout={() => 로그아웃후_로그인화면()}
      />
    </div>
  );
}
