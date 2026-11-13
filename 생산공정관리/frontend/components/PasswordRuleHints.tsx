import { 비밀번호_규칙목록 } from "@/lib/passwordRules";

// 비밀번호 규칙 ✓/✗ 실시간 표시(2026-11-13, 7단계) — 비밀번호 변경 창·계정 추가·초기화 창 공용.
export default function PasswordRuleHints({ 값 }: { 값: string }) {
  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {비밀번호_규칙목록(값).map((r) => (
        <li key={r.이름} className={r.ok ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
          {r.ok ? "✓" : "✗"} {r.이름}
        </li>
      ))}
    </ul>
  );
}
