// 고객 제출용 명세서(2026-11-22) — scripts/billing.py의 고객품목_계산()·고객규칙_자동적용()과 같은 규칙을
// 화면에서도 그대로 계산한다(편집 중 합계·미배정을 바로 보여주기 위함). 최종 판정은 항상 서버가 다시
// 하므로(금액은 서버가 직접 합산), 여기 값은 "화면 표시용"이다. 두 쪽 규칙을 바꿀 때는 함께 바꿀 것.
// 상세: `.claude/plans/plan_고객제출용명세서.md`.
import type { 확정품목 } from "@/components/InvoicePreviewDialog";

export type 고객상자 = {
  품명: string;
  규격?: string | null;
  비고?: string | null;
  포함: number[]; // 품목_최종 배열 인덱스
  나머지전부: boolean;
};

export type 저장고객규칙 = {
  순서: number;
  품명: string;
  규격?: string | null;
  비고?: string | null;
  포함항목: [string, string, string][]; // [코드, 품명, 조]
  나머지전부: boolean;
};

export type 고객줄 = {
  품명: string;
  규격: string | null;
  비고: string | null;
  수량: number | null;
  단가: number | null;
  금액: number;
  포함: number[];
};

const 반올림2 = (x: number) => Math.round(x * 100) / 100;

export function 매칭키(r: 확정품목): string {
  return JSON.stringify([r.코드 ?? "", r.품목 ?? "", r.조 ?? ""]);
}

export function 대상줄(r: 확정품목): boolean {
  return !r.구분자;
}

export function 고객품목_계산(최종: 확정품목[], 상자목록: 고객상자[]) {
  const 오류: string[] = [];
  const 대상 = 최종.map((r, i) => (대상줄(r) ? i : -1)).filter((i) => i >= 0);
  const 대상셋 = new Set(대상);
  const 배정 = new Map<number, number>(); // 내부용 인덱스 → 상자 번호
  const 나머지상자 = 상자목록.map((b, n) => (b.나머지전부 ? n : -1)).filter((n) => n >= 0);
  if (나머지상자.length > 1) 오류.push("'나머지 전부' 줄은 하나만 둘 수 있습니다");
  상자목록.forEach((b, n) => {
    if (!b.품명.trim()) 오류.push(`${n + 1}번째 고객용 줄의 품명이 비어 있습니다`);
    for (const i of b.포함) {
      if (!대상셋.has(i)) 오류.push(`${n + 1}번째 고객용 줄에 없는 내부용 줄이 들어 있습니다`);
      else if (배정.has(i)) 오류.push(`내부용 ${i + 1}번째 줄이 고객용 줄 두 곳에 담겨 있습니다`);
      else 배정.set(i, n);
    }
  });
  let 미배정 = 대상.filter((i) => !배정.has(i));
  if (나머지상자.length === 1) {
    for (const i of 미배정) 배정.set(i, 나머지상자[0]);
    미배정 = [];
  }
  if (미배정.length > 0) 오류.push(`고객용 줄에 담기지 않은 내부용 줄이 ${미배정.length}개 있습니다`);

  const 줄: 고객줄[] = 상자목록.map((b, n) => {
    const 담긴 = 대상.filter((i) => 배정.get(i) === n);
    if (담긴.length === 0) 오류.push(`${n + 1}번째 고객용 줄 '${b.품명.trim()}'에 담긴 내부용 줄이 없습니다`);
    const 금액 = 반올림2(담긴.reduce((s, i) => s + (최종[i].금액 || 0), 0));
    const 단가들 = new Set(담긴.map((i) => 최종[i].단가));
    let 단가: number | null = null;
    let 수량: number | null = null;
    if (단가들.size === 1 && !단가들.has(null)) {
      단가 = [...단가들][0] as number;
      수량 = 반올림2(담긴.reduce((s, i) => s + (최종[i].수량 || 0), 0));
    }
    return {
      품명: b.품명.trim(),
      규격: (b.규격 ?? "").trim() || null,
      비고: (b.비고 ?? "").trim() || null,
      수량, 단가, 금액, 포함: 담긴,
    };
  });

  const 내부합 = 반올림2(대상.reduce((s, i) => s + (최종[i].금액 || 0), 0));
  const 고객합 = 반올림2(줄.reduce((s, r) => s + r.금액, 0));
  return { 줄, 미배정, 오류, 배정, 내부합, 고객합 };
}

export function 고객규칙_자동적용(최종: 확정품목[], 규칙: 저장고객규칙[]): 고객상자[] {
  const 정렬 = [...규칙].sort((a, b) => a.순서 - b.순서);
  const 키규칙 = new Map<string, number>();
  정렬.forEach((r, n) => {
    if (r.나머지전부) return;
    for (const 키 of r.포함항목 ?? []) {
      const k = JSON.stringify([키[0] ?? "", 키[1] ?? "", 키[2] ?? ""]);
      if (!키규칙.has(k)) 키규칙.set(k, n);
    }
  });
  const 나머지 = 정렬.findIndex((r) => r.나머지전부);
  const 담김: number[][] = 정렬.map(() => []);
  최종.forEach((r, i) => {
    if (!대상줄(r)) return;
    const n = 키규칙.get(매칭키(r)) ?? (나머지 >= 0 ? 나머지 : undefined);
    if (n !== undefined) 담김[n].push(i);
  });
  return 정렬
    .map((r, n) => ({
      품명: r.품명,
      규격: r.규격 ?? "",
      비고: r.비고 ?? "",
      포함: 담김[n],
      나머지전부: r.나머지전부,
    }))
    .filter((b) => b.포함.length > 0);
}
