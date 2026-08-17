import type { 규칙조건, 규칙조건AND그룹 } from "@/components/ConditionRuleModal";

export type 원본품목 = {
  코드: string;
  품목: string;
  작업명: string | null;
  자재명: string | null; // 단가마스터_자재단가로 등록된 자재 단위 단가가 적용된 행만 채워짐(2026-08-15)
  수량: number;
  단가: number;
  금액: number;
};

export type 규칙적용행 = {
  최종청구품명: string;
  코드: string;
  수량: number;
  단가: number | null;
  금액: number;
  조?: string; // 조별 분할발급(2026-07-29) — billing.py 적용_규칙()과 대칭, 없으면 미지정(하위호환)
};

// 소수점 셋째 자리부터 잘라 버림(반올림 아님) — 부동소수점 오차(예: 14.29*100=1428.9999...)로
// 한 자리 낮게 잘리는 걸 막기 위해 아주 작은 보정값을 더한 뒤 자른다. billing._절삭2()와 대칭.
function 절삭2(x: number): number {
  return Math.floor(x * 100 + 1e-9) / 100;
}

// scripts/billing.py의 평가_조건()·적용_규칙()과 완전히 동일한 로직의 클라이언트 사이드 복제본 —
// 조건 편집 모달에서 규칙을 저장할 때마다 서버를 왕복하지 않고 즉시 화면에 결과를 반영하기 위함
// (최종 확정 시에는 어차피 서버가 같은 로직으로 다시 검증·저장하므로 여기서의 계산은 미리보기용).
// 조건["or"]가 빈 배열이면 무조건 매칭(전체 합산) — billing.평가_조건()과 동일(2026-07-22).
function 평가_and그룹(row: 원본품목, group: 규칙조건AND그룹): boolean {
  if (group.and.length === 0) return false;
  return group.and.every((c) => {
    if (c.field === "단가") {
      // 단가는 숫자라 문자열 비교(String(14)!==String(14.0) 등 파이썬·JS 표현 차이)가 어긋날 수
      // 있음 → 숫자로 변환해 소수 2자리까지 절삭 비교(2026-07-28 조건식 "단가" 필드 추가)
      const 비교값 = Number(c.value);
      if (Number.isNaN(비교값)) return false;
      return 절삭2(row.단가) === 절삭2(비교값);
    }
    const 필드값 = String((row as unknown as Record<string, unknown>)[c.field] ?? "");
    const 비교값 = String(c.value ?? "");
    return c.op === "contains" ? 필드값.includes(비교값) : 필드값 === 비교값;
  });
}

export function 평가_조건(row: 원본품목, 조건: 규칙조건): boolean {
  if (조건.or.length === 0) return true;
  return 조건.or.some((g) => 평가_and그룹(row, g));
}

// 원본 행은 순서가 빠른 규칙부터 검사해 처음 매칭되는 규칙 한 곳에만 속한다(이중 청구 방지) —
// billing.적용_규칙()과 동일. 규칙목록은 이미 원하는 순서로 정렬되어 들어온다고 가정.
export function 적용_규칙(
  원본목록: 원본품목[],
  규칙목록: { 최종청구품명: string; 조건: 규칙조건; 조?: string }[]
): { 결과: 규칙적용행[]; 미분류: 원본품목[] } {
  const 매칭됨 = new Array(원본목록.length).fill(false);
  const 결과: 규칙적용행[] = [];

  for (const 규칙 of 규칙목록) {
    let 수량합 = 0;
    let 금액합 = 0;
    const 단가집합 = new Set<number>();
    const 코드집합 = new Set<string>();
    원본목록.forEach((row, i) => {
      if (매칭됨[i]) return;
      if (평가_조건(row, 규칙.조건)) {
        매칭됨[i] = true;
        수량합 += row.수량;
        금액합 += row.금액;
        단가집합.add(row.단가);
        코드집합.add(row.코드);
      }
    });
    결과.push({
      최종청구품명: 규칙.최종청구품명,
      코드: 코드집합.size === 1 ? [...코드집합][0] : "",
      수량: 수량합,
      단가: 단가집합.size === 1 ? [...단가집합][0] : null,
      금액: 금액합,
      조: 규칙.조,
    });
  }

  const 미분류 = 원본목록.filter((_, i) => !매칭됨[i]);
  return { 결과, 미분류 };
}
