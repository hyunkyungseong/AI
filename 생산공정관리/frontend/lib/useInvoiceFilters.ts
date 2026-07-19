import { useMemo, useState } from "react";
import { uniqSorted, usePrunedSelection } from "./useFilters";
import type { 미발행행 } from "@/components/Dashboard";

// rows 중 가장 이른 작업일자를 시작일 기본값으로 사용 — 빈 칸으로 두면 필터가 적용된 건지 헷갈리고,
// 그렇다고 최근 N개월로 좁히면(탭1~3 방식) 오래된 미발행 건을 놓칠 수 있어서, "이 목록에 있는 가장
// 오래된 날짜"를 채워 넣는 것으로 절충(사용자 요청, 2026-07-19). 종료일은 계속 공란(제한 없음).
function 최소작업일자(rows: { 작업일자: string }[]): string {
  let min = "";
  for (const r of rows) {
    if (r.작업일자 && (!min || r.작업일자 < min)) min = r.작업일자;
  }
  return min;
}

// 탭4 "미발행 목록" 전용 필터 훅 — useFilters()를 제네릭화하지 않고 복제한 이유는
// 필드셋(운영통계행 vs 미발행행)이 달라 제네릭화하면 탭1~3까지 건드려야 해서 회귀 위험이 생기기
// 때문 (SKILL-10 "재사용보다 명시적 복제" 전례 참고). 필터 종류·순서(사업부→조회기간→담당자→
// 거래처→업무명)는 탭1~3과 동일하게 맞춤(사용자 요청, 2026-07-19).
// 담당자·거래처·업무명 옵션은 상위 필터(사업부·기간) 적용 후 남은 rows에서 뽑으므로
// "미발행 건에 실제 등장하는 값"만 노출됨.
export function useInvoiceFilters(rows: 미발행행[]) {
  const 기본시작일 = useMemo(() => 최소작업일자(rows), [rows]);

  const [사업부, set사업부] = useState<string[]>([]);
  const [시작일, set시작일] = useState(기본시작일);
  const [종료일, set종료일] = useState("");
  const [담당자, set담당자] = useState<string[]>([]);
  const [거래처, set거래처] = useState<string[]>([]);
  const [업무명, set업무명] = useState<string[]>([]);

  const base1 = useMemo(
    () => (사업부.length ? rows.filter((r) => 사업부.includes(r.사업부)) : rows),
    [rows, 사업부]
  );
  const base2 = useMemo(
    () => base1.filter((r) => (!시작일 || r.작업일자 >= 시작일) && (!종료일 || r.작업일자 <= 종료일)),
    [base1, 시작일, 종료일]
  );

  const 담당자옵션 = useMemo(() => uniqSorted(base2.map((r) => r.담당자)), [base2]);
  const 유효담당자 = usePrunedSelection(담당자, 담당자옵션, set담당자);
  const base3 = useMemo(
    () => (유효담당자.length ? base2.filter((r) => 유효담당자.includes(r.담당자)) : base2),
    [base2, 유효담당자]
  );

  const 거래처옵션 = useMemo(() => uniqSorted(base3.map((r) => r.거래처명)), [base3]);
  const 유효거래처 = usePrunedSelection(거래처, 거래처옵션, set거래처);
  const base4 = useMemo(
    () => (유효거래처.length ? base3.filter((r) => 유효거래처.includes(r.거래처명)) : base3),
    [base3, 유효거래처]
  );

  const 업무명옵션 = useMemo(() => uniqSorted(base4.map((r) => r.업무명)), [base4]);
  const 유효업무명 = usePrunedSelection(업무명, 업무명옵션, set업무명);
  const base5 = useMemo(
    () => (유효업무명.length ? base4.filter((r) => 유효업무명.includes(r.업무명)) : base4),
    [base4, 유효업무명]
  );

  function 필터초기화() {
    set사업부([]);
    set시작일(기본시작일);
    set종료일("");
    set담당자([]);
    set거래처([]);
    set업무명([]);
  }

  return {
    사업부,
    set사업부,
    시작일,
    set시작일,
    종료일,
    set종료일,
    담당자,
    set담당자,
    거래처,
    set거래처,
    업무명,
    set업무명,
    담당자옵션,
    거래처옵션,
    업무명옵션,
    base5,
    필터초기화,
  };
}
