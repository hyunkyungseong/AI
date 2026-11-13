"use client";

import { useState } from "react";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import PasswordChangeDialog from "./PasswordChangeDialog";
import type { 내정보 } from "@/lib/session";

// 상단 오른쪽 사용자 메뉴(2026-11-13, 7단계 2-2·2-3):
// 이름(ID) · 관리자 표시 · [계정 관리](관리자에게만, /accounts) · [비밀번호 변경] · [로그아웃].
export default function UserMenu({ 정보 }: { 정보: 내정보 }) {
  const [변경창, set변경창] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-700 dark:text-gray-300" data-testid="user-name">
        {정보.이름 ? `${정보.이름} (${정보.사용자명})` : 정보.사용자명}
      </span>
      {정보.관리자 && (
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          관리자
        </span>
      )}
      {정보.관리자 && (
        <Link
          href="/accounts"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          계정 관리
        </Link>
      )}
      <button
        type="button"
        onClick={() => set변경창(true)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        비밀번호 변경
      </button>
      <LogoutButton />
      {변경창 && <PasswordChangeDialog 모드="일반" onClose={() => set변경창(false)} />}
    </div>
  );
}
