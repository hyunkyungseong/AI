import type { 발행행 } from "@/components/Dashboard";

// 레벨1(요약) 그리드 한 행 — 거래명세서번호+업무명 기준으로 같은 업무명끼리 합산한 것.
// (사용자 결정, 2026-07-19: Streamlit의 (이력_id,업무명) 그룹핑과 동일한 그레인을
//  거래명세서번호 PK 기준으로 재구성 — _이력_id 같은 내부 ID 개념은 더 이상 필요 없음)
export type 레벨1그룹 = {
  key: string; // `${거래명세서번호}::${업무명}`
  거래명세서번호: string;
  사업부: string;
  거래처명: string;
  업무명: string;
  담당자: string;
  의뢰서건수: number;
  청구페이지: number;
  장수: number;
  봉입건수: number;
  용지수량: number;
  봉투수량: number;
  삽지수량: number;
  예상공급가액: number | null; // 그룹 내 하나라도 단가 미등록(null)이면 전체 null
  발송여부: 0 | 1;
};

export function build레벨1그룹(rows: 발행행[]): 레벨1그룹[] {
  const map = new Map<string, 발행행[]>();
  for (const r of rows) {
    const key = `${r.거래명세서번호}::${r.업무명}`;
    const arr = map.get(key);
    if (arr) arr.push(r);
    else map.set(key, [r]);
  }

  return Array.from(map.entries()).map(([key, lines]) => {
    const 단가미등록있음 = lines.some((l) => l.예상공급가액 === null);
    const sum = (f: (r: 발행행) => number) => lines.reduce((s, l) => s + f(l), 0);
    return {
      key,
      거래명세서번호: lines[0].거래명세서번호,
      사업부: lines[0].사업부,
      거래처명: lines[0].거래처명,
      업무명: lines[0].업무명,
      담당자: Array.from(new Set(lines.map((l) => l.담당자))).sort((a, b) => a.localeCompare(b, "ko")).join(", "),
      의뢰서건수: lines.length,
      청구페이지: sum((l) => l.청구페이지),
      장수: sum((l) => l.장수),
      봉입건수: sum((l) => l.봉입건수),
      용지수량: sum((l) => l.용지수량),
      봉투수량: sum((l) => l.봉투수량),
      삽지수량: sum((l) => l.삽지수량),
      예상공급가액: 단가미등록있음 ? null : sum((l) => l.예상공급가액 ?? 0),
      발송여부: lines[0].발송여부,
    };
  });
}
