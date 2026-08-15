// 거래명세서 수정 감사이력(거래명세서_수정이력, 2026-08-13) 표시 전용 헬퍼 — InvoiceHistoryDialog.tsx
// ("편집됨" 팝업)와 Tab4EditHistory.tsx("수정이력" 탭)가 공유한다.
// 품목 필드(수량·단가·금액·품목추가·품목삭제)는 비고(품목명)와 합쳐 "품목명(필드명)"으로 보여주고,
// 총계 필드(공급가액·세액)는 비고가 비어 있으므로 필드명만 그대로 보여준다(사용자 요청, 2026-08-13).
const 품목필드 = new Set(["수량", "단가", "금액", "품목추가", "품목삭제"]);
// 취소·발행취소(되돌리기)는 비고에 사유(+ 취소는 "전체취소/부분취소(의뢰서 N건)" 요약)가 담겨
// 있는데, 이 값이 화면에 전혀 안 보여서 "사유가 저장 안 됐다"는 오해를 샀다(2026-08-14 실사용
// 제보 — 실제로는 DB엔 저장돼 있었고 표시만 누락됐던 문제) — 필드명 뒤에 그대로 이어붙여 노출한다.
const 사유필드 = new Set(["취소", "발행취소(되돌리기)"]);

export function 필드표시(필드명: string, 비고: string | null): string {
  if (품목필드.has(필드명) && 비고) return `${비고}(${필드명})`;
  if (사유필드.has(필드명) && 비고) return `${필드명}: ${비고}`;
  return 필드명;
}

// 총계 필드(공급가액·세액·합계)에만 "이후값" 옆에 증감을 함께 보여준다(2026-08-14, 사용자 요청 —
// 수정으로 합계가 얼마나 차이 나는지 한눈에 보고 싶음). 품목 필드(수량·단가·금액 등)는 대상에서
// 제외 — 금액 증감까지 색칠하면 "이게 수량 변화인지 금액 변화인지" 헷갈릴 수 있어 총계 3종으로
// 범위를 좁혔다.
const 총계필드 = new Set(["공급가액", "세액", "합계"]);

export function 차이표시(필드명: string, 이전값: number | null, 이후값: number | null): string {
  if (!총계필드.has(필드명) || 이전값 === null || 이후값 === null) return "";
  const 차이 = Math.round(이후값 - 이전값);
  if (차이 === 0) return "";
  return `(${차이 > 0 ? "+" : ""}${차이.toLocaleString()})`;
}

// "편집됨" 배지와 동일한 색상 규칙(증가=빨강/감소=파랑, InvoiceIssuedLevel1Table.tsx 참고).
export function 차이색상(필드명: string, 이전값: number | null, 이후값: number | null): string {
  if (!총계필드.has(필드명) || 이전값 === null || 이후값 === null) return "";
  const 차이 = Math.round(이후값 - 이전값);
  if (차이 > 0) return "text-red-600 dark:text-red-400";
  if (차이 < 0) return "text-blue-600 dark:text-blue-400";
  return "";
}
