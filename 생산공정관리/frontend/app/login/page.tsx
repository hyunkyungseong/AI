import LoginForm from "@/components/LoginForm";
import { 접속거부사유인가, 접속거부_안내문구 } from "@/lib/authReasons";

// 로그인 페이지(서버 부분) — 주소의 ?reason=(접속 종료 사유)을 읽어 양식 위에 안내 문구로 넘긴다
// (2026-11-13, 7단계 2-1: 새로고침(F5)으로 첫 화면에서 접속이 거부된 경우 app/page.tsx가 사유를 붙여 보냄).
// 양식 자체는 components/LoginForm.tsx(클라이언트)로 분리 — 클라이언트에서 주소를 읽으면 build 시
// Suspense 경계가 필요해지는 것을 피하기 위해 서버 쪽 searchParams(Next 16: Promise)로 받음.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const reason = (await searchParams).reason;
  const 종료안내 = 접속거부사유인가(reason) && reason !== "missing" ? 접속거부_안내문구(reason) : undefined;
  return <LoginForm 종료안내={종료안내} />;
}
