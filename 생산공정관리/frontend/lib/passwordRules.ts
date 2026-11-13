// 비밀번호 규칙 화면 표시용(2026-11-13, 7단계) — 서버 scripts/auth.py 비밀번호_규칙_검사와 같은 규칙:
// 8자 이상 + 영문·숫자·특수문자(키보드 ASCII 기호 = Python string.punctuation) 모두 포함.
// 화면의 ✓/✗는 안내용이고 최종 판단은 서버(서버가 거부하면 그 문구를 그대로 표시).
// 사용처: PasswordChangeDialog(본인 변경), AccountManager(계정 추가 초기 비밀번호·관리자 초기화).

export const 비밀번호_최소길이 = 8;
const 특수문자 = /[!-/:-@[-`{-~]/;

export function 비밀번호_규칙목록(pw: string) {
  return [
    { 이름: `${비밀번호_최소길이}자 이상`, ok: pw.length >= 비밀번호_최소길이 },
    { 이름: "영문 포함", ok: /[A-Za-z]/.test(pw) },
    { 이름: "숫자 포함", ok: /[0-9]/.test(pw) },
    { 이름: "특수문자 포함", ok: 특수문자.test(pw) },
  ];
}

export function 비밀번호_규칙통과(pw: string) {
  return 비밀번호_규칙목록(pw).every((r) => r.ok);
}
