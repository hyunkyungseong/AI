import { redirect } from "next/navigation";
import { fastapiFetch } from "@/lib/fastapi";
import AccountManager from "@/components/AccountManager";
import ForcedPasswordChange from "@/components/ForcedPasswordChange";
import type { 내정보 } from "@/lib/session";

// 계정 관리 화면(관리자 전용, 2026-11-13 7단계 2-3). 업무 탭 화면(app/page.tsx·Dashboard)과 분리된 별도 페이지 —
// 업무 화면의 데이터 5종 로딩과 무관하게 빠르게 열리고, 기존 업무 화면을 건드리지 않기 위함.
// 판단 순서(/내정보 — 비밀번호 변경 필요 상태에서도 서버가 통과시킴):
//   401 → 로그인 화면(사유 포함) / 비밀번호 변경 필요 → 필수 변경 화면 / 관리자 아님 → 업무 화면(/)
// 서버 관리자 API도 관리자가 아니면 403이라, 주소를 직접 입력해도 이중으로 막힌다.
export default async function AccountsPage() {
  const res = await fastapiFetch("/내정보");
  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    const reason = typeof data?.인증사유 === "string" ? data.인증사유 : "";
    redirect(reason ? `/login?reason=${encodeURIComponent(reason)}` : "/login");
  }
  if (!res.ok) {
    throw new Error(`내 정보를 불러오지 못했습니다 (status ${res.status})`);
  }
  const 정보: 내정보 = await res.json();
  if (정보.비밀번호변경필요) return <ForcedPasswordChange />;
  if (!정보.관리자) redirect("/");
  return <AccountManager 정보={정보} />;
}
